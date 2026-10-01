import { useCallback, useState } from 'react'
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  trackerApi,
  type ActivityTemplate,
  type CreateTemplateInput,
} from '@/api/client'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { cacheTemplates, getCachedTemplates } from '@/db/database'
import { colors, spacing, typography, radius } from '@/theme/tokens'

const PRESET_CATEGORIES = ['all', 'work', 'personal', 'fitness', 'health', 'learning']
const PALETTE_COLORS = ['#ff7557', '#10b981', '#6366f1', '#8b5cf6', '#f59e0b', '#38bdf8', '#ec4899']
const RECURRENCE_OPTIONS: Array<CreateTemplateInput['recurrenceType']> = ['daily', 'weekly', 'monthly', 'custom']

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
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('work')
  const [formRecurrence, setFormRecurrence] = useState<CreateTemplateInput['recurrenceType']>('daily')
  const [formColor, setFormColor] = useState(PALETTE_COLORS[0])
  const [formError, setFormError] = useState<string | null>(null)

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

  const openCreateModal = () => {
    setFormName('')
    setFormCategory('work')
    setFormRecurrence('daily')
    setFormColor(PALETTE_COLORS[0])
    setFormError(null)
    setModalVisible(true)
  }

  const handleCreate = async () => {
    const trimmed = formName.trim()
    if (!trimmed) {
      setFormError('Activity name is required.')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      const input: CreateTemplateInput = {
        name: trimmed,
        category: formCategory,
        recurrenceType: formRecurrence,
        color: formColor,
        icon: 'activity',
      }
      await trackerApi.createTemplate(input)
      setModalVisible(false)
      await load()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create activity.')
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
            onPress={openCreateModal}
            accessibilityLabel="Create new activity"
          />
        </View>
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {PRESET_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryPill,
                isSelected && styles.categoryPillActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${cat}`}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  isSelected && styles.categoryPillTextActive,
                ]}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

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
            <Card key={template.id} style={styles.card}>
              <View style={styles.cardRow}>
                <View
                  style={[
                    styles.indicator,
                    {
                      backgroundColor: template.color || colors.primary,
                    },
                  ]}
                />
                <View style={styles.copy}>
                  <Text style={styles.name}>{template.name}</Text>
                  <Text style={styles.meta}>
                    {template.category.toUpperCase()} • {template.recurrenceType.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(template.id, template.name)}
                  style={styles.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${template.name}`}
                >
                  <TrackerIcon name="trash" size="xs" color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Create Activity Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Activity Template</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <TrackerIcon name="x" size="sm" color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.label}>Activity Name</Text>
              <Input
                placeholder="e.g. Morning Workout"
                value={formName}
                onChangeText={setFormName}
                autoFocus
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.optionRow}>
                {PRESET_CATEGORIES.filter((c) => c !== 'all').map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setFormCategory(cat)}
                    style={[
                      styles.optionChip,
                      formCategory === cat && styles.optionChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formCategory === cat && styles.optionChipTextActive,
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Recurrence</Text>
              <View style={styles.optionRow}>
                {RECURRENCE_OPTIONS.map((rec) => (
                  <TouchableOpacity
                    key={rec}
                    onPress={() => setFormRecurrence(rec)}
                    style={[
                      styles.optionChip,
                      formRecurrence === rec && styles.optionChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formRecurrence === rec && styles.optionChipTextActive,
                      ]}
                    >
                      {rec.charAt(0).toUpperCase() + rec.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Accent Color</Text>
              <View style={styles.colorPalette}>
                {PALETTE_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setFormColor(c)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      formColor === c && styles.colorCircleSelected,
                    ]}
                  />
                ))}
              </View>

              {formError ? (
                <Text style={styles.formErrorText}>{formError}</Text>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setModalVisible(false)}
                disabled={saving}
              />
              <Button
                label={saving ? 'Saving...' : 'Create Activity'}
                onPress={handleCreate}
                disabled={saving}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  categoryScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: '#ff7557',
    borderColor: '#ff7557',
  },
  categoryPillText: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: typography.md.fontSize,
    lineHeight: typography.md.lineHeight,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.lg.fontSize,
    fontWeight: '700',
  },
  modalBody: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  optionChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipActive: {
    backgroundColor: '#ff7557',
    borderColor: '#ff7557',
  },
  optionChipText: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  colorPalette: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  formErrorText: {
    color: colors.danger,
    fontSize: typography.xs.fontSize,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
})