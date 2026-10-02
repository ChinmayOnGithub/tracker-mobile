import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { trackerApi } from '@/api/client'
import type { BillingEntitlementsResponse, BillingSubscription } from '@/api/types'
import { useAuth } from './AuthProvider'

export interface EntitlementContextValue {
  isPro: boolean
  tier: 'FREE' | 'PRO' | 'TEAM'
  plan: string
  features: Record<string, boolean>
  limits: Record<string, number>
  subscription: BillingSubscription | null
  isLoading: boolean
  refreshEntitlements: () => Promise<void>
  hasFeature: (key: string) => boolean
  requirePro: (featureTitle: string, onAllowed?: () => void) => boolean
}

const DEFAULT_LIMITS: Record<string, number> = {
  active_activities: 10,
  tasks_created_daily: 50,
  calendar_events_created_daily: 5,
}

const EntitlementContext = createContext<EntitlementContextValue>({
  isPro: false,
  tier: 'FREE',
  plan: 'FREE',
  features: {},
  limits: DEFAULT_LIMITS,
  subscription: null,
  isLoading: false,
  refreshEntitlements: async () => {},
  hasFeature: () => false,
  requirePro: () => false,
})

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [entitlements, setEntitlements] = useState<BillingEntitlementsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refreshEntitlements = useCallback(async () => {
    if (!isAuthenticated) {
      setEntitlements(null)
      return
    }
    setIsLoading(true)
    try {
      const data = await trackerApi.getBilling()
      setEntitlements(data)
    } catch {
      // Offline fallback: rely on user.isPro and user.tier from auth token
      if (user) {
        setEntitlements({
          isPro: Boolean(user.isPro),
          tier: user.tier || 'FREE',
          plan: user.plan || 'FREE',
          features: {},
          limits: DEFAULT_LIMITS,
          subscription: null,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (isAuthenticated) {
      void refreshEntitlements()
    } else {
      setEntitlements(null)
    }
  }, [isAuthenticated, refreshEntitlements])

  // Prefer fetched entitlements, with fallback to authenticated user object
  const isPro = Boolean(entitlements?.isPro ?? user?.isPro ?? false)
  const tier = entitlements?.tier ?? user?.tier ?? 'FREE'
  const plan = entitlements?.plan ?? user?.plan ?? 'FREE'
  const features = entitlements?.features ?? {}
  const limits = entitlements?.limits ?? DEFAULT_LIMITS
  const subscription = entitlements?.subscription ?? null

  const hasFeature = useCallback(
    (key: string): boolean => {
      if (isPro) return true
      return Boolean(features[key])
    },
    [isPro, features]
  )

  const requirePro = useCallback(
    (featureTitle: string, onAllowed?: () => void): boolean => {
      if (isPro) {
        onAllowed?.()
        return true
      }
      Alert.alert(
        'Tracker Pro Feature',
        `"${featureTitle}" is exclusive to Tracker Pro. Upgrade your plan in Settings to unlock unlimited habits, custom symbols, and advanced features.`,
        [{ text: 'OK' }]
      )
      return false
    },
    [isPro]
  )

  return (
    <EntitlementContext.Provider
      value={{
        isPro,
        tier,
        plan,
        features,
        limits,
        subscription,
        isLoading,
        refreshEntitlements,
        hasFeature,
        requirePro,
      }}
    >
      {children}
    </EntitlementContext.Provider>
  )
}

export function useEntitlements(): EntitlementContextValue {
  return useContext(EntitlementContext)
}
