/**
 * Tracker Entitlements Policy (Client-Side Predictive View)
 *
 * NOTE: The server remains strictly authoritative for entitlements and quotas.
 * Mobile uses these definitions solely for UX affordances and graceful upsell cues.
 */

export interface EntitlementLimits {
  readonly maxActiveActivities: number
  readonly maxVaultStorageBytes: number
  readonly allowDataExport: boolean
  readonly allowMultiDeviceSync: boolean
}

export const FREE_TIER_LIMITS: EntitlementLimits = {
  maxActiveActivities: 20,
  maxVaultStorageBytes: 50 * 1024 * 1024, // 50 MB
  allowDataExport: true,
  allowMultiDeviceSync: true,
} as const

export const PRO_TIER_LIMITS: EntitlementLimits = {
  maxActiveActivities: 500,
  maxVaultStorageBytes: 5 * 1024 * 1024 * 1024, // 5 GB
  allowDataExport: true,
  allowMultiDeviceSync: true,
} as const

export function getEntitlementLimits(isPro: boolean): EntitlementLimits {
  return isPro ? PRO_TIER_LIMITS : FREE_TIER_LIMITS
}