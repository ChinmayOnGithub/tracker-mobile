import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
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
  accessibilityHint,
}: ButtonProps) {
  const isDisabled = disabled || loading

  const variantStyle =
    variant === 'secondary'
      ? styles.secondary
      : variant === 'destructive'
      ? styles.destructive
      : variant === 'ghost'
      ? styles.ghost
      : variant === 'outline'
      ? styles.outline
      : styles.primary

  const pressedStyle =
    variant === 'secondary'
      ? styles.secondary_pressed
      : variant === 'destructive'
      ? styles.destructive_pressed
      : variant === 'ghost'
      ? styles.ghost_pressed
      : variant === 'outline'
      ? styles.outline_pressed
      : styles.primary_pressed

  const sizeStyle =
    size === 'sm' ? styles.size_sm : size === 'lg' ? styles.size_lg : styles.size_md

  const labelVariantStyle =
    variant === 'secondary'
      ? styles.label_secondary
      : variant === 'destructive'
      ? styles.label_destructive
      : variant === 'ghost'
      ? styles.label_ghost
      : variant === 'outline'
      ? styles.label_outline
      : styles.label_primary

  const labelSizeStyle =
    size === 'sm'
      ? styles.label_size_sm
      : size === 'lg'
      ? styles.label_size_lg
      : styles.label_size_md

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
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
          color={variant === 'ghost' ? colors.primary : '#ffffff'}
          size="small"
        />
      ) : (
        <Text style={[styles.label, labelVariantStyle, labelSizeStyle, labelStyle]}>
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
    color: '#ffffff',
  },
  label_secondary: {
    color: colors.text,
  },
  label_outline: {
    color: colors.text,
  },
  label_destructive: {
    color: '#ffffff',
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