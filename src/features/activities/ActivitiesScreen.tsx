import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  trackerApi,
  type ActivityTemplate,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from '@/api/client'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { OutboxRepository, TemplateRepository } from '@/db/repository'
import { withSafeTransaction } from '@/db/transaction'
import { colors, normalizeColor, spacing, typography } from '@/theme/tokens'
import { fastCache } from '@/utils/dataCache'
import { appEvents } from '@/utils/events'
import { ActivityCard } from './components/ActivityCard'
import { ActivityCategoryPills } from './components/ActivityCategoryPills'
import { ActivityFormModal, type ActivityFormData, type ActivityStarterPreset } from './components/ActivityFormModal'
import { useTheme } from '@/theme/ThemeContext'

function generateLocalUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const ACTIVITY_STARTERS: (ActivityStarterPreset & { id: string; description: string })[] = [
  { id: 'water', name: 'Water intake', description: 'Build a hydration habit', category: 'health', icon: 'droplets', color: '#38bdf8' },
  { id: 'fuel', name: 'Fuel refill', description: 'Track fuel expenses', category: 'finance', icon: 'fuel', color: '#f59e0b' },
  { id: 'jogging', name: 'Jogging / Running', description: 'Build a running routine', category: 'fitness', icon: 'footprints', color: '#10b981' },
  { id: 'workout', name: 'Workout', description: 'Track exercise sessions', category: 'fitness', icon: 'dumbbell', color: '#8b5cf6' },
  { id: 'reading', name: 'Reading', description: 'Make time for books', category: 'learning', icon: 'book-open', color: '#6366f1' },
  { id: 'sleep', name: 'Sleep', description: 'Track your sleep routine', category: 'health', icon: 'moon', color: '#8b5cf6' },
  { id: 'meditation', name: 'Meditation', description: 'Mindfulness and calm', category: 'health', icon: 'brain', color: '#10b981' },
  { id: 'study', name: 'Study session', description: 'Protect focused learning time', category: 'learning', icon: 'graduation-cap', color: '#f59e0b' },
]

const PRESET_CATEGORIES = ['all', 'work', 'personal', 'fitness', 'health', 'learning', 'finance']

export function ActivitiesScreen() {
  const db = useSQLiteContext()
  const [templates, setTemplates] = useState<ActivityTemplate[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal State
  const { colors: themeColors } = useTheme()
  const [modalVisible, setModalVisible] = useState(false)
  const [starterPickerVisible, setStarterPickerVisible] = useState(false)
  const [starterData, setStarterData] = useState<ActivityStarterPreset | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<ActivityTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const templateRepo = useMemo(() => new TemplateRepository(db), [db])
  const outboxRepo = useMemo(() => new OutboxRepository(db), [db])

  const load = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true)
      setError(null)

      // Step 1: Memory cache (0ms instant render)
      const memoryTemplates = fastCache.get<ActivityTemplate[]>('templates')
      if (memoryTemplates && memoryTemplates.length > 0) {
        setTemplates(memoryTemplates)
        setLoading(false)
      }

      // Step 2: Instant local SQLite read
      try {
        const cached = await templateRepo.getActiveTemplates()
        if (cached.length > 0) {
          setTemplates(cached)
          fastCache.set('templates', cached)
          setLoading(false)
        }
      } catch {
        // Fall through to server fetch
      }

      // Step 3: If not pull-to-refresh and cache is fresh, skip network
      if (!isPull && fastCache.isFresh('templates')) {
        setLoading(false)
        setRefreshing(false)
        return
      }

      // Step 4: Background reconciliation from server
      try {
        const result = await trackerApi.getTemplates()
        await templateRepo.upsertFromServer(result.templates)
        const fresh = await templateRepo.getActiveTemplates()
        setTemplates(fresh)
        fastCache.set('templates', fresh)
      } catch (err) {
        if (templates.length === 0 && (!memoryTemplates || memoryTemplates.length === 0)) {
          setError(err instanceof Error ? err.message : 'Unable to load activities.')
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [templateRepo, templates.length]
  )

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  // React to cross-tab activity events immediately
  useEffect(() => {
    return appEvents.on('activities:changed', () => {
      void load()
    })
  }, [load])

  const handleSaveActivity = async (data: ActivityFormData) => {
    setSaving(true)
    setModalError(null)

    try {
      if (data.id) {
        // Editing existing template
        const updateInput: UpdateTemplateInput = {
          name: data.name,
          category: data.category,
          recurrenceType: data.recurrenceType,
          color: data.color,
          priority: data.priority,
          icon: data.icon,
          notes: data.notes,
        }
        const res = await trackerApi.updateTemplate(data.id, updateInput)
        await templateRepo.upsertFromServer([res.template])
        setTemplates((prev) =>
          prev.map((t) => (t.id === data.id ? res.template : t))
        )
        fastCache.set('templates', (prevTemplates: ActivityTemplate[] = []) =>
          prevTemplates.map((t) => (t.id === data.id ? res.template : t))
        )
      } else {
        // Creating new template
        const createInput: CreateTemplateInput = {
          name: data.name,
          category: data.category,
          recurrenceType: data.recurrenceType,
          color: normalizeColor(data.color, colors.coral),
          icon: data.icon || 'activity',
          priority: data.priority,
          notes: data.notes,
        }
        const res = await trackerApi.createTemplate(createInput)
        await templateRepo.upsertFromServer([res.template])
        setTemplates((prev) =>
          [...prev, res.template].sort((a, b) => a.name.localeCompare(b.name))
        )
        fastCache.set('templates', (prevTemplates: ActivityTemplate[] = []) =>
          [...prevTemplates, res.template].sort((a, b) => a.name.localeCompare(b.name))
        )
      }
      appEvents.emit('activities:changed')
      appEvents.emit('tasks:changed')
      setModalVisible(false)
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Failed to save activity.'
      )
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
            const mutationId = generateLocalUuid()
            const outboxId = generateLocalUuid()
            try {
              // Optimistic local soft-delete + outbox entry
              await withSafeTransaction(db, async () => {
                await templateRepo.markDeleted(id)
                await outboxRepo.enqueue(
                  outboxId,
                  mutationId,
                  'activity_template',
                  id,
                  'delete_template',
                  { id }
                )
              })
              setTemplates((prev) => prev.filter((t) => t.id !== id))
              fastCache.set('templates', (prevTemplates: ActivityTemplate[] = []) =>
                prevTemplates.filter((t) => t.id !== id)
              )
              appEvents.emit('activities:changed')
              appEvents.emit('tasks:changed')

              try {
                await trackerApi.deleteTemplate(id)
                await outboxRepo.markDone(outboxId)
              } catch {
                await outboxRepo.markFailed(outboxId, 'Network delete failed')
              }
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
              setEditingTemplate(null)
              setStarterData(null)
              setModalError(null)
              setStarterPickerVisible(true)
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
          title="No activities found"
          message={
            query || selectedCategory !== 'all'
              ? 'Try adjusting your search or category filters.'
              : 'Add your first recurring habit or daily routine.'
          }
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((item) => (
            <ActivityCard
              key={item.id}
              onDelete={handleDelete}
              onPress={(t) => {
                setEditingTemplate(t)
                setModalError(null)
                setModalVisible(true)
              }}
              template={item}
            />
          ))}
        </View>
      )}

      {/* Optional starter gallery; selecting a starter only prefills the form. */}
      <Modal visible={starterPickerVisible} transparent animationType="slide" onRequestClose={() => setStarterPickerVisible(false)}>
        <View style={[styles.starterOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <View style={[styles.starterPanel, { backgroundColor: themeColors.surface }]}>
            <View style={styles.starterHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.starterTitle, { color: themeColors.text }]}>Create an activity</Text>
                <Text style={[styles.starterSubtitle, { color: themeColors.textMuted }]}>Choose a starter and customize it, or start from scratch.</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close activity starters" onPress={() => setStarterPickerVisible(false)} style={styles.starterClose}>
                <Text style={{ color: themeColors.text, fontSize: 22 }}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.starterGrid}>
              {ACTIVITY_STARTERS.map((starter) => (
                <Pressable key={starter.id} accessibilityRole="button" onPress={() => {
                  setStarterData(starter)
                  setEditingTemplate(null)
                  setModalError(null)
                  setStarterPickerVisible(false)
                  setModalVisible(true)
                }} style={({ pressed }) => [styles.starterCard, { borderColor: themeColors.border, backgroundColor: pressed ? themeColors.surfaceRaised : themeColors.surface }]}>
                  <View style={[styles.starterIcon, { backgroundColor: starter.color + '20' }]}>
                    <TrackerIcon name={starter.icon} size="sm" color={starter.color} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.starterName, { color: themeColors.text }]}>{starter.name}</Text>
                    <Text style={[styles.starterDescription, { color: themeColors.textMuted }]}>{starter.description}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Button label="Start from scratch" variant="secondary" onPress={() => {
              setStarterData(null)
              setEditingTemplate(null)
              setModalError(null)
              setStarterPickerVisible(false)
              setModalVisible(true)
            }} />
          </View>
        </View>
      </Modal>

      {/* Modal for Create / Edit Activity */}
      <ActivityFormModal
        error={modalError}
        initialData={editingTemplate}
        starterData={starterData}
        onClose={() => {
          setEditingTemplate(null)
          setModalVisible(false)
        }}
        onSubmit={handleSaveActivity}
        saving={saving}
        visible={modalVisible}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  starterOverlay: { flex: 1, justifyContent: 'flex-end' },
  starterPanel: { maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.md, gap: spacing.md },
  starterHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  starterTitle: { fontSize: typography.lg.fontSize, lineHeight: typography.lg.lineHeight, fontWeight: '800' },
  starterSubtitle: { fontSize: typography.sm.fontSize, lineHeight: typography.sm.lineHeight, marginTop: 3 },
  starterClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  starterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.sm },
  starterCard: { width: '48%', minHeight: 108, borderWidth: 1, borderRadius: radius.md, padding: spacing.sm, gap: spacing.sm },
  starterIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  starterName: { fontSize: typography.sm.fontSize, fontWeight: '700' },
  starterDescription: { fontSize: typography.xs.fontSize, lineHeight: typography.xs.lineHeight },
  header: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.xl.fontSize,
    lineHeight: typography.xl.lineHeight,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
})
