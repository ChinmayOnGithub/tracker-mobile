import { describe, expect, it } from 'bun:test'
import { fastCache } from '@/utils/dataCache'
import { dedupeRequest } from '@/utils/requestDeduper'

describe('performance primitives', () => {
  it('returns cached hot data and expires it by TTL', async () => {
    fastCache.clear()
    fastCache.set('perf:test', { value: 42 }, 20)

    expect(fastCache.peek<{ value: number }>('perf:test')?.value).toBe(42)

    await new Promise((resolve) => setTimeout(resolve, 25))

    expect(fastCache.peek('perf:test')).toBeNull()
  })

  it('deduplicates concurrent identical requests', async () => {
    let calls = 0

    const request = () => {
      calls += 1
      return new Promise<number>((resolve) =>
        setTimeout(() => resolve(123), 10)
      )
    }

    const [a, b, c] = await Promise.all([
      dedupeRequest('perf:dedupe', request),
      dedupeRequest('perf:dedupe', request),
      dedupeRequest('perf:dedupe', request),
    ])

    expect(a).toBe(123)
    expect(b).toBe(123)
    expect(c).toBe(123)
    expect(calls).toBe(1)
  })
})
