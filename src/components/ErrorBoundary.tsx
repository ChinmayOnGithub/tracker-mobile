import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Button } from './Button'
import { TrackerIcon } from './TrackerIcon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors in child component tree, logs them, and displays fallback UI.
 * Prevents entire app crash from unhandled exceptions in features.
 *
 * Usage:
 *   <ErrorBoundary fallbackTitle="Today Screen Error">
 *     <TodayScreen />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error)
    console.error('[ErrorBoundary] Error info:', errorInfo.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconWrapper}>
            <TrackerIcon name="alert-triangle" size="xl" color={colors.danger} />
          </View>
          
          <Text style={styles.title}>
            {this.props.fallbackTitle || 'Something went wrong'}
          </Text>
          
          <Text style={styles.message}>
            An unexpected error occurred. Try reloading this screen.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.devError}>
              <Text style={styles.devErrorText}>
                {this.state.error.toString()}
              </Text>
            </View>
          )}

          <Button
            label="Reload"
            variant="primary"
            onPress={this.handleReset}
            style={styles.button}
          />
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
    gap: spacing.lg,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.dangerSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.lg.fontSize,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sm.fontSize,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  devError: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.dangerSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    maxWidth: '100%',
  },
  devErrorText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: colors.danger,
  },
  button: {
    marginTop: spacing.md,
    minWidth: 120,
  },
})
