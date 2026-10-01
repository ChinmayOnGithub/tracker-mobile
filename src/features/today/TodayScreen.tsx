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
import { cacheLogs, cacheTemplates, getCachedLogs, getCachedTemplates } from '@/db/database'
import { colors, spacing, typography } from '@/theme/tokens'
import { formatDisplayDate, todayYmd } from '@/utils/date'
import { getNextActivityStatus } from '@/domain/activity'

export function TodayScreen() {
  const db = useSQLiteContext()
  const currentDate = todayYmd()
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
        trackerApi.getLogs(currentDate),
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
        const cachedL = await getCachedLogs(db, currentDate)
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
  }, [currentDate, db])

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
          date: currentDate,
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

  if (loading && !refreshing) {
    return (
      <Screen>
        <LoadingState message="Loading today's activities..." />
      </Screen>
    )
  }

  const logMap = new Map(logs.map((l) => [l.activityId, l]))

  return (
    <Screen onRefresh={() => void load(true)} refreshing={refreshing}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Text style={styles.date}>{formatDisplayDate(currentDate)}</Text>
      </View>

      {error ? (
        <ErrorView message={error} onRetry={() => void load()} />
      ) : null}

      {templates.length === 0 ? (
        <EmptyState
          actionLabel="Refresh"
          message="No active activities found for today. Add templates in web Tracker to see them here."
          onAction={() => void load()}
          title="No activities yet"
        />
      ) : (
        <View style={styles.list}>
          {templates.map((template) => {
            const log = logMap.get(template.id)
            const status = log ? log.status : 'open'
            const isDone = status === 'done'
            const isToggling = togglingId === template.id

            return (
              <Card
                key={template.id}
                onPress={() => void toggleActivity(template)}
                style={styles.card}
              >
                <View style={styles.row}>
                  <View style={styles.copy}>
                    <Text style={[styles.name, isDone && styles.doneName]}>
                      {template.name}
                    </Text>
                    <Text style={styles.category}>{template.category}</Text>
                  </View>
                  <Pressable
                    disabled={isToggling}
                    onPress={() => void toggleActivity(template)}
                  >
                    <StatusBadge status={status} />
                  </Pressable>
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
  header: {
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.hero.fontSize,
    lineHeight: typography.hero.lineHeight,
    fontWeight: '800',
  },
  date: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
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
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: typography.md.fontSize,
    lineHeight: typography.md.lineHeight,
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