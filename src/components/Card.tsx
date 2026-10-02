import type { PropsWithChildren } from 'react'
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { colors, radius, spacing } from '@/theme/tokens'

export interface CardProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>
  onPress?: () => void
  disabled?: boolean
  accessibilityLabel?: string
  accessibilityHint?: string
}

export function Card({
  children,
  style,
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const { colors } = useTheme()

  if (onPress) {
    return (
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
            borderColor: colors.border,
          },
          styles.interactive,
          disabled && styles.disabled,
          style,
        ]}
      >
        {children}
      </Pressable>
    )
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  interactive: {
    minHeight: 48,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
})