import { useEffect, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { TrackerIcon } from '@/components/TrackerIcon'
import { trackerApi, type WorkSession } from '@/api/client'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface WorkSessionCardProps {
  date: string
}

export function WorkSessionCard({ date }: WorkSessionCardProps) {
  const [session, setSession] = useState<WorkSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Configuration when starting / logging
  const [loggingType, setLoggingType] = useState<'timer' | 'manual'>('timer')
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office')
  const [inTime, setInTime] = useState<string>('')
  const [manualHours, setManualHours] = useState<string>('8.0')

  useEffect(() => {
    let mounted = true
    trackerApi
      .getWorkSession(date)
      .then((res) => {
        if (mounted) {
          const current = res.activeSession || res.sessionForDate || null
          setSession(current)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [date])

  // Timer interval for active session
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE' || !session.startedAt) {
      return
    }

    const started = new Date(session.startedAt).getTime()
    const computeElapsed = () => {
      const segSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000))
      return (session.durationMinutes || 0) * 60 + segSeconds
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

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start timer')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogManual = async () => {
    const hours = parseFloat(manualHours)
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      setError('Please enter a valid duration between 0.5 and 24 hours')
      return
    }

    setActionLoading(true)
    setError(null)
    try {
      const durationMinutes = Math.round(hours * 60)
      const res = await trackerApi.logManualWorkSession(date, workMode, durationMinutes)
      setSession(res.session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log manual session')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePause = async () => {
    if (!session) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await trackerApi.pauseWorkSession(session.id)
      setSession(res.session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause session')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResume = async () => {
    if (!session) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await trackerApi.resumeWorkSession(session.id)
      setSession(res.session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume session')
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!session) return
    setActionLoading(true)
    setError(null)
    try {
      const res = await trackerApi.finishWorkSession(session.id)
      setSession(res.session)
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
    : (session?.durationMinutes || 0) * 60

  return (
    <Card style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <TrackerIcon name="briefcase" size="sm" color={colors.primary} />
          <Text style={styles.title}>Work Session</Text>
        </View>

        {session ? (
          <View
            style={[
              styles.modeBadge,
              isRunning && styles.modeBadgeActive,
              isCompleted && styles.modeBadgeCompleted,
            ]}
          >
            <Text style={styles.modeText}>
              {session.mode.toUpperCase()} • {session.status}
            </Text>
          </View>
        ) : null}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Timer / Summary Display */}
      <View style={styles.timerRow}>
        <Text style={[styles.timerDigits, isRunning && styles.timerDigitsActive]}>
          {isCompleted
            ? `${Math.floor((session?.durationMinutes || 0) / 60)}h ${(session?.durationMinutes || 0) % 60}m`
            : formatTimer(displaySeconds)}
        </Text>
        <Text style={styles.timerLabel}>
          {isCompleted
            ? 'Total time logged today'
            : isRunning
              ? 'Session in progress'
              : isPaused
                ? 'Session paused'
                : 'Ready to track'}
        </Text>
      </View>

      {/* Controls */}
      {!session || (!isRunning && !isPaused && !isCompleted) ? (
        <View style={styles.setupContainer}>
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
            <Text style={styles.label}>Location:</Text>
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
                <Text style={styles.label}>Hours worked:</Text>
                <TextInput
                  keyboardType="numeric"
                  placeholder="8.0"
                  placeholderTextColor={colors.textMuted}
                  value={manualHours}
                  onChangeText={setManualHours}
                  maxLength={4}
                  style={styles.timeInput}
                />
              </View>
              {/* Presets */}
              <View style={styles.presetRow}>
                {[4, 6, 8, 9].map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => setManualHours(String(h))}
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
      ) : isRunning ? (
        <View style={styles.buttonGroup}>
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
            label="Finish"
            onPress={handleFinish}
            size="sm"
            style={styles.actionBtn}
            variant="primary"
          />
        </View>
      ) : isPaused ? (
        <View style={styles.buttonGroup}>
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
            label="Finish"
            onPress={handleFinish}
            size="sm"
            style={styles.actionBtn}
            variant="outline"
          />
        </View>
      ) : (
        <View style={styles.completedSection}>
          <View style={styles.completedRow}>
            <TrackerIcon name="check" size="sm" color={colors.success} />
            <Text style={styles.completedText}>Work session completed for this day</Text>
          </View>
          <Pressable
            onPress={() => {
              setSession(null)
              setLoggingType('timer')
            }}
            style={styles.logAgainBtn}
          >
            <Text style={styles.logAgainText}>+ Log Additional Work</Text>
          </Pressable>
        </View>
      )}
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
  errorText: {
    color: colors.danger,
    fontSize: typography.xs.fontSize,
    paddingHorizontal: spacing.xs,
  },
  timerRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  timerDigits: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerDigitsActive: {
    color: colors.coral,
  },
  timerLabel: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
  },
  setupContainer: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    paddingTop: spacing.sm,
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
    paddingVertical: 3,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  presetText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  fullBtn: {
    width: '100%',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
  },
  completedSection: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  completedText: {
    fontSize: typography.xs.fontSize,
    color: colors.success,
    fontWeight: '600',
  },
  logAgainBtn: {
    paddingVertical: spacing.xs,
  },
  logAgainText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
})
