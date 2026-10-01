import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { Screen } from '@/components/Screen'
import { colors, radius, spacing } from '@/theme/tokens'

export default function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setError(null)
    if (!username.trim()) return setError('Username is required.')
    if (!/^\d{4}$/.test(pin)) return setError('PIN must be exactly 4 digits.')

    setSubmitting(true)
    try {
      await login(username, pin)
      router.replace('/(tabs)')
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
          Mobile uses the existing Tracker authentication and API contracts.
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Username"
          placeholderTextColor={colors.textMuted}
          value={username}
          onChangeText={setUsername}
          style={styles.input}
        />
        <TextInput
          keyboardType="number-pad"
          maxLength={4}
          placeholder="4-digit PIN"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={pin}
          onChangeText={setPin}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={submitting}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            submitting && styles.disabled,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </Pressable>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { marginTop: 56, gap: spacing.sm },
  kicker: { color: colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 34, lineHeight: 40, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 16, lineHeight: 24 },
  form: { marginTop: spacing.lg, gap: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    fontSize: 16,
  },
  error: { color: '#fca5a5', lineHeight: 20 },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.6 },
})