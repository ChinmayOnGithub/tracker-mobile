import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  trackerApi,
  type LeaveAllowance,
  type LeaveRecord,
  type LeaveType,
} from '@/api/client'
import { TrackerIcon } from '@/components/TrackerIcon'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { LeaveModal } from '@/features/leave/LeaveModal'

interface LeaveWidgetCardProps {
  selectedDate: string
  onLeaveChanged?: () => void
}

const LEAVE_TYPES_CONFIG: { key: LeaveType; label: string; color: string }[] = [
  { key: 'CASUAL', label: 'Casual', color: '#38bdf8' },
  { key: 'SICK', label: 'Sick', color: '#f87171' },
  { key: 'PTO', label: 'PTO', color: '#a78bfa' },
  { key: 'COMP_OFF', label: 'Comp', color: '#fbbf24' },
  { key: 'HALF_DAY', label: 'Half', color: '#38bdf8' },
  { key: 'WFH', label: 'WFH', color: '#34d399' },
]

export function LeaveWidgetCard({ selectedDate, onLeaveChanged }: LeaveWidgetCardProps) {
  const currentYear = new Date().getFullYear()
  const [allowances, setAllowances] = useState<LeaveAllowance[]>([])
  const [records, setRecords] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const res = await trackerApi.getLeaveData(currentYear)
      setAllowances(res.allowances)
      setRecords(res.records)
    } catch {
      // Offline fallback: keep existing state
    } finally {
      setLoading(false)
    }
  }, [currentYear])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Compute used by type
  const usedByType: Record<string, number> = {}
  records.filter((r) => r.status === 'APPROVED').forEach((r) => {
    usedByType[r.leaveType] = (usedByType[r.leaveType] ?? 0) + r.totalDays
  })

  // Filter types with positive allowance or used
  const activeTypes = LEAVE_TYPES_CONFIG.filter((t) => {
    const allowance = allowances.find((a) => a.leaveType === t.key)?.allowance ?? 0
    const used = usedByType[t.key] ?? 0
    return allowance > 0 || used > 0
  })

  // Check if user is on leave on selectedDate
  const activeLeaveToday = records.find(
    (r) =>
      r.status === 'APPROVED' &&
      r.startDate <= selectedDate &&
      r.endDate >= selectedDate
  )

  const handleModalClose = () => {
    setModalVisible(false)
    void loadData()
    onLeaveChanged?.()
  }

  return (
    <>
      <Pressable onPress={() => setModalVisible(true)} style={styles.card}>
        {/* Card Header */}
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <TrackerIcon name="calendar" size="xs" color={colors.warning} />
            <Text style={styles.headerTitle}>Time Off</Text>
          </View>
          <Pressable hitSlop={8} onPress={() => setModalVisible(true)}>
            <Text style={styles.manageBtnText}>Manage</Text>
          </Pressable>
        </View>

        {/* Active Leave Today Banner */}
        {activeLeaveToday && (
          <View style={styles.activeBanner}>
            <TrackerIcon name="sparkles" size="xs" color={colors.coral} />
            <Text style={styles.activeBannerText}>
              On Leave ({activeLeaveToday.leaveType}) today
            </Text>
          </View>
        )}

        {/* Body Chips */}
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="small" color={colors.coral} />
          </View>
        ) : activeTypes.length === 0 ? (
          <Text style={styles.emptyText}>No active leave entitlements</Text>
        ) : (
          <View style={styles.chipRow}>
            {activeTypes.map((t) => {
              const allowance = allowances.find((a) => a.leaveType === t.key)?.allowance ?? 0
              const used = usedByType[t.key] ?? 0
              const remaining = Math.max(0, allowance - used)

              return (
                <View key={t.key} style={styles.chip}>
                  <View style={[styles.dot, { backgroundColor: t.color }]} />
                  <Text style={styles.chipNumber}>
                    {remaining}/{allowance}
                  </Text>
                  <Text style={styles.chipLabel}>{t.label}</Text>
                </View>
              )
            })}
          </View>
        )}

        {/* Footer CTA */}
        <Pressable
          hitSlop={8}
          onPress={() => setModalVisible(true)}
          style={styles.ctaRow}
        >
          <Text style={styles.ctaText}>Request Time Off</Text>
          <TrackerIcon name="chevron-right" size="xs" color={colors.textMuted} />
        </Pressable>
      </Pressable>

      <LeaveModal
        visible={modalVisible}
        onClose={handleModalClose}
        onLeaveChanged={() => {
          void loadData()
          onLeaveChanged?.()
        }}
      />
    </>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  manageBtnText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '700',
    color: colors.coral,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(235, 94, 40, 0.12)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(235, 94, 40, 0.25)',
  },
  activeBannerText: {
    fontSize: typography.xs.fontSize,
    color: colors.coral,
    fontWeight: '700',
  },
  loaderWrap: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipNumber: {
    fontSize: typography.xs.fontSize,
    fontWeight: '800',
    color: colors.text,
  },
  chipLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  ctaText: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    fontWeight: '600',
  },
})
