import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

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
        <Text style={styles.title}>Settings & More</Text>
        <Text style={styles.subtitle}>
          Account, data recovery, offline storage, and system settings.
        </Text>
      </View>

      {/* Bin / Data Recovery Card */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.iconHeadingWrap}>
            <View style={styles.binIconWrap}>
              <TrackerIcon name="trash" size="sm" color="#ff7557" />
            </View>
            <View style={styles.binCopyWrap}>
              <Text style={styles.cardHeading}>Bin / Recovery</Text>
              <Text style={styles.cardSubtext}>
                Recover soft-deleted journals, habits, notes, and weight records.
              </Text>
            </View>
          </View>
          <Button
            label="Open"
            variant="outline"
            size="sm"
            onPress={() => router.push('/(app)/bin')}
            accessibilityLabel="Open Bin"
          />
        </View>
      </Card>

      {/* Account Info Card */}
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
        <View style={styles.item}>
          <Text style={styles.label}>Account Role</Text>
          <Text style={styles.value}>{user?.isOwner ? 'Owner / Admin' : 'Member'}</Text>
        </View>
      </Card>

      {/* Offline & Sync Status */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Offline & Local Storage</Text>
        <Text style={styles.body}>
          The mobile client caches activities, work sessions, journal entries, and notes locally in SQLite for rapid offline viewing. Auth tokens are secured inside Android Keystore / iOS Keychain via Expo SecureStore.
        </Text>
      </Card>

      {/* System Boundary */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Architecture Boundary</Text>
        <Text style={styles.body}>
          Mobile client provides rich native interactions and offline-first caches. Domain invariants, recurrence schedules, server timestamps, and subscriptions remain server-authoritative.
        </Text>
      </Card>

      {/* Sign Out */}
      <Button
        label="Sign out"
        onPress={handleSignOut}
        size="lg"
        style={styles.signOutButton}
        variant="destructive"
        accessibilityLabel="Sign out of Tracker"
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
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconHeadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  binIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff755722',
    alignItems: 'center',
    justifyContent: 'center',
  },
  binCopyWrap: {
    flex: 1,
    gap: 2,
  },
  cardHeading: {
    color: colors.text,
    fontSize: typography.md.fontSize,
    fontWeight: '700',
  },
  cardSubtext: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
  value: {
    color: colors.text,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: '600',
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight * 1.3,
  },
  signOutButton: {
    marginTop: spacing.md,
  },
})