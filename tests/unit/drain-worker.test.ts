import { describe, it, expect, mock } from 'bun:test'
import { drainOutbox } from '@/sync/drainWorker'
import { trackerApi } from '@/api/client'
import type { SQLiteDatabase } from 'expo-sqlite'

interface MutationQueueRow {
  id: string
  mutation_id: string
  entity_type: string
  entity_id: string
  operation: string
  payload_json: string
  version: number
  attempt_count: number
  next_attempt_at: string | null
  status: string
  last_error: string | null
  created_at: string
}

function makeMockDb(initialRows: MutationQueueRow[] = []) {
  const queue = new Map<string, MutationQueueRow>()
  for (const r of initialRows) {
    queue.set(r.id, { ...r })
  }

  return {
    async getAllAsync<T>(sql: string): Promise<T[]> {
      if (sql.includes('mutation_queue')) {
        const rows = Array.from(queue.values()).filter((r) => r.status === 'pending')
        return rows as unknown as T[]
      }
      return []
    },
    async getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null> {
      if (sql.includes('SELECT attempt_count FROM mutation_queue') && params) {
        const [id] = params as [string]
        const row = queue.get(id)
        if (row) {
          return { attempt_count: row.attempt_count } as unknown as T
        }
      }
      return null
    },
    async runAsync(sql: string, params?: unknown[]): Promise<void> {
      if (sql.includes('UPDATE mutation_queue SET status = ?') && params) {
        const [status, id] = params as [string, string]
        const row = queue.get(id)
        if (row) {
          row.status = status
        }
      } else if (sql.includes('DELETE FROM mutation_queue WHERE id = ?') && params) {
        const [id] = params as [string]
        queue.delete(id)
      } else if (sql.includes('attempt_count = ?') && params) {
        const [attempts, nextAttempt, error, id] = params as [number, string, string, string]
        const row = queue.get(id)
        if (row) {
          row.attempt_count = attempts
          row.next_attempt_at = nextAttempt
          row.last_error = error
        }
      }
    },
    _queue: queue,
  } as unknown as SQLiteDatabase & { _queue: Map<string, MutationQueueRow> }
}

describe('Outbox Drain Worker (drainOutbox)', () => {
  it('returns zero processed and zero errors on empty queue', async () => {
    const db = makeMockDb([])
    const result = await drainOutbox(db)
    expect(result.processed).toBe(0)
    expect(result.errors).toBe(0)
  })

  it('drains delete_log operation and marks queue item done', async () => {
    const originalDeleteLog = trackerApi.deleteLog
    let apiCalledWith: string | null = null
    trackerApi.deleteLog = mock(async (id: string) => {
      apiCalledWith = id
      return { deleted: true, id }
    })

    const db = makeMockDb([
      {
        id: 'outbox-1',
        mutation_id: 'mut-1',
        entity_type: 'activity_log',
        entity_id: 'log-123',
        operation: 'delete_log',
        payload_json: JSON.stringify({ id: 'log-123' }),
        version: 1,
        attempt_count: 0,
        next_attempt_at: null,
        status: 'pending',
        last_error: null,
        created_at: new Date().toISOString(),
      },
    ])

    const result = await drainOutbox(db)
    expect(result.processed).toBe(1)
    expect(result.errors).toBe(0)
    expect<string | null>(apiCalledWith).toBe('log-123')
    expect(db._queue.has('outbox-1')).toBe(false) // Removed on markDone

    trackerApi.deleteLog = originalDeleteLog
  })

  it('handles API rejection and marks entry as failed', async () => {
    const originalCreateLog = trackerApi.createLog
    trackerApi.createLog = mock(async () => {
      throw new Error('Network timeout')
    })

    const db = makeMockDb([
      {
        id: 'outbox-2',
        mutation_id: 'mut-2',
        entity_type: 'activity_log',
        entity_id: 'log-456',
        operation: 'create_log',
        payload_json: JSON.stringify({
          activityId: 'template-1',
          date: '2026-10-02',
          status: 'done',
        }),
        version: 1,
        attempt_count: 0,
        next_attempt_at: null,
        status: 'pending',
        last_error: null,
        created_at: new Date().toISOString(),
      },
    ])

    const result = await drainOutbox(db)
    expect(result.processed).toBe(0)
    expect(result.errors).toBe(1)
    expect(db._queue.get('outbox-2')?.attempt_count).toBe(1)
    expect(db._queue.get('outbox-2')?.last_error).toBe('Network timeout')

    trackerApi.createLog = originalCreateLog
  })
})
