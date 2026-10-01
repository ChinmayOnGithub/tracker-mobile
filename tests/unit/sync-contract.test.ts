import { describe, expect, it } from 'bun:test'
import { SafeSyncEngine, syncEngine } from '@/sync'

describe('Sync Engine & Server Contract Safety', () => {
  it('keeps full offline sync safely disabled until server multi-entity stream is audited', async () => {
    expect(syncEngine.isConfigured()).toBe(false)
    const state = await syncEngine.getSyncState()
    expect(state.isSyncing).toBe(false)
    expect(state.lastSyncedAt).toBeNull()
    expect(state.error).toContain('Offline engine paused')
  })

  it('SafeSyncEngine triggerSync executes as a safe boundary no-op without data corruption', async () => {
    const engine = new SafeSyncEngine()
    await expect(engine.triggerSync()).resolves.toBeUndefined()
  })
})