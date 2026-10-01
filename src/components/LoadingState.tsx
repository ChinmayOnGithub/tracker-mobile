import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '@/theme/tokens'

export interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <View
      accessibilityLabel={message}
      accessibilityRole="progressbar"
      style={styles.container}
    >
      <ActivityIndicator color={colors.primary} size="large" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  message: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
})
