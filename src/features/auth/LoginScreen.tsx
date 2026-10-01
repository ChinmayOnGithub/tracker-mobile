import { useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import Svg, { Path } from 'react-native-svg'
import { useAuth } from '@/auth/AuthProvider'
import { config } from '@/config'
import { Button } from '@/components/Button'
import { ErrorView } from '@/components/ErrorView'
import { Input } from '@/components/Input'
import { Screen } from '@/components/Screen'
import { colors, radius, spacing, typography } from '@/theme/tokens'

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
      <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </Svg>
  )
}

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

  async function handleGoogleSignIn() {
    setError(null)
    setSubmitting(true)
    try {
      const googleAuthUrl = `${config.apiUrl}/api/auth/google?source=mobile`
      await Linking.openURL(googleAuthUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to initiate Google sign-in.')
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

        {/* Google OAuth Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          disabled={submitting}
          onPress={() => void handleGoogleSignIn()}
          style={({ pressed }) => [
            styles.googleButton,
            pressed && styles.googleButtonPressed,
          ]}
        >
          <GoogleIcon />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </Pressable>

        {/* Divider matching Tracker Web */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
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
    backgroundColor: colors.coral, // Canonical Tracker brand coral
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
    backgroundColor: colors.coralHover,
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
    borderBottomColor: colors.coral,
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
    backgroundColor: colors.coral,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  googleButtonPressed: {
    backgroundColor: colors.surface,
    opacity: 0.9,
  },
  googleButtonText: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: '600',
    color: colors.text,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
})