import React, { useEffect, useState, useCallback } from 'react'
import { StyleSheet, Text, View, Pressable } from 'react-native'
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

  const loadSession = useCallback(async () => {
    try {
      const res = await trackerApi.getWorkSession(date)
      const current = res.activeSession || res.sessionForDate || null
      setSession(current)
    } catch {
      // Offline fallback: keep previous session
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  // Timer interval for active session
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE' || !session.startedAt) {
      if (session?.durationMinutes) {
        setElapsedSeconds(session.durationMinutes * 60)
      } else {
        setElapsedSeconds(0)
      }
      return
    }

    const computeElapsed = () => {
      const started = new Date(session.startedAt!).getTime()
      const now = Date.now()
      const segSeconds = Math.max(0, Math.floor((now - started) / 1000))
      return (session.durationMinutes || 0) * 60 + segSeconds
    }

    setElapsedSeconds(computeElapsed())
    const interval = setInterval(() => {
      setElapsedSeconds(computeElapsed())
    }, 1000)

    return () => clearInterval(interval)
  }, [session])

  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  const handleStart = async (mode: 'office' | 'wfh') => {
    setActionLoading(true)
    try {
      const res = await trackerApi.startWorkSession(date, mode)
      setSession(res.session)
    } catch {
      // Error handled silently or via state
    } finally {
      setActionLoading(false)
    }
  }

  const handlePause = async () => {
    if (!session) return
    setActionLoading(true)
    try {
      const res = await trackerApi.pauseWorkSession(session.id)
      setSession(res.session)
    } catch {
      // Handled
    } finally {
      setActionLoading(false)
    }
  }

  const handleResume = async () => {
    if (!session) return
    setActionLoading(true)
    try {
      const res = await trackerApi.resumeWorkSession(session.id)
      setSession(res.session)
    } catch {
      // Handled
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinish = async () => {
    if (!session) return
    setActionLoading(true)
    try {
      const res = await trackerApi.finishWorkSession(session.id)
      setSession(res.session)
    } catch {
      // Handled
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

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <TrackerIcon name="work" size="sm" color={colors.primary} />
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

      {/* Timer Display */}
      <View style={styles.timerRow}>
        <Text style={[styles.timerDigits, isRunning && styles.timerDigitsActive]}>
          {isCompleted
            ? `${Math.floor((session?.durationMinutes || 0) / 60)}h ${(session?.durationMinutes || 0) % 60}m`
            : formatTimer(elapsedSeconds)}
        </Text>
        <Text style={styles.timerLabel}>
          {isCompleted
            ? 'Total time logged'
            : isRunning
              ? 'Session in progress'
              : isPaused
                ? 'Session paused'
                : 'Not started'}
        </Text>
      </View>

      {/* Action Controls */}
      <View style={styles.actionsRow}>
        {!session || (!isRunning && !isPaused && !isCompleted) ? (
          <View style={styles.buttonGroup}>
            <Button
              disabled={actionLoading}
              label="Office"
              onPress={() => void handleStart('office')}
              size="sm"
              style={styles.actionBtn}
              variant="primary"
            />
            <Button
              disabled={actionLoading}
              label="WFH"
              onPress={() => void handleStart('wfh')}
              size="sm"
              style={styles.actionBtn}
              variant="outline"
            />
          </View>
        ) : isRunning ? (
          <View style={styles.buttonGroup}>
            <Button
              disabled={actionLoading}
              label="Pause"
              onPress={() => void handlePause()}
              size="sm"
              style={styles.actionBtn}
              variant="outline"
            />
            <Button
              disabled={actionLoading}
              label="Finish"
              onPress={() => void handleFinish()}
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
              onPress={() => void handleResume()}
              size="sm"
              style={styles.actionBtn}
              variant="primary"
            />
            <Button
              disabled={actionLoading}
              label="Finish"
              onPress={() => void handleFinish()}
              size="sm"
              style={styles.actionBtn}
              variant="outline"
            />
          </View>
        ) : (
          <View style={styles.completedRow}>
            <TrackerIcon name="check" size="sm" color={colors.success} />
            <Text style={styles.completedText}>Day's work session finalized</Text>
          </View>
        )}
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
    color: '#ff7557', // Canonical Tracker coral accent
  },
  timerLabel: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
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
})
