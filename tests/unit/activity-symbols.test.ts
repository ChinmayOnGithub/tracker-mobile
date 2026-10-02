import { describe, expect, it } from 'bun:test'
import {
  ALL_SYMBOLS,
  FREE_SYMBOLS,
  PRO_SYMBOLS,
  getSymbolById,
  isSymbolLocked,
  resolveSymbol,
} from '@/features/activities/symbol-registry'

describe('Activity Symbol Registry & Tier Gating', () => {
  it('defines 12 essential symbols in the Free tier (6 emojis + 6 wireframes)', () => {
    expect(FREE_SYMBOLS.length).toBe(12)
    const emojis = FREE_SYMBOLS.filter((s) => s.type === 'emoji')
    const wireframes = FREE_SYMBOLS.filter((s) => s.type === 'wireframe')

    expect(emojis.length).toBe(6)
    expect(wireframes.length).toBe(6)
    for (const s of FREE_SYMBOLS) {
      expect(s.isPro).toBe(false)
    }
  })

  it('defines 24 extended symbols in the Pro tier (12 emojis + 12 wireframes)', () => {
    expect(PRO_SYMBOLS.length).toBe(24)
    const emojis = PRO_SYMBOLS.filter((s) => s.type === 'emoji')
    const wireframes = PRO_SYMBOLS.filter((s) => s.type === 'wireframe')

    expect(emojis.length).toBe(12)
    expect(wireframes.length).toBe(12)
    for (const s of PRO_SYMBOLS) {
      expect(s.isPro).toBe(true)
    }
  })

  it('guarantees unique IDs across the entire symbol registry', () => {
    const ids = ALL_SYMBOLS.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ALL_SYMBOLS.length)
  })

  it('correctly gates locked status based on user Pro entitlement', () => {
    const freeItem = FREE_SYMBOLS[0]
    const proItem = PRO_SYMBOLS[0]

    // Free user perspective
    expect(isSymbolLocked(freeItem, false)).toBe(false)
    expect(isSymbolLocked(proItem, false)).toBe(true)

    // Pro user perspective
    expect(isSymbolLocked(freeItem, true)).toBe(false)
    expect(isSymbolLocked(proItem, true)).toBe(false)
  })

  it('resolves symbol by ID, value, emoji, and default fallback', () => {
    const byId = getSymbolById('emoji:running')
    expect(byId).toBeDefined()
    expect(byId?.value).toBe('🏃')

    const byEmojiValue = resolveSymbol('🏃')
    expect(byEmojiValue.value).toBe('🏃')
    expect(byEmojiValue.type).toBe('emoji')

    const byIconValue = resolveSymbol('briefcase')
    expect(byIconValue.value).toBe('briefcase')
    expect(byIconValue.type).toBe('wireframe')

    const fallback = resolveSymbol(null)
    expect(fallback.value).toBe('activity')
    expect(fallback.type).toBe('wireframe')
  })
})
