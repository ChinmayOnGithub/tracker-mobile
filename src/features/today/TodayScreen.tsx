import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppState,
  type AppStateStatus,
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
  type CreateTemplateInput,
} from '@/api/client'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import {
  CalendarRepository,
  LogRepository,
  OutboxRepository,
  TemplateRepository,
  type LocalCalendarEvent,
} from '@/db/repository'
import { normalizeColor, radius, spacing, typography } from '@/theme/tokens'
import { useTheme } from '@/theme/ThemeContext'
import { addDays, formatDisplayDate, todayYmd } from '@/utils/date'
import { getNextActivityStatus, type ActivityStatus } from '@/domain/activity'
import { computeTaskOccurrences, type TaskOccurrence } from '@/domain/timeline'
import { TodayTaskRow } from './components/TodayTaskRow'
import { TaskActionModal } from './components/TaskActionModal'
import { QuickTaskAddBar } from './components/QuickTaskAddBar'
import { CalendarEventsSection } from './components/CalendarEventsSection'
import { WorkSessionCard } from './WorkSessionCard'
import { WeightWidgetCard } from './WeightWidgetCard'
import { JournalWidgetCard } from './JournalWidgetCard'
import { DailyCodingCard } from './DailyCodingCard'
import { LeaveWidgetCard } from './LeaveWidgetCard'
import { MobileCompletionService } from '@/domain/completion'
import { appEvents } from '@/utils/events'
import { fastCache } from '@/utils/dataCache'

function generateLocalUuid(): string {
  // Simple RFC4122 v4 UUID generator for local optimistic IDs
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function TodayScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const db = useSQLiteContext()
  const today = todayYmd()
  const [selectedDate, setSelectedDate] = useState(today)
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [calendarEvents, setCalendarEvents] = useState<LocalCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [actionModalTask, setActionModalTask] = useState<TaskOccurrence | null>(null)

  const inFlightMutationRef = useRef(new Set<string>())

  // Repository instances
  const templateRepo = useMemo(() => new TemplateRepository(db), [db])
  const logRepo = useMemo(() => new LogRepository(db), [db])
  const outboxRepo = useMemo(() => new OutboxRepository(db), [db])
  const calendarRepo = useMemo(() => new CalendarRepository(db), [db])

  // Load flow: SQLite-first (instant zero-latency render), then background reconciliation
  const load = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true)
      setError(null)

      // Step 1: Read local SQLite immediately for instant render
      try {
        const [cachedT, cachedL, cachedE] = await Promise.all([
          templateRepo.getActiveTemplates(),
          logRepo.getByDate(selectedDate),
          calendarRepo.getByDate(selectedDate),
        ])
        setTemplates(cachedT)
        setLogs(cachedL)
        setCalendarEvents(cachedE)
        // If local data exists or SQLite query finished, unblock screen immediately
        setLoading(false)
      } catch {
        // SQLite read failed; continue to network attempt
      }

      // If data for this date was fetched recently and not pull-to-refresh, skip heavy network roundtrip
      const cacheKey = `today:${selectedDate}`
      if (!isPull && fastCache.isFresh(cacheKey, 25_000)) {
        setLoading(false)
        return
      }

      // Step 2: Background reconciliation from Tracker API
      try {
        const [templateResult, logResult, calendarDayResult] = await Promise.all([
          trackerApi.getTemplates(),
          trackerApi.getLogs(selectedDate),
          trackerApi.getCalendarDay(selectedDate).catch(() => null),
        ])

        const now = new Date().toISOString()
        const eventsToCache: LocalCalendarEvent[] = (
          calendarDayResult?.day?.events || []
        ).map((ev) => ({
          id: ev.id,
          googleEventId: ev.id,
          calendarId: 'primary',
          title: ev.title,
          description: null,
          location: null,
          startDate: ev.start,
          endDate: ev.end,
          allDay: ev.allDay,
          color: normalizeColor(ev.color, colors.sky),
          status: ev.status ?? 'confirmed',
          trackerArtifactId: ev.trackerArtifactId,
          trackerArtifactType: null,
          isDeleted: false,
          syncedAt: now,
          createdAt: now,
          updatedAt: now,
        }))

        // Upsert to SQLite
        await Promise.all([
          templateRepo.upsertFromServer(templateResult.templates),
          logRepo.upsertFromServer(logResult.logs),
          eventsToCache.length > 0
            ? calendarRepo.upsertEvents(eventsToCache)
            : Promise.resolve(),
        ])

        fastCache.set(cacheKey, true)

        // Re-read canonical local SQLite state
        const [freshT, freshL, freshE] = await Promise.all([
          templateRepo.getActiveTemplates(),
          logRepo.getByDate(selectedDate),
          calendarRepo.getByDate(selectedDate),
        ])
        setTemplates(freshT)
        setLogs(freshL)
        setCalendarEvents(freshE)
      } catch (err) {
        // If network failed and we had no cache loaded yet, surface error
        if (templates.length === 0 && logs.length === 0) {
          setError(err instanceof Error ? err.message : 'Unable to load today.')
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [selectedDate, templateRepo, logRepo, calendarRepo]
  )

  // Reactive subscription: auto-refresh when tasks or activities change across tabs/modals
  useEffect(() => {
    const unsub1 = appEvents.subscribe('tasks:changed', () => {
      void (async () => {
        try {
          const [freshT, freshL, freshE] = await Promise.all([
            templateRepo.getActiveTemplates(),
            logRepo.getByDate(selectedDate),
            calendarRepo.getByDate(selectedDate),
          ])
          setTemplates(freshT)
          setLogs(freshL)
          setCalendarEvents(freshE)
        } catch {
          // ignore
        }
      })()
    })
    const unsub2 = appEvents.subscribe('activities:changed', () => {
      void (async () => {
        try {
          const freshT = await templateRepo.getActiveTemplates()
          setTemplates(freshT)
        } catch {
          // ignore
        }
      })()
    })
    return () => {
      unsub1()
      unsub2()
    }
  }, [templateRepo, logRepo, calendarRepo, selectedDate])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  // AppState foregrounding listener for automatic refresh
  useFocusEffect(
    useCallback(() => {
      const handleAppStateChange = (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          void load()
        }
      }
      const subscription = AppState.addEventListener('change', handleAppStateChange)
      return () => {
        subscription.remove()
      }
    }, [load])
  )

  // Compute task occurrences for the active date
  const tasks = useMemo(() => {
    return computeTaskOccurrences(templates, logs, selectedDate)
  }, [templates, logs, selectedDate])

  const completedCount = tasks.filter((t) => t.isCompleted).length
  const totalCount = tasks.length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Quick Task Creation (optimistic write in SQLite transaction + outbox + server sync)
  const handleCreateQuickTask = async (
    input: CreateTemplateInput
  ): Promise<ActivityTemplate> => {
    const localId = generateLocalUuid()
    const mutationId = generateLocalUuid()
    const outboxId = generateLocalUuid()
    const now = new Date().toISOString()

    const optimisticTemplate: ActivityTemplate = {
      id: localId,
      name: input.name,
      category: input.category,
      type: input.type || 'TASK',
      icon: input.icon || 'check',
      color: normalizeColor(input.color, colors.coral),
      recurrenceType: input.recurrenceType,
      isActive: true,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
      ...('targetDate' in input && input.targetDate ? { targetDate: input.targetDate } : {}),
    }

    await db.withTransactionAsync(async () => {
      await templateRepo.upsertFromServer([optimisticTemplate])
      await outboxRepo.enqueue(
        outboxId,
        mutationId,
        'activity_template',
        localId,
        'create_template',
        input as unknown as Record<string, unknown>
      )
    })

    setTemplates((prev) => [...prev, optimisticTemplate])
    appEvents.emit('activities:changed')
    appEvents.emit('tasks:changed')

    try {
      const res = await trackerApi.createTemplate(input)
      await templateRepo.upsertFromServer([res.template])
      await outboxRepo.markDone(outboxId)
      setTemplates((prev) =>
        prev.map((t) => (t.id === localId ? res.template : t))
      )
      return res.template
    } catch {
      await outboxRepo.markFailed(outboxId, 'Network failed during quick task create')
      return optimisticTemplate
    }
  }

  // Checklist status cycling: optimistic update -> outbox enqueue -> API drain
  const handleCycleStatus = async (task: TaskOccurrence) => {
    const lockKey = task.templateId
    if (inFlightMutationRef.current.has(lockKey)) return
    inFlightMutationRef.current.add(lockKey)
    setTogglingId(task.templateId)

    const nextStatus = getNextActivityStatus(task.status, task.template.recurrenceType)

    if (nextStatus === 'done' && MobileCompletionService.needsValuePrompt(task.template)) {
      inFlightMutationRef.current.delete(lockKey)
      setTogglingId(null)
      setActionModalTask(task)
      return
    }

    const mutationId = generateLocalUuid()
    const outboxId = generateLocalUuid()

    try {
      if (nextStatus === 'cleared') {
        if (task.logId) {
          const logIdToDelete = task.logId
          // Optimistic local delete + outbox in transaction
          await db.withTransactionAsync(async () => {
            await logRepo.markDeleted(logIdToDelete)
            await outboxRepo.enqueue(
              outboxId,
              mutationId,
              'activity_log',
              logIdToDelete,
              'delete_log',
              { id: logIdToDelete }
            )
          })
          setLogs((prev) => prev.filter((l) => l.id !== logIdToDelete))
          appEvents.emit('tasks:changed')
          appEvents.emit('calendar:changed')

          // Server drain attempt
          try {
            await trackerApi.deleteLog(logIdToDelete)
            await outboxRepo.markDone(outboxId)
          } catch {
            await outboxRepo.markFailed(outboxId, 'Network request failed during cycle')
          }
        }
      } else if (task.logId) {
        const logIdToUpdate = task.logId
        // Optimistic local update + outbox in transaction
        await db.withTransactionAsync(async () => {
          await logRepo.optimisticUpdate(logIdToUpdate, nextStatus)
          await outboxRepo.enqueue(
            outboxId,
            mutationId,
            'activity_log',
            logIdToUpdate,
            'update_log',
            { id: logIdToUpdate, status: nextStatus }
          )
        })
        const now = new Date().toISOString()
        setLogs((prev) =>
          prev.map((l) =>
            l.id === logIdToUpdate ? { ...l, status: nextStatus, updatedAt: now } : l
          )
        )
        appEvents.emit('tasks:changed')
        appEvents.emit('calendar:changed')

        // Server drain attempt
        try {
          const res = await trackerApi.updateLog(logIdToUpdate, { status: nextStatus })
          await logRepo.upsertFromServer([res.log])
          await outboxRepo.markDone(outboxId)
        } catch {
          await outboxRepo.markFailed(outboxId, 'Network request failed during cycle')
        }
      } else {
        // Optimistic local create + outbox in transaction
        const clientLogId = generateLocalUuid()
        const now = new Date().toISOString()
        const optimisticLog: ActivityLog = {
          id: clientLogId,
          activityId: task.templateId,
          date: selectedDate,
          status: nextStatus,
          note: null,
          amount: null,
          createdAt: now,
          updatedAt: now,
        }

        await db.withTransactionAsync(async () => {
          await logRepo.optimisticCreate(optimisticLog)
          await outboxRepo.enqueue(
            outboxId,
            mutationId,
            'activity_log',
            clientLogId,
            'create_log',
            {
              activityId: task.templateId,
              date: selectedDate,
              status: nextStatus,
            }
          )
        })
        setLogs((prev) => [...prev, optimisticLog])
        appEvents.emit('tasks:changed')
        appEvents.emit('calendar:changed')

        // Server drain attempt
        try {
          const res = await trackerApi.createLog({
            activityId: task.templateId,
            date: selectedDate,
            status: nextStatus,
          })
          // Replace optimistic client id with server-assigned log
          await db.runAsync('DELETE FROM activity_log WHERE id = ?;', [clientLogId])
          await logRepo.upsertFromServer([res.log])
          await outboxRepo.markDone(outboxId)
          setLogs((prev) => prev.map((l) => (l.id === clientLogId ? res.log : l)))
        } catch {
          await outboxRepo.markFailed(outboxId, 'Network request failed during cycle')
        }
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
    targetStatus: ActivityStatus,
    completionValue?: { amount?: number | null; payload?: Record<string, unknown> }
  ) => {
    const lockKey = task.templateId
    if (inFlightMutationRef.current.has(lockKey)) return
    inFlightMutationRef.current.add(lockKey)
    setTogglingId(task.templateId)

    const mutationId = generateLocalUuid()
    const outboxId = generateLocalUuid()

    try {
      // Special handling for postpone: updates template targetDate + creates postponed log
      if (targetStatus === 'postponed') {
        try {
          const result = await trackerApi.postponeTask(
            task.templateId,
            selectedDate,
            task.logId || null
          )
          // Refresh to get updated template targetDate and new/updated log
          await load()
          appEvents.emit('tasks:changed')
          appEvents.emit('activities:changed')
          appEvents.emit('calendar:changed')
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to postpone task.'
          )
        } finally {
          inFlightMutationRef.current.delete(lockKey)
          setTogglingId(null)
        }
        return
      }

      if (targetStatus === 'cleared') {
        if (task.logId) {
          const logIdToDelete = task.logId
          await db.withTransactionAsync(async () => {
            await logRepo.markDeleted(logIdToDelete)
            await outboxRepo.enqueue(
              outboxId,
              mutationId,
              'activity_log',
              logIdToDelete,
              'delete_log',
              { id: logIdToDelete }
            )
          })
          setLogs((prev) => prev.filter((l) => l.id !== logIdToDelete))
          appEvents.emit('tasks:changed')
          appEvents.emit('calendar:changed')

          try {
            await trackerApi.deleteLog(logIdToDelete)
            await outboxRepo.markDone(outboxId)
          } catch {
            await outboxRepo.markFailed(outboxId, 'Network request failed during set status')
          }
        }
      } else if (task.logId) {
        const logIdToUpdate = task.logId
        const newAmount = completionValue?.amount !== undefined ? completionValue.amount : undefined
        const newPayload = completionValue?.payload !== undefined ? completionValue.payload : undefined

        await db.withTransactionAsync(async () => {
          await logRepo.optimisticUpdate(logIdToUpdate, targetStatus, newAmount, newPayload)
          await outboxRepo.enqueue(
            outboxId,
            mutationId,
            'activity_log',
            logIdToUpdate,
            'update_log',
            {
              id: logIdToUpdate,
              status: targetStatus,
              ...(newAmount !== undefined ? { amount: newAmount } : {}),
              ...(newPayload !== undefined ? { payload: newPayload } : {}),
            }
          )
        })
        const now = new Date().toISOString()
        setLogs((prev) =>
          prev.map((l) =>
            l.id === logIdToUpdate
              ? {
                  ...l,
                  status: targetStatus,
                  amount: newAmount !== undefined ? newAmount : l.amount,
                  payload: newPayload !== undefined ? newPayload : l.payload,
                  updatedAt: now,
                }
              : l
          )
        )
        appEvents.emit('tasks:changed')
        appEvents.emit('calendar:changed')

        try {
          const res = await trackerApi.updateLog(logIdToUpdate, {
            status: targetStatus,
            ...(newAmount !== undefined ? { amount: newAmount } : {}),
            ...(newPayload !== undefined ? { payload: newPayload } : {}),
          })
          await logRepo.upsertFromServer([res.log])
          await outboxRepo.markDone(outboxId)
        } catch {
          await outboxRepo.markFailed(outboxId, 'Network request failed during set status')
        }
      } else {
        const clientLogId = generateLocalUuid()
        const now = new Date().toISOString()
        const optimisticLog: ActivityLog = {
          id: clientLogId,
          activityId: task.templateId,
          date: selectedDate,
          status: targetStatus,
          note: null,
          amount: completionValue?.amount ?? null,
          payload: completionValue?.payload ?? undefined,
          createdAt: now,
          updatedAt: now,
        }

        await db.withTransactionAsync(async () => {
          await logRepo.optimisticCreate(optimisticLog)
          await outboxRepo.enqueue(
            outboxId,
            mutationId,
            'activity_log',
            clientLogId,
            'create_log',
            {
              activityId: task.templateId,
              date: selectedDate,
              status: targetStatus,
              ...(completionValue?.amount !== undefined ? { amount: completionValue.amount } : {}),
              ...(completionValue?.payload !== undefined ? { payload: completionValue.payload } : {}),
            }
          )
        })
        setLogs((prev) => [...prev, optimisticLog])
        appEvents.emit('tasks:changed')
        appEvents.emit('calendar:changed')

        try {
          const res = await trackerApi.createLog({
            activityId: task.templateId,
            date: selectedDate,
            status: targetStatus,
            amount: completionValue?.amount ?? null,
            payload: completionValue?.payload,
          })
          await db.runAsync('DELETE FROM activity_log WHERE id = ?;', [clientLogId])
          await logRepo.upsertFromServer([res.log])
          await outboxRepo.markDone(outboxId)
          setLogs((prev) => prev.map((l) => (l.id === clientLogId ? res.log : l)))
        } catch {
          await outboxRepo.markFailed(outboxId, 'Network request failed during set status')
        }
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
    const mutationId = generateLocalUuid()
    const outboxId = generateLocalUuid()
    try {
      await db.withTransactionAsync(async () => {
        await logRepo.markDeleted(logId)
        await outboxRepo.enqueue(
          outboxId,
          mutationId,
          'activity_log',
          logId,
          'delete_log',
          { id: logId }
        )
      })
      setLogs((prev) => prev.filter((l) => l.id !== logId))
      appEvents.emit('tasks:changed')
      appEvents.emit('calendar:changed')

      try {
        await trackerApi.deleteLog(logId)
        await outboxRepo.markDone(outboxId)
      } catch {
        await outboxRepo.markFailed(outboxId, 'Network request failed during delete log')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete log.')
    }
  }

  // Re-postpone: revert a task that was postponed to today back to its previous day
  const handleRePostpone = async (task: TaskOccurrence) => {
    if (!task.postponedLogId || !task.postponedFromDate) return

    try {
      await trackerApi.unpostponeTask(
        task.templateId,
        task.postponedLogId,
        task.postponedFromDate
      )
      // Refresh to get updated template targetDate and removed log
      await load()
      appEvents.emit('tasks:changed')
      appEvents.emit('activities:changed')
      appEvents.emit('calendar:changed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-postpone task.')
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

      {/* Google Calendar Events Section */}
      <CalendarEventsSection events={calendarEvents} />

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

        {/* Pinned Quick Task Add Bar */}
        <QuickTaskAddBar
          createTemplate={handleCreateQuickTask}
          onTaskCreated={(newT) => {
            setTemplates((prev) => {
              const exists = prev.some((t) => t.id === newT.id)
              return exists ? prev : [...prev, newT]
            })
          }}
          selectedDate={selectedDate}
        />
      </View>

      {/* Secondary Dashboard Widgets */}
      <View style={styles.widgetsSection}>
        <WorkSessionCard date={selectedDate} />
        <LeaveWidgetCard selectedDate={selectedDate} onLeaveChanged={() => void load()} />
        <JournalWidgetCard date={selectedDate} />
        <DailyCodingCard date={selectedDate} />
        <WeightWidgetCard date={selectedDate} />
      </View>

      {/* Task Context Action Modal */}
      <TaskActionModal
        onClose={() => setActionModalTask(null)}
        onDeleteLog={handleDeleteLog}
        onRePostpone={handleRePostpone}
        onSetStatus={handleSetStatus}
        task={actionModalTask}
        visible={actionModalTask !== null}
      />
    </Screen>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
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
    backgroundColor: colors.coralSubtle,
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