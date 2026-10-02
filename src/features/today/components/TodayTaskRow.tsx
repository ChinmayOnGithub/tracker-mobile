import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { TaskOccurrence } from '@/domain/timeline'
import { TrackerIcon } from '@/components/TrackerIcon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface TodayTaskRowProps {
  task: TaskOccurrence
  isToggling: boolean
  onCycleStatus: (task: TaskOccurrence) => void
  onOpenActions: (task: TaskOccurrence) => void
}

export function TodayTaskRow({
  task,
  isToggling,
  onCycleStatus,
  onOpenActions,
}: TodayTaskRowProps) {
  const isDone = task.isCompleted
  const isCanceled = task.isCanceled
  const isPostponed = task.isPostponed

  return (
    <View style={[styles.container, (isDone || isCanceled || isPostponed) && styles.containerFaded]}>
      {/* Checkbox Cycling Button */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isDone }}
        accessibilityLabel={`Cycle status for ${task.title}`}
        disabled={isToggling}
        hitSlop={8}
        onPress={() => onCycleStatus(task)}
        style={[
          styles.checkbox,
          isDone && styles.checkboxDone,
          isCanceled && styles.checkboxCanceled,
          isPostponed && styles.checkboxPostponed,
        ]}
      >
        {isToggling ? (
          <ActivityIndicator size="small" color={colors.coral} />
        ) : isDone ? (
          <TrackerIcon name="check" size="xs" color={colors.white} />
        ) : isCanceled ? (
          <TrackerIcon name="x" size="xs" color={colors.textMuted} />
        ) : isPostponed ? (
          <TrackerIcon name="clock" size="xs" color={colors.warning} />
        ) : (
          <View style={styles.checkboxEmpty} />
        )}
      </Pressable>

      {/* Main Task Info */}
      <Pressable
        accessibilityRole="button"
        onPress={() => onOpenActions(task)}
        style={styles.contentCol}
      >
        <View style={styles.titleRow}>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              isDone && styles.titleDone,
              isCanceled && styles.titleCanceled,
            ]}
          >
            {task.title}
          </Text>

          {task.completionDisplay && (
            <View style={styles.completionBadge}>
              <Text style={styles.completionBadgeText}>
                {task.completionDisplay.formatted}
              </Text>
            </View>
          )}

          {isPostponed && (
            <View style={styles.postponedBadge}>
              <Text style={styles.postponedBadgeText}>Tomorrow</Text>
            </View>
          )}

          {task.isPostponedOccurrence && (
            <View style={styles.postponedBadge}>
              <Text style={styles.postponedBadgeText}>Postponed</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{task.category}</Text>
          </View>

          {task.isTimed && task.scheduledTime ? (
            <View style={styles.metaItem}>
              <TrackerIcon name="clock" size="xs" color={colors.textSubtle} />
              <Text style={styles.metaText}>{task.scheduledTime}</Text>
            </View>
          ) : task.estimatedDuration > 0 ? (
            <View style={styles.metaItem}>
              <TrackerIcon name="clock" size="xs" color={colors.textSubtle} />
              <Text style={styles.metaText}>{task.estimatedDuration}m</Text>
            </View>
          ) : null}

          {task.analysis.streak > 0 && !isPostponed && !isCanceled && (
            <View style={styles.metaItem}>
              <TrackerIcon name="sparkles" size="xs" color={colors.coral} />
              <Text style={styles.streakText}>{task.analysis.streak}d</Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* More Actions Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Actions for ${task.title}`}
        hitSlop={8}
        onPress={() => onOpenActions(task)}
        style={styles.moreBtn}
      >
        <TrackerIcon name="more-horizontal" size="sm" color={colors.textMuted} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  containerFaded: {
    opacity: 0.75,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  checkboxEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  checkboxDone: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  checkboxCanceled: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.textMuted,
  },
  checkboxPostponed: {
    backgroundColor: colors.warningSubtle,
    borderColor: colors.warning,
  },
  contentCol: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: '600',
    color: colors.text,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  titleCanceled: {
    textDecorationLine: 'line-through',
    color: colors.textSubtle,
  },
  completionBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderWidth: 1,
  },
  completionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
  },
  postponedBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.warningSubtle,
  },
  postponedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
  },
  categoryText: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: typography.xs.fontSize,
    color: colors.textSubtle,
  },
  streakText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    color: colors.coral,
  },
  moreBtn: {
    padding: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
