import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { trackerApi, type ActivityTemplate } from '@/api/client'
import { Screen } from '@/components/Screen'
import { colors, spacing } from '@/theme/tokens'

export default function ActivitiesScreen() {
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setTemplates((await trackerApi.getTemplates()).templates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load activities.')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { void load() }, [load]))

  if (loading) {
    return <Screen><ActivityIndicator color={colors.primary} /></Screen>
  }

  return (
    <Screen>
      <Text style={styles.title}>Activities</Text>
      <Text style={styles.subtitle}>
        Activity definitions remain server-authoritative.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {templates.map((template) => (
        <View key={template.id} style={styles.row}>
          <Text style={styles.name}>{template.name}</Text>
          <Text style={styles.meta}>{template.category} · {template.recurrenceType}</Text>
        </View>
      ))}

      {!templates.length ? <Text style={styles.meta}>No active activities.</Text> : null}

      <Pressable onPress={() => void load()} style={styles.refresh}>
        <Text style={styles.refreshText}>Refresh</Text>
      </Pressable>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 32, fontWeight: '800' },
  subtitle: { color: colors.textMuted, lineHeight: 21 },
  row: {
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  name: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.textMuted },
  error: { color: '#fca5a5' },
  refresh: { alignItems: 'center', padding: spacing.md },
  refreshText: { color: colors.primary, fontWeight: '700' },
})