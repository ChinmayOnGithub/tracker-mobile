import type { ActivityLog, ActivityTemplate } from '@/api/types'

/**
 * Entity-specific cursor pointing to the last synchronized item
 * using deterministic (updatedAt, id) ordering.
 */
export interface EntityCursor {
  updatedAt: string
  id: string
}

/**
 * Composite multi-entity cursor required for safe independent pagination.
 *
 * ARCHITECTURAL SAFETY REQUIREMENT:
 * The server sync protocol at `/api/mobile/sync` independently paginates:
 * - ActivityTemplate
 * - ActivityLog
 * - JournalNote
 *
 * A single global scalar cursor (e.g. revision integer or lastSyncedAt) cannot
 * safely advance across pagination boundaries when entities have different page sizes.
 * Full mobile sync must track independent entity cursors or consume a single
 * linearized append-only change stream before offline sync is enabled.
 */
export interface MultiEntityCursor {
  templates?: EntityCursor | null
  logs?: EntityCursor | null
  notes?: EntityCursor | null
}

export interface SyncPullPayload {
  serverTime: string
  cursor: string
  hasMore: boolean
  nextCursor: string | null
  syncData: {
    templates: ActivityTemplate[]
    logs: ActivityLog[]
  }
}

export interface SyncPushPayload {
  logs: ActivityLog[]
  templates: ActivityTemplate[]
  deletedLogs: { id: string; version?: number }[]
  deletedTemplates: { id: string; version?: number }[]
}

export interface SyncState {
  isSyncing: boolean
  lastSyncedAt: string | null
  pendingPushCount: number
  error: string | null
}