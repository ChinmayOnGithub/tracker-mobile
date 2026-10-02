import { describe, expect, it } from 'bun:test'
import { fastCache } from '@/utils/dataCache'

describe('FastDataCache', () => {
  it('supports cached null values without confusing them with a miss', () => {
    fastCache.clear()

    expect(fastCache.has('nullable')).toBe(false)
    fastCache.set('nullable', null)

    expect(fastCache.has('nullable')).toBe(true)
    expect(fastCache.get<null>('nullable')).toBeNull()

    fastCache.clear()
  })

  it('updates cached arrays without storing the updater function', () => {
    fastCache.clear()
    fastCache.set('items', ['a'])

    fastCache.update<string[]>('items', (current) => [...(current ?? []), 'b'])

    expect(fastCache.get<string[]>('items')).toEqual(['a', 'b'])
    fastCache.clear()
  })

  it('evicts old entries instead of growing without a bound', () => {
    fastCache.clear()

    for (let i = 0; i < 140; i++) {
      fastCache.set(`key:${i}`, i)
    }

    const stats = fastCache.stats()
    expect(stats.entries).toBeLessThanOrEqual(128)
    expect(fastCache.get<number>('key:139')).toBe(139)

    fastCache.clear()
  })
})
