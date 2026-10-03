import React, { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { ActivityTemplate, CreateTemplateInput } from '@/api/client'
import { TrackerIcon } from '@/components/TrackerIcon'
import { colors, paletteColors, radius, spacing, typography } from '@/theme/tokens'
import { ActivityPickerModal } from './ActivityPickerModal'

interface QuickTaskAddBarProps {
  selectedDate: string
  templates?: ActivityTemplate[]
  onTaskCreated: (template: ActivityTemplate) => void
  onSelectTemplate?: (template: ActivityTemplate) => void
  createTemplate: (input: CreateTemplateInput) => Promise<ActivityTemplate>
}

export function QuickTaskAddBar({
  selectedDate,
  templates = [],
  onTaskCreated,
  onSelectTemplate,
  createTemplate,
}: QuickTaskAddBarProps) {
  const [title, setTitle] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(paletteColors[0])
  const [isHabit, setIsHabit] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [pickerVisible, setPickerVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const trimmed = title.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      const input: CreateTemplateInput = {
        name: trimmed,
        category: isHabit ? 'habit' : 'general',
        type: isHabit ? 'HABIT' : 'TASK',
        priority: 'NORMAL',
        color: selectedColor,
        icon: isHabit ? 'activity' : 'check',
        recurrenceType: isHabit ? 'daily' : 'one_time',
        targetDate: isHabit ? null : selectedDate,
      }

      const created = await createTemplate(input)
      setTitle('')
      setShowOptions(false)
      onTaskCreated(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Main input row */}
      <View style={styles.inputBar}>
        <Pressable
          accessibilityLabel="Toggle options"
          hitSlop={8}
          onPress={() => setShowOptions((prev) => !prev)}
          style={[styles.colorPreviewBtn, { backgroundColor: selectedColor }]}
        >
          <TrackerIcon name="plus" size={14} color={colors.white} />
        </Pressable>

        <TextInput
          accessibilityLabel="Add a task for today"
          editable={!submitting}
          onChangeText={(t) => {
            setTitle(t)
            if (error) setError(null)
          }}
          onSubmitEditing={handleSubmit}
          placeholder="+ Add a task for today…"
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          style={styles.input}
          value={title}
        />

        {onSelectTemplate && templates.length > 0 ? (
          <Pressable
            accessibilityLabel="Schedule from existing activities"
            hitSlop={6}
            onPress={() => setPickerVisible(true)}
            style={styles.pickerTriggerBtn}
          >
            <TrackerIcon name="sparkles" size={13} color={colors.coral} />
            <Text style={styles.pickerTriggerText}>Activities</Text>
          </Pressable>
        ) : null}

        {submitting ? (
          <View style={styles.actionBtn}>
            <ActivityIndicator color={colors.coral} size="small" />
          </View>
        ) : (
          <Pressable
            accessibilityLabel="Submit task"
            disabled={!title.trim()}
            hitSlop={8}
            onPress={handleSubmit}
            style={[
              styles.actionBtn,
              !title.trim() && styles.actionBtnDisabled,
            ]}
          >
            <TrackerIcon
              name="check"
              size="sm"
              color={title.trim() ? colors.coral : colors.textSubtle}
            />
          </Pressable>
        )}
      </View>

      {/* Expanded options: Color selection & One-time vs Habit toggle */}
      {showOptions ? (
        <View style={styles.optionsWrap}>
          {/* Mode Toggle */}
          <View style={styles.toggleRow}>
            <Text style={styles.optionsLabel}>Type:</Text>
            <View style={styles.togglePills}>
              <Pressable
                onPress={() => setIsHabit(false)}
                style={[styles.typePill, !isHabit && styles.typePillActive]}
              >
                <Text
                  style={[
                    styles.typePillText,
                    !isHabit && styles.typePillTextActive,
                  ]}
                >
                  One-time Task
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsHabit(true)}
                style={[styles.typePill, isHabit && styles.typePillActive]}
              >
                <Text
                  style={[
                    styles.typePillText,
                    isHabit && styles.typePillTextActive,
                  ]}
                >
                  Daily Habit
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Color Palette */}
          <View style={styles.colorsRow}>
            <Text style={styles.optionsLabel}>Color:</Text>
            <View style={styles.paletteList}>
              {paletteColors.map((color) => {
                const isSelected = selectedColor === color
                return (
                  <Pressable
                    key={color}
                    accessibilityLabel={`Color ${color}`}
                    hitSlop={6}
                    onPress={() => setSelectedColor(color)}
                    style={[
                      styles.colorDot,
                      { backgroundColor: color },
                      isSelected && styles.colorDotSelected,
                    ]}
                  />
                )
              })}
            </View>
          </View>
        </View>
      ) : null}

      <ActivityPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        templates={templates}
        onSelectTemplate={(t) => {
          onSelectTemplate?.(t)
        }}
        onNewCustomTask={() => {
          setShowOptions(true)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.xs.fontSize,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: 2,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorPreviewBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: typography.sm.fontSize,
    color: colors.text,
    paddingVertical: 0,
    paddingHorizontal: spacing.xs,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  actionBtnDisabled: {
    opacity: 0.4,
  },
  optionsWrap: {
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs + 2,
    borderTopColor: colors.borderMuted,
    borderTopWidth: 1,
    gap: spacing.xs + 4,
    paddingHorizontal: spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionsLabel: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    color: colors.textMuted,
  },
  togglePills: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
    padding: 2,
    gap: 2,
  },
  typePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm - 2,
  },
  typePillActive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typePillTextActive: {
    color: colors.text,
  },
  colorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paletteList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: colors.white,
  },
  pickerTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
    height: 32,
  },
  pickerTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.coral,
  },
})
