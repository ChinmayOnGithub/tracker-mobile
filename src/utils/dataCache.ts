/**
 * In-memory cache and freshness tracker for high-performance mobile renders.
 * Ensures tabs render immediately with zero latency and avoids redundant network requests.
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class FastDataCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map()

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    return entry.data as T
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  isFresh(key: string, maxAgeMs = 30_000): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    return Date.now() - entry.timestamp < maxAgeMs
  }

  invalidate(keyPrefix?: string): void {
    if (!keyPrefix) {
      this.cache.clear()
      return
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key)
      }
    }
  }
}

export const fastCache = new FastDataCache()
