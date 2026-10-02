/**
 * Small L0 in-memory cache for hot mobile reads.
 *
 * SQLite remains the persistent local source of truth. This layer only
 * removes repeated JS/SQLite work during a warm session.
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

export interface CacheStats {
  hits: number
  misses: number
  entries: number
}

class FastDataCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private hits = 0
  private misses = 0

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      this.misses++
      return null
    }
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      this.misses++
      return null
    }
    this.hits++
    return entry.data as T
  }

  peek<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry || entry.expiresAt <= Date.now()) return null
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs = 30_000): void {
    const now = Date.now()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + Math.max(0, ttlMs),
    })
  }

  getTimestamp(key: string): number | null {
    return this.cache.get(key)?.timestamp ?? null
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
      if (key.startsWith(keyPrefix)) this.cache.delete(key)
    }
  }

  clear(): void {
    this.cache.clear()
  }

  stats(): CacheStats {
    return { hits: this.hits, misses: this.misses, entries: this.cache.size }
  }

  resetStats(): void {
    this.hits = 0
    this.misses = 0
  }
}

export const fastCache = new FastDataCache()
