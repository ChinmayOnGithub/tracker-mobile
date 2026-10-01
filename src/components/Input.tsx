import { useState } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { colors, layout, radius, spacing, typography } from '@/theme/tokens'

export interface InputProps extends TextInputProps {
  label?: string
  error?: string | null
  helperText?: string
  containerStyle?: StyleProp<ViewStyle>
  inputStyle?: StyleProp<TextStyle>
}

export function Input({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label ?? rest.placeholder}
        onBlur={(e) => {
          setFocused(false)
          onBlur?.(e)
        }}
        onFocus={(e) => {
          setFocused(true)
          onFocus?.(e)
        }}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error ? styles.inputError : undefined,
          inputStyle,
        ]}
        {...rest}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: typography.base.fontSize,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
    fontWeight: '500',
  },
  helperText: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
  },
})
