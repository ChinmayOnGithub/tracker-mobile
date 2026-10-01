import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/Button'
import { ErrorView } from '@/components/ErrorView'
import { Input } from '@/components/Input'
import { Screen } from '@/components/Screen'
import { colors, radius, spacing, typography } from '@/theme/tokens'

export function LoginScreen() {
  const { login, register } = useAuth()
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setError(null)
    const trimmed = username.trim()
    if (!trimmed) {
      setError('Username is required.')
      return
    }

    if (isRegisterMode) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.')
        return
      }
    } else {
      if (!password) {
        setError('Password or PIN is required.')
        return
      }
    }

    setSubmitting(true)
    try {
      if (isRegisterMode) {
        await register(trimmed, password)
      } else {
        await login(trimmed, password)
      }
      router.replace('/(app)/(tabs)')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen>
      {/* Brand Header matching Tracker Web */}
      <View style={styles.brandContainer}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <View style={styles.logoInnerDot} />
            <View style={styles.logoCutout} />
          </View>
          <Text style={styles.brandTitle}>tracker</Text>
        </View>
        <Text style={styles.brandTagline}>
          Focus, daily habits, and time management
        </Text>
      </View>

      {/* Auth Card */}
      <View style={styles.card}>
        {/* Tab Switcher: Sign In vs Create Account */}
        <View style={styles.tabContainer}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: !isRegisterMode }}
            onPress={() => {
              setIsRegisterMode(false)
              setError(null)
            }}
            style={[styles.tab, !isRegisterMode && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                !isRegisterMode && styles.tabTextActive,
              ]}
            >
              Sign In
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: isRegisterMode }}
            onPress={() => {
              setIsRegisterMode(true)
              setError(null)
            }}
            style={[styles.tab, isRegisterMode && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                isRegisterMode && styles.tabTextActive,
              ]}
            >
              Create Account
            </Text>
          </Pressable>
        </View>

        {/* Inputs */}
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
            autoCapitalize="none"
            autoCorrect={false}
            label="Password"
            onChangeText={setPassword}
            placeholder={
              isRegisterMode
                ? 'Enter password (min 8 chars)'
                : 'Enter password or PIN'
            }
            rightAccessory={
              <Pressable
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                hitSlop={8}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Text style={styles.togglePasswordText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            }
            secureTextEntry={!showPassword}
            value={password}
          />

          {error ? (
            <ErrorView
              message={error}
              title={isRegisterMode ? 'Registration failed' : 'Sign in failed'}
            />
          ) : null}

          <Button
            disabled={submitting}
            label={
              submitting
                ? isRegisterMode
                  ? 'Creating account...'
                  : 'Signing in...'
                : isRegisterMode
                  ? 'Create Account'
                  : 'Sign In'
            }
            loading={submitting}
            onPress={() => void submit()}
            size="lg"
            style={styles.submitButton}
            variant="primary"
          />
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  brandContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff7557', // Canonical Tracker brand coral
    position: 'relative',
    overflow: 'hidden',
  },
  logoInnerDot: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f9a68e',
  },
  logoCutout: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    color: colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: '#ff7557',
  },
  tabText: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  form: {
    gap: spacing.md,
  },
  togglePasswordText: {
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
    color: colors.primary,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  submitButton: {
    marginTop: spacing.xs,
    backgroundColor: '#ff7557',
  },
})