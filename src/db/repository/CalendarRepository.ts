import type { SQLiteDatabase } from 'expo-sqlite'
import { withSafeTransaction } from '../transaction'
import { normalizeColor, darkPalette } from '@/theme/tokens'

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

function rowToEvent(row: CalendarEventRow): LocalCalendarEvent {
  return {
    id: row.id,
    googleEventId: row.google_event_id,
    calendarId: row.calendar_id,
    title: row.title,
    description: row.description,
    location: row.location,
    startDate: row.start_date,
    endDate: row.end_date,
    allDay: row.all_day === 1,
    color: normalizeColor(row.color, darkPalette.sky),
    status: row.status,
    trackerArtifactId: row.tracker_artifact_id,
    trackerArtifactType: row.tracker_artifact_type,
    isDeleted: row.is_deleted === 1,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CalendarRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getByDateRange(
    startDate: string,
    endDate: string
  ): Promise<LocalCalendarEvent[]> {
    const rows = await this.db.getAllAsync<CalendarEventRow>(
      `SELECT
         id, google_event_id, calendar_id, title, description, location,
         start_date, end_date, all_day, color, status,
         tracker_artifact_id, tracker_artifact_type, is_deleted,
         synced_at, created_at, updated_at
       FROM calendar_event
       WHERE is_deleted = 0
         AND start_date <= ?
         AND end_date >= ?
       ORDER BY start_date ASC;`,
      [endDate, startDate]
    )

    return rows.map(rowToEvent)
  }

  async getByDate(dateStr: string): Promise<LocalCalendarEvent[]> {
    const startOfDay = `${dateStr}T00:00:00.000Z`
    const endOfDay = `${dateStr}T23:59:59.999Z`
    return this.getByDateRange(startOfDay, endOfDay)
  }

  async getByGoogleEventId(
    googleEventId: string
  ): Promise<LocalCalendarEvent | null> {
    const row = await this.db.getFirstAsync<CalendarEventRow>(
      'SELECT id, google_event_id, calendar_id, title, description, location, start_date, end_date, all_day, color, status, tracker_artifact_id, tracker_artifact_type, is_deleted, synced_at, created_at, updated_at FROM calendar_event WHERE google_event_id = ? AND is_deleted = 0;',
      [googleEventId]
    )

    return row ? rowToEvent(row) : null
  }

  async upsertEvents(events: LocalCalendarEvent[]): Promise<void> {
    if (events.length === 0) return

    await withSafeTransaction(this.db, async () => {
      for (const event of events) {
        await this.db.runAsync(
          `INSERT INTO calendar_event (
            id, google_event_id, calendar_id, title, description, location,
            start_date, end_date, all_day, color, status,
            tracker_artifact_id, tracker_artifact_type, is_deleted,
            synced_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            google_event_id = excluded.google_event_id,
            calendar_id = excluded.calendar_id,
            title = excluded.title,
            description = excluded.description,
            location = excluded.location,
            start_date = excluded.start_date,
            end_date = excluded.end_date,
            all_day = excluded.all_day,
            color = excluded.color,
            status = excluded.status,
            tracker_artifact_id = excluded.tracker_artifact_id,
            tracker_artifact_type = excluded.tracker_artifact_type,
            is_deleted = excluded.is_deleted,
            synced_at = excluded.synced_at,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at;`,
          [
            event.id,
            event.googleEventId,
            event.calendarId,
            event.title,
            event.description ?? null,
            event.location ?? null,
            event.startDate,
            event.endDate,
            event.allDay ? 1 : 0,
            event.color ?? null,
            event.status,
            event.trackerArtifactId ?? null,
            event.trackerArtifactType ?? null,
            event.isDeleted ? 1 : 0,
            event.syncedAt,
            event.createdAt,
            event.updatedAt,
          ]
        )

        await this.db.runAsync(
          'DELETE FROM tracker_search WHERE entity_type = ? AND entity_id = ?;',
          ['calendar_event', event.id]
        )

        if (!event.isDeleted) {
          await this.db.runAsync(
            'INSERT INTO tracker_search (entity_type, entity_id, title, body, updated_at) VALUES (?, ?, ?, ?, ?);',
            [
              'calendar_event',
              event.id,
              event.title,
              [event.description ?? '', event.location ?? '', event.status]
                .filter(Boolean)
                .join(' '),
              event.updatedAt,
            ]
          )
        }
      }
    })
  }

  async markDeleted(id: string): Promise<void> {
    const now = new Date().toISOString()

    await withSafeTransaction(this.db, async () => {
      await this.db.runAsync(
        'UPDATE calendar_event SET is_deleted = 1, updated_at = ? WHERE id = ?;',
        [now, id]
      )
      await this.db.runAsync(
        'DELETE FROM tracker_search WHERE entity_type = ? AND entity_id = ?;',
        ['calendar_event', id]
      )
    })
  }

  async clearCalendar(calendarId: string): Promise<void> {
    const now = new Date().toISOString()

    await withSafeTransaction(this.db, async () => {
      await this.db.runAsync(
        'UPDATE calendar_event SET is_deleted = 1, updated_at = ? WHERE calendar_id = ?;',
        [now, calendarId]
      )
      await this.db.runAsync(
        `DELETE FROM tracker_search
         WHERE entity_type = ?
           AND entity_id IN (
             SELECT id FROM calendar_event WHERE calendar_id = ?
           );`,
        ['calendar_event', calendarId]
      )
    })
  }
}
