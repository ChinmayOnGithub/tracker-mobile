import { describe, it, expect, beforeEach } from 'bun:test'
import { TemplateRepository } from '@/db/repository/TemplateRepository'
import { LogRepository } from '@/db/repository/LogRepository'
import { OutboxRepository } from '@/db/repository/OutboxRepository'
import { CalendarRepository, type LocalCalendarEvent } from '@/db/repository/CalendarRepository'
import type { ActivityTemplate, ActivityLog } from '@/api/types'

// ---------------------------------------------------------------------------
// In-memory SQLite mock that tracks rows via Maps
// ---------------------------------------------------------------------------

interface TemplateRow {
  id: string; name: string; category: string; type: string; icon: string
  color: string; recurrence_type: string; is_active: number; deleted_at: string | null
  created_at: string; updated_at: string
}

interface LogRow {
  id: string; activity_id: string; date: string; status: string
  note: string | null; amount: number | null; payload_json: string | null
  deleted_at: string | null; created_at: string; updated_at: string
}

interface TombstoneRow {
  entity_type: string; entity_id: string; deleted_at: string
}

interface MutationQueueRow {
  id: string; mutation_id: string; entity_type: string; entity_id: string
  operation: string; payload_json: string; version: number
  attempt_count: number; next_attempt_at: string | null
  status: string; last_error: string | null; created_at: string
}

interface CalendarEventRow {
  id: string; google_event_id: string; calendar_id: string
  title: string; description: string | null; location: string | null
  start_date: string; end_date: string; all_day: number
  color: string | null; status: string
  tracker_artifact_id: string | null; tracker_artifact_type: string | null
  is_deleted: number; synced_at: string; created_at: string; updated_at: string
}

function makeDb() {
  const templates = new Map<string, TemplateRow>()
  const logs = new Map<string, LogRow>()
  const tombstones = new Map<string, TombstoneRow>()
  const queue = new Map<string, MutationQueueRow>()
  const events = new Map<string, CalendarEventRow>()

  return {
    _templates: templates,
    _logs: logs,
    _tombstones: tombstones,
    _queue: queue,
    _events: events,

    async getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]> {
      if (sql.includes('activity_template')) {
        let rows = Array.from(templates.values())
        if (sql.includes('is_active = 1') && sql.includes('deleted_at IS NULL')) {
          rows = rows.filter((r) => r.is_active === 1 && r.deleted_at === null)
        } else if (sql.includes('deleted_at IS NULL')) {
          rows = rows.filter((r) => r.deleted_at === null)
        }
        rows.sort((a, b) => a.name.localeCompare(b.name))
        return rows as T[]
      }
      if (sql.includes('activity_log')) {
        let rows = Array.from(logs.values()).filter((r) => r.deleted_at === null)
        if (sql.includes('date = ?') && params?.[0]) {
          rows = rows.filter((r) => r.date === params[0])
        }
        if (sql.includes('date >= ?') && params?.[0] && params?.[1]) {
          rows = rows.filter((r) => r.date >= (params[0] as string) && r.date <= (params[1] as string))
        }
        if (sql.includes('activity_id = ?') && params?.[0]) {
          rows = rows.filter((r) => r.activity_id === params[0])
        }
        return rows as T[]
      }
      if (sql.includes('mutation_queue')) {
        const now = (params?.[0] as string) ?? new Date().toISOString()
        const rows = Array.from(queue.values()).filter(
          (r) => r.status === 'pending' && (r.next_attempt_at === null || r.next_attempt_at <= now)
        )
        return rows as T[]
      }
      if (sql.includes('calendar_event')) {
        let rows = Array.from(events.values()).filter((r) => r.is_deleted === 0)
        if (params && params.length >= 2) {
          const endDate = params[0] as string
          const startDate = params[1] as string
          rows = rows.filter((r) => r.start_date <= endDate && r.end_date >= startDate)
        }
        rows.sort((a, b) => a.start_date.localeCompare(b.start_date))
        return rows as T[]
      }
      return []
    },

    async getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null> {
      if (sql.includes('activity_template') && sql.includes('id = ?')) {
        const row = templates.get(params?.[0] as string)
        if (!row || row.deleted_at !== null) return null
        return row as T
      }
      if (sql.includes('activity_log') && sql.includes('id = ?')) {
        const row = logs.get(params?.[0] as string)
        if (!row || row.deleted_at !== null) return null
        return row as T
      }
      if (sql.includes('mutation_queue') && sql.includes('mutation_id = ?')) {
        const found = Array.from(queue.values()).find((r) => r.mutation_id === params?.[0])
        return (found as T) ?? null
      }
      if (sql.includes('mutation_queue') && sql.includes('id = ?')) {
        return (queue.get(params?.[0] as string) as T) ?? null
      }
      if (sql.includes('COUNT(*)')) {
        const count = Array.from(queue.values()).filter((r) => r.status === 'pending').length
        return { count } as T
      }
      if (sql.includes('calendar_event') && sql.includes('google_event_id = ?')) {
        const found = Array.from(events.values()).find(
          (r) => r.google_event_id === params?.[0] && r.is_deleted === 0
        )
        return (found as T) ?? null
      }
      return null
    },

    async runAsync(sql: string, params?: unknown[]): Promise<void> {
      if (sql.includes('INSERT OR REPLACE INTO activity_template')) {
        const [id, name, category, type, icon, color, recurrence_type, is_active, created_at, updated_at] = params as [string, string, string, string, string, string, string, number, string, string]
        templates.set(id, { id, name, category, type, icon, color, recurrence_type, is_active, deleted_at: null, created_at, updated_at })
      }
      if (sql.includes('UPDATE activity_template SET deleted_at')) {
        const id = params?.[2] as string
        const row = templates.get(id)
        if (row) { row.deleted_at = params?.[0] as string; row.updated_at = params?.[1] as string }
      }
      if (sql.includes("DELETE FROM tombstones")) {
        const entityId = params?.[0] as string
        tombstones.delete(entityId)
      }
      if (sql.includes("INSERT OR REPLACE INTO tombstones")) {
        const [entityId, deletedAt] = params as [string, string]
        const entityType = sql.includes("'activity_template'") ? 'activity_template' : 'activity_log'
        tombstones.set(entityId, { entity_type: entityType, entity_id: entityId, deleted_at: deletedAt })
      }
      if (sql.includes('INSERT OR REPLACE INTO activity_log')) {
        const [id, activity_id, date, status, note, amount, payload_json, created_at, updated_at] = params as [string, string, string, string, string | null, number | null, string | null, string, string]
        logs.set(id, { id, activity_id, date, status, note, amount, payload_json, deleted_at: null, created_at, updated_at })
      }
      if (sql.includes('UPDATE activity_log SET status')) {
        const id = params?.[2] as string
        const row = logs.get(id)
        if (row) { row.status = params?.[0] as string; row.updated_at = params?.[1] as string }
      }
      if (sql.includes('UPDATE activity_log SET deleted_at')) {
        const id = params?.[2] as string
        const row = logs.get(id)
        if (row) { row.deleted_at = params?.[0] as string; row.updated_at = params?.[1] as string }
      }
      if (sql.includes("DELETE FROM mutation_queue WHERE id")) {
        queue.delete(params?.[0] as string)
      }
      if (sql.includes('INSERT INTO mutation_queue')) {
        const [id, mutation_id, entity_type, entity_id, operation, payload_json, created_at] = params as [string, string, string, string, string, string, string]
        queue.set(id, { id, mutation_id, entity_type, entity_id, operation, payload_json, version: 1, attempt_count: 0, next_attempt_at: null, status: 'pending', last_error: null, created_at })
      }
      if (sql.includes("UPDATE mutation_queue SET status = 'processing'")) {
        const row = queue.get(params?.[0] as string)
        if (row) row.status = 'processing'
      }
      if (sql.includes("UPDATE mutation_queue") && sql.includes("attempt_count")) {
        const [attempts, nextAttempt, error, id] = params as [number, string, string, string]
        const row = queue.get(id)
        if (row) { row.status = 'pending'; row.attempt_count = attempts; row.next_attempt_at = nextAttempt; row.last_error = error }
      }
      if (sql.includes("status = 'failed'") && sql.includes("last_error")) {
        const [error, id] = params as [string, string]
        const row = queue.get(id)
        if (row) { row.status = 'failed'; row.last_error = error }
      }
      if (sql.includes('INSERT OR REPLACE INTO calendar_event')) {
        const [
          id, google_event_id, calendar_id, title, description, location,
          start_date, end_date, all_day, color, status,
          tracker_artifact_id, tracker_artifact_type, is_deleted,
          synced_at, created_at, updated_at
        ] = params as [
          string, string, string, string, string | null, string | null,
          string, string, number, string | null, string,
          string | null, string | null, number,
          string, string, string
        ]
        events.set(id, {
          id, google_event_id, calendar_id, title, description, location,
          start_date, end_date, all_day, color, status,
          tracker_artifact_id, tracker_artifact_type, is_deleted,
          synced_at, created_at, updated_at
        })
      }
      if (sql.includes('UPDATE calendar_event SET is_deleted = 1')) {
        const calId = params?.[1] as string
        const now = params?.[0] as string
        if (sql.includes('WHERE calendar_id')) {
          // Soft-delete all events for a calendar
          for (const [, ev] of events.entries()) {
            if (ev.calendar_id === calId) { ev.is_deleted = 1; ev.updated_at = now }
          }
        } else {
          // Soft-delete a single event
          const id = params?.[1] as string
          const row = events.get(id)
          if (row) { row.is_deleted = 1; row.updated_at = now }
        }
      }
      if (sql.includes('DELETE FROM calendar_event WHERE calendar_id = ?')) {
        const calId = params?.[0] as string
        for (const [id, ev] of events.entries()) {
          if (ev.calendar_id === calId) events.delete(id)
        }
      }
    },

    async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
      await fn()
    },
  }
}

// ---------------------------------------------------------------------------
// TemplateRepository tests
// ---------------------------------------------------------------------------

describe('TemplateRepository', () => {
  let db: ReturnType<typeof makeDb>

  beforeEach(() => { db = makeDb() })

  const makeTemplate = (overrides?: Partial<ActivityTemplate>): ActivityTemplate => ({
    id: 'tmpl-1',
    name: 'Morning Run',
    category: 'Health',
    type: 'habit',
    icon: 'activity',
    color: '#ff7557',
    recurrenceType: 'daily',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  })

  it('upserts templates and reads them back as active', async () => {
    const repo = new TemplateRepository(db as never)
    const tmpl = makeTemplate()
    await repo.upsertFromServer([tmpl])
    const result = await repo.getActiveTemplates()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Morning Run')
    expect(result[0].recurrenceType).toBe('daily')
  })

  it('excludes inactive templates from getActiveTemplates', async () => {
    const repo = new TemplateRepository(db as never)
    await repo.upsertFromServer([makeTemplate(), makeTemplate({ id: 'tmpl-2', name: 'Archive', isActive: false })])
    const result = await repo.getActiveTemplates()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('tmpl-1')
  })

  it('excludes soft-deleted templates from getActiveTemplates', async () => {
    const repo = new TemplateRepository(db as never)
    await repo.upsertFromServer([makeTemplate()])
    await repo.markDeleted('tmpl-1')
    const result = await repo.getActiveTemplates()
    expect(result).toHaveLength(0)
  })

  it('records a tombstone on markDeleted', async () => {
    const repo = new TemplateRepository(db as never)
    await repo.upsertFromServer([makeTemplate()])
    await repo.markDeleted('tmpl-1')
    expect(db._tombstones.has('tmpl-1')).toBe(true)
    expect(db._tombstones.get('tmpl-1')!.entity_type).toBe('activity_template')
  })

  it('returns null for getById when not present', async () => {
    const repo = new TemplateRepository(db as never)
    const result = await repo.getById('nonexistent')
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// LogRepository tests
// ---------------------------------------------------------------------------

describe('LogRepository', () => {
  let db: ReturnType<typeof makeDb>

  beforeEach(() => { db = makeDb() })

  const makeLog = (overrides?: Partial<ActivityLog>): ActivityLog => ({
    id: 'log-1',
    activityId: 'tmpl-1',
    date: '2026-10-02',
    status: 'done',
    note: null,
    amount: null,
    createdAt: '2026-10-02T08:00:00Z',
    updatedAt: '2026-10-02T08:00:00Z',
    ...overrides,
  })

  it('upserts logs and reads by date', async () => {
    const repo = new LogRepository(db as never)
    await repo.upsertFromServer([makeLog()])
    const result = await repo.getByDate('2026-10-02')
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('done')
  })

  it('returns empty array for a date with no logs', async () => {
    const repo = new LogRepository(db as never)
    const result = await repo.getByDate('2026-10-02')
    expect(result).toHaveLength(0)
  })

  it('optimisticUpdate changes status in SQLite', async () => {
    const repo = new LogRepository(db as never)
    await repo.upsertFromServer([makeLog()])
    await repo.optimisticUpdate('log-1', 'postponed')
    const row = db._logs.get('log-1')
    expect(row?.status).toBe('postponed')
  })

  it('markDeleted soft-deletes and records tombstone', async () => {
    const repo = new LogRepository(db as never)
    await repo.upsertFromServer([makeLog()])
    await repo.markDeleted('log-1')
    expect(db._logs.get('log-1')?.deleted_at).not.toBeNull()
    expect(db._tombstones.has('log-1')).toBe(true)
    expect(db._tombstones.get('log-1')!.entity_type).toBe('activity_log')
  })
})

// ---------------------------------------------------------------------------
// OutboxRepository tests
// ---------------------------------------------------------------------------

describe('OutboxRepository', () => {
  let db: ReturnType<typeof makeDb>

  beforeEach(() => { db = makeDb() })

  it('enqueues a mutation and reads it back as pending', async () => {
    const repo = new OutboxRepository(db as never)
    await repo.enqueue('q-1', 'mut-1', 'activity_log', 'log-1', 'create_log', { status: 'done' })
    const pending = await repo.getPending()
    expect(pending).toHaveLength(1)
    expect(pending[0].operation).toBe('create_log')
    expect(pending[0].status).toBe('pending')
  })

  it('getPendingCount returns correct count', async () => {
    const repo = new OutboxRepository(db as never)
    expect(await repo.getPendingCount()).toBe(0)
    await repo.enqueue('q-1', 'mut-1', 'activity_log', 'log-1', 'create_log', {})
    expect(await repo.getPendingCount()).toBe(1)
  })

  it('markDone removes the entry from the queue', async () => {
    const repo = new OutboxRepository(db as never)
    await repo.enqueue('q-1', 'mut-1', 'activity_log', 'log-1', 'create_log', {})
    await repo.markDone('q-1')
    expect(await repo.getPendingCount()).toBe(0)
  })

  it('markFailed increments attempt_count and sets next_attempt_at', async () => {
    const repo = new OutboxRepository(db as never)
    await repo.enqueue('q-1', 'mut-1', 'activity_log', 'log-1', 'create_log', {})
    await repo.markFailed('q-1', 'Network error')
    const row = db._queue.get('q-1')
    expect(row?.attempt_count).toBe(1)
    expect(row?.next_attempt_at).not.toBeNull()
    expect(row?.last_error).toBe('Network error')
  })

  it('existsByMutationId detects duplicate mutations', async () => {
    const repo = new OutboxRepository(db as never)
    await repo.enqueue('q-1', 'mut-stable', 'activity_log', 'log-1', 'create_log', {})
    expect(await repo.existsByMutationId('mut-stable')).toBe(true)
    expect(await repo.existsByMutationId('mut-other')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// CalendarRepository tests
// ---------------------------------------------------------------------------

describe('CalendarRepository', () => {
  let db: ReturnType<typeof makeDb>

  beforeEach(() => { db = makeDb() })

  const makeEvent = (overrides?: Partial<LocalCalendarEvent>): LocalCalendarEvent => ({
    id: 'cal-1',
    googleEventId: 'g-event-1',
    calendarId: 'primary',
    title: 'Team Sync',
    description: 'Weekly team meeting',
    location: 'Google Meet',
    startDate: '2026-10-02T10:00:00.000Z',
    endDate: '2026-10-02T11:00:00.000Z',
    allDay: false,
    color: '#4285F4',
    status: 'confirmed',
    trackerArtifactId: null,
    trackerArtifactType: null,
    isDeleted: false,
    syncedAt: '2026-10-02T08:00:00.000Z',
    createdAt: '2026-10-02T08:00:00.000Z',
    updatedAt: '2026-10-02T08:00:00.000Z',
    ...overrides,
  })

  it('upserts calendar events and reads them back by date range', async () => {
    const repo = new CalendarRepository(db as never)
    const ev = makeEvent()
    await repo.upsertEvents([ev])

    const results = await repo.getByDateRange('2026-10-02T00:00:00.000Z', '2026-10-02T23:59:59.999Z')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Team Sync')
    expect(results[0].googleEventId).toBe('g-event-1')
  })

  it('getByGoogleEventId retrieves a specific event', async () => {
    const repo = new CalendarRepository(db as never)
    await repo.upsertEvents([makeEvent()])

    const found = await repo.getByGoogleEventId('g-event-1')
    expect(found).not.toBeNull()
    expect(found?.id).toBe('cal-1')

    const notFound = await repo.getByGoogleEventId('g-nonexistent')
    expect(notFound).toBeNull()
  })

  it('markDeleted soft-deletes the event', async () => {
    const repo = new CalendarRepository(db as never)
    await repo.upsertEvents([makeEvent()])
    await repo.markDeleted('cal-1')

    const results = await repo.getByDateRange('2026-10-02T00:00:00.000Z', '2026-10-02T23:59:59.999Z')
    expect(results).toHaveLength(0)
    expect(db._events.get('cal-1')?.is_deleted).toBe(1)
  })

  it('clearCalendar purges all events for a given calendar', async () => {
    const repo = new CalendarRepository(db as never)
    await repo.upsertEvents([
      makeEvent({ id: 'cal-1', calendarId: 'primary' }),
      makeEvent({ id: 'cal-2', calendarId: 'secondary', googleEventId: 'g-2' }),
    ])

    await repo.clearCalendar('primary')
    // clearCalendar now soft-deletes instead of hard-deletes (maintains soft-delete invariant)
    expect(db._events.has('cal-1')).toBe(true)
    expect(db._events.get('cal-1')?.is_deleted).toBe(1)
    expect(db._events.has('cal-2')).toBe(true)
    expect(db._events.get('cal-2')?.is_deleted).toBe(0)
  })
})
