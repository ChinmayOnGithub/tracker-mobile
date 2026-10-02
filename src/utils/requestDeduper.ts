/**
 * Deduplicates concurrent identical read requests.
 *
 * This is intentionally only an in-flight cache. Persistent data remains in
 * SQLite and response freshness remains owned by the existing data cache.
 */
const inFlight = new Map<string, Promise<unknown>>()

export async function dedupeRequest<T>(
  key: string,
  request: () => Promise<T>
): Promise<T> {
  const existing = inFlight.get(key)
  if (existing) return existing as Promise<T>

  const promise = request().finally(() => {
    inFlight.delete(key)
  })

  inFlight.set(key, promise)
  return promise
}

export function clearInFlightRequests(): void {
  inFlight.clear()
}

export function inFlightRequestCount(): number {
  return inFlight.size
}
