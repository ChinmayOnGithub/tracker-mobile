import type { PropsWithChildren, ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView, type Edge } from 'react-native-safe-area-context'
import { colors, spacing } from '@/theme/tokens'

export interface ScreenProps extends PropsWithChildren {
  scrollable?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  edges?: Edge[]
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
  header?: ReactNode
  footer?: ReactNode
}

export function Screen({
  children,
  scrollable = true,
  refreshing = false,
  onRefresh,
  edges = ['top', 'left', 'right'],
  style,
  contentContainerStyle,
  header,
  footer,
}: ScreenProps) {
  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>{children}</View>
  )

  return (
    <SafeAreaView edges={edges} style={[styles.safe, style]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        {header}
        {content}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
})