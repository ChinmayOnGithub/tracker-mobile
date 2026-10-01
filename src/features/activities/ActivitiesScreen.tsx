import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { trackerApi, type ActivityTemplate } from '@/api/client'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { cacheTemplates, getCachedTemplates } from '@/db/database'
import { colors, spacing, typography } from '@/theme/tokens'

export function ActivitiesScreen() {
  const db = useSQLiteContext()
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const result = await trackerApi.getTemplates()
      setTemplates(result.templates)
      void cacheTemplates(db, result.templates).catch(() => {})
    } catch (err) {
      try {
        const cached = await getCachedTemplates(db)
        if (cached.length > 0) {
          setTemplates(cached)
          setError('Showing cached offline activities.')
        } else {
          setError(err instanceof Error ? err.message : 'Unable to load activities.')
        }
      } catch {
        setError(err instanceof Error ? err.message : 'Unable to load activities.')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [db])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  if (loading && !refreshing) {
    return (
      <Screen>
        <LoadingState message="Loading activities..." />
      </Screen>
    )
  }

  const query = search.trim().toLowerCase()
  const filtered = query
    ? templates.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      )
    : templates

  return (
    <Screen onRefresh={() => void load(true)} refreshing={refreshing}>
      <View style={styles.header}>
        <Text style={styles.title}>Activities</Text>
        <Text style={styles.subtitle}>
          Activity definitions remain server-authoritative.
        </Text>
      </View>

      <Input
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onChangeText={setSearch}
        placeholder="Search activities..."
        value={search}
      />

      {error ? (
        <ErrorView message={error} onRetry={() => void load()} />
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          message={
            query
              ? `No activities matching "${search}".`
              : 'No activities configured yet.'
          }
          title={query ? 'No results' : 'No activities'}
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((template) => (
            <Card key={template.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.name}>{template.name}</Text>
                  <Text style={styles.meta}>
                    {template.category} • {template.recurrenceType}
                  </Text>
                </View>
                <View
                  style={[
                    styles.indicator,
                    {
                      backgroundColor: template.color || colors.primary,
                    },
                  ]}
                />
              </View>
            </Card>
          ))}
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
  subtitle: {
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
  meta: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
})