import type { SQLiteDatabase } from 'expo-sqlite'

export type OutboxOperation = 'create_log' | 'update_log' | 'delete_log' | 'create_template' | 'update_template' | 'delete_template'
export type OutboxStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface OutboxEntry {
  id: string
  mutationId: string
  entityType: string
  entityId: string
  operation: OutboxOperation
  payload: Record<string, unknown>
  attemptCount: number
  nextAttemptAt: string | null
  status: OutboxStatus
  lastError: string | null
  createdAt: string
}

interface OutboxRow {
  id: string
  mutation_id: string | null
  entity_type: string
  entity_id: string
  operation: string
  payload_json: string
  attempt_count: number
  next_attempt_at: string | null
  status: string
  last_error: string | null
  created_at: string
}

function rowToEntry(r: OutboxRow): OutboxEntry {
  return {
    id: r.id,
    mutationId: r.mutation_id ?? r.id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    operation: r.operation as OutboxOperation,
    payload: JSON.parse(r.payload_json) as Record<string, unknown>,
    attemptCount: r.attempt_count,
    nextAttemptAt: r.next_attempt_at,
    status: r.status as OutboxStatus,
    lastError: r.last_error,
    createdAt: r.created_at,
  }
}

/**
 * OutboxRepository
 *
 * Manages the mutation_queue table — the durable outbox for offline-capable mutations.
 * Mutations are written here first (atomically with the local SQLite state change),
 * then drained to the server by the outbox drain worker.
 */
export class OutboxRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  /** Enqueue a mutation. Called atomically inside a local-state transaction. */
  async enqueue(
    id: string,
    mutationId: string,
    entityType: string,
    entityId: string,
    operation: OutboxOperation,
    payload: Record<string, unknown>
  ): Promise<void> {
    const now = new Date().toISOString()
    await this.db.runAsync(
      `INSERT INTO mutation_queue (
        id, mutation_id, entity_type, entity_id, operation, payload_json,
        version, attempt_count, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, 'pending', ?);`,
      [id, mutationId, entityType, entityId, operation, JSON.stringify(payload), now]
    )
  }

  /** Read all pending entries ordered by creation time (FIFO drain). */
  async getPending(): Promise<OutboxEntry[]> {
    const now = new Date().toISOString()
    const rows = await this.db.getAllAsync<OutboxRow>(
      `SELECT * FROM mutation_queue
       WHERE status = 'pending'
         AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
       ORDER BY created_at ASC;`,
      [now]
    )
    return rows.map(rowToEntry)
  }

  /** Count pending mutations (for sync status display). */
  async getPendingCount(): Promise<number> {
    const row = await this.db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM mutation_queue WHERE status = 'pending';"
    )
    return row?.count ?? 0
  }

  /** Mark an entry as processing (prevents concurrent drain). */
  async markProcessing(id: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE mutation_queue SET status = 'processing' WHERE id = ?;",
      [id]
    )
  }

  /** Mark an entry as done and remove it from the queue. */
  async markDone(id: string): Promise<void> {
    await this.db.runAsync("DELETE FROM mutation_queue WHERE id = ?;", [id])
  }

  /**
   * Mark an entry as failed with exponential back-off.
   * Back-off: 2^attemptCount * 5 seconds, capped at 300 seconds (5 min).
   */
  async markFailed(id: string, error: string): Promise<void> {
    const entry = await this.db.getFirstAsync<{ attempt_count: number }>(
      'SELECT attempt_count FROM mutation_queue WHERE id = ?;',
      [id]
    )
    const attempts = (entry?.attempt_count ?? 0) + 1
    const backoffSeconds = Math.min(Math.pow(2, attempts) * 5, 300)
    const nextAttempt = new Date(Date.now() + backoffSeconds * 1000).toISOString()

    await this.db.runAsync(
      `UPDATE mutation_queue
       SET status = 'pending', attempt_count = ?, next_attempt_at = ?, last_error = ?
       WHERE id = ?;`,
      [attempts, nextAttempt, error, id]
    )
  }

  /** Permanently fail an entry after max retries (will not be retried). */
  async markPermanentlyFailed(id: string, error: string): Promise<void> {
    await this.db.runAsync(
      "UPDATE mutation_queue SET status = 'failed', last_error = ? WHERE id = ?;",
      [error, id]
    )
  }

  /** Remove all done/failed entries older than a given date (queue housekeeping). */
  async pruneOlderThan(isoDate: string): Promise<void> {
    await this.db.runAsync(
      "DELETE FROM mutation_queue WHERE status = 'failed' AND created_at < ?;",
      [isoDate]
    )
  }

  /** Check if a mutation with this idempotency key already exists. */
  async existsByMutationId(mutationId: string): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ id: string }>(
      'SELECT id FROM mutation_queue WHERE mutation_id = ?;',
      [mutationId]
    )
    return row !== null
  }
}
