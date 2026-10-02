import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  trackerApi,
  type CreateLeaveInput,
  type LeaveAllowance,
  type LeaveRecord,
  type LeaveType,
} from '@/api/client'
import { TrackerIcon } from '@/components/TrackerIcon'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing, typography } from '@/theme/tokens'
import { addDays, todayYmd } from '@/utils/date'

interface LeaveModalProps {
  visible: boolean
  onClose: () => void
  onLeaveChanged?: () => void
}

type TabKey = 'allowances' | 'request' | 'history'

interface LeaveTypeConfig {
  key: LeaveType
  label: string
  colorKey: 'sky' | 'rose' | 'purple' | 'warning' | 'success'
}

const LEAVE_TYPES: LeaveTypeConfig[] = [
  { key: 'CASUAL', label: 'Casual', colorKey: 'sky' },
  { key: 'SICK', label: 'Sick', colorKey: 'rose' },
  { key: 'PTO', label: 'Paid Leave', colorKey: 'purple' },
  { key: 'COMP_OFF', label: 'Comp Off', colorKey: 'warning' },
  { key: 'HALF_DAY', label: 'Half Day', colorKey: 'sky' },
  { key: 'WFH', label: 'Remote / WFH', colorKey: 'success' },
]

function calcDays(startStr: string, endStr: string): number {
  const [sy, sm, sd] = startStr.split('-').map(Number)
  const [ey, em, ed] = endStr.split('-').map(Number)
  const startUtc = Date.UTC(sy, sm - 1, sd)
  const endUtc = Date.UTC(ey, em - 1, ed)
  if (isNaN(startUtc) || isNaN(endUtc)) return 1
  const diffDays = Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000))
  return Math.max(1, diffDays + 1)
}

