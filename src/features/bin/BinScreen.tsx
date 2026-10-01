import { useCallback, useState } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { trackerApi, type BinItem } from '@/api/client'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { TrackerIcon, type TrackerIconName } from '@/components/TrackerIcon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

const FILTER_TYPES = ['all', 'journal', 'note', 'activity_template', 'weight'] as const

function getEntityIcon(type: BinItem['entityType']): TrackerIconName {
  switch (type) {
    case 'journal':
      return 'journal'
    case 'note':
      return 'notes'
    case 'activity_template':
      return 'activity'
    case 'weight':
      return 'weight'
    default:
      return 'trash'
  }
}

function getEntityColor(type: BinItem['entityType']): string {
  switch (type) {
    case 'journal':
      return colors.coral
    case 'note':
      return colors.sky
    case 'activity_template':
      return colors.emerald
    case 'weight':
      return colors.purple
    default:
      return colors.textMuted
  }
}

export function BinScreen() {
  const [items, setItems] = useState<BinItem[]>([])
  const [filter, setFilter] = useState<typeof FILTER_TYPES[number]>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const loadBin = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await trackerApi.getBinItems()
      setItems(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load Bin.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadBin()
    }, [loadBin])
  )

  const handleRestore = async (item: BinItem) => {
    setRestoringId(item.id)
    try {
      await trackerApi.restoreBinItem(item.entityType, item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      Alert.alert('Restored', `"${item.title}" has been restored.`)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to restore item.')
    } finally {
      setRestoringId(null)
    }
  }

  if (loading && !refreshing) {
    return (
      <Screen>
        <LoadingState message="Loading Bin items..." />
      </Screen>
    )
  }

  const filtered = items.filter((item) => {
    if (filter === 'all') return true
    return item.entityType === filter
  })

  return (
    <Screen onRefresh={() => void loadBin(true)} refreshing={refreshing}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bin</Text>
        <Text style={styles.subtitle}>
          Recover deleted journal entries, notes, habits, and weight logs.
        </Text>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTER_TYPES.map((t) => {
          const isSelected = filter === t
          const label =
            t === 'all'
              ? 'All'
              : t === 'activity_template'
              ? 'Activities'
              : t === 'note'
              ? 'Notes'
              : t === 'journal'
              ? 'Journal'
              : 'Weight'

          return (
            <TouchableOpacity
              key={t}
              onPress={() => setFilter(t)}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${label}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {error ? (
        <ErrorView message={error} onRetry={() => void loadBin()} />
      ) : null}

      {/* Deleted Items List */}
      {filtered.length === 0 ? (
        <EmptyState
          message="No soft-deleted records in the bin."
          title="Bin is empty"
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((item) => {
            const iconName = getEntityIcon(item.entityType)
            const iconColor = getEntityColor(item.entityType)
            const isRestoring = restoringId === item.id

            return (
              <Card key={item.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${iconColor}22` },
                    ]}
                  >
                    <TrackerIcon name={iconName} size="xs" color={iconColor} />
                  </View>

                  <View style={styles.copyWrap}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.preview ? (
                      <Text style={styles.itemPreview} numberOfLines={1}>
                        {item.preview}
                      </Text>
                    ) : null}
                    <Text style={styles.dateText}>
                      Deleted {new Date(item.deletedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  <Button
                    label={isRestoring ? 'Restoring...' : 'Restore'}
                    variant="outline"
                    size="sm"
                    onPress={() => handleRestore(item)}
                    disabled={isRestoring}
                    accessibilityLabel={`Restore ${item.title}`}
                  />
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
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
  filterScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.white,
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
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyWrap: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    color: colors.text,
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
  },
  itemPreview: {
    color: colors.textMuted,
    fontSize: 11,
  },
  dateText: {
    color: colors.textSubtle,
    fontSize: 10,
  },
})
