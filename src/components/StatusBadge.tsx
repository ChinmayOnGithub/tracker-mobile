import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius, spacing, typography } from '@/theme/tokens'

export type ActivityStatus = 'done' | 'cleared' | 'postponed' | 'canceled' | 'open'

export interface StatusBadgeProps {
  status: ActivityStatus | string
  style?: StyleProp<ViewStyle>
}

export function StatusBadge({ status, style }: StatusBadgeProps) {
  const normalized = status.toLowerCase()

  const config = (() => {
    switch (normalized) {
      case 'done':
        return {
          label: 'Done',
          bg: colors.successSubtle,
          text: colors.success,
          border: colors.success,
        }
      case 'postponed':
        return {
          label: 'Postponed',
          bg: colors.warningSubtle,
          text: colors.warning,
          border: colors.warning,
        }
      case 'canceled':
        return {
          label: 'Canceled',
          bg: colors.dangerSubtle,
          text: colors.danger,
          border: colors.danger,
        }
      default:
        return {
          label: 'Open',
          bg: colors.surfaceRaised,
          text: colors.textMuted,
          border: colors.border,
        }
    }
  })()

  return (
    <View
      accessibilityLabel={`Status: ${config.label}`}
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
})
