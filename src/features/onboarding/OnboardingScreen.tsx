import { useEffect, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { trackerApi, type OnboardingState } from '@/api/client'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { ErrorView } from '@/components/ErrorView'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import type { TrackerIconName } from '@/components/TrackerIcon'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface FocusOption {
  id: string
  label: string
  icon: TrackerIconName
}

const FOCUS_OPTIONS: FocusOption[] = [
  { id: 'work', label: 'Work & Career', icon: 'briefcase' },
  { id: 'learning', label: 'Learning & Skills', icon: 'activity' },
  { id: 'personal', label: 'Personal Growth', icon: 'sparkles' },
  { id: 'health', label: 'Health & Fitness', icon: 'activity' },
  { id: 'life-admin', label: 'Life Admin', icon: 'check' },
  { id: 'creative', label: 'Creative Work', icon: 'sparkles' },
]

export function OnboardingScreen() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [state, setState] = useState<OnboardingState>({
    version: 1,
    status: 'IN_PROGRESS',
    currentStep: 1,
    completedSteps: [],
    taskSources: [],
    calendarProvider: null,
    workStartTime: '09:00',
    workEndTime: '17:00',
    planningStyle: 'structured',
    dailyCapacity: 6,
    focusAreas: ['work'],
    firstDayObjective: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    firstPlanActivityId: null,
    momentum: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
  })

  useEffect(() => {
    let active = true

    async function loadInitial() {
      try {
        const res = await trackerApi.getOnboardingState()
        if (active && res.state) {
          if (res.state.status === 'COMPLETED') {
            router.replace('/(app)/(tabs)')
            return
          }
          setState((prev) => ({
            ...prev,
            ...res.state,
            timezone: prev.timezone || res.state?.timezone || 'UTC',
          }))
        }
      } catch {
        // Safe fallback to defaults
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadInitial()

    return () => {
      active = false
    }
  }, [])

  function toggleFocus(id: string) {
    setState((prev) => {
      const exists = prev.focusAreas.includes(id)
      const nextFocus = exists
        ? prev.focusAreas.filter((f) => f !== id)
        : [...prev.focusAreas, id].slice(0, 3)
      return { ...prev, focusAreas: nextFocus.length > 0 ? nextFocus : ['work'] }
    })
  }

  async function handleComplete() {
    setError(null)
    setSubmitting(true)
    try {
      await trackerApi.completeOnboarding(state)
      router.replace('/(app)/(tabs)')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to complete setup.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Screen>
        <LoadingState message="Setting up your workspace..." />
      </Screen>
    )
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeLabel}>Welcome to Tracker</Text>
          <Text style={styles.subtitle}>
            Select your main focus areas to personalize your daily routine.
          </Text>
        </View>

        {error ? <ErrorView message={error} /> : null}

        {/* Minimal Setup Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>What are your main focus areas?</Text>
          <Text style={styles.sectionDesc}>
            Choose up to 3 domains to organize your habits and daily tasks.
          </Text>

          <View style={styles.pillGrid}>
            {FOCUS_OPTIONS.map((opt) => {
              const selected = state.focusAreas.includes(opt.id)
              return (
                <Pressable
                  key={opt.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleFocus(opt.id)}
                  style={[styles.pill, selected && styles.pillSelected]}
                >
                  <TrackerIcon
                    name={opt.icon}
                    size="sm"
                    color={selected ? colors.coral : colors.textMuted}
                  />
                  <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <View style={styles.tzRow}>
            <Text style={styles.tzLabel}>Detected Timezone:</Text>
            <Text style={styles.tzValue}>{state.timezone}</Text>
          </View>

          <View style={styles.inputWrap}>
            <Input
              label="Today's Primary Goal (Optional)"
              onChangeText={(val) => setState((p) => ({ ...p, firstDayObjective: val }))}
              placeholder="e.g. Focus on high priority tasks"
              value={state.firstDayObjective}
            />
          </View>

          <Button
            disabled={submitting}
            label={submitting ? 'Setting Up...' : 'Start Using Tracker'}
            loading={submitting}
            onPress={() => void handleComplete()}
            size="lg"
            style={styles.actionBtn}
            variant="primary"
          />

          <Button
            disabled={submitting}
            label="Skip and go to Today"
            onPress={() => void handleComplete()}
            size="sm"
            style={styles.skipBtn}
            variant="ghost"
          />
        </Card>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  welcomeLabel: {
    fontSize: typography.xl.fontSize,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.sm.fontSize,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  card: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.md.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDesc: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    lineHeight: 18,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSelected: {
    borderColor: colors.coral,
    backgroundColor: colors.coralSubtle,
  },
  pillText: {
    fontSize: typography.sm.fontSize,
    color: colors.text,
    fontWeight: '500',
  },
  pillTextSelected: {
    color: colors.coral,
    fontWeight: '700',
  },
  tzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  tzLabel: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
  },
  tzValue: {
    fontSize: typography.xs.fontSize,
    color: colors.text,
    fontWeight: '600',
  },
  inputWrap: {
    marginTop: spacing.xs,
  },
  actionBtn: {
    marginTop: spacing.sm,
  },
  skipBtn: {
    marginTop: spacing.xs,
  },
})
