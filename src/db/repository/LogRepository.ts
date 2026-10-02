import type { SQLiteDatabase } from 'expo-sqlite'
import type { ActivityLog } from '@/api/types'

interface LogRow {
  id: string
  activity_id: string
  date: string
  status: string
  note: string | null
  amount: number | null
  payload_json: string | null
  version?: number
  created_at: string
  updated_at: string
}

function rowToLog(r: LogRow): ActivityLog {
  return {
    id: r.id,
    activityId: r.activity_id,
    date: r.date,
    status: r.status,
    note: r.note,
    amount: r.amount,
    payload: r.payload_json ? (JSON.parse(r.payload_json) as unknown) : undefined,
    version: r.version ?? 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/**
 * LogRepository
 *
 * Domain-oriented SQLite access for activity_log rows.
 * SQLite is the primary read path. Server data is reconciled via upsertFromServer.
 * All multi-step writes are wrapped in transactions.
 */
export class LogRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  /** Read all logs for a specific date. Primary read source for Today screen. */
  async getByDate(date: string): Promise<ActivityLog[]> {
    const rows = await this.db.getAllAsync<LogRow>(
      'SELECT * FROM activity_log WHERE date = ? AND deleted_at IS NULL ORDER BY created_at ASC;',
      [date]
    )
    return rows.map(rowToLog)
  }

  /** Read logs for a date range (inclusive). Used by Calendar and prefetching. */
  async getByDateRange(startDate: string, endDate: string): Promise<ActivityLog[]> {
    const rows = await this.db.getAllAsync<LogRow>(
      `SELECT * FROM activity_log
       WHERE date >= ? AND date <= ? AND deleted_at IS NULL
       ORDER BY date ASC, created_at ASC;`,
      [startDate, endDate]
    )
    return rows.map(rowToLog)
  }

  /** Read a single log by id. Returns null if not found or soft-deleted. */
  async getById(id: string): Promise<ActivityLog | null> {
    const row = await this.db.getFirstAsync<LogRow>(
      'SELECT * FROM activity_log WHERE id = ? AND deleted_at IS NULL;',
      [id]
    )
    return row ? rowToLog(row) : null
  }

  /** Read all logs for a specific activity across all dates. */
  async getByActivityId(activityId: string): Promise<ActivityLog[]> {
    const rows = await this.db.getAllAsync<LogRow>(
      `SELECT * FROM activity_log
       WHERE activity_id = ? AND deleted_at IS NULL
       ORDER BY date DESC;`,
      [activityId]
    )
    return rows.map(rowToLog)
  }

  /**
   * Upsert a batch of logs from a server response.
   * INSERT OR REPLACE keeps SQLite in sync with server state.
   * Version-aware: ignores updates where incoming.version <= local.version (#186).
   * Clears tombstones for restored entities.
   */
  async upsertFromServer(logs: ActivityLog[]): Promise<void> {
    if (logs.length === 0) return

    await this.db.withTransactionAsync(async () => {
      for (const log of logs) {
        // Version-aware check (#186): if incoming.version <= local.version, ignore
        const existing = await this.db.getFirstAsync<{ version: number }>(
          'SELECT version FROM activity_log WHERE id = ?;',
          [log.id]
        )
        if (existing && log.version !== undefined && log.version <= (existing.version || 0)) {
          continue
        }

        const logVersion = log.version ?? 1

        await this.db.runAsync(
          `INSERT OR REPLACE INTO activity_log (
            id, activity_id, date, status, note, amount, payload_json, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            log.id,
            log.activityId,
            log.date,
            log.status,
            log.note ?? null,
            log.amount ?? null,
            log.payload ? JSON.stringify(log.payload) : null,
            logVersion,
            log.createdAt,
            log.updatedAt,
          ]
        )

        // Clear tombstone if entity was restored on server
        await this.db.runAsync(
          "DELETE FROM tombstones WHERE entity_type = 'activity_log' AND entity_id = ?;",
          [log.id]
        )
      }
    })
  }

  /**
   * Apply an optimistic create log locally before server acknowledgment.
   * Uses a client-generated id (UUID v4). The outbox will reconcile with server.
   */
  async optimisticCreate(log: ActivityLog): Promise<void> {
    await this.db.runAsync(
      `INSERT OR REPLACE INTO activity_log (
        id, activity_id, date, status, note, amount, payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        log.id,
        log.activityId,
        log.date,
        log.status,
        log.note ?? null,
        log.amount ?? null,
        log.payload ? JSON.stringify(log.payload) : null,
        log.createdAt,
        log.updatedAt,
      ]
    )
  }

  /**
   * Apply an optimistic update locally.
   * The outbox will push the mutation to the server.
   */
  async optimisticUpdate(
    id: string,
    status: string,
    amount?: number | null,
    payload?: unknown
  ): Promise<void> {
    const now = new Date().toISOString()
    if (amount !== undefined || payload !== undefined) {
      await this.db.runAsync(
        'UPDATE activity_log SET status = ?, amount = ?, payload_json = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;',
        [status, amount ?? null, payload ? JSON.stringify(payload) : null, now, id]
      )
    } else {
      await this.db.runAsync(
        'UPDATE activity_log SET status = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL;',
        [status, now, id]
      )
    }
  }

  /**
   * Soft-delete a log locally and record a tombstone.
   * Called on local user delete before server ack.
   */
  async markDeleted(id: string): Promise<void> {
    const now = new Date().toISOString()
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        'UPDATE activity_log SET deleted_at = ?, updated_at = ? WHERE id = ?;',
        [now, now, id]
      )
      await this.db.runAsync(
        `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at)
         VALUES ('activity_log', ?, ?);`,
        [id, now]
      )
    })
  }

  /** Returns latest updated_at for incremental sync cursor. */
  async getLatestUpdatedAt(): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ updated_at: string }>(
      'SELECT updated_at FROM activity_log ORDER BY updated_at DESC LIMIT 1;'
    )
    return row?.updated_at ?? null
  }
}
