import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { TrackerIcon } from '@/components/TrackerIcon'
import { trackerApi, type WorkSession, type WorkSessionResponse } from '@/api/client'
import {
  calculateSessionHours,
  formatHoursTwoDecimals,
  formatTimer,
  getDayOfMonth,
  getDayShortName,
  getWeekDates,
  isWeekend,
} from '@/domain/work'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { todayYmd } from '@/utils/date'

interface WorkSessionCardProps {
  date: string
  onSelectDate?: (date: string) => void
}

export function WorkSessionCard({ date, onSelectDate }: WorkSessionCardProps) {
  const router = useRouter()
  const today = todayYmd()

  const [session, setSession] = useState<WorkSession | null>(null)
  const [weekData, setWeekData] = useState<WorkSessionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Configuration when starting / logging
  const [loggingType, setLoggingType] = useState<'timer' | 'manual'>('timer')
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office')
  const [inTime, setInTime] = useState<string>('')
  const [manualHours, setManualHours] = useState<string>('8.00')

  // Load session and week data
  const loadData = useCallback(async () => {
    try {
      const res = await trackerApi.getWorkSession(date)
      setWeekData(res)
      const current =
        (res.activeSession?.date === date ? res.activeSession : null) ||
        res.sessionForDate ||
        res.activeSession ||
        null
      setSession(current)
    } catch {
      // Ignore network errors on initial load
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Timer interval for active session
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE' || !session.startedAt) {
      return
    }

    const started = new Date(session.startedAt).getTime()
    const baseSeconds =
      session.durationSeconds && session.durationSeconds > 0
        ? session.durationSeconds
        : (session.durationMinutes || 0) * 60

    const computeElapsed = () => {
      const segSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000))
      return baseSeconds + segSeconds
    }

    const timerId = setTimeout(() => {
      setElapsedSeconds(computeElapsed())
    }, 0)

    const interval = setInterval(() => {
      setElapsedSeconds(computeElapsed())
    }, 1000)

    return () => {
      clearTimeout(timerId)
      clearInterval(interval)
    }
  }, [session])

  // All 7 days of the week (Monday through Sunday)
  const weekDays = useMemo(() => {
    return getWeekDates(date, 'monday')
  }, [date])

  const handleStartTimer = async () => {
    setActionLoading(true)
    setError(null)
    try {
      const res = await trackerApi.startWorkSession(
        date,
        workMode,
        inTime.trim() || undefined
      )
      setSession(res.session)
      setInTime('')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogManual = async () => {
    const hours = parseFloat(manualHours)
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      setError('Please enter a valid duration between 0.25 and 24 hours')
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      const durationMinutes = Math.round(hours * 60)
      const res = await trackerApi.logManualWorkSession(date, workMode, durationMinutes)
      setSession(res.session)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log manual session')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePause = async () => {
    if (!session || session.status !== 'ACTIVE') return
    const now = Date.now()
    const started = session.startedAt ? new Date(session.startedAt).getTime() : now
    const segSeconds = Math.max(0, Math.floor((now - started) / 1000))
    const baseSeconds =
      session.durationSeconds && session.durationSeconds > 0
        ? session.durationSeconds
        : (session.durationMinutes || 0) * 60
    const totalAccumulated = baseSeconds + segSeconds

    // Optimistically freeze timer immediately
    setSession((prev) =>
      prev
        ? {
            ...prev,
            status: 'PAUSED',
            startedAt: null,
            durationSeconds: totalAccumulated,
            durationMinutes: Math.round(totalAccumulated / 60),
          }
        : null
    )
    setElapsedSeconds(totalAccumulated)

    setActionLoading(true)
    setError(null)
    try {
      const res = await trackerApi.pauseWorkSession(session.id)
      setSession(res.session)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause session')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResume = async () => {
    if (!session || session.status !== 'PAUSED') return
    const nowIso = new Date().toISOString()

    setSession((prev) =>
      prev
        ? {
            ...prev,
            status: 'ACTIVE',
            startedAt: nowIso,
          }
        : null
    )

    setActionLoading(true)
    setError(null)
    try {
      const res = await trackerApi.resumeWorkSession(session.id)
      setSession(res.session)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume session')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!session) return
    const now = Date.now()
    let totalSec =
      session.durationSeconds && session.durationSeconds > 0
        ? session.durationSeconds
        : (session.durationMinutes || 0) * 60

    if (session.status === 'ACTIVE' && session.startedAt) {
      const segSeconds = Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 1000))
      totalSec += segSeconds
    }

    setSession((prev) =>
      prev
        ? {
            ...prev,
            status: 'COMPLETED',
            startedAt: null,
            endedAt: new Date().toISOString(),
            durationSeconds: totalSec,
            durationMinutes: Math.round(totalSec / 60),
          }
        : null
    )
    setElapsedSeconds(totalSec)

    setActionLoading(true)
    setError(null)
    try {
      const res = await trackerApi.finishWorkSession(session.id)
      setSession(res.session)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish session')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return null
  }

  const isRunning = session?.status === 'ACTIVE'
  const isPaused = session?.status === 'PAUSED'
  const isCompleted = session?.status === 'COMPLETED'

  const displaySeconds = isRunning
    ? elapsedSeconds
    : session?.durationSeconds && session.durationSeconds > 0
      ? session.durationSeconds
      : (session?.durationMinutes || 0) * 60

  const trackedHours = displaySeconds / 3600
  const weeklyOfficeHours = weekData?.weeklyOfficeHours || 0
  const weeklyGoal = weekData?.weeklyGoal || 40.0
  const completedBarWidth = Math.min(100, (weeklyOfficeHours / weeklyGoal) * 100)
  const isGoalMet = weeklyOfficeHours >= weeklyGoal

  return (
    <Card style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <TrackerIcon name="briefcase" size="sm" color={colors.primary} />
          <Text style={styles.title}>Work Hours Tracker</Text>
        </View>

        <View style={styles.headerActions}>
          {session ? (
            <View
              style={[
                styles.modeBadge,
                isRunning && styles.modeBadgeActive,
                isPaused && styles.modeBadgePaused,
                isCompleted && styles.modeBadgeCompleted,
              ]}
            >
              <Text style={styles.modeText}>
                {session.mode.toUpperCase()} • {session.status}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityLabel="View full work analytics and history"
            onPress={() => router.push('/work')}
            style={styles.analyticsIconBtn}
          >
            <TrackerIcon name="bar-chart-2" size="xs" color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* 7-Day Week Blocks with 2-Decimal Precision */}
      <View style={styles.weekBlocksSection}>
        <View style={styles.weekBlocksHeader}>
          <Text style={styles.sectionSubtitle}>WEEK PRESENCE (MON – SUN)</Text>
          <Text style={styles.sectionMeta}>
            Total: {formatHoursTwoDecimals(weekData?.weeklyTotalHours || 0)}
          </Text>
        </View>

        <View style={styles.weekGrid}>
          {weekDays.map((d) => {
            const isSelected = d === date
            const isCurrentDay = d === today
            const isWknd = isWeekend(d)
            const daySession = weekData?.weekSessions?.find((s) => s.date === d)
            const hours = daySession ? calculateSessionHours(daySession) : 0
            const isCompOff = isWknd && hours > 0

            return (
              <Pressable
                key={d}
                accessibilityLabel={`Day ${d}, worked ${formatHoursTwoDecimals(hours)}`}
                onPress={() => onSelectDate?.(d)}
                style={[
                  styles.dayBlock,
                  isSelected && styles.dayBlockSelected,
                  isCurrentDay && !isSelected && styles.dayBlockToday,
                  isCompOff && styles.dayBlockCompOff,
                ]}
              >
                <Text
                  style={[
                    styles.dayShortName,
                    isWknd && styles.dayShortNameWeekend,
                    isSelected && styles.dayShortNameSelected,
                  ]}
                >
                  {getDayShortName(d)}
                </Text>

                <Text
                  style={[
                    styles.dayNumber,
                    isSelected && styles.dayNumberSelected,
                  ]}
                >
                  {getDayOfMonth(d)}
                </Text>

                {/* Hours worked with exact 2 decimal accuracy */}
                <Text
                  style={[
                    styles.dayHours,
                    hours > 0 && styles.dayHoursWorked,
                    isCompOff && styles.dayHoursCompOff,
                    isSelected && styles.dayHoursSelected,
                  ]}
                >
                  {formatHoursTwoDecimals(hours)}
                </Text>

                {/* Status indicator tag */}
                <View style={styles.statusIndicator}>
                  {isCompOff ? (
                    <Text style={styles.compOffTag}>Comp</Text>
                  ) : daySession?.mode === 'office' ? (
                    <View style={[styles.modeDot, { backgroundColor: colors.success }]} />
                  ) : daySession?.mode === 'wfh' ? (
                    <View style={[styles.modeDot, { backgroundColor: colors.warning }]} />
                  ) : (
                    <Text style={styles.dashText}>-</Text>
                  )}
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Main Timer / Current Day Summary Display */}
      <View style={styles.timerDisplayContainer}>
        {isRunning ? (
          <View style={styles.activeDisplayBox}>
            <View style={styles.activeHeaderRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.activeLabel}>
                ACTIVE SESSION ({session?.mode.toUpperCase()})
              </Text>
              <Text style={styles.inTimeLabel}>
                {session?.startedAt ? `Started at ${new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'In progress'}
              </Text>
            </View>

            <Text style={styles.timerDigitsActive}>
              {formatTimer(displaySeconds)}
            </Text>
            <Text style={styles.decimalHoursActive}>
              ({formatHoursTwoDecimals(trackedHours)} tracked today)
            </Text>

            <View style={styles.buttonRow}>
              <Button
                disabled={actionLoading}
                label="Pause"
                onPress={handlePause}
                size="sm"
                style={styles.actionBtn}
                variant="outline"
              />
              <Button
                disabled={actionLoading}
                label="Finish Session"
                onPress={handleFinish}
                size="sm"
                style={styles.actionBtn}
                variant="primary"
              />
            </View>
          </View>
        ) : isPaused ? (
          <View style={styles.pausedDisplayBox}>
            <View style={styles.pausedHeaderRow}>
              <TrackerIcon name="clock" size="xs" color={colors.warning} />
              <Text style={styles.pausedLabel}>
                SESSION PAUSED ({session?.mode.toUpperCase()})
              </Text>
            </View>

            <Text style={styles.timerDigitsPaused}>
              {formatTimer(displaySeconds)}
            </Text>
            <Text style={styles.pausedSubtext}>
              Accumulated time preserved ({formatHoursTwoDecimals(trackedHours)})
            </Text>

            <View style={styles.buttonRow}>
              <Button
                disabled={actionLoading}
                label="Resume"
                onPress={handleResume}
                size="sm"
                style={styles.actionBtn}
                variant="primary"
              />
              <Button
                disabled={actionLoading}
                label="Finish Day"
                onPress={handleFinish}
                size="sm"
                style={styles.actionBtn}
                variant="outline"
              />
            </View>
          </View>
        ) : isCompleted ? (
          <View style={styles.completedDisplayBox}>
            <View style={styles.completedHeaderRow}>
              <TrackerIcon name="check" size="xs" color={colors.success} />
              <Text style={styles.completedLabel}>
                COMPLETED DAY ({session?.mode.toUpperCase()})
              </Text>
            </View>

            <Text style={styles.completedHoursDigits}>
              {formatHoursTwoDecimals(trackedHours)}
            </Text>

            <Text style={styles.completedDetails}>
              Recorded for {date} • {session?.loggingMode === 'manual' ? 'Manual entry' : 'Timer tracked'}
            </Text>
          </View>
        ) : (
          <View style={styles.idleDisplayBox}>
            <Text style={styles.idleDigits}>00:00:00</Text>
            <Text style={styles.idleLabel}>Ready to track work on {date}</Text>
          </View>
        )}
      </View>

      {/* Detailed Controls Visible By Default (when idle or completed) */}
      {(!session || !isRunning && !isPaused) && (
        <View style={styles.setupContainer}>
          <Text style={styles.controlsHeader}>
            {isCompleted ? 'Log Additional Session / Hours' : 'Start or Log Work'}
          </Text>

          {/* Mode Switch: Timer vs Manual */}
          <View style={styles.segmentedControl}>
            <Pressable
              onPress={() => setLoggingType('timer')}
              style={[
                styles.segmentTab,
                loggingType === 'timer' && styles.segmentTabActive,
              ]}
            >
              <TrackerIcon
                name="clock"
                size={12}
                color={loggingType === 'timer' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  loggingType === 'timer' && styles.segmentTextActive,
                ]}
              >
                Live Timer
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLoggingType('manual')}
              style={[
                styles.segmentTab,
                loggingType === 'manual' && styles.segmentTabActive,
              ]}
            >
              <TrackerIcon
                name="pen-tool"
                size={12}
                color={loggingType === 'manual' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.segmentText,
                  loggingType === 'manual' && styles.segmentTextActive,
                ]}
              >
                Manual Log
              </Text>
            </Pressable>
          </View>

          {/* Location Toggle: Office vs WFH */}
          <View style={styles.locationRow}>
            <Text style={styles.label}>Work Location:</Text>
            <View style={styles.locationPills}>
              <Pressable
                onPress={() => setWorkMode('office')}
                style={[
                  styles.locationPill,
                  workMode === 'office' && styles.locationPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.locationPillText,
                    workMode === 'office' && styles.locationPillTextActive,
                  ]}
                >
                  Office
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setWorkMode('wfh')}
                style={[
                  styles.locationPill,
                  workMode === 'wfh' && styles.locationPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.locationPillText,
                    workMode === 'wfh' && styles.locationPillTextActive,
                  ]}
                >
                  WFH
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Controls body */}
          {loggingType === 'timer' ? (
            <View style={styles.timerInputs}>
              <View style={styles.inputRow}>
                <Text style={styles.label}>Start Time (optional):</Text>
                <TextInput
                  placeholder="HH:mm (e.g. 09:30)"
                  placeholderTextColor={colors.textMuted}
                  value={inTime}
                  onChangeText={setInTime}
                  maxLength={5}
                  style={styles.timeInput}
                />
              </View>
              <Button
                disabled={actionLoading}
                label={actionLoading ? 'Starting...' : `Start ${workMode.toUpperCase()} Timer`}
                onPress={handleStartTimer}
                size="sm"
                variant="primary"
                style={styles.fullBtn}
              />
            </View>
          ) : (
            <View style={styles.manualInputs}>
              <View style={styles.inputRow}>
                <Text style={styles.label}>Hours worked (2 decimal):</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="8.00"
                  placeholderTextColor={colors.textMuted}
                  value={manualHours}
                  onChangeText={setManualHours}
                  maxLength={5}
                  style={styles.timeInput}
                />
              </View>
              {/* Presets */}
              <View style={styles.presetRow}>
                {['4.00', '6.00', '8.00', '9.00'].map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => setManualHours(h)}
                    style={styles.presetChip}
                  >
                    <Text style={styles.presetText}>{h}h</Text>
                  </Pressable>
                ))}
              </View>
              <Button
                disabled={actionLoading}
                label={actionLoading ? 'Logging...' : `Log ${manualHours}h (${workMode.toUpperCase()})`}
                onPress={handleLogManual}
                size="sm"
                variant="primary"
                style={styles.fullBtn}
              />
            </View>
          )}
        </View>
      )}

      {/* Weekly Goal Progress Bar */}
      <View style={styles.weeklyProgressContainer}>
        <View style={styles.weeklyHeader}>
          <Text style={styles.weeklyLabel}>Weekly Office Presence</Text>
          <Text style={styles.weeklyValue}>
            {formatHoursTwoDecimals(weeklyOfficeHours)} / {formatHoursTwoDecimals(weeklyGoal)}
          </Text>
        </View>

        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${completedBarWidth}%` },
            ]}
          />
        </View>

        <View style={styles.weeklyFooter}>
          <Text style={styles.weeklyStatusText}>
            {isGoalMet
              ? '🎉 Weekly Office Goal Achieved!'
              : `${formatHoursTwoDecimals(Math.max(0, weeklyGoal - weeklyOfficeHours))} remaining`}
          </Text>

          <Pressable
            accessibilityLabel="Open Work Tracker dedicated screen"
            onPress={() => router.push('/work')}
            style={styles.viewAnalyticsLink}
          >
            <Text style={styles.viewAnalyticsText}>Full Analytics & History</Text>
            <TrackerIcon name="arrow-right" size={10} color={colors.primary} />
          </Pressable>
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  title: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: '700',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  modeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
  },
  modeBadgeActive: {
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary,
  },
  modeBadgePaused: {
    backgroundColor: colors.warningSubtle,
    borderColor: colors.warning,
  },
  modeBadgeCompleted: {
    backgroundColor: colors.successSubtle,
    borderColor: colors.success,
  },
  modeText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  analyticsIconBtn: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  weekBlocksSection: {
    gap: spacing.xs,
  },
  weekBlocksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  sectionMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  weekGrid: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'space-between',
  },
  dayBlock: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    minHeight: 70,
    justifyContent: 'space-between',
  },
  dayBlockSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  dayBlockToday: {
    borderColor: colors.textMuted,
  },
  dayBlockCompOff: {
    borderColor: colors.sky,
    backgroundColor: colors.skySubtle,
  },
  dayShortName: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  dayShortNameWeekend: {
    color: colors.sky,
  },
  dayShortNameSelected: {
    color: colors.primary,
  },
  dayNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  dayNumberSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  dayHours: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  dayHoursWorked: {
    color: colors.text,
    fontWeight: '800',
  },
  dayHoursCompOff: {
    color: colors.sky,
    fontWeight: '800',
  },
  dayHoursSelected: {
    color: colors.primary,
  },
  statusIndicator: {
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compOffTag: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.sky,
    textTransform: 'uppercase',
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dashText: {
    fontSize: 8,
    color: colors.textMuted,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.xs.fontSize,
    paddingHorizontal: spacing.xs,
  },
  timerDisplayContainer: {
    paddingVertical: spacing.xs,
  },
  activeDisplayBox: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  inTimeLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  timerDigitsActive: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  decimalHoursActive: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  pausedDisplayBox: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  pausedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pausedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.warning,
    letterSpacing: 0.5,
  },
  timerDigitsPaused: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.warning,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  pausedSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  completedDisplayBox: {
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.successSubtle,
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: 4,
  },
  completedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  completedHoursDigits: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.success,
    fontVariant: ['tabular-nums'],
  },
  completedDetails: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  idleDisplayBox: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 2,
  },
  idleDigits: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  idleLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
  setupContainer: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    paddingTop: spacing.sm,
  },
  controlsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: 2,
    gap: 2,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: radius.sm - 2,
    gap: 6,
  },
  segmentTabActive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    color: colors.textMuted,
  },
  locationPills: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: 2,
    gap: 2,
  },
  locationPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm - 2,
  },
  locationPillActive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  locationPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  locationPillTextActive: {
    color: colors.text,
  },
  timerInputs: {
    gap: spacing.sm,
  },
  manualInputs: {
    gap: spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  timeInput: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: typography.sm.fontSize,
    color: colors.text,
    width: 130,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'flex-end',
  },
  presetChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  presetText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  fullBtn: {
    width: '100%',
  },
  weeklyProgressContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    paddingTop: spacing.sm,
    gap: 6,
  },
  weeklyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weeklyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  weeklyValue: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  weeklyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weeklyStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  viewAnalyticsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAnalyticsText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
})
