import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { TaskOccurrence } from '@/domain/timeline'
import { MobileCompletionService } from '@/domain/completion'
import { TrackerIcon } from '@/components/TrackerIcon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface TaskActionModalProps {
  task: TaskOccurrence | null
  visible: boolean
  onClose: () => void
  onSetStatus: (
    task: TaskOccurrence,
    status: 'cleared' | 'done' | 'canceled' | 'postponed',
    completionValue?: { amount?: number | null; payload?: Record<string, unknown> }
  ) => void
  onDeleteLog: (logId: string) => void
  onRePostpone?: (task: TaskOccurrence) => void
}

export function TaskActionModal({
  task,
  visible,
  onClose,
  onSetStatus,
  onDeleteLog,
  onRePostpone,
}: TaskActionModalProps) {
  if (!task) return null

  const isDone = task.isCompleted
  const isCanceled = task.isCanceled
  const isPostponed = task.isPostponed
  const isDaily = task.template.recurrenceType === 'daily'

  const completionConfig = MobileCompletionService.getCompletionConfig(task.template)
  const isValueTarget =
    completionConfig.method === 'VALUE' ||
    (typeof task.template.amount === 'number' && task.template.amount > 0)

  const defaultVal = task.template.amount ? String(task.template.amount) : ''
  const [valueInput, setValueInput] = useState<string>(defaultVal)

  const handleMarkDone = () => {
    let completionVal: { amount?: number | null; payload?: Record<string, unknown> } | undefined
    if (isValueTarget && valueInput.trim()) {
      const num = Number(valueInput.trim())
      const isNum = !isNaN(num)
      const unit = completionConfig.value?.unit
      completionVal = {
        amount: isNum ? num : null,
        payload: {
          value: isNum ? num : valueInput.trim(),
          ...(unit ? { unit } : {}),
        },
      }
    }
    onSetStatus(task, 'done', completionVal)
    onClose()
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.title} numberOfLines={2}>
                {task.title}
              </Text>
              <Pressable hitSlop={8} onPress={onClose} style={styles.closeBtn}>
                <TrackerIcon name="close" size="sm" color={colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.category}>{task.category}</Text>
          </View>

          {/* Value Completion Input (if target/counter activity) */}
          {isValueTarget && !isDone && (
            <View style={styles.valueSection}>
              <Text style={styles.valueSectionLabel}>
                Target Value / Amount {completionConfig.value?.unit ? `(${completionConfig.value.unit})` : ''}
              </Text>
              <TextInput
                style={styles.valueInput}
                value={valueInput}
                onChangeText={setValueInput}
                placeholder={
                  task.template.amount
                    ? `Default: ${task.template.amount} ${completionConfig.value?.unit || ''}`
                    : `Enter amount ${completionConfig.value?.unit ? '(' + completionConfig.value.unit + ')' : ''}`
                }
                placeholderTextColor={colors.textMuted}
                keyboardType={completionConfig.value?.inputType === 'text' ? 'default' : 'numeric'}
              />
            </View>
          )}

          {/* Action List */}
          <View style={styles.actionList}>
            {!isDone && (
              <Pressable
                onPress={handleMarkDone}
                style={styles.actionItem}
              >
                <TrackerIcon name="check" size="sm" color={colors.success} />
                <Text style={styles.actionText}>
                  {isValueTarget && valueInput.trim()
                    ? `Complete with ${valueInput.trim()} ${completionConfig.value?.unit || ''}`.trim()
                    : 'Mark Completed'}
                </Text>
              </Pressable>
            )}

            {!isCanceled && (
              <Pressable
                onPress={() => {
                  onSetStatus(task, 'canceled')
                  onClose()
                }}
                style={styles.actionItem}
              >
                <TrackerIcon name="close" size="sm" color={colors.textMuted} />
                <Text style={styles.actionText}>Skip / Cancel Today</Text>
              </Pressable>
            )}

            {!isDaily && !isPostponed && (
              <Pressable
                onPress={() => {
                  onSetStatus(task, 'postponed')
                  onClose()
                }}
                style={styles.actionItem}
              >
                <TrackerIcon name="clock" size="sm" color={colors.warning} />
                <Text style={styles.actionText}>Postpone to Tomorrow</Text>
              </Pressable>
            )}

            {/* Re-postpone on next day: return to previous scheduled day */}
            {task.isPostponedOccurrence && (
              <Pressable
                onPress={() => {
                  if (onRePostpone) {
                    onRePostpone(task)
                  } else if (task.postponedLogId) {
                    onDeleteLog(task.postponedLogId)
                  }
                  onClose()
                }}
                style={styles.actionItem}
              >
                <TrackerIcon name="restore" size="sm" color={colors.coral} />
                <Text style={[styles.actionText, styles.restoreText]}>
                  Re-postpone (Return to {task.postponedFromDate || 'previous day'})
                </Text>
              </Pressable>
            )}

            {(isDone || isCanceled || isPostponed) && (
              <Pressable
                onPress={() => {
                  onSetStatus(task, 'cleared')
                  onClose()
                }}
                style={styles.actionItem}
              >
                <TrackerIcon name="restore" size="sm" color={colors.coral} />
                <Text style={[styles.actionText, styles.restoreText]}>
                  {isPostponed ? 'Re-postpone / Restore' : 'Restore Task'}
                </Text>
              </Pressable>
            )}

            {task.logId && (
              <Pressable
                onPress={() => {
                  onDeleteLog(task.logId!)
                  onClose()
                }}
                style={[styles.actionItem, styles.deleteItem]}
              >
                <TrackerIcon name="trash" size="sm" color={colors.danger} />
                <Text style={[styles.actionText, styles.deleteText]}>Delete Log</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
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
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.md.fontSize,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  category: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  valueSection: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  valueSectionLabel: {
    fontSize: typography.xs.fontSize,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  valueInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: typography.sm.fontSize,
    color: colors.text,
    fontWeight: '600',
  },
  actionList: {
    gap: spacing.xs,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  actionText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  restoreText: {
    color: colors.coral,
  },
  deleteItem: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  deleteText: {
    color: colors.danger,
  },
})
