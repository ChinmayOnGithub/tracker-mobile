import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  trackerApi,
  type ActivityLog,
  type ActivityTemplate,
} from '@/api/client'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { cacheLogs, cacheTemplates, getCachedLogs, getCachedTemplates } from '@/db/database'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { addDays, formatDisplayDate, todayYmd } from '@/utils/date'
import { getNextActivityStatus, type ActivityStatus } from '@/domain/activity'
import { computeTaskOccurrences, type TaskOccurrence } from '@/domain/timeline'
import { TodayTaskRow } from './components/TodayTaskRow'
import { TaskActionModal } from './components/TaskActionModal'
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
  const [actionModalTask, setActionModalTask] = useState<TaskOccurrence | null>(null)

  const inFlightMutationRef = useRef(new Set<string>())

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

  // Compute task occurrences for the active date
  const tasks = useMemo(() => {
    return computeTaskOccurrences(templates, logs, selectedDate)
  }, [templates, logs, selectedDate])

  const completedCount = tasks.filter((t) => t.isCompleted).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Checklist status cycling
  const handleCycleStatus = async (task: TaskOccurrence) => {
    const lockKey = task.templateId
    if (inFlightMutationRef.current.has(lockKey)) return
    inFlightMutationRef.current.add(lockKey)
    setTogglingId(task.templateId)

    const nextStatus = getNextActivityStatus(task.status, task.template.recurrenceType)

    try {
      if (nextStatus === 'cleared') {
        if (task.logId) {
          await trackerApi.deleteLog(task.logId)
          setLogs((prev) => prev.filter((l) => l.id !== task.logId))
        }
      } else if (task.logId) {
        const res = await trackerApi.updateLog(task.logId, { status: nextStatus })
        setLogs((prev) => prev.map((l) => (l.id === task.logId ? res.log : l)))
      } else {
        const res = await trackerApi.createLog({
          activityId: task.templateId,
          date: selectedDate,
          status: nextStatus,
        })
        setLogs((prev) => [...prev, res.log])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.')
    } finally {
      inFlightMutationRef.current.delete(lockKey)
      setTogglingId(null)
    }
  }

  // Explicit status change from Context Modal
  const handleSetStatus = async (
    task: TaskOccurrence,
    targetStatus: ActivityStatus
  ) => {
    const lockKey = task.templateId
    if (inFlightMutationRef.current.has(lockKey)) return
    inFlightMutationRef.current.add(lockKey)
    setTogglingId(task.templateId)

    try {
      if (targetStatus === 'cleared') {
        if (task.logId) {
          await trackerApi.deleteLog(task.logId)
          setLogs((prev) => prev.filter((l) => l.id !== task.logId))
        }
      } else if (task.logId) {
        const res = await trackerApi.updateLog(task.logId, { status: targetStatus })
        setLogs((prev) => prev.map((l) => (l.id === task.logId ? res.log : l)))
      } else {
        const res = await trackerApi.createLog({
          activityId: task.templateId,
          date: selectedDate,
          status: targetStatus,
        })
        setLogs((prev) => [...prev, res.log])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task.')
    } finally {
      inFlightMutationRef.current.delete(lockKey)
      setTogglingId(null)
    }
  }

  // Delete Log
  const handleDeleteLog = async (logId: string) => {
    try {
      await trackerApi.deleteLog(logId)
      setLogs((prev) => prev.filter((l) => l.id !== logId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete log.')
    }
  }

  if (loading && !refreshing) {
    return (
      <Screen>
        <LoadingState message="Loading today's schedule..." />
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
              accessibilityRole="button"
              accessibilityLabel="Jump to today"
              hitSlop={8}
              onPress={() => setSelectedDate(today)}
            >
              <Text style={styles.todayChip}>Today</Text>
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

      {error ? <ErrorView message={error} /> : null}

      {/* Primary Section: TASKS */}
      <View style={styles.taskSection}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Today&apos;s Tasks</Text>
            {totalCount > 0 ? (
              <Text style={styles.sectionSubtitle}>
                {completedCount} of {totalCount} completed ({progressPercent}%)
              </Text>
            ) : null}
          </View>
        </View>

        {/* Progress Bar */}
        {totalCount > 0 ? (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
        ) : null}

        {/* Task List */}
        {tasks.length === 0 ? (
          <EmptyState
            icon={<TrackerIcon name="activity" size="lg" color={colors.textMuted} />}
            title="No tasks scheduled"
            message="Nothing due for this date. Add activities or enjoy your free time."
          />
        ) : (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <TodayTaskRow
                key={task.id}
                isToggling={togglingId === task.templateId}
                onCycleStatus={handleCycleStatus}
                onOpenActions={setActionModalTask}
                task={task}
              />
            ))}
          </View>
        )}
      </View>

      {/* Secondary Dashboard Widgets */}
      <View style={styles.widgetsSection}>
        <WorkSessionCard date={selectedDate} />
        <WeightWidgetCard date={selectedDate} />
      </View>

      {/* Task Context Action Modal */}
      <TaskActionModal
        onClose={() => setActionModalTask(null)}
        onDeleteLog={handleDeleteLog}
        onSetStatus={handleSetStatus}
        task={actionModalTask}
        visible={actionModalTask !== null}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
  },
  dateNavBtn: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: '700',
    color: colors.text,
  },
  todayChip: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.coral,
    backgroundColor: 'rgba(255, 117, 87, 0.12)',
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: typography.lg.fontSize,
    lineHeight: typography.lg.lineHeight,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.coral,
    borderRadius: 2,
  },
  taskList: {
    gap: spacing.sm,
  },
  widgetsSection: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
})