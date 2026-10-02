import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  trackerApi,
  type CalendarDayDTO,
  type CalendarMonthSummaryDTO,
  type CalendarWeekDTO,
} from '@/api/client'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { CalendarRepository, type LocalCalendarEvent } from '@/db/repository'
import { radius, spacing, typography } from '@/theme/tokens'
import { useTheme } from '@/theme/ThemeContext'
import { addDays, formatDisplayDate, todayYmd } from '@/utils/date'

type CalendarViewMode = 'month' | 'week' | 'day'

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarScreen() {
  const { colors } = useTheme()
  const db = useSQLiteContext()
  const calendarRepo = useMemo(() => new CalendarRepository(db), [db])

  const today = todayYmd()
  const [selectedDate, setSelectedDate] = useState(today)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')

  // Month state
  const [monthSummaries, setMonthSummaries] = useState<CalendarMonthSummaryDTO[]>([])
  // Week state
  const [weekData, setWeekData] = useState<CalendarWeekDTO | null>(null)
  // Day state
  const [dayData, setDayData] = useState<CalendarDayDTO | null>(null)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null)

  // Current year and month from selectedDate
  const [currentYear, currentMonth] = selectedDate.split('-').map(Number)

  // Calculate start of week (Sunday)
  function getStartOfWeek(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d))
    const dayOfWeek = date.getUTCDay()
    date.setUTCDate(date.getUTCDate() - dayOfWeek)
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const loadData = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      if (viewMode === 'month') {
        const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
        const res = await trackerApi.getCalendarMonth(monthStr)
        setMonthSummaries(res.summaries || [])
      } else if (viewMode === 'week') {
        const startOfWeek = getStartOfWeek(selectedDate)
        const res = await trackerApi.getCalendarWeek(startOfWeek)
        setWeekData(res.week)

        // Cache events to SQLite in background
        const now = new Date().toISOString()
        const eventsToCache: LocalCalendarEvent[] = []
        for (const day of res.week.days) {
          for (const ev of day.events) {
            eventsToCache.push({
              id: ev.id,
              googleEventId: ev.id,
              calendarId: 'primary',
              title: ev.title,
              description: null,
              location: null,
              startDate: ev.start,
              endDate: ev.end,
              allDay: ev.allDay,
              color: ev.color,
              status: ev.status ?? 'confirmed',
              trackerArtifactId: ev.trackerArtifactId,
              trackerArtifactType: ev.trackerArtifactType,
              isDeleted: false,
              syncedAt: now,
              createdAt: now,
              updatedAt: now,
            })
          }
        }
        void calendarRepo.upsertEvents(eventsToCache).catch(() => {})
      } else {
        const res = await trackerApi.getCalendarDay(selectedDate)
        setDayData(res.day)

        // Cache events to SQLite in background
        const now = new Date().toISOString()
        const eventsToCache: LocalCalendarEvent[] = res.day.events.map((ev) => ({
          id: ev.id,
          googleEventId: ev.id,
          calendarId: 'primary',
          title: ev.title,
          description: ev.description,
          location: null,
          startDate: ev.start,
          endDate: ev.end,
          allDay: ev.allDay,
          color: ev.color,
          status: ev.status,
          trackerArtifactId: ev.trackerArtifactId,
          trackerArtifactType: ev.trackerArtifactType,
          isDeleted: false,
          syncedAt: now,
          createdAt: now,
          updatedAt: now,
        }))
        void calendarRepo.upsertEvents(eventsToCache).catch(() => {})
      }
    } catch (err) {
      // Fallback to SQLite cached events on network error
      try {
        if (viewMode === 'day') {
          const cached = await calendarRepo.getByDate(selectedDate)
          if (cached.length > 0) {
            setDayData({
              date: selectedDate,
              events: cached.map((e) => ({
                id: e.id,
                title: e.title,
                start: e.startDate,
                end: e.endDate,
                allDay: e.allDay,
                color: e.color,
                type: 'MEETING',
                trackerArtifactId: e.trackerArtifactId,
                trackerArtifactType: e.trackerArtifactType,
                status: e.status,
                description: e.description,
              })),
              tasks: [],
              workedHours: 0,
              workStatus: 'cleared',
              workDetails: null,
              journalEntry: null,
              weight: null,
              habits: [],
              isLeave: false,
              leaveDetails: null,
            })
            setError('Showing cached offline calendar.')
            return
          }
        }
        setError(err instanceof Error ? err.message : 'Unable to load calendar data.')
      } catch {
        setError(err instanceof Error ? err.message : 'Unable to load calendar data.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [viewMode, selectedDate, currentYear, currentMonth, calendarRepo])

  useFocusEffect(
    useCallback(() => {
      void loadData()
    }, [loadData])
  )

  async function handleGoogleSync() {
    setSyncing(true)
    setError(null)
    setSyncSuccess(null)
    try {
      await trackerApi.syncCalendar()
      setSyncSuccess('Google Calendar synchronized successfully.')
      void loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calendar synchronization failed.')
    } finally {
      setSyncing(false)
    }
  }

  // Navigation handlers
  function handlePrev() {
    if (viewMode === 'month') {
      const prevDate = new Date(Date.UTC(currentYear, currentMonth - 2, 1))
      const y = prevDate.getUTCFullYear()
      const m = String(prevDate.getUTCMonth() + 1).padStart(2, '0')
      setSelectedDate(`${y}-${m}-01`)
    } else if (viewMode === 'week') {
      setSelectedDate((d) => addDays(d, -7))
    } else {
      setSelectedDate((d) => addDays(d, -1))
    }
  }

  function handleNext() {
    if (viewMode === 'month') {
      const nextDate = new Date(Date.UTC(currentYear, currentMonth, 1))
      const y = nextDate.getUTCFullYear()
      const m = String(nextDate.getUTCMonth() + 1).padStart(2, '0')
      setSelectedDate(`${y}-${m}-01`)
    } else if (viewMode === 'week') {
      setSelectedDate((d) => addDays(d, 7))
    } else {
      setSelectedDate((d) => addDays(d, 1))
    }
  }

  function handleGoToday() {
    setSelectedDate(today)
  }

  // Build Month Grid Cells
  function renderMonthGrid() {
    const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).getUTCDay()
    const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate()

    const summaryMap = new Map(monthSummaries.map((s) => [s.date, s]))
    const cells = []

    // Padding empty cells before 1st of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(<View key={`pad-${i}`} style={styles.gridCellEmpty} />)
    }

    // Actual day cells
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      const isSelected = dateStr === selectedDate
      const isCurrentDay = dateStr === today
      const summary = summaryMap.get(dateStr)

      const hasTasks = summary && summary.taskCount > 0
      const hasEvents = summary && summary.eventCount > 0
      const hasWork = summary && summary.workedHours > 0

      cells.push(
        <Pressable
          key={dateStr}
          accessibilityRole="button"
          onPress={() => {
            setSelectedDate(dateStr)
            setViewMode('day')
          }}
          style={[
            styles.gridCell,
            isSelected && styles.gridCellSelected,
            isCurrentDay && styles.gridCellToday,
          ]}
        >
          <Text
            style={[
              styles.cellDayText,
              isCurrentDay && styles.cellDayTextToday,
              isSelected && styles.cellDayTextSelected,
            ]}
          >
            {dayNum}
          </Text>

          {/* Indicators */}
          <View style={styles.cellDotsRow}>
            {hasTasks && <View style={styles.taskDot} />}
            {hasEvents && <View style={styles.eventDot} />}
            {hasWork && <View style={styles.workDot} />}
          </View>
        </Pressable>
      )
    }

    return (
      <Card style={styles.monthCard}>
        {/* Days Header */}
        <View style={styles.weekDaysHeader}>
          {WEEK_DAYS.map((wd) => (
            <Text key={wd} style={styles.weekDayLabel}>
              {wd}
            </Text>
          ))}
        </View>

        {/* 7-column Grid */}
        <View style={styles.grid}>{cells}</View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={styles.taskDot} />
            <Text style={styles.legendText}>Tasks</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.eventDot} />
            <Text style={styles.legendText}>Meetings</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.workDot} />
            <Text style={styles.legendText}>Work Log</Text>
          </View>
        </View>
      </Card>
    )
  }

  // Render Week View
  function renderWeekView() {
    if (!weekData || !weekData.days) {
      return (
        <EmptyState
          icon={<TrackerIcon name="calendar" size="lg" color={colors.textMuted} />}
          title="No week data"
          message="No schedule available for this week."
        />
      )
    }

    return (
      <View style={styles.weekList}>
        {weekData.days.map((day) => {
          const isDayToday = day.date === today
          const isSelected = day.date === selectedDate

          return (
            <Pressable
              key={day.date}
              accessibilityRole="button"
              onPress={() => {
                setSelectedDate(day.date)
                setViewMode('day')
              }}
            >
              <Card
                style={[
                  styles.weekDayCard,
                  isSelected && styles.weekDayCardSelected,
                ]}
              >
                <View style={styles.weekDayHeader}>
                  <View style={styles.weekDayTitleRow}>
                    <Text
                      style={[
                        styles.weekDayDateText,
                        isDayToday && styles.weekDayTodayText,
                      ]}
                    >
                      {formatDisplayDate(day.date)}
                    </Text>
                    {isDayToday && (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>Today</Text>
                      </View>
                    )}
                  </View>

                  {day.workedHours > 0 && (
                    <Text style={styles.workedHoursBadge}>
                      {day.workedHours.toFixed(1)}h worked
                    </Text>
                  )}
                </View>

                {day.events.length === 0 ? (
                  <Text style={styles.noEventsText}>No events or tasks</Text>
                ) : (
                  <View style={styles.eventsList}>
                    {day.events.map((evt) => (
                      <View key={evt.id} style={styles.eventRow}>
                        <View
                          style={[
                            styles.eventBar,
                            {
                              backgroundColor:
                                evt.type === 'MEETING'
                                  ? colors.primary
                                  : evt.status === 'done'
                                    ? colors.success
                                    : colors.coral,
                            },
                          ]}
                        />
                        <View style={styles.eventInfo}>
                          <Text numberOfLines={1} style={styles.eventTitle}>
                            {evt.title}
                          </Text>
                          <Text style={styles.eventTime}>
                            {evt.allDay
                              ? 'All day'
                              : `${new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </Pressable>
          )
        })}
      </View>
    )
  }

  // Render Day View
  function renderDayView() {
    if (!dayData) {
      return (
        <EmptyState
          icon={<TrackerIcon name="calendar" size="lg" color={colors.textMuted} />}
          title="No day data"
          message="No schedule found for this date."
        />
      )
    }

    const { events, tasks, workedHours, isLeave } = dayData
    const hasItems = events.length > 0 || tasks.length > 0

    return (
      <View style={styles.dayContainer}>
        {/* Day Summary Card */}
        <Card style={styles.daySummaryCard}>
          <View style={styles.daySummaryRow}>
            <View>
              <Text style={styles.daySummaryDate}>{formatDisplayDate(selectedDate)}</Text>
              <Text style={styles.daySummarySubtitle}>
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} • {events.length} {events.length === 1 ? 'meeting' : 'meetings'}
              </Text>
            </View>

            {workedHours > 0 ? (
              <View style={styles.workPill}>
                <TrackerIcon name="clock" size="xs" color={colors.coral} />
                <Text style={styles.workPillText}>{workedHours.toFixed(1)} hrs</Text>
              </View>
            ) : isLeave ? (
              <View style={styles.leavePill}>
                <Text style={styles.leavePillText}>On Leave</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {!hasItems ? (
          <EmptyState
            icon={<TrackerIcon name="activity" size="lg" color={colors.textMuted} />}
            title="Clear day"
            message="No tasks or meetings scheduled for this date."
          />
        ) : null}

        {/* Tasks Section */}
        {tasks.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Tracker Tasks</Text>
            <View style={styles.itemsList}>
              {tasks.map((task) => (
                <View key={task.id} style={styles.itemRow}>
                  <View
                    style={[
                      styles.statusDot,
                      task.status === 'done' && styles.statusDotDone,
                    ]}
                  />
                  <Text
                    style={[
                      styles.itemTitle,
                      task.status === 'done' && styles.itemTitleDone,
                    ]}
                  >
                    {task.title}
                  </Text>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>{task.priority}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Google Calendar Events Section */}
        {events.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionHeading}>Calendar Events</Text>
            <View style={styles.itemsList}>
              {events.map((evt) => (
                <View key={evt.id} style={styles.eventItemCard}>
                  <View style={styles.eventItemHeader}>
                    <Text style={styles.eventItemTitle}>{evt.title}</Text>
                    <View style={styles.gCalBadge}>
                      <Text style={styles.gCalBadgeText}>Google</Text>
                    </View>
                  </View>
                  <Text style={styles.eventItemTime}>
                    {evt.allDay
                      ? 'All day event'
                      : `${new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                  </Text>
                  {evt.description ? (
                    <Text numberOfLines={2} style={styles.eventItemDesc}>
                      {evt.description}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    )
  }

  const monthLabel = new Date(Date.UTC(currentYear, currentMonth - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Screen onRefresh={() => void loadData(true)} refreshing={refreshing}>
      {/* Top Header & Sync Bar */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sync Google Calendar"
            disabled={syncing}
            hitSlop={8}
            onPress={() => void handleGoogleSync()}
            style={styles.syncBtn}
          >
            {syncing ? (
              <ActivityIndicator size="small" color={colors.coral} />
            ) : (
              <TrackerIcon name="refresh" size="sm" color={colors.coral} />
            )}
            <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync'}</Text>
          </Pressable>
        </View>

        {/* View Mode Segmented Switcher */}
        <View style={styles.modeTabs}>
          {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => {
            const active = viewMode === mode
            return (
              <Pressable
                key={mode}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setViewMode(mode)}
                style={[styles.modeTab, active && styles.modeTabActive]}
              >
                <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {/* Period Navigation */}
        <View style={styles.navBar}>
          <Pressable
            accessibilityLabel="Previous period"
            hitSlop={8}
            onPress={handlePrev}
            style={styles.navArrow}
          >
            <TrackerIcon name="chevron-left" size="sm" color={colors.textMuted} />
          </Pressable>

          <View style={styles.navCenter}>
            <Text style={styles.navCenterText}>
              {viewMode === 'month'
                ? monthLabel
                : viewMode === 'week'
                  ? `Week of ${formatDisplayDate(getStartOfWeek(selectedDate))}`
                  : formatDisplayDate(selectedDate)}
            </Text>
            {selectedDate !== today ? (
              <Pressable hitSlop={8} onPress={handleGoToday}>
                <Text style={styles.todayPill}>Today</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityLabel="Next period"
            hitSlop={8}
            onPress={handleNext}
            style={styles.navArrow}
          >
            <TrackerIcon name="chevron-right" size="sm" color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {error ? <ErrorView message={error} /> : null}

      {syncSuccess ? (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{syncSuccess}</Text>
        </View>
      ) : null}

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <LoadingState message="Loading calendar..." />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {viewMode === 'month' && renderMonthGrid()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </ScrollView>
      )}
    </Screen>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  monthLabel: {
    fontSize: typography.xl.fontSize,
    lineHeight: typography.xl.lineHeight,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
  },
  syncBtnText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    color: colors.coral,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 3,
  },
  modeTab: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  modeTabActive: {
    backgroundColor: colors.surfaceRaised,
  },
  modeTabText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modeTabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
  },
  navArrow: {
    padding: spacing.xs,
  },
  navCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navCenterText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  todayPill: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.coral,
    backgroundColor: colors.coralSubtle,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    textTransform: 'uppercase',
  },
  successBanner: {
    backgroundColor: colors.successSubtle,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: typography.xs.fontSize,
    color: colors.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  monthCard: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    gap: 3,
  },
  gridCellEmpty: {
    width: '14.28%',
    height: 48,
  },
  gridCellSelected: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.coral,
    borderWidth: 1,
  },
  gridCellToday: {
    backgroundColor: colors.coralSubtle,
  },
  cellDayText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '500',
    color: colors.text,
  },
  cellDayTextToday: {
    color: colors.coral,
    fontWeight: '800',
  },
  cellDayTextSelected: {
    fontWeight: '800',
  },
  cellDotsRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.coral,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  workDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.success,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  weekList: {
    gap: spacing.sm,
  },
  weekDayCard: {
    gap: spacing.sm,
  },
  weekDayCardSelected: {
    borderColor: colors.coral,
  },
  weekDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  weekDayTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  weekDayDateText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  weekDayTodayText: {
    color: colors.coral,
  },
  todayBadge: {
    backgroundColor: colors.coralSubtle,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.coral,
    textTransform: 'uppercase',
  },
  workedHoursBadge: {
    fontSize: typography.xs.fontSize,
    color: colors.success,
    fontWeight: '600',
  },
  noEventsText: {
    fontSize: typography.xs.fontSize,
    color: colors.textSubtle,
    fontStyle: 'italic',
  },
  eventsList: {
    gap: spacing.xs,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventBar: {
    width: 3,
    height: 24,
    borderRadius: 1.5,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  eventTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  dayContainer: {
    gap: spacing.md,
  },
  daySummaryCard: {
    padding: spacing.md,
  },
  daySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  daySummaryDate: {
    fontSize: typography.md.fontSize,
    fontWeight: '800',
    color: colors.text,
  },
  daySummarySubtitle: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    marginTop: 2,
  },
  workPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.coralSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  workPillText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '700',
    color: colors.coral,
  },
  leavePill: {
    backgroundColor: colors.warningSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  leavePillText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '700',
    color: colors.warning,
  },
  sectionBlock: {
    gap: spacing.xs,
  },
  sectionHeading: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: 2,
  },
  itemsList: {
    gap: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.border,
  },
  statusDotDone: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  itemTitle: {
    flex: 1,
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  priorityBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  eventItemCard: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: 4,
  },
  eventItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventItemTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  gCalBadge: {
    backgroundColor: colors.primarySubtle,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  gCalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  eventItemTime: {
    fontSize: typography.xs.fontSize,
    color: colors.primary,
    fontWeight: '600',
  },
  eventItemDesc: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
  },
})