import React, { useMemo, useState } from 'react'
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { ActivityTemplate } from '@/api/client'
import { TrackerIcon } from '@/components/TrackerIcon'
import { radius, spacing, typography } from '@/theme/tokens'
import { useTheme } from '@/theme/ThemeContext'

interface ActivityPickerModalProps {
  visible: boolean
  onClose: () => void
  templates: ActivityTemplate[]
  onSelectTemplate: (template: ActivityTemplate) => void
  onNewCustomTask?: () => void
}

export function ActivityPickerModal({
  visible,
  onClose,
  templates,
  onSelectTemplate,
  onNewCustomTask,
}: ActivityPickerModalProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const activeTemplates = useMemo(() => {
    return templates.filter((t) => t.isActive && !('deletedAt' in t && t.deletedAt))
  }, [templates])

  const categories = useMemo(() => {
    const set = new Set<string>()
    activeTemplates.forEach((t) => {
      if (t.category) set.add(t.category)
    })
    return ['all', ...Array.from(set)]
  }, [activeTemplates])

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase()
    return activeTemplates.filter((t) => {
      const matchesCategory =
        selectedCategory === 'all' || t.category?.toLowerCase() === selectedCategory.toLowerCase()
      if (!matchesCategory) return false

      if (!query) return true
      return (
        t.name.toLowerCase().includes(query) ||
        (t.category && t.category.toLowerCase().includes(query)) ||
        (t.notes && t.notes.toLowerCase().includes(query))
      )
    })
  }, [activeTemplates, search, selectedCategory])

  const handleSelect = (template: ActivityTemplate) => {
    onSelectTemplate(template)
    onClose()
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.titleWrap}>
                <TrackerIcon name="sparkles" size="sm" color={colors.primary} />
                <Text style={styles.title}>Schedule Activity</Text>
              </View>
              <Pressable
                accessibilityLabel="Close"
                hitSlop={8}
                onPress={onClose}
                style={styles.closeBtn}
              >
                <TrackerIcon name="x" size="sm" color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.subtitle}>
              Select an existing activity or habit to add to today&apos;s schedule.
            </Text>
          </View>

          {/* Search Input */}
          <View style={styles.searchBar}>
            <TrackerIcon name="search" size={14} color={colors.textMuted} />
            <TextInput
              accessibilityLabel="Search activities"
              autoFocus={false}
              onChangeText={setSearch}
              placeholder="Search activities or habits…"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={styles.searchInput}
              value={search}
            />
            {search.length > 0 ? (
              <Pressable hitSlop={8} onPress={() => setSearch('')}>
                <TrackerIcon name="x" size={14} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Category Filter Pills */}
          {categories.length > 2 ? (
            <View style={styles.categoryRow}>
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.categoryPill,
                      isSelected && styles.categoryPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextActive,
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : null}

          {/* Templates List */}
          <FlatList
            data={filteredTemplates}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            style={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <TrackerIcon name="activity" size="lg" color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No matching activities</Text>
                <Text style={styles.emptyText}>
                  {search
                    ? `No activities match "${search}".`
                    : 'No saved activity templates found.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Schedule ${item.name}`}
                onPress={() => handleSelect(item)}
                style={styles.templateItem}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: `${item.color || colors.primary}20` },
                  ]}
                >
                  <TrackerIcon
                    name={item.icon || 'activity'}
                    size={16}
                    color={item.color || colors.primary}
                  />
                </View>

                <View style={styles.itemInfo}>
                  <Text numberOfLines={1} style={styles.itemName}>
                    {item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaCategory}>
                      {item.category || 'general'}
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaRecurrence}>
                      {item.recurrenceType === 'daily'
                        ? 'Daily Habit'
                        : item.recurrenceType === 'weekly'
                          ? 'Weekly'
                          : 'Task'}
                    </Text>
                    {item.scheduledTime ? (
                      <>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.metaTime}>@{item.scheduledTime}</Text>
                      </>
                    ) : null}
                  </View>
                </View>

                <TrackerIcon name="plus" size={14} color={colors.textMuted} />
              </Pressable>
            )}
          />

          {/* Footer Action: Create New Custom Task */}
          {onNewCustomTask ? (
            <View style={styles.footer}>
              <Pressable
                onPress={() => {
                  onClose()
                  onNewCustomTask()
                }}
                style={styles.customTaskBtn}
              >
                <TrackerIcon name="plus" size="sm" color={colors.primary} />
                <Text style={styles.customTaskBtnText}>+ Create New Custom Task</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderTopWidth: 1,
      borderColor: colors.border,
      maxHeight: '82%',
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    header: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderMuted,
      paddingBottom: spacing.xs + 2,
      gap: 2,
    },
    headerTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    titleWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    title: {
      fontSize: typography.md.fontSize,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: typography.xs.fontSize,
      color: colors.textMuted,
      marginTop: 2,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
      height: 38,
      marginTop: spacing.xs,
    },
    searchInput: {
      flex: 1,
      height: 36,
      fontSize: typography.sm.fontSize,
      color: colors.text,
      paddingVertical: 0,
    },
    categoryRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginVertical: spacing.xs,
    },
    categoryPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.borderMuted,
    },
    categoryPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
    },
    categoryPillTextActive: {
      color: colors.white,
    },
    list: {
      maxHeight: 340,
    },
    listContent: {
      paddingVertical: spacing.xs,
      gap: spacing.xs,
    },
    templateItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      backgroundColor: colors.surfaceRaised,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    iconBox: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInfo: {
      flex: 1,
      gap: 2,
    },
    itemName: {
      fontSize: typography.sm.fontSize,
      fontWeight: '600',
      color: colors.text,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaCategory: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'capitalize',
    },
    metaDot: {
      fontSize: 10,
      color: colors.textSubtle,
    },
    metaRecurrence: {
      fontSize: 10,
      color: colors.textMuted,
    },
    metaTime: {
      fontSize: 10,
      color: colors.primary,
      fontFamily: 'monospace',
    },
    emptyWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.xs,
    },
    emptyTitle: {
      fontSize: typography.sm.fontSize,
      fontWeight: '600',
      color: colors.text,
      marginTop: spacing.xs,
    },
    emptyText: {
      fontSize: typography.xs.fontSize,
      color: colors.textMuted,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.borderMuted,
      paddingTop: spacing.sm,
    },
    customTaskBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    customTaskBtnText: {
      fontSize: typography.xs.fontSize,
      fontWeight: '700',
      color: colors.primary,
    },
  })
