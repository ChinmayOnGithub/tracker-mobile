import { useCallback, useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { trackerApi } from '@/api/client'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { OutboxRepository } from '@/db/repository'
import { drainOutbox } from '@/sync'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { LeaveModal } from '@/features/leave/LeaveModal'

export function SettingsScreen() {
  const { user, logout } = useAuth()
  const db = useSQLiteContext()
  const outboxRepo = useMemo(() => new OutboxRepository(db), [db])

  const [pendingCount, setPendingCount] = useState<number>(0)
  const [draining, setDraining] = useState<boolean>(false)
  const [syncingCalendar, setSyncingCalendar] = useState<boolean>(false)
  const [leaveModalVisible, setLeaveModalVisible] = useState<boolean>(false)

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await outboxRepo.getPendingCount()
      setPendingCount(count)
    } catch {
      setPendingCount(0)
    }
  }, [outboxRepo])

  useFocusEffect(
    useCallback(() => {
      void refreshPendingCount()
    }, [refreshPendingCount])
  )

  const handleDrainOutbox = async () => {
    setDraining(true)
    try {
      const result = await drainOutbox(db)
      await refreshPendingCount()
      Alert.alert(
        'Outbox Sync Completed',
        `Processed ${result.processed} mutations with ${result.errors} errors.`
      )
    } catch (err) {
      Alert.alert('Outbox Sync Failed', err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDraining(false)
    }
  }

  const handleSyncCalendar = async () => {
    setSyncingCalendar(true)
    try {
      await trackerApi.syncCalendar()
      Alert.alert('Calendar Synced', 'Google Calendar 2-way sync successfully updated.')
    } catch (err) {
      Alert.alert('Calendar Sync Failed', err instanceof Error ? err.message : 'Unable to sync calendar')
    } finally {
      setSyncingCalendar(false)
    }
  }

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
          Account, offline queue, Google Calendar, and recovery bin.
        </Text>
      </View>

      {/* Outbox & Offline Sync Card */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.iconHeadingWrap}>
            <View style={styles.outboxIconWrap}>
              <TrackerIcon name="upload" size="sm" color={colors.primary} />
            </View>
            <View style={styles.binCopyWrap}>
              <Text style={styles.cardHeading}>Offline Outbox Queue</Text>
              <Text style={styles.cardSubtext}>
                {pendingCount === 0
                  ? 'All changes uploaded to server.'
                  : `${pendingCount} pending mutation${pendingCount === 1 ? '' : 's'} waiting to sync.`}
              </Text>
            </View>
          </View>
          <Button
            label={draining ? 'Syncing...' : 'Sync Now'}
            size="sm"
            onPress={handleDrainOutbox}
            disabled={draining || pendingCount === 0}
            accessibilityLabel="Sync Outbox"
          />
        </View>
      </Card>

      {/* Google Calendar Integration Card */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.iconHeadingWrap}>
            <View style={styles.calendarIconWrap}>
              <TrackerIcon name="calendar" size="sm" color={colors.sky} />
            </View>
            <View style={styles.binCopyWrap}>
              <Text style={styles.cardHeading}>Google Calendar Sync</Text>
              <Text style={styles.cardSubtext}>
                Bi-directional sync between Tracker tasks and your Google account.
              </Text>
            </View>
          </View>
          <Button
            label={syncingCalendar ? 'Syncing...' : 'Sync'}
            variant="outline"
            size="sm"
            onPress={handleSyncCalendar}
            disabled={syncingCalendar}
            accessibilityLabel="Sync Google Calendar"
          />
        </View>
      </Card>

      {/* Time Off & Leave Card */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.iconHeadingWrap}>
            <View style={styles.leaveIconWrap}>
              <TrackerIcon name="calendar" size="sm" color={colors.warning} />
            </View>
            <View style={styles.binCopyWrap}>
              <Text style={styles.cardHeading}>Time Off & Leave</Text>
              <Text style={styles.cardSubtext}>
                View entitlements, remaining balances, and submit leave requests.
              </Text>
            </View>
          </View>
          <Button
            label="Manage"
            variant="outline"
            size="sm"
            onPress={() => setLeaveModalVisible(true)}
            accessibilityLabel="Manage Time Off and Leave"
          />
        </View>
      </Card>

      {/* Bin / Data Recovery Card */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.iconHeadingWrap}>
            <View style={styles.binIconWrap}>
              <TrackerIcon name="trash" size="sm" color={colors.coral} />
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

      {/* Offline & Sync Architecture */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Offline & Local Storage</Text>
        <Text style={styles.body}>
          The mobile client caches activities, calendar events, work sessions, journal entries, and notes locally in SQLite for rapid offline viewing. Auth tokens are secured inside Android Keystore / iOS Keychain via Expo SecureStore.
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

      <LeaveModal
        visible={leaveModalVisible}
        onClose={() => setLeaveModalVisible(false)}
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
  outboxIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  binIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.coralSubtle,
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
    fontSize: typography.xs.fontSize,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
  },
  value: {
    color: colors.text,
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
  signOutButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
})
