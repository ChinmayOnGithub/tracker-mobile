import { describe, expect, it } from 'bun:test'
import { arePayloadsEquivalent, resolveLastWriterWins } from '@/domain/conflict'

describe('Domain Conflict Resolution & Equivalence', () => {
  it('resolves newer timestamp to corresponding side', () => {
    const local = { val: 'A' }
    const remote = { val: 'B' }

    const res1 = resolveLastWriterWins(local, { lastModified: 200 }, remote, { lastModified: 100 })
    expect(res1.resolution).toBe('local')

    const res2 = resolveLastWriterWins(local, { lastModified: 100 }, remote, { lastModified: 200 })
    expect(res2.resolution).toBe('remote')
  })

  it('resolves version tie-breaker when timestamps are identical', () => {
    const local = { val: 'A' }
    const remote = { val: 'B' }

    const res = resolveLastWriterWins(
      local,
      { lastModified: 100, version: 3 },
      remote,
      { lastModified: 100, version: 2 }
    )
    expect(res.resolution).toBe('local')
  })

  it('determines deep JSON payload equivalence', () => {
    expect(arePayloadsEquivalent({ a: 1, b: 'two' }, { b: 'two', a: 1 })).toBe(true)
    expect(arePayloadsEquivalent({ a: 1 }, { a: 2 })).toBe(false)
    expect(arePayloadsEquivalent({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })
})