import type { SQLiteDatabase } from 'expo-sqlite'
import type { ActivityTemplate } from '@/api/types'

interface TemplateRow {
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
}

function rowToTemplate(r: TemplateRow): ActivityTemplate {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    type: r.type,
    icon: r.icon,
    color: r.color,
    recurrenceType: r.recurrence_type,
    isActive: r.is_active === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/**
 * TemplateRepository
 *
 * Domain-oriented SQLite access for activity_template rows.
 * SQLite is the primary read path; server data is reconciled via upsertFromServer.
 * All multi-step writes are wrapped in transactions.
 */
export class TemplateRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  /** Read all active templates ordered by name. Primary read source. */
  async getActiveTemplates(): Promise<ActivityTemplate[]> {
    const rows = await this.db.getAllAsync<TemplateRow>(
      'SELECT * FROM activity_template WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name ASC;'
    )
    return rows.map(rowToTemplate)
  }

  /** Read all templates including inactive (for management views). */
  async getAllTemplates(): Promise<ActivityTemplate[]> {
    const rows = await this.db.getAllAsync<TemplateRow>(
      'SELECT * FROM activity_template WHERE deleted_at IS NULL ORDER BY name ASC;'
    )
    return rows.map(rowToTemplate)
  }

  /** Read a single template by id. Returns null if not found or soft-deleted. */
  async getById(id: string): Promise<ActivityTemplate | null> {
    const row = await this.db.getFirstAsync<TemplateRow>(
      'SELECT * FROM activity_template WHERE id = ? AND deleted_at IS NULL;',
      [id]
    )
    return row ? rowToTemplate(row) : null
  }

  /**
   * Upsert a batch of templates from a server response.
   * INSERT OR REPLACE keeps SQLite in sync with server state.
   * Clears tombstones for restored entities.
   */
  async upsertFromServer(templates: ActivityTemplate[]): Promise<void> {
    if (templates.length === 0) return

    await this.db.withTransactionAsync(async () => {
      for (const t of templates) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO activity_template (
            id, name, category, type, icon, color, recurrence_type,
            is_active, created_at, updated_at
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

        // Clear tombstone if entity was restored on server
        await this.db.runAsync(
          "DELETE FROM tombstones WHERE entity_type = 'activity_template' AND entity_id = ?;",
          [t.id]
        )
      }
    })
  }

  /**
   * Soft-delete a template locally and record a tombstone.
   * Called on server 404 or local user delete pending server ack.
   */
  async markDeleted(id: string): Promise<void> {
    const now = new Date().toISOString()
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        'UPDATE activity_template SET deleted_at = ?, updated_at = ? WHERE id = ?;',
        [now, now, id]
      )
      await this.db.runAsync(
        `INSERT OR REPLACE INTO tombstones (entity_type, entity_id, deleted_at)
         VALUES ('activity_template', ?, ?);`,
        [id, now]
      )
    })
  }

  /** Returns latest updated_at for incremental sync cursor. */
  async getLatestUpdatedAt(): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ updated_at: string }>(
      'SELECT updated_at FROM activity_template ORDER BY updated_at DESC LIMIT 1;'
    )
    return row?.updated_at ?? null
  }
}
