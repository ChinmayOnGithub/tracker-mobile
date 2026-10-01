import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '@/theme/tokens'
import { Button } from './Button'

export interface EmptyStateProps {
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <View accessibilityRole="text" style={styles.container}>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          size="sm"
          style={styles.button}
          variant="secondary"
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconContainer: {
    marginBottom: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: typography.md.fontSize,
    lineHeight: typography.md.lineHeight,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
  },
})
