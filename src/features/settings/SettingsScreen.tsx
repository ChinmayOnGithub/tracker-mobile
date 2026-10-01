import { Alert, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { colors, spacing, typography } from '@/theme/tokens'

export function SettingsScreen() {
  const { user, logout } = useAuth()

  const handleSignOut = () => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out? Your session token will be removed from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            void logout().then(() => {
              router.replace('/(auth)/login')
            })
          },
        },
      ]
    )
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.item}>
          <Text style={styles.label}>Username</Text>
          <Text style={styles.value}>{user?.username ?? 'Not signed in'}</Text>
        </View>
        {user?.email ? (
          <View style={styles.item}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user.email}</Text>
          </View>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Offline & Sync Status</Text>
        <Text style={styles.body}>
          The mobile client caches templates and logs in SQLite for offline
          viewing. Full bidirectional sync remains paused until the server
          pagination protocol guarantees atomic multi-entity cursor ordering.
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>System Boundary</Text>
        <Text style={styles.body}>
          Mobile owns presentation, offline caching, and native interaction. User
          identity, entitlements, business rules, and timeline recurrence
          remain server-authoritative.
        </Text>
      </Card>

      <Button
        label="Sign out"
        onPress={handleSignOut}
        size="lg"
        style={styles.signOutButton}
        variant="destructive"
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.hero.fontSize,
    lineHeight: typography.hero.lineHeight,
    fontWeight: '800',
  },
  card: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  item: {
    gap: 2,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
  },
  value: {
    color: colors.text,
    fontSize: typography.base.fontSize,
    lineHeight: typography.base.lineHeight,
    fontWeight: '600',
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
  signOutButton: {
    marginTop: spacing.sm,
  },
})