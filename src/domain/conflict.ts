export interface ConflictMetadata {
  lastModified: number // Unix timestamp (ms)
  version?: number
}

export type ConflictResolution = 'local' | 'remote'

export interface ConflictResult<T> {
  resolution: ConflictResolution
  data: T
  reason: string
}

export function arePayloadsEquivalent(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false
  }

  const keysA = Object.keys(a as Record<string, unknown>)
  const keysB = Object.keys(b as Record<string, unknown>)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (!keysB.includes(key)) return false
    const valA = (a as Record<string, unknown>)[key]
    const valB = (b as Record<string, unknown>)[key]
    if (!arePayloadsEquivalent(valA, valB)) return false
  }

  return true
}

export function resolveLastWriterWins<T>(
  localData: T,
  localMeta: ConflictMetadata,
  remoteData: T,
  remoteMeta: ConflictMetadata
): ConflictResult<T> {
  const localTime = Number(localMeta.lastModified) || 0
  const remoteTime = Number(remoteMeta.lastModified) || 0
  const localVer = Number(localMeta.version) || 0
  const remoteVer = Number(remoteMeta.version) || 0

  if (localTime > remoteTime) {
    return {
      resolution: 'local',
      data: localData,
      reason: `Local version is newer (${localTime} > ${remoteTime})`,
    }
  }

  if (remoteTime > localTime) {
    return {
      resolution: 'remote',
      data: remoteData,
      reason: `Remote version is newer (${remoteTime} > ${localTime})`,
    }
  }

  // Equal timestamps: evaluate version
  if (localVer > remoteVer) {
    return {
      resolution: 'local',
      data: localData,
      reason: `Equal timestamps (${localTime}), higher local version (${localVer} > ${remoteVer})`,
    }
  }

  if (remoteVer > localVer) {
    return {
      resolution: 'remote',
      data: remoteData,
      reason: `Equal timestamps (${remoteTime}), higher remote version (${remoteVer} > ${localVer})`,
    }
  }

  // Deterministic tie-breaker: keep local
  return {
    resolution: 'local',
    data: localData,
    reason: `Identical timestamp (${localTime}) and version (${localVer}): deterministic local preference`,
  }
}