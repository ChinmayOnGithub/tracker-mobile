import type { SQLiteDatabase } from 'expo-sqlite'
import { withSafeTransaction } from './transaction'
import type { ActivityLog, ActivityTemplate } from '@/api/types'
import { normalizeColor, darkPalette } from '@/theme/tokens'

export async function getCachedTemplates(db: SQLiteDatabase): Promise<ActivityTemplate[]> {
  const rows = await db.getAllAsync<{
    id: string
    name: string
    category: string
    type: string
    icon: string
    color: string
    recurrence_type: string
    is_active: number
    created_at: string
    updated_at: string
  }>('SELECT * FROM activity_template WHERE is_active = 1 ORDER BY name ASC;')

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    type: r.type,
    icon: r.icon,
    color: normalizeColor(r.color, darkPalette.coral),
    recurrenceType: r.recurrence_type,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export async function cacheTemplates(
  db: SQLiteDatabase,
  templates: ActivityTemplate[]
): Promise<void> {
  await withSafeTransaction(db, async () => {
    for (const t of templates) {
      await db.runAsync(
        `INSERT OR REPLACE INTO activity_template (
          id, name, category, type, icon, color, recurrence_type, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          t.id,
          t.name,
          t.category,
          t.type,
          t.icon,
          t.color,
          t.recurrenceType,
          t.isActive ? 1 : 0,
          t.createdAt,
          t.updatedAt,
        ]
      )
    }
  })
}

export async function getCachedLogs(
  db: SQLiteDatabase,
  date: string
): Promise<ActivityLog[]> {
  const rows = await db.getAllAsync<{
    id: string
    activity_id: string
    date: string
    status: string
    note: string | null
    amount: number | null
    payload_json: string | null
    created_at: string
    updated_at: string
  }>('SELECT * FROM activity_log WHERE date = ? ORDER BY created_at ASC;', [date])

  return rows.map((r) => ({
    id: r.id,
    activityId: r.activity_id,
    date: r.date,
    status: r.status,
    note: r.note,
    amount: r.amount,
    payload: r.payload_json ? JSON.parse(r.payload_json) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export async function cacheLogs(
  db: SQLiteDatabase,
  logs: ActivityLog[]
): Promise<void> {
  await withSafeTransaction(db, async () => {
    for (const log of logs) {
      await db.runAsync(
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
  })
}

/**
 * Wipes all user-scoped data from local SQLite tables on sign out.
 * Guarantees zero data leakage when a different user logs in.
 */
export async function clearUserLocalData(db: SQLiteDatabase): Promise<void> {
  await withSafeTransaction(db, async () => {
    await db.execAsync(`
      DELETE FROM activity_log;
      DELETE FROM activity_template;
      DELETE FROM calendar_event;
      DELETE FROM tracker_search;
      DELETE FROM mutation_queue;
      DELETE FROM tombstones;
      DELETE FROM onboarding_state;
      DELETE FROM sync_state;
    `)
  })
}