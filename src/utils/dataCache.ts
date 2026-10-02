/**
 * Small L0 in-memory cache for hot mobile reads.
 *
 * SQLite remains the persistent local source of truth. This layer only
 * removes repeated JS/SQLite work during a warm session.
 *
 * The cache is deliberately bounded. A mobile process can live for a long
 * time, so unbounded feature/query keys would otherwise retain domain data
 * indefinitely.
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

const DEFAULT_TTL_MS = 30_000
const MAX_ENTRIES = 128

class FastDataCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private hits = 0
  private misses = 0

  get<T>(key: string): T | null {
    const entry = this.getEntry(key)
    if (!entry) {
      this.misses++
      return null
    }
    this.hits++
    return entry.data as T
  }

  has(key: string): boolean {
    return this.getEntry(key) !== null
  }

  peek<T>(key: string): T | null {
    const entry = this.getEntry(key)
    return entry ? (entry.data as T) : null
  }

  set<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
    const now = Date.now()
    this.cache.delete(key)
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + Math.max(0, ttlMs),
    })
    this.evictIfNeeded()
  }

  update<T>(
    key: string,
    updater: (current: T | null) => T,
    ttlMs = DEFAULT_TTL_MS
  ): void {
    const current = this.peek<T>(key)
    this.set(key, updater(current), ttlMs)
  }

  getTimestamp(key: string): number | null {
    return this.getEntry(key)?.timestamp ?? null
  }

  isFresh(key: string, maxAgeMs = DEFAULT_TTL_MS): boolean {
    const entry = this.getEntry(key)
    return entry !== null && Date.now() - entry.timestamp < maxAgeMs
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

  private getEntry(key: string): CacheEntry<unknown> | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key)
      return null
    }

    // Map insertion order gives us a tiny LRU: touching a hot entry moves it
    // to the end so eviction keeps the most useful keys.
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry
  }

  private evictIfNeeded(): void {
    while (this.cache.size > MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string | undefined
      if (oldest === undefined) break
      this.cache.delete(oldest)
    }
  }
}

export const fastCache = new FastDataCache()
