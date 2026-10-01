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

const CAPACITY_OPTIONS = [2, 4, 6, 8]

export function OnboardingScreen() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

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
            Let&apos;s personalize your daily focus and routine.
          </Text>
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
            <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
            <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
            <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
            <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
          </View>
        </View>

        {error ? <ErrorView message={error} /> : null}

        {/* Step 1: Focus Areas */}
        {step === 1 && (
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

            <Button
              label="Continue"
              onPress={() => setStep(2)}
              size="lg"
              style={styles.actionBtn}
              variant="primary"
            />
          </Card>
        )}

        {/* Step 2: Workday & Capacity */}
        {step === 2 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Daily Capacity & Work Hours</Text>
            <Text style={styles.sectionDesc}>
              Define how much focused work you realistically plan for each day.
            </Text>

            <Text style={styles.fieldLabel}>Daily Work Capacity (hours)</Text>
            <View style={styles.capacityRow}>
              {CAPACITY_OPTIONS.map((hours) => {
                const selected = state.dailyCapacity === hours
                return (
                  <Pressable
                    key={hours}
                    accessibilityRole="button"
                    onPress={() => setState((p) => ({ ...p, dailyCapacity: hours }))}
                    style={[styles.capacityBtn, selected && styles.capacityBtnSelected]}
                  >
                    <Text
                      style={[
                        styles.capacityBtnText,
                        selected && styles.capacityBtnTextSelected,
                      ]}
                    >
                      {hours}h
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <View style={styles.hoursRow}>
              <View style={styles.hoursCol}>
                <Input
                  label="Work Start Time"
                  onChangeText={(val) => setState((p) => ({ ...p, workStartTime: val }))}
                  placeholder="09:00"
                  value={state.workStartTime}
                />
              </View>
              <View style={styles.hoursCol}>
                <Input
                  label="Work Finish Time"
                  onChangeText={(val) => setState((p) => ({ ...p, workEndTime: val }))}
                  placeholder="17:00"
                  value={state.workEndTime}
                />
              </View>
            </View>

            <View style={styles.btnRow}>
              <Button
                label="Back"
                onPress={() => setStep(1)}
                style={styles.backBtn}
                variant="secondary"
              />
              <Button
                label="Continue"
                onPress={() => setStep(3)}
                style={styles.flexBtn}
                variant="primary"
              />
            </View>
          </Card>
        )}

        {/* Step 3: First Day Objective */}
        {step === 3 && (
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Today&apos;s Primary Mission</Text>
            <Text style={styles.sectionDesc}>
              What is the one most important outcome you want to achieve today?
            </Text>

            <Input
              label="First Day Objective (Optional)"
              onChangeText={(val) => setState((p) => ({ ...p, firstDayObjective: val }))}
              placeholder="e.g. Complete mobile functional parity"
              value={state.firstDayObjective}
            />

            <View style={styles.btnRow}>
              <Button
                label="Back"
                onPress={() => setStep(2)}
                style={styles.backBtn}
                variant="secondary"
              />
              <Button
                disabled={submitting}
                label={submitting ? 'Generating Plan...' : 'Start Using Tracker'}
                loading={submitting}
                onPress={() => void handleComplete()}
                style={styles.flexBtn}
                variant="primary"
              />
            </View>
          </Card>
        )}
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
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  progressDotActive: {
    backgroundColor: colors.coral,
  },
  progressLine: {
    width: 36,
    height: 2,
    backgroundColor: colors.border,
  },
  progressLineActive: {
    backgroundColor: colors.coral,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.md.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDesc: {
    fontSize: typography.xs.fontSize,
    lineHeight: typography.xs.lineHeight,
    color: colors.textMuted,
  },
  pillGrid: {
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
  },
  pillSelected: {
    borderColor: colors.coral,
    backgroundColor: colors.coralSubtle,
  },
  pillText: {
    fontSize: typography.sm.fontSize,
    color: colors.textMuted,
    fontWeight: '500',
  },
  pillTextSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  tzRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
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
  fieldLabel: {
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  capacityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  capacityBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1,
  },
  capacityBtnSelected: {
    borderColor: colors.coral,
    backgroundColor: colors.coralSubtle,
  },
  capacityBtnText: {
    fontSize: typography.sm.fontSize,
    color: colors.textMuted,
    fontWeight: '600',
  },
  capacityBtnTextSelected: {
    color: colors.coral,
    fontWeight: '800',
  },
  hoursRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  hoursCol: {
    flex: 1,
  },
  actionBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.coral,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  backBtn: {
    flex: 1,
  },
  flexBtn: {
    flex: 2,
    backgroundColor: colors.coral,
  },
})
