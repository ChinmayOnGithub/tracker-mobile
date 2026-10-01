/**
 * Mobile Sync Boundary Interface
 *
 * Current Status: BOUNDED / PENDING SERVER PROTOCOL AUDIT
 *
 * Server Contract Finding:
 * Tracker server (/api/mobile/sync) returns independently paginated entities
 * with composite base64 cursors (templates, logs, notes). Advancing a global
 * lastSyncedAt or single cursor before exhausting all entity pages can lead
 * to silent record skips.
 *
 * Until the server provides:
 * 1) A monotonic globally ordered changelog / event stream, OR
 * 2) Fully atomic independent cursors with restartable checkpoints,
 * the mobile client uses direct server-authoritative API calls for live queries
 * and mutations, while maintaining local SQLite caching as a read-only mirror.
 */

export * from './types'

export interface ISyncEngine {
  isConfigured(): boolean
  getSyncState(): Promise<import('./types').SyncState>
  triggerSync(): Promise<void>
}

export class SafeSyncEngine implements ISyncEngine {
  isConfigured(): boolean {
    return false // Intentionally disabled until server contract is finalized
  }

  async getSyncState(): Promise<import('./types').SyncState> {
    return {
      isSyncing: false,
      lastSyncedAt: null,
      pendingPushCount: 0,
      error: 'Offline engine paused pending server change-stream cursor validation.',
    }
  }

  async triggerSync(): Promise<void> {
    // No-op boundary
  }
}

export const syncEngine = new SafeSyncEngine()