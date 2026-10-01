import { useEffect, useState } from 'react'
import { Redirect } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { trackerApi } from '@/api/client'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'

export default function IndexRoute() {
  const { isLoading, isAuthenticated } = useAuth()
  const [checkingOnboarding, setCheckingOnboarding] = useState(false)
  const [targetRoute, setTargetRoute] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function checkState() {
      if (!isAuthenticated) {
        setTargetRoute('/(auth)/login')
        return
      }

      setCheckingOnboarding(true)
      try {
        const res = await trackerApi.getOnboardingState()
        if (active) {
          if (!res.state || res.state.status !== 'COMPLETED') {
            setTargetRoute('/(app)/onboarding')
          } else {
            setTargetRoute('/(app)/(tabs)')
          }
        }
      } catch {
        if (active) {
          setTargetRoute('/(app)/(tabs)')
        }
      } finally {
        if (active) {
          setCheckingOnboarding(false)
        }
      }
    }

    if (!isLoading) {
      void checkState()
    }

    return () => {
      active = false
    }
  }, [isLoading, isAuthenticated])

  if (isLoading || checkingOnboarding || !targetRoute) {
    return (
      <Screen>
        <LoadingState message="Restoring session..." />
      </Screen>
    )
  }

  return <Redirect href={targetRoute as '/(app)/(tabs)' | '/(auth)/login' | '/(app)/onboarding'} />
}