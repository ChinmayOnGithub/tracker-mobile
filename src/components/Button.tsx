import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { useTheme } from '@/theme/ThemeContext'
import { colors, layout, radius, spacing, typography } from '@/theme/tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
  accessibilityLabel?: string
  accessibilityHint?: string
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  labelStyle,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme()
  const isDisabled = disabled || loading

  const variantStyle =
    variant === 'secondary'
      ? { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 }
      : variant === 'destructive'
      ? { backgroundColor: colors.danger }
      : variant === 'ghost'
      ? { backgroundColor: 'transparent' }
      : variant === 'outline'
      ? { backgroundColor: 'transparent', borderColor: colors.border, borderWidth: 1 }
      : { backgroundColor: colors.primary }

  const pressedStyle =
    variant === 'secondary'
      ? { backgroundColor: colors.border }
      : variant === 'destructive'
      ? { opacity: 0.85 }
      : variant === 'ghost'
      ? { backgroundColor: colors.primarySubtle }
      : variant === 'outline'
      ? { backgroundColor: colors.surfaceRaised, borderColor: colors.textMuted }
      : { backgroundColor: colors.primaryHover }

  const sizeStyle =
    size === 'sm' ? styles.size_sm : size === 'lg' ? styles.size_lg : styles.size_md

  const labelColor =
    variant === 'primary' || variant === 'destructive'
      ? colors.white
      : variant === 'ghost'
      ? colors.primary
      : colors.text

  const labelSizeStyle =
    size === 'sm'
      ? styles.label_size_sm
      : size === 'lg'
      ? styles.label_size_lg
      : styles.label_size_md

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        sizeStyle,
        pressed && !isDisabled && pressedStyle,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' ? colors.primary : colors.white}
          size="small"
        />
      ) : (
        <Text style={[styles.label, { color: labelColor }, labelSizeStyle, labelStyle]}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: layout.minTouchTarget,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primary_pressed: {
    backgroundColor: colors.primaryHover,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
  },
  secondary_pressed: {
    backgroundColor: colors.border,
  },
  destructive: {
    backgroundColor: colors.danger,
  },
  destructive_pressed: {
    opacity: 0.85,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghost_pressed: {
    backgroundColor: colors.primarySubtle,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    borderWidth: 1,
  },
  outline_pressed: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.textMuted,
  },
  size_sm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 36,
  },
  size_md: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: layout.minTouchTarget,
  },
  size_lg: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  label: {
    fontWeight: '700',
    textAlign: 'center',
  },
  label_primary: {
    color: colors.white,
  },
  label_secondary: {
    color: colors.text,
  },
  label_outline: {
    color: colors.text,
  },
  label_destructive: {
    color: colors.white,
  },
  label_ghost: {
    color: colors.primary,
  },
  label_size_sm: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
  label_size_md: {
    fontSize: typography.base.fontSize,
    lineHeight: typography.base.lineHeight,
  },
  label_size_lg: {
    fontSize: typography.md.fontSize,
    lineHeight: typography.md.lineHeight,
  },
  disabled: {
    opacity: 0.5,
  },
})