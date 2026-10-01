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
  rightAccessory?: React.ReactNode
}

export function Input({
  label,
  error,
  helperText,
  containerStyle,
  inputStyle,
  secureTextEntry,
  rightAccessory,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused && styles.inputFocused,
          error ? styles.inputError : undefined,
        ]}
      >
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
          style={[styles.input, inputStyle]}
          {...rest}
        />
        {rightAccessory ? (
          <View style={styles.accessory}>{rightAccessory}</View>
        ) : null}
      </View>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    minHeight: layout.minTouchTarget,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.base.fontSize,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  accessory: {
    paddingRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
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
