import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/Button'
import { ErrorView } from '@/components/ErrorView'
import { Input } from '@/components/Input'
import { Screen } from '@/components/Screen'
import { colors, spacing, typography } from '@/theme/tokens'

export function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setError(null)
    const trimmed = username.trim()
    if (!trimmed) {
      setError('Username is required.')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.')
      return
    }

    setSubmitting(true)
    try {
      await login(trimmed, pin)
      router.replace('/(app)/(tabs)')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>TRACKER</Text>
        <Text style={styles.title}>Your life, on the go.</Text>
        <Text style={styles.subtitle}>
          Sign in with your Tracker username and 4-digit PIN.
        </Text>
      </View>

      <View style={styles.form}>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          label="Username"
          onChangeText={setUsername}
          placeholder="Enter username"
          value={username}
        />
        <Input
          keyboardType="number-pad"
          label="PIN"
          maxLength={4}
          onChangeText={setPin}
          placeholder="4-digit PIN"
          secureTextEntry
          value={pin}
        />

        {error ? <ErrorView message={error} title="Sign in failed" /> : null}

        <Button
          disabled={submitting}
          label={submitting ? 'Signing in...' : 'Sign in'}
          loading={submitting}
          onPress={() => void submit()}
          size="lg"
          style={styles.submitButton}
          variant="primary"
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  kicker: {
    color: colors.primary,
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: typography.hero.fontSize,
    lineHeight: typography.hero.lineHeight,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.base.fontSize,
    lineHeight: typography.base.lineHeight,
  },
  form: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
})