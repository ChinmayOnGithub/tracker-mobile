import { useCallback, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  trackerApi,
  type ActivityTemplate,
  type CreateTemplateInput,
} from '@/api/client'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { cacheTemplates, getCachedTemplates } from '@/db/database'
import { colors, spacing, typography } from '@/theme/tokens'
import { ActivityCard } from './components/ActivityCard'
import { ActivityCategoryPills } from './components/ActivityCategoryPills'
import { ActivityFormModal } from './components/ActivityFormModal'

const PRESET_CATEGORIES = ['all', 'work', 'personal', 'fitness', 'health', 'learning']

export function ActivitiesScreen() {
  const db = useSQLiteContext()
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

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

  const handleCreate = async (data: {
    name: string
    category: string
    recurrenceType: CreateTemplateInput['recurrenceType']
    color: string
  }) => {
    setSaving(true)
    setModalError(null)

    try {
      const input: CreateTemplateInput = {
        name: data.name,
        category: data.category,
        recurrenceType: data.recurrenceType,
        color: data.color,
        icon: 'activity',
      }
      await trackerApi.createTemplate(input)
      setModalVisible(false)
      await load()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to create activity.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Activity',
      `Are you sure you want to delete "${name}"? It will be moved to Bin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await trackerApi.deleteTemplate(id)
              setTemplates((prev) => prev.filter((t) => t.id !== id))
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete activity.')
            }
          },
        },
      ]
    )
  }

  if (loading && !refreshing) {
    return (
      <Screen>
        <LoadingState message="Loading activities..." />
      </Screen>
    )
  }

  const query = search.trim().toLowerCase()
  const filtered = templates.filter((t) => {
    const matchesQuery = !query || t.name.toLowerCase().includes(query) || t.category.toLowerCase().includes(query)
    const matchesCategory = selectedCategory === 'all' || t.category.toLowerCase() === selectedCategory.toLowerCase()
    return matchesQuery && matchesCategory
  })

  return (
    <Screen onRefresh={() => void load(true)} refreshing={refreshing}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Activities</Text>
            <Text style={styles.subtitle}>
              Manage recurring habits and core activity templates.
            </Text>
          </View>
          <Button
            label="+ New"
            size="sm"
            onPress={() => {
              setModalError(null)
              setModalVisible(true)
            }}
            accessibilityLabel="Create new activity"
          />
        </View>
      </View>

      {/* Category Pills */}
      <ActivityCategoryPills
        categories={PRESET_CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Search Input */}
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

      {/* Activity List */}
      {filtered.length === 0 ? (
        <EmptyState
          message={
            query
              ? `No activities matching "${search}".`
              : 'No activities configured yet. Tap "+ New" to create one.'
          }
          title={query ? 'No results' : 'No activities'}
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((template) => (
            <ActivityCard
              key={template.id}
              template={template}
              onDelete={handleDelete}
            />
          ))}
        </View>
      )}

      {/* Create Activity Modal */}
      <ActivityFormModal
        visible={modalVisible}
        saving={saving}
        error={modalError}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreate}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 4,
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
})