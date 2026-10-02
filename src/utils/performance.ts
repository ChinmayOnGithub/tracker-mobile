export interface PerformanceSample {
  name: string
  durationMs: number
  timestamp: number
}

const MAX_SAMPLES = 200
const samples: PerformanceSample[] = []

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

export function recordPerformance(name: string, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) return

  samples.push({
    name,
    durationMs,
    timestamp: Date.now(),
  })

  if (samples.length > MAX_SAMPLES) {
    samples.splice(0, samples.length - MAX_SAMPLES)
  }
}

export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const start = now()
  try {
    return await operation()
  } finally {
    recordPerformance(name, now() - start)
  }
}

export function getPerformanceSamples(name?: string): PerformanceSample[] {
  return samples
    .filter((sample) => !name || sample.name === name)
    .map((sample) => ({ ...sample }))
}

export function clearPerformanceSamples(): void {
  samples.length = 0
}
