import { useCallback, useMemo, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { trackerApi } from '@/api/client'
import { useAuth } from '@/auth/AuthProvider'
import { useEntitlements } from '@/auth/EntitlementProvider'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { OutboxRepository } from '@/db/repository'
import { drainOutbox } from '@/sync'
import { useTheme } from '@/theme/ThemeContext'
import {
  ACCENT_OPTIONS,
  ThemeMode,
  radius,
  spacing,
  typography,
} from '@/theme/tokens'
import { LeaveModal } from '@/features/leave/LeaveModal'

export function SettingsScreen() {
  const { user, logout } = useAuth()
  const { isPro, refreshEntitlements } = useEntitlements()
  const { mode, setMode, accent, setAccent, colors } = useTheme()
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
      void refreshEntitlements()
    }, [refreshPendingCount, refreshEntitlements])
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
        <Text style={[styles.title, { color: colors.text }]}>Settings & More</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Account, theme, offline queue, Google Calendar, and recovery bin.
        </Text>
      </View>

      {/* Appearance & Themes Card */}
      <Card style={styles.card}>
        <View style={styles.iconHeadingWrap}>
          <View style={[styles.paletteIconWrap, { backgroundColor: `${colors.primary}22` }]}>
            <TrackerIcon name="sparkles" size="sm" color={colors.primary} />
          </View>
          <View style={styles.binCopyWrap}>
            <Text style={[styles.cardHeading, { color: colors.text }]}>Appearance & Theme</Text>
            <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
              Customize mode (Dark, Light, System) and accent colors.
            </Text>
          </View>
        </View>

        {/* Theme Mode Chips */}
        <Text style={[styles.subLabel, { color: colors.textMuted }]}>THEME MODE</Text>
        <View style={styles.themeModeRow}>
          {(['system', 'dark', 'light'] as ThemeMode[]).map((m) => {
            const active = mode === m
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[
                  styles.modeButton,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                  active && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Theme mode ${m}`}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    { color: colors.textMuted },
                    active && { color: colors.white, fontWeight: '700' },
                  ]}
                >
                  {m === 'system' ? 'System' : m === 'dark' ? 'Dark' : 'Light'}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Accent Color Palette */}
        <Text style={[styles.subLabel, { color: colors.textMuted }]}>ACCENT COLOR</Text>
        <View style={styles.accentGrid}>
          {ACCENT_OPTIONS.map((opt) => {
            const isSelected = accent === opt.key
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setAccent(opt.key)}
                style={[
                  styles.accentSwatch,
                  { backgroundColor: opt.color },
                  isSelected && [styles.accentSwatchActive, { borderColor: colors.text }],
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select accent ${opt.label}`}
              >
                {isSelected ? (
                  <TrackerIcon name="check" size="xs" color="#ffffff" />
                ) : null}
              </TouchableOpacity>
            )
          })}
        </View>
      </Card>

      {/* Subscription & Plan Card */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.iconHeadingWrap}>
            <View
              style={[
                styles.planIconWrap,
                { backgroundColor: isPro ? 'rgba(245, 158, 11, 0.18)' : `${colors.primary}22` },
              ]}
            >
              <TrackerIcon
                name={isPro ? 'crown' : 'shield'}
                size="sm"
                color={isPro ? '#f59e0b' : colors.primary}
              />
            </View>
            <View style={styles.binCopyWrap}>
              <View style={styles.planHeaderRow}>
                <Text style={[styles.cardHeading, { color: colors.text }]}>Subscription</Text>
                <View
                  style={[
                    styles.planBadge,
                    { backgroundColor: isPro ? '#f59e0b25' : colors.surfaceRaised },
                  ]}
                >
                  <Text
                    style={[
                      styles.planBadgeText,
                      { color: isPro ? '#f59e0b' : colors.textMuted },
                    ]}
                  >
                    {isPro ? 'PRO ⚡' : 'FREE'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
                {isPro
                  ? 'All premium activity symbols, 2-way calendar sync, and unlimited features unlocked.'
                  : 'Essential tracking active. Extended emoji & wireframe symbols require Pro.'}
              </Text>
            </View>
          </View>
        </View>

        {!isPro && (
          <Button
            label="Upgrade to Pro"
            variant="primary"
            size="sm"
            onPress={() => {
              Alert.alert(
                'Tracker Pro',
                'Tracker Pro unlocks 24+ custom activity symbols, unlimited notes, bi-directional Google Calendar sync, and advanced analytics.\n\nVisit tracker.app/billing or upgrade from the web dashboard.',
                [{ text: 'OK' }]
              )
            }}
            accessibilityLabel="Upgrade to Tracker Pro"
          />
        )}
      </Card>

      {/* Outbox & Offline Sync Card */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.iconHeadingWrap}>
            <View style={[styles.outboxIconWrap, { backgroundColor: `${colors.primary}22` }]}>
              <TrackerIcon name="upload" size="sm" color={colors.primary} />
            </View>
            <View style={styles.binCopyWrap}>
              <Text style={[styles.cardHeading, { color: colors.text }]}>Offline Outbox Queue</Text>
              <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
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
            <View style={[styles.calendarIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <TrackerIcon name="calendar" size="sm" color={colors.sky} />
            </View>
            <View style={styles.binCopyWrap}>
              <Text style={[styles.cardHeading, { color: colors.text }]}>Google Calendar Sync</Text>
              <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
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
            <View style={[styles.leaveIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <TrackerIcon name="calendar" size="sm" color={colors.warning} />
            </View>
            <View style={styles.binCopyWrap}>
              <Text style={[styles.cardHeading, { color: colors.text }]}>Time Off & Leave</Text>
              <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
                View entitlements, remaining balances, and submit leave requests.
              </Text>
            </View>
          </View>
          <Button
            label="Manage"
            variant="outline"
            size="sm"
            onPress={() => setLeaveModalVisible(false || true)}
            accessibilityLabel="Manage Time Off and Leave"
          />
        </View>
      </Card>

      {/* Bin / Data Recovery Card */}
      <Card style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.iconHeadingWrap}>
            <View style={[styles.binIconWrap, { backgroundColor: colors.coralSubtle }]}>
              <TrackerIcon name="trash" size="sm" color={colors.coral} />
            </View>
            <View style={styles.binCopyWrap}>
              <Text style={[styles.cardHeading, { color: colors.text }]}>Bin / Recovery</Text>
              <Text style={[styles.cardSubtext, { color: colors.textMuted }]}>
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Username</Text>
          <Text style={[styles.value, { color: colors.text }]}>{user?.username ?? 'Not signed in'}</Text>
        </View>
        {user?.email ? (
          <View style={styles.item}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
            <Text style={[styles.value, { color: colors.text }]}>{user.email}</Text>
          </View>
        ) : null}
        <View style={styles.item}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Account Role</Text>
          <Text style={[styles.value, { color: colors.text }]}>{user?.isOwner ? 'Owner / Admin' : 'Member'}</Text>
        </View>
      </Card>

      {/* Offline & Sync Architecture */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Offline & Local Storage</Text>
        <Text style={[styles.body, { color: colors.textMuted }]}>
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
    fontSize: typography.hero.fontSize,
    lineHeight: typography.hero.lineHeight,
    fontWeight: '800',
  },
  subtitle: {
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
  paletteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outboxIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  binIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  binCopyWrap: {
    flex: 1,
    gap: 2,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardHeading: {
    fontSize: typography.md.fontSize,
    fontWeight: '700',
  },
  cardSubtext: {
    fontSize: typography.xs.fontSize,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  themeModeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
  },
  accentGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  accentSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentSwatchActive: {
    borderWidth: 3,
  },
  sectionTitle: {
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
    fontSize: typography.sm.fontSize,
  },
  value: {
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
  },
  body: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
  signOutButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
})