export function LeaveModal({ visible, onClose, onLeaveChanged }: LeaveModalProps) {
  const { colors } = useTheme()
  const today = todayYmd()
  const currentYear = new Date().getFullYear()

  const [tab, setTab] = useState<TabKey>('allowances')
  const [allowances, setAllowances] = useState<LeaveAllowance[]>([])
  const [records, setRecords] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successBanner, setSuccessBanner] = useState<string | null>(null)

  // Form State
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [totalDays, setTotalDays] = useState(1)
  const [notes, setNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await trackerApi.getLeaveData(currentYear)
      setAllowances(res.allowances)
      setRecords(res.records)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leave data')
    } finally {
      setLoading(false)
    }
  }, [currentYear])

  useEffect(() => {
    if (visible) {
      void loadData()
      setSuccessBanner(null)
    }
  }, [visible, loadData])

  // Recalculate days when dates or type change
  const handleStartDateChange = (date: string) => {
    setStartDate(date)
    if (leaveType === 'HALF_DAY') {
      setEndDate(date)
      setTotalDays(0.5)
    } else {
      if (date > endDate) {
        setEndDate(date)
        setTotalDays(1)
      } else {
        setTotalDays(calcDays(date, endDate))
      }
    }
  }

  const handleEndDateChange = (date: string) => {
    if (leaveType === 'HALF_DAY') {
      return
    }
    setEndDate(date)
    setTotalDays(calcDays(startDate, date))
  }

  const handleTypeSelect = (type: LeaveType) => {
    setLeaveType(type)
    if (type === 'HALF_DAY') {
      setEndDate(startDate)
      setTotalDays(0.5)
    } else {
      setTotalDays(calcDays(startDate, endDate))
    }
  }

  const handleSubmitRequest = async () => {
    if (!startDate || !endDate) {
      Alert.alert('Validation Error', 'Start and end dates are required.')
      return
    }
    if (startDate > endDate) {
      Alert.alert('Validation Error', 'End date must be on or after start date.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const input: CreateLeaveInput = {
        leaveType,
        startDate,
        endDate,
        totalDays: leaveType === 'HALF_DAY' ? 0.5 : totalDays,
        notes: notes.trim() || undefined,
      }
      await trackerApi.createLeaveRequest(input)
      setSuccessBanner(`Leave request created for ${totalDays} day(s).`)
      setNotes('')
      await loadData()
      setTab('history')
      onLeaveChanged?.()
    } catch (err) {
      Alert.alert('Request Failed', err instanceof Error ? err.message : 'Could not create leave request.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRecord = (id: string, label: string) => {
    Alert.alert(
      'Delete Leave Record',
      `Are you sure you want to delete ${label}? Associated activity logs will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await trackerApi.deleteLeaveRequest(id)
              setRecords((prev) => prev.filter((r) => r.id !== id))
              await loadData()
              onLeaveChanged?.()
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete record.')
            }
          },
        },
      ]
    )
  }

  const handleAdjustAllowance = async (type: LeaveType, delta: number) => {
    const current = allowances.find((a) => a.leaveType === type)?.allowance ?? 0
    const newAllowance = Math.max(0, current + delta)
    try {
      setAllowances((prev) =>
        prev.map((a) => (a.leaveType === type ? { ...a, allowance: newAllowance } : a))
      )
      await trackerApi.updateLeaveAllowance({
        leaveType: type,
        year: currentYear,
        allowance: newAllowance,
      })
      onLeaveChanged?.()
    } catch {
      await loadData()
    }
  }

  // Compute used by type
  const usedByType: Record<string, number> = {}
  records.filter((r) => r.status === 'APPROVED').forEach((r) => {
    usedByType[r.leaveType] = (usedByType[r.leaveType] ?? 0) + r.totalDays
  })

  const styles = React.useMemo(() => createStyles(colors), [colors])

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TrackerIcon name="calendar" size="md" color={colors.coral} />
              <View>
                <Text style={styles.sheetTitle}>Time Off & Leave</Text>
                <Text style={styles.sheetSubtitle}>Year {currentYear} Allowances & Requests</Text>
              </View>
            </View>
            <Pressable hitSlop={8} onPress={onClose} style={styles.closeBtn}>
              <TrackerIcon name="close" size="sm" color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Segmented Navigation */}
          <View style={styles.tabsRow}>
            {(['allowances', 'request', 'history'] as TabKey[]).map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  setTab(t)
                  setSuccessBanner(null)
                }}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'allowances' ? 'Allowances' : t === 'request' ? 'Request Leave' : `History (${records.length})`}
                </Text>
              </Pressable>
            ))}
          </View>

          {successBanner && (
            <View style={styles.successBanner}>
              <TrackerIcon name="check" size="xs" color={colors.success} />
              <Text style={styles.successBannerText}>{successBanner}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={colors.coral} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              {/* TAB 1: ALLOWANCES */}
              {tab === 'allowances' && (
                <View style={styles.sectionWrap}>
                  <Text style={styles.sectionNote}>
                    Track your annual entitlements. Use steppers to configure allowance balances.
                  </Text>
                  <View style={styles.allowanceGrid}>
                    {LEAVE_TYPES.map(({ key, label, colorKey }) => {
                      const allowance = allowances.find((a) => a.leaveType === key)?.allowance ?? 0
                      const used = usedByType[key] ?? 0
                      const remaining = Math.max(0, allowance - used)
                      const pct = allowance > 0 ? Math.min(100, Math.round((used / allowance) * 100)) : 0
                      const typeColor = colors[colorKey]

                      return (
                        <View key={key} style={styles.allowanceCard}>
                          <View style={styles.cardHeaderRow}>
                            <View style={styles.typeTag}>
                              <View style={[styles.colorDot, { backgroundColor: typeColor }]} />
                              <Text style={styles.cardTypeTitle}>{label}</Text>
                            </View>
                            <View style={styles.stepperRow}>
                              <Pressable
                                hitSlop={8}
                                onPress={() => void handleAdjustAllowance(key, -1)}
                                style={styles.stepBtn}
                              >
                                <Text style={styles.stepBtnText}>-</Text>
                              </Pressable>
                              <Pressable
                                hitSlop={8}
                                onPress={() => void handleAdjustAllowance(key, +1)}
                                style={styles.stepBtn}
                              >
                                <Text style={styles.stepBtnText}>+</Text>
                              </Pressable>
                            </View>
                          </View>

                          <View style={styles.metricRow}>
                            <View>
                              <Text style={styles.metricVal}>{remaining}</Text>
                              <Text style={styles.metricSub}>Days Left</Text>
                            </View>
                            <View style={styles.metricRight}>
                              <Text style={styles.metricTotalText}>{used} used / {allowance} total</Text>
                            </View>
                          </View>

                          {/* Smooth desaturated progress bar */}
                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${pct}%`,
                                  backgroundColor: typeColor,
                                  opacity: 0.75,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      )
                    })}
                  </View>
                </View>
              )}

              {/* TAB 2: REQUEST TIME OFF */}
              {tab === 'request' && (
                <View style={styles.sectionWrap}>
                  <Text style={styles.inputLabel}>Leave Type</Text>
                  <View style={styles.typeSelectorWrap}>
                    {LEAVE_TYPES.map(({ key, label }) => (
                      <Pressable
                        key={key}
                        onPress={() => handleTypeSelect(key)}
                        style={[styles.typePill, leaveType === key && styles.typePillActive]}
                      >
                        <Text style={[styles.typePillText, leaveType === key && styles.typePillTextActive]}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Dates Row */}
                  <View style={styles.dateInputsRow}>
                    <View style={styles.dateCol}>
                      <Text style={styles.inputLabel}>Start Date</Text>
                      <TextInput
                        style={styles.textInput}
                        value={startDate}
                        onChangeText={handleStartDateChange}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textMuted}
                        maxLength={10}
                      />
                    </View>
                    <View style={styles.dateCol}>
                      <Text style={styles.inputLabel}>End Date</Text>
                      <TextInput
                        editable={leaveType !== 'HALF_DAY'}
                        style={[styles.textInput, leaveType === 'HALF_DAY' && styles.inputDisabled]}
                        value={endDate}
                        onChangeText={handleEndDateChange}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textMuted}
                        maxLength={10}
                      />
                    </View>
                  </View>

                  {/* Quick Date Presets */}
                  <View style={styles.quickPresetsRow}>
                    <Pressable
                      onPress={() => {
                        handleStartDateChange(today)
                        handleEndDateChange(today)
                      }}
                      style={styles.presetChip}
                    >
                      <Text style={styles.presetChipText}>Today</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const tomorrow = addDays(today, 1)
                        handleStartDateChange(tomorrow)
                        handleEndDateChange(tomorrow)
                      }}
                      style={styles.presetChip}
                    >
                      <Text style={styles.presetChipText}>Tomorrow</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        const nextMon = addDays(today, 7)
                        handleStartDateChange(nextMon)
                        handleEndDateChange(nextMon)
                      }}
                      style={styles.presetChip}
                    >
                      <Text style={styles.presetChipText}>+1 Week</Text>
                    </Pressable>
                  </View>

                  {/* Duration summary */}
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>Total Duration</Text>
                    <Text style={styles.summaryVal}>
                      {leaveType === 'HALF_DAY' ? '0.5' : totalDays} {totalDays === 1 && leaveType !== 'HALF_DAY' ? 'day' : 'days'}
                    </Text>
                  </View>

                  <Text style={styles.inputLabel}>Notes / Reason (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Doctor appointment, personal trip, etc."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                  />

                  <Pressable
                    disabled={submitting}
                    onPress={() => void handleSubmitRequest()}
                    style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <TrackerIcon name="check" size="sm" color={colors.white} />
                        <Text style={styles.submitBtnText}>Submit Time Off Request</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}

              {/* TAB 3: HISTORY */}
              {tab === 'history' && (
                <View style={styles.sectionWrap}>
                  {records.length === 0 ? (
                    <View style={styles.emptyWrap}>
                      <TrackerIcon name="calendar" size="lg" color={colors.textMuted} />
                      <Text style={styles.emptyTitle}>No Leave Records</Text>
                      <Text style={styles.emptySubtitle}>You have not recorded any time off in {currentYear}.</Text>
                    </View>
                  ) : (
                    records.map((r) => {
                      const typeMeta = LEAVE_TYPES.find((t) => t.key === r.leaveType)
                      const typeColor = typeMeta ? colors[typeMeta.colorKey] : colors.primary
                      const isApproved = r.status === 'APPROVED'
                      const isPending = r.status === 'PENDING'

                      return (
                        <View key={r.id} style={styles.historyCard}>
                          <View style={styles.historyCardHeader}>
                            <View style={styles.historyTagRow}>
                              <View
                                style={[
                                  styles.colorDot,
                                  { backgroundColor: typeColor },
                                ]}
                              />
                              <Text style={styles.historyTypeName}>{typeMeta?.label || r.leaveType}</Text>
                            </View>
                            <View
                              style={[
                                styles.statusBadge,
                                isApproved
                                  ? styles.statusApproved
                                  : isPending
                                  ? styles.statusPending
                                  : styles.statusRejected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusText,
                                  isApproved
                                    ? styles.statusTextApproved
                                    : isPending
                                    ? styles.statusTextPending
                                    : styles.statusTextRejected,
                                ]}
                              >
                                {r.status}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.historyDetailsRow}>
                            <Text style={styles.historyDateRange}>
                              {r.startDate === r.endDate ? r.startDate : `${r.startDate} → ${r.endDate}`}
                            </Text>
                            <Text style={styles.historyDuration}>
                              {r.totalDays} {r.totalDays === 1 ? 'day' : 'days'}
                            </Text>
                          </View>

                          {r.notes ? <Text style={styles.historyNotes}>“{r.notes}”</Text> : null}

                          <View style={styles.historyFooter}>
                            <Pressable
                              hitSlop={8}
                              onPress={() =>
                                handleDeleteRecord(
                                  r.id,
                                  `${typeMeta?.label || r.leaveType} (${r.startDate})`
                                )
                              }
                              style={styles.deleteBtn}
                            >
                              <TrackerIcon name="trash" size="xs" color={colors.danger} />
                              <Text style={styles.deleteBtnText}>Delete</Text>
                            </Pressable>
                          </View>
                        </View>
                      )
                    })
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetTitle: {
    fontSize: typography.md.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  sheetSubtitle: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: spacing.xs,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.coral,
  },
  tabText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.coral,
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.successSubtle,
    borderRadius: radius.sm,
    borderColor: colors.success,
    borderWidth: 1,
  },
  successBannerText: {
    fontSize: typography.xs.fontSize,
    color: colors.success,
    fontWeight: '600',
  },
  loaderWrap: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionWrap: {
    gap: spacing.md,
  },
  sectionNote: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    lineHeight: 18,
  },
  allowanceGrid: {
    gap: spacing.sm,
  },
  allowanceCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTypeTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  metricVal: {
    fontSize: typography.lg.fontSize,
    fontWeight: '900',
    color: colors.text,
  },
  metricSub: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricRight: {
    alignItems: 'flex-end',
  },
  metricTotalText: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  inputLabel: {
    fontSize: typography.xs.fontSize,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeSelectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typePill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typePillActive: {
    borderColor: colors.coral,
    backgroundColor: colors.coralSubtle,
  },
  typePillText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typePillTextActive: {
    color: colors.coral,
    fontWeight: '700',
  },
  dateInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateCol: {
    flex: 1,
    gap: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: typography.sm.fontSize,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  notesInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  quickPresetsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  presetChip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  presetChipText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  summaryLabel: {
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    color: colors.textMuted,
  },
  summaryVal: {
    fontSize: typography.md.fontSize,
    fontWeight: '800',
    color: colors.coral,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.coral,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minHeight: 48,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: typography.sm.fontSize,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    textAlign: 'center',
  },
  historyCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyTypeName: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusApproved: {
    backgroundColor: colors.successSubtle,
  },
  statusPending: {
    backgroundColor: colors.warningSubtle,
  },
  statusRejected: {
    backgroundColor: colors.dangerSubtle,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statusTextApproved: {
    color: colors.success,
  },
  statusTextPending: {
    color: colors.warning,
  },
  statusTextRejected: {
    color: colors.danger,
  },
  historyDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDateRange: {
    fontSize: typography.xs.fontSize,
    color: colors.text,
    fontWeight: '500',
  },
  historyDuration: {
    fontSize: typography.xs.fontSize,
    fontWeight: '700',
    color: colors.textMuted,
  },
  historyNotes: {
    fontSize: typography.xs.fontSize,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  deleteBtnText: {
    fontSize: typography.xs.fontSize,
    color: colors.danger,
    fontWeight: '600',
  },
})
    fontSize: typography.xs.fontSize,
    color: colors.danger,
    fontWeight: '600',
  },
})
