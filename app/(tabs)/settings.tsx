import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { Screen } from '@/components/Screen'
import { colors, spacing } from '@/theme/tokens'

export default function SettingsScreen() {
  const { user, logout } = useAuth()

  function confirmSignOut() {
    Alert.alert('Sign out?', 'The session token will be removed from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void logout().then(() => router.replace('/login'))
        },
      },
    ])
  }

  return (
    <Screen>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{user?.username ?? 'Unknown user'}</Text>
        {user?.email ? <Text style={styles.meta}>{user.email}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Architecture</Text>
        <Text style={styles.meta}>
          Mobile owns presentation and local storage. Authentication, business rules,
          entitlements and persistence remain server-authoritative.
        </Text>
      </View>

      <Pressable onPress={confirmSignOut} style={styles.button}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 32, fontWeight: '800' },
  card: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  label: { color: colors.textMuted, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  value: { color: colors.text, fontSize: 18, fontWeight: '700' },
  meta: { color: colors.textMuted, lineHeight: 21 },
  button: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
  },
  buttonText: { color: '#fca5a5', fontWeight: '700' },
})