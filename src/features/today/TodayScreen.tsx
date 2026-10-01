import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  trackerApi,
  type ActivityLog,
  type ActivityTemplate,
} from '@/api/client'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { StatusBadge } from '@/components/StatusBadge'
import { TrackerIcon } from '@/components/TrackerIcon'
import { cacheLogs, cacheTemplates, getCachedLogs, getCachedTemplates } from '@/db/database'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { addDays, formatDisplayDate, todayYmd } from '@/utils/date'
import { getNextActivityStatus } from '@/domain/activity'
import { WorkSessionCard } from './WorkSessionCard'
import { WeightWidgetCard } from './WeightWidgetCard'

export function TodayScreen() {
  const db = useSQLiteContext()
  const today = todayYmd()
  const [selectedDate, setSelectedDate] = useState(today)
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [templateResult, logResult] = await Promise.all([
        trackerApi.getTemplates(),
        trackerApi.getLogs(selectedDate),
      ])

      setTemplates(templateResult.templates)
      setLogs(logResult.logs)

      // Background cache to SQLite
      void cacheTemplates(db, templateResult.templates).catch(() => {})
      void cacheLogs(db, logResult.logs).catch(() => {})
    } catch (err) {
      // Fallback to SQLite cache on network failure
      try {
        const cachedT = await getCachedTemplates(db)
        const cachedL = await getCachedLogs(db, selectedDate)
        if (cachedT.length > 0) {
          setTemplates(cachedT)
          setLogs(cachedL)
          setError('Showing cached offline data.')
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load today.')
        }
      } catch {
        setError(err instanceof Error ? err.message : 'Unable to load today.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedDate, db])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  const toggleActivity = async (template: ActivityTemplate) => {
    const existingLog = logs.find((l) => l.activityId === template.id)
    const newStatus = getNextActivityStatus(existingLog?.status ?? 'cleared', template.recurrenceType)

    setTogglingId(template.id)
    try {
      if (existingLog) {
        const result = await trackerApi.updateLog(existingLog.id, {
          status: newStatus,
        })
        setLogs((prev) =>
          prev.map((l) => (l.id === existingLog.id ? result.log : l))
        )
      } else {
        const result = await trackerApi.createLog({
          activityId: template.id,
          date: selectedDate,
          status: newStatus,
        })
        setLogs((prev) => [...prev, result.log])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update activity.')
    } finally {
      setTogglingId(null)
    }
  }

  const logMap = new Map(logs.map((l) => [l.activityId, l]))
  const completedCount = templates.filter(
    (t) => logMap.get(t.id)?.status === 'done'
  ).length
  const totalCount = templates.length
  const percentComplete =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  if (loading && !refreshing) {
    return (
      <Screen>
        <LoadingState message="Loading activities..." />
      </Screen>
    )
  }

  const isToday = selectedDate === today

  return (
    <Screen onRefresh={() => void load(true)} refreshing={refreshing}>
      {/* Date Switcher Bar */}
      <View style={styles.dateBar}>
        <Pressable
          accessibilityLabel="Previous day"
          hitSlop={8}
          onPress={() => setSelectedDate((d) => addDays(d, -1))}
          style={styles.dateNavBtn}
        >
          <TrackerIcon name="chevron-left" size="sm" color={colors.textMuted} />
        </Pressable>

        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatDisplayDate(selectedDate)}</Text>
          {!isToday ? (
            <Pressable
              accessibilityLabel="Jump to today"
              onPress={() => setSelectedDate(today)}
            >
              <Text style={styles.todayPill}>Today</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel="Next day"
          hitSlop={8}
          onPress={() => setSelectedDate((d) => addDays(d, 1))}
          style={styles.dateNavBtn}
        >
          <TrackerIcon name="chevron-right" size="sm" color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Progress Summary Card */}
      {totalCount > 0 ? (
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Daily Progress</Text>
            <Text style={styles.progressStats}>
              {completedCount} of {totalCount} completed ({percentComplete}%)
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[styles.progressBarFill, { width: `${percentComplete}%` }]}
            />
          </View>
        </Card>
      ) : null}

      {/* Work Session Widget */}
      <WorkSessionCard date={selectedDate} />

      {/* Weight Tracking Widget */}
      <WeightWidgetCard date={selectedDate} onWeightLogged={() => void load()} />

      {error ? (
        <ErrorView message={error} onRetry={() => void load()} />
      ) : null}

      {/* Activity Checklist */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Activities</Text>
        <Text style={styles.sectionSubtitle}>
          Tap card or badge to cycle status
        </Text>
      </View>

      {templates.length === 0 ? (
        <EmptyState
          actionLabel="Refresh"
          message="No active activities found for this date. Create templates in Activities tab."
          onAction={() => void load()}
          title="No activities yet"
        />
      ) : (
        <View style={styles.list}>
          {templates.map((template) => {
            const log = logMap.get(template.id)
            const status = log ? log.status : 'cleared'
            const isDone = status === 'done'
            const isToggling = togglingId === template.id

            return (
              <Card
                key={template.id}
                onPress={() => void toggleActivity(template)}
                style={styles.card}
              >
                <View style={styles.row}>
                  {/* Status Indicator Icon */}
                  <Pressable
                    accessibilityLabel={`Toggle status for ${template.name}`}
                    disabled={isToggling}
                    hitSlop={8}
                    onPress={() => void toggleActivity(template)}
                    style={[
                      styles.checkCircle,
                      status === 'done' && styles.checkCircleDone,
                      status === 'canceled' && styles.checkCircleCanceled,
                      status === 'postponed' && styles.checkCirclePostponed,
                    ]}
                  >
                    {status === 'done' ? (
                      <TrackerIcon name="check" size="xs" color={colors.white} />
                    ) : status === 'canceled' ? (
                      <TrackerIcon name="x" size="xs" color={colors.white} />
                    ) : status === 'postponed' ? (
                      <TrackerIcon name="clock" size="xs" color={colors.white} />
                    ) : null}
                  </Pressable>

                  <View style={styles.copy}>
                    <Text style={[styles.name, isDone && styles.doneName]}>
                      {template.name}
                    </Text>
                    <Text style={styles.category}>{template.category}</Text>
                  </View>

                  <StatusBadge status={status} />
                </View>
              </Card>
            )
          })}
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: 1,
  },
  dateNavBtn: {
    padding: spacing.xs,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  todayPill: {
    fontSize: typography.xs.fontSize,
    fontWeight: '800',
    color: colors.coral,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.coralSubtle,
  },
  progressCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  progressStats: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.coral,
    borderRadius: radius.full,
  },
  sectionHeader: {
    marginTop: spacing.sm,
    gap: 2,
  },
  sectionTitle: {
    fontSize: typography.md.fontSize,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  checkCircleDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkCircleCanceled: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  checkCirclePostponed: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: typography.base.fontSize,
    lineHeight: typography.base.lineHeight,
    fontWeight: '700',
  },
  doneName: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  category: {
    color: colors.textSubtle,
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})