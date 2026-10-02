import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Card } from '@/components/Card'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { useEntitlements } from '@/auth/EntitlementProvider'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing, typography } from '@/theme/tokens'

const PLANS = [
  { id: 'monthly', name: 'Monthly', cadence: 'Billed monthly', description: 'Flexible access to Tracker Pro.' },
  { id: 'annual', name: 'Annual', cadence: 'Billed annually', description: 'Pro access with an annual billing cycle.' },
  { id: 'lifetime', name: 'Lifetime', cadence: 'One-time purchase', description: 'Permanent Pro access when available.' },
] as const

export function BillingScreen() {
  const { isPro } = useEntitlements()
  const { colors } = useTheme()
  const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[number]['id']>('annual')
  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.back}
        >
          <TrackerIcon name="chevron-left" size="sm" color={colors.textMuted} />
          <Text style={styles.backText}>Settings</Text>
        </Pressable>
        <Text style={styles.title}>Tracker Pro</Text>
        <Text style={styles.subtitle}>
          Choose the billing period that fits you. Final pricing and checkout are supplied by the canonical billing service.
        </Text>
      </View>

      {isPro ? (
        <Card style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <TrackerIcon name="crown" size="sm" color={colors.warning} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Pro is active</Text>
            <Text style={styles.statusText}>Your current entitlement is managed by Tracker&apos;s billing system.</Text>
          </View>
        </Card>
      ) : null}

      <View style={styles.plans}>
        {PLANS.map((plan) => {
          const selected = selectedPlan === plan.id
          return (
            <Pressable
              key={plan.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setSelectedPlan(plan.id)}
              style={[styles.plan, selected && styles.planSelected]}
            >
              <View style={styles.planTop}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.cadence}>{plan.cadence}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
              </View>
              <Text style={styles.description}>{plan.description}</Text>
            </Pressable>
          )
        })}
      </View>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>What Pro unlocks</Text>
        <Text style={styles.infoText}>Premium Tracker capabilities are controlled by the server-authoritative entitlement contract.</Text>
      </Card>
    </Screen>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  header: { gap: spacing.sm, marginBottom: spacing.md },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { color: colors.textMuted, fontSize: typography.sm.fontSize, fontWeight: '600' },
  title: { color: colors.text, fontSize: typography.hero.fontSize, lineHeight: typography.hero.lineHeight, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: typography.sm.fontSize, lineHeight: typography.sm.lineHeight },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.md },
  statusIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.warningSubtle, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { color: colors.text, fontSize: typography.md.fontSize, fontWeight: '700' },
  statusText: { color: colors.textMuted, fontSize: typography.xs.fontSize, lineHeight: typography.xs.lineHeight },
  plans: { gap: spacing.sm },
  plan: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, gap: spacing.sm },
  planSelected: { borderColor: colors.primary, backgroundColor: colors.primarySubtle },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  planName: { color: colors.text, fontSize: typography.md.fontSize, fontWeight: '800' },
  cadence: { color: colors.textMuted, fontSize: typography.xs.fontSize, marginTop: 2 },
  description: { color: colors.textMuted, fontSize: typography.sm.fontSize, lineHeight: typography.sm.lineHeight },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  infoCard: { padding: spacing.md, marginTop: spacing.md, gap: spacing.xs },
  infoTitle: { color: colors.text, fontSize: typography.sm.fontSize, fontWeight: '700' },
  infoText: { color: colors.textMuted, fontSize: typography.xs.fontSize, lineHeight: typography.xs.lineHeight },
})
