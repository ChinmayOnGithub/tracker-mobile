import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'

export default function AppLayout() {
  const { isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return (
      <Screen>
        <LoadingState message="Loading..." />
      </Screen>
    )
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}