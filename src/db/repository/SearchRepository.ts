import type { SQLiteDatabase } from 'expo-sqlite'
import { withSafeTransaction } from '../transaction'

export type SearchEntityType =
  | 'activity_template'
  | 'activity_log'
  | 'note'
  | 'journal'
  | 'task'
  | 'calendar_event'
  | 'vault'

export interface SearchDocument {
  entityType: SearchEntityType
  entityId: string
  title: string
  body?: string | null
  updatedAt?: string | null
}

export interface SearchResult extends SearchDocument {
  rank: number
}

function toFtsQuery(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .map((term) => term.replace(/[^\p{L}\p{N}_-]/gu, ''))
    .filter(Boolean)
    .map((term) => '"' + term.replace(/"/g, '""') + '"*')
    .join(' AND ')
}

/**
 * SQLite-backed search index. FTS5 is the fast path; migrations enable it in
 * the native SQLite build. The index is separate from domain tables.
 */
export class SearchRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async upsert(document: SearchDocument): Promise<void> {
    await withSafeTransaction(this.db, async () => {
      await this.db.runAsync(
        'DELETE FROM tracker_search WHERE entity_type = ? AND entity_id = ?;',
        [document.entityType, document.entityId]
      )
      await this.db.runAsync(
        'INSERT INTO tracker_search (entity_type, entity_id, title, body, updated_at) VALUES (?, ?, ?, ?, ?);',
        [
          document.entityType,
          document.entityId,
          document.title,
          document.body ?? '',
          document.updatedAt ?? new Date().toISOString(),
        ]
      )
    })
  }

  async upsertMany(documents: SearchDocument[]): Promise<void> {
    if (documents.length === 0) return

    await withSafeTransaction(this.db, async () => {
      for (const document of documents) {
        await this.db.runAsync(
          'DELETE FROM tracker_search WHERE entity_type = ? AND entity_id = ?;',
          [document.entityType, document.entityId]
        )
        await this.db.runAsync(
          'INSERT INTO tracker_search (entity_type, entity_id, title, body, updated_at) VALUES (?, ?, ?, ?, ?);',
          [
            document.entityType,
            document.entityId,
            document.title,
            document.body ?? '',
            document.updatedAt ?? new Date().toISOString(),
          ]
        )
      }
    })
  }

  async remove(entityType: SearchEntityType, entityId: string): Promise<void> {
    await this.db.runAsync(
      'DELETE FROM tracker_search WHERE entity_type = ? AND entity_id = ?;',
      [entityType, entityId]
    )
  }

  async search(query: string, limit = 50): Promise<SearchResult[]> {
    const normalized = toFtsQuery(query)
    if (!normalized) return []

    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const rows = await this.db.getAllAsync<{
      entity_type: SearchEntityType
      entity_id: string
      title: string
      body: string
      updated_at: string | null
      rank: number
    }>(
      'SELECT entity_type, entity_id, title, body, updated_at, bm25(tracker_search) AS rank ' +
        'FROM tracker_search WHERE tracker_search MATCH ? ' +
        'ORDER BY rank ASC, updated_at DESC LIMIT ?;',
      [normalized, safeLimit]
    )

    return rows.map((row) => ({
      entityType: row.entity_type,
      entityId: row.entity_id,
      title: row.title,
      body: row.body,
      updatedAt: row.updated_at,
      rank: row.rank,
    }))
  }

  async clear(): Promise<void> {
    await this.db.runAsync('DELETE FROM tracker_search;')
  }
}
