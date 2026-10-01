import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { Button } from './Button'

export interface ErrorViewProps {
  message: string
  title?: string
  onRetry?: () => void
}

export function ErrorView({
  message,
  title = 'Something went wrong',
  onRetry,
}: ErrorViewProps) {
  return (
    <View accessibilityRole="alert" style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          label="Retry"
          onPress={onRetry}
          size="sm"
          style={styles.button}
          variant="secondary"
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    color: colors.danger,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: '700',
  },
  message: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
  },
  button: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
})
