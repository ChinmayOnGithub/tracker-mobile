import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { trackerApi, type ActivityLog, type ActivityTemplate } from '@/api/client'
import { Screen } from '@/components/Screen'
import { colors, spacing } from '@/theme/tokens'

function todayYmd() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export default function TodayScreen() {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [templateResult, logResult] = await Promise.all([
        trackerApi.getTemplates(),
        trackerApi.getLogs(todayYmd()),
      ])
      setTemplates(templateResult.templates)
      setLogs(logResult.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Today.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  if (loading) {
    return <Screen><ActivityIndicator color={colors.primary} /></Screen>
  }

  const completed = new Set(
    logs.filter((log) => log.status === 'done').map((log) => log.activityId)
  )

  return (
    <Screen>
      <Text style={styles.title}>Today</Text>
      <Text style={styles.subtitle}>{todayYmd()}</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.list}>
        {templates.map((template) => {
          const isDone = completed.has(template.id)
          return (
            <View key={template.id} style={styles.row}>
              <View style={styles.copy}>
                <Text style={[styles.activity, isDone && styles.done]}>{template.name}</Text>
                <Text style={styles.meta}>{template.category}</Text>
              </View>
              <Text style={[styles.status, isDone && styles.statusDone]}>
                {isDone ? 'Done' : 'Open'}
              </Text>
            </View>
          )
        })}
      </View>

      {!templates.length ? <Text style={styles.meta}>No active activities yet.</Text> : null}

      <Pressable onPress={() => void load()} style={styles.refresh}>
        <Text style={styles.refreshText}>Refresh</Text>
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 32, fontWeight: '800' },
  subtitle: { color: colors.textMuted },
  list: { gap: spacing.sm },
  row: {
    minHeight: 68,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copy: { flex: 1, gap: 4 },
  activity: { color: colors.text, fontSize: 17, fontWeight: '700' },
  done: { textDecorationLine: 'line-through', opacity: 0.6 },
  meta: { color: colors.textMuted },
  status: { color: colors.textMuted, fontWeight: '700' },
  statusDone: { color: colors.success },
  error: { color: '#fca5a5' },
  refresh: { alignItems: 'center', padding: spacing.md },
  refreshText: { color: colors.primary, fontWeight: '700' },
})