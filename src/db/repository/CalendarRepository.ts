import type { SQLiteDatabase } from 'expo-sqlite'

export interface LocalCalendarEvent {
  id: string
  googleEventId: string
  calendarId: string
  title: string
  description: string | null
  location: string | null
  startDate: string
  endDate: string
  allDay: boolean
  color: string | null
  status: string
  trackerArtifactId: string | null
  trackerArtifactType: string | null
  isDeleted: boolean
  syncedAt: string
  createdAt: string
  updatedAt: string
}

interface CalendarEventRow {
  id: string
  google_event_id: string
  calendar_id: string
  title: string
  description: string | null
  location: string | null
  start_date: string
  end_date: string
  all_day: number
  color: string | null
  status: string
  tracker_artifact_id: string | null
  tracker_artifact_type: string | null
  is_deleted: number
  synced_at: string
  created_at: string
  updated_at: string
}

function rowToEvent(r: CalendarEventRow): LocalCalendarEvent {
  return {
    id: r.id,
    googleEventId: r.google_event_id,
    calendarId: r.calendar_id,
    title: r.title,
    description: r.description,
    location: r.location,
    startDate: r.start_date,
    endDate: r.end_date,
    allDay: r.all_day === 1,
    color: r.color,
    status: r.status,
    trackerArtifactId: r.tracker_artifact_id,
    trackerArtifactType: r.tracker_artifact_type,
    isDeleted: r.is_deleted === 1,
    syncedAt: r.synced_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/**
 * CalendarRepository
 *
 * Domain-oriented SQLite access for calendar_event rows.
 * Provides offline caching for Google Calendar events and mapped Tracker events.
 */
export class CalendarRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  /** Read events within a date range (inclusive). */
  async getByDateRange(startDate: string, endDate: string): Promise<LocalCalendarEvent[]> {
    const rows = await this.db.getAllAsync<CalendarEventRow>(
      `SELECT * FROM calendar_event
       WHERE is_deleted = 0
         AND start_date <= ?
         AND end_date >= ?
       ORDER BY start_date ASC;`,
      [endDate, startDate]
    )
    return rows.map(rowToEvent)
  }

  /** Read events on a specific date. */
  async getByDate(dateStr: string): Promise<LocalCalendarEvent[]> {
    const startOfDay = `${dateStr}T00:00:00.000Z`
    const endOfDay = `${dateStr}T23:59:59.999Z`
    return this.getByDateRange(startOfDay, endOfDay)
  }

  /** Read a single event by Google Event ID. */
  async getByGoogleEventId(googleEventId: string): Promise<LocalCalendarEvent | null> {
    const row = await this.db.getFirstAsync<CalendarEventRow>(
      'SELECT * FROM calendar_event WHERE google_event_id = ? AND is_deleted = 0;',
      [googleEventId]
    )
    return row ? rowToEvent(row) : null
  }

  /** Upsert a batch of calendar events into SQLite. */
  async upsertEvents(events: LocalCalendarEvent[]): Promise<void> {
    if (events.length === 0) return

    await this.db.withTransactionAsync(async () => {
      for (const e of events) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO calendar_event (
            id, google_event_id, calendar_id, title, description, location,
            start_date, end_date, all_day, color, status,
            tracker_artifact_id, tracker_artifact_type, is_deleted,
            synced_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            e.id,
            e.googleEventId,
            e.calendarId,
            e.title,
            e.description ?? null,
            e.location ?? null,
            e.startDate,
            e.endDate,
            e.allDay ? 1 : 0,
            e.color ?? null,
            e.status,
            e.trackerArtifactId ?? null,
            e.trackerArtifactType ?? null,
            e.isDeleted ? 1 : 0,
            e.syncedAt,
            e.createdAt,
            e.updatedAt,
          ]
        )
      }
    })
  }

  /** Soft-delete an event. */
  async markDeleted(id: string): Promise<void> {
    const now = new Date().toISOString()
    await this.db.runAsync(
      'UPDATE calendar_event SET is_deleted = 1, updated_at = ? WHERE id = ?;',
      [now, id]
    )
  }

  /** Purge all events for a calendar (used on full 410 resync). */
  async clearCalendar(calendarId: string): Promise<void> {
    await this.db.runAsync('DELETE FROM calendar_event WHERE calendar_id = ?;', [calendarId])
  }
}
