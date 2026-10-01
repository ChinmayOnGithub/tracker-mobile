import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { trackerApi } from '@/api/client'
import { Button } from '@/components/Button'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { colors, spacing, typography } from '@/theme/tokens'

export default function AuthCallbackRoute() {
  const params = useLocalSearchParams<{
    token?: string
    username?: string
    error?: string
  }>()
  const { handleGoogleSession } = useAuth()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    let active = true

    async function processAuth() {
      if (params.error) {
        if (active) {
          setErrorMessage(params.error)
          setProcessing(false)
        }
        return
      }

      const token = params.token
      if (!token) {
        if (active) {
          setErrorMessage('No authentication token received from Google.')
          setProcessing(false)
        }
        return
      }

      try {
        await handleGoogleSession(token)

        // Check Onboarding state
        try {
          const onboarding = await trackerApi.getOnboardingState()
          if (active) {
            if (!onboarding.state || onboarding.state.status !== 'COMPLETED') {
              router.replace('/(app)/onboarding')
            } else {
              router.replace('/(app)/(tabs)')
            }
          }
        } catch {
          // If onboarding check encounters an error, proceed to tabs safely
          if (active) {
            router.replace('/(app)/(tabs)')
          }
        }
      } catch (err) {
        if (active) {
          setErrorMessage(
            err instanceof Error ? err.message : 'Google authentication failed.'
          )
          setProcessing(false)
        }
      }
    }

    void processAuth()

    return () => {
      active = false
    }
  }, [params.token, params.error, handleGoogleSession])

  if (processing) {
    return (
      <Screen>
        <LoadingState message="Signing in with Google..." />
      </Screen>
    )
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Sign In Failed</Text>
        <Text style={styles.errorMessage}>
          {errorMessage || 'Unable to complete sign-in with Google.'}
        </Text>
        <Button
          label="Back to Sign In"
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backButton}
          variant="primary"
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: typography.xl.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  errorMessage: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    color: colors.textMuted,
    textAlign: 'center',
  },
  backButton: {
    marginTop: spacing.md,
    backgroundColor: colors.coral,
  },
})
