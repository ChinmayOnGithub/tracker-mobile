import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Screen } from '@/components/Screen'
import { Card } from '@/components/Card'
import { TrackerIcon } from '@/components/TrackerIcon'
import { LoadingState } from '@/components/LoadingState'
import { trackerApi, type WorkSession } from '@/api/client'
import {
  calculateSessionHours,
  formatHoursTwoDecimals,
  getDayOfMonth,
  getDayShortName,
  getWeekDates,
  isWeekend,
} from '@/domain/work'
import { colors, radius, spacing, typography } from '@/theme/tokens'
import { todayYmd } from '@/utils/date'

type PeriodType = 'week' | 'month' | 'year'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export function WorkScreen() {
  const router = useRouter()
  const today = todayYmd()

  const [period, setPeriod] = useState<PeriodType>('week')
  const [baseDate, setBaseDate] = useState<string>(today)
  const [sessions, setSessions] = useState<WorkSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Compute date range for current view
  const { startDate, endDate, label } = useMemo(() => {
    const parts = baseDate.split('-').map(Number)
    const year = parts[0] || 2026
    const month = (parts[1] || 1) - 1 // 0-indexed

    if (period === 'week') {
      const week = getWeekDates(baseDate, 'monday')
      const start = week[0] || baseDate
      const end = week[6] || baseDate
      const startParts = start.split('-')
      const endParts = end.split('-')
      const sM = SHORT_MONTH_NAMES[(parseInt(startParts[1], 10) || 1) - 1]
      const eM = SHORT_MONTH_NAMES[(parseInt(endParts[1], 10) || 1) - 1]
      const rangeLabel = sM === eM
        ? `${sM} ${startParts[2]} – ${endParts[2]}, ${year}`
        : `${sM} ${startParts[2]} – ${eM} ${endParts[2]}, ${year}`
      return { startDate: start, endDate: end, label: rangeLabel }
    }

    if (period === 'month') {
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
      const mStr = String(month + 1).padStart(2, '0')
      const start = `${year}-${mStr}-01`
      const end = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`
      return { startDate: start, endDate: end, label: `${MONTH_NAMES[month]} ${year}` }
    }

    // year
    const start = `${year}-01-01`
    const end = `${year}-12-31`
    return { startDate: start, endDate: end, label: `${year}` }
  }, [period, baseDate])

  const loadData = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await trackerApi.getWorkSession(undefined, startDate, endDate)
      const list = res.rangeSessions || res.weekSessions || []
      setSessions(list)
    } catch {
      // Non-fatal
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Navigation handlers
  const handlePrev = () => {
    const parts = baseDate.split('-').map(Number)
    const year = parts[0] || 2026
    const month = (parts[1] || 1) - 1
    const day = parts[2] || 1

    if (period === 'week') {
      const d = new Date(Date.UTC(year, month, day - 7))
      setBaseDate(d.toISOString().slice(0, 10))
    } else if (period === 'month') {
      const d = new Date(Date.UTC(year, month - 1, 1))
      setBaseDate(d.toISOString().slice(0, 10))
    } else {
      setBaseDate(`${year - 1}-01-01`)
    }
  }

  const handleNext = () => {
    const parts = baseDate.split('-').map(Number)
    const year = parts[0] || 2026
    const month = (parts[1] || 1) - 1
    const day = parts[2] || 1

    if (period === 'week') {
      const d = new Date(Date.UTC(year, month, day + 7))
      setBaseDate(d.toISOString().slice(0, 10))
    } else if (period === 'month') {
      const d = new Date(Date.UTC(year, month + 1, 1))
      setBaseDate(d.toISOString().slice(0, 10))
    } else {
      setBaseDate(`${year + 1}-01-01`)
    }
  }

  const handleResetToday = () => {
    setBaseDate(today)
  }

  // Summary Metrics calculations with 2 decimal precision
  const metrics = useMemo(() => {
    let officeSec = 0
    let wfhSec = 0
    let compOffSec = 0
    const daysSet = new Set<string>()

    for (const s of sessions) {
      const hours = calculateSessionHours(s)
      const sec = hours * 3600
      daysSet.add(s.date)

      if (isWeekend(s.date) && hours > 0) {
        compOffSec += sec
      }

      if (s.mode === 'office') {
        officeSec += sec
      } else {
        wfhSec += sec
      }
    }

    const totalSec = officeSec + wfhSec
    const totalHours = totalSec / 3600
    const officeHours = officeSec / 3600
    const wfhHours = wfhSec / 3600
    const compOffHours = compOffSec / 3600
    const daysWorked = daysSet.size
    const avgDailyHours = daysWorked > 0 ? totalHours / daysWorked : 0

    return {
      totalHours,
      officeHours,
      wfhHours,
      compOffHours,
      daysWorked,
      avgDailyHours,
    }
  }, [sessions])

  // Week View Chart Data (7 days: Mon-Sun)
  const weekChartData = useMemo(() => {
    if (period !== 'week') return []
    const week = getWeekDates(baseDate, 'monday')
    return week.map((d) => {
      const daySessions = sessions.filter((s) => s.date === d)
      let dayHours = 0
      let mode: 'office' | 'wfh' | 'comp-off' = 'office'

      for (const s of daySessions) {
        const h = calculateSessionHours(s)
        dayHours += h
        if (isWeekend(d) && h > 0) {
          mode = 'comp-off'
        } else if (s.mode === 'wfh') {
          mode = 'wfh'
        }
      }

      return {
        date: d,
        dayName: getDayShortName(d),
        dayNum: getDayOfMonth(d),
        hours: dayHours,
        mode,
        isWeekend: isWeekend(d),
      }
    })
  }, [period, baseDate, sessions])

  // Month View Chart Data (grouped by week / weeks of month)
  const monthChartData = useMemo(() => {
    if (period !== 'month') return []
    const parts = baseDate.split('-').map(Number)
    const year = parts[0] || 2026
    const month = (parts[1] || 1) - 1
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

    // 4 or 5 bucket periods
    const buckets: { label: string; hours: number; officeHours: number; wfhHours: number }[] = []
    let currentBucket = { label: 'W1 (1-7)', hours: 0, officeHours: 0, wfhHours: 0 }

    for (let day = 1; day <= lastDay; day++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const daySessions = sessions.filter((s) => s.date === dStr)
      for (const s of daySessions) {
        const h = calculateSessionHours(s)
        currentBucket.hours += h
        if (s.mode === 'office') currentBucket.officeHours += h
        else currentBucket.wfhHours += h
      }

      if (day === 7 || day === 14 || day === 21 || day === 28 || day === lastDay) {
        let label = `W${buckets.length + 1}`
        if (day === 7) label = 'W1 (1-7)'
        else if (day === 14) label = 'W2 (8-14)'
        else if (day === 21) label = 'W3 (15-21)'
        else if (day === 28) label = 'W4 (22-28)'
        else label = `W5 (29-${lastDay})`

        currentBucket.label = label
        buckets.push({ ...currentBucket })
        currentBucket = { label: '', hours: 0, officeHours: 0, wfhHours: 0 }
      }
    }

    return buckets
  }, [period, baseDate, sessions])

  // Year View Chart Data (12 months: Jan-Dec)
  const yearChartData = useMemo(() => {
    if (period !== 'year') return []
    const parts = baseDate.split('-').map(Number)
    const year = parts[0] || 2026

    return SHORT_MONTH_NAMES.map((mName, idx) => {
      const mStr = String(idx + 1).padStart(2, '0')
      const prefix = `${year}-${mStr}`
      const monthSessions = sessions.filter((s) => s.date.startsWith(prefix))
      let total = 0
      let office = 0
      let wfh = 0

      for (const s of monthSessions) {
        const h = calculateSessionHours(s)
        total += h
        if (s.mode === 'office') office += h
        else wfh += h
      }

      return {
        month: mName,
        monthIndex: idx,
        hours: total,
        officeHours: office,
        wfhHours: wfh,
      }
    })
  }, [period, baseDate, sessions])

  const maxChartHours = useMemo(() => {
    if (period === 'week') {
      const maxH = Math.max(...weekChartData.map((d) => d.hours), 10)
      return Math.ceil(maxH)
    }
    if (period === 'month') {
      const maxH = Math.max(...monthChartData.map((d) => d.hours), 45)
      return Math.ceil(maxH)
    }
    const maxH = Math.max(...yearChartData.map((d) => d.hours), 180)
    return Math.ceil(maxH)
  }, [period, weekChartData, monthChartData, yearChartData])

  return (
    <Screen
      onRefresh={() => void loadData(true)}
      refreshing={refreshing}
      scrollable
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <Pressable
          accessibilityLabel="Back to Today"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <TrackerIcon name="chevron-left" size="sm" color={colors.text} />
        </Pressable>

        <View style={styles.headerTitleGroup}>
          <Text style={styles.screenTitle}>Work Analytics</Text>
          <Text style={styles.screenSubtitle}>Detailed Presence & Comp-off</Text>
        </View>

        <View style={styles.headerSpacer} />
      </View>

      {/* Period Tabs: Week | Month | Year */}
      <View style={styles.tabContainer}>
        {(['week', 'month', 'year'] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPeriod(p)}
            style={[
              styles.periodTab,
              period === p && styles.periodTabActive,
            ]}
          >
            <Text
              style={[
                styles.periodTabText,
                period === p && styles.periodTabTextActive,
              ]}
            >
              {p.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Date Navigator */}
      <View style={styles.dateNavigator}>
        <Pressable
          accessibilityLabel="Previous period"
          onPress={handlePrev}
          style={styles.navArrowBtn}
        >
          <TrackerIcon name="chevron-left" size="sm" color={colors.text} />
        </Pressable>

        <View style={styles.navLabelGroup}>
          <Text style={styles.navLabelText}>{label}</Text>
          {baseDate !== today && (
            <Pressable onPress={handleResetToday} style={styles.todayChip}>
              <Text style={styles.todayChipText}>Reset to Today</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityLabel="Next period"
          onPress={handleNext}
          style={styles.navArrowBtn}
        >
          <TrackerIcon name="chevron-right" size="sm" color={colors.text} />
        </Pressable>
      </View>

      {loading ? (
        <LoadingState message="Loading work analytics..." />
      ) : (
        <>
          {/* KPI Summary Cards Grid */}
          <View style={styles.kpiGrid}>
            <Card style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>TOTAL HOURS</Text>
              <Text style={[styles.kpiValue, { color: colors.primary }]}>
                {formatHoursTwoDecimals(metrics.totalHours)}
              </Text>
              <Text style={styles.kpiSub}>
                {metrics.daysWorked} days logged
              </Text>
            </Card>

            <Card style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>OFFICE HOURS</Text>
              <Text style={[styles.kpiValue, { color: colors.success }]}>
                {formatHoursTwoDecimals(metrics.officeHours)}
              </Text>
              <Text style={styles.kpiSub}>
                {metrics.totalHours > 0
                  ? `${Math.round((metrics.officeHours / metrics.totalHours) * 100)}% of total`
                  : '0% of total'}
              </Text>
            </Card>

            <Card style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>WFH HOURS</Text>
              <Text style={[styles.kpiValue, { color: colors.warning }]}>
                {formatHoursTwoDecimals(metrics.wfhHours)}
              </Text>
              <Text style={styles.kpiSub}>
                {metrics.totalHours > 0
                  ? `${Math.round((metrics.wfhHours / metrics.totalHours) * 100)}% of total`
                  : '0% of total'}
              </Text>
            </Card>

            <Card style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>WEEKEND COMP-OFF</Text>
              <Text style={[styles.kpiValue, { color: colors.sky }]}>
                {formatHoursTwoDecimals(metrics.compOffHours)}
              </Text>
              <Text style={styles.kpiSub}>
                Comp-off eligible
              </Text>
            </Card>
          </View>

          {/* Average & Productivity Card */}
          <Card style={styles.avgCard}>
            <View style={styles.avgRow}>
              <View>
                <Text style={styles.avgLabel}>DAILY AVERAGE</Text>
                <Text style={styles.avgValue}>
                  {formatHoursTwoDecimals(metrics.avgDailyHours)} / day
                </Text>
              </View>
              <View style={styles.avgBadge}>
                <TrackerIcon name="trending-up" size="xs" color={colors.primary} />
                <Text style={styles.avgBadgeText}>
                  {metrics.avgDailyHours >= 8.0 ? 'Target Met (≥8h)' : 'Below 8h Target'}
                </Text>
              </View>
            </View>
          </Card>

          {/* Graphical Visualization Card */}
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleGroup}>
                <TrackerIcon name="bar-chart-2" size="xs" color={colors.primary} />
                <Text style={styles.chartTitle}>
                  {period === 'week'
                    ? '7-Day Week Breakdown'
                    : period === 'month'
                      ? 'Monthly Weekly Distribution'
                      : '12-Month Annual Trends'}
                </Text>
              </View>
              <Text style={styles.chartLegend}>Hours (2-decimal)</Text>
            </View>

            {/* Week View Chart */}
            {period === 'week' && (
              <View style={styles.chartArea}>
                <View style={styles.barsContainer}>
                  {weekChartData.map((d) => {
                    const heightPercent = maxChartHours > 0
                      ? Math.min(100, Math.round((d.hours / maxChartHours) * 100))
                      : 0

                    const barColor = d.mode === 'comp-off'
                      ? colors.sky
                      : d.mode === 'wfh'
                        ? colors.warning
                        : colors.success

                    return (
                      <View key={d.date} style={styles.barCol}>
                        <Text style={styles.barValueText}>
                          {formatHoursTwoDecimals(d.hours)}
                        </Text>

                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${Math.max(4, heightPercent)}%`,
                                backgroundColor: d.hours > 0 ? barColor : colors.borderMuted,
                              },
                            ]}
                          />
                        </View>

                        <Text style={[styles.barLabel, d.isWeekend && styles.barLabelWeekend]}>
                          {d.dayName}
                        </Text>
                        <Text style={styles.barDateText}>{d.dayNum}</Text>
                      </View>
                    )
                  })}
                </View>

                {/* Target line note */}
                <View style={styles.targetRefRow}>
                  <View style={styles.targetLine} />
                  <Text style={styles.targetRefText}>8.00h Daily Target Reference</Text>
                </View>
              </View>
            )}

            {/* Month View Chart */}
            {period === 'month' && (
              <View style={styles.chartArea}>
                <View style={styles.barsContainer}>
                  {monthChartData.map((b, idx) => {
                    const heightPercent = maxChartHours > 0
                      ? Math.min(100, Math.round((b.hours / maxChartHours) * 100))
                      : 0

                    return (
                      <View key={idx} style={styles.barCol}>
                        <Text style={styles.barValueText}>
                          {formatHoursTwoDecimals(b.hours)}
                        </Text>

                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${Math.max(4, heightPercent)}%`,
                                backgroundColor: b.hours > 0 ? colors.primary : colors.borderMuted,
                              },
                            ]}
                          />
                        </View>

                        <Text style={styles.barLabel}>{b.label}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            )}

            {/* Year View Chart */}
            {period === 'year' && (
              <View style={styles.chartArea}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={[styles.barsContainer, { gap: 12, minWidth: 420 }]}>
                    {yearChartData.map((m) => {
                      const heightPercent = maxChartHours > 0
                        ? Math.min(100, Math.round((m.hours / maxChartHours) * 100))
                        : 0

                      return (
                        <View key={m.month} style={[styles.barCol, { width: 28 }]}>
                          <Text style={[styles.barValueText, { fontSize: 8 }]}>
                            {m.hours > 0 ? `${Math.round(m.hours)}h` : '-'}
                          </Text>

                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height: `${Math.max(4, heightPercent)}%`,
                                  backgroundColor: m.hours > 0 ? colors.primary : colors.borderMuted,
                                },
                              ]}
                            />
                          </View>

                          <Text style={styles.barLabel}>{m.month}</Text>
                        </View>
                      )
                    })}
                  </View>
                </ScrollView>
              </View>
            )}
          </Card>

          {/* Session History List */}
          <Card style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recorded Sessions ({sessions.length})</Text>
              <Text style={styles.historySubtitle}>Sorted chronologically</Text>
            </View>

            {sessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No work sessions recorded for this period.</Text>
              </View>
            ) : (
              <View style={styles.sessionList}>
                {sessions.map((s) => {
                  const hours = calculateSessionHours(s)
                  const isWknd = isWeekend(s.date)
                  const isComp = isWknd && hours > 0

                  return (
                    <View key={s.id} style={styles.sessionRow}>
                      <View style={styles.sessionDateCol}>
                        <Text style={styles.sessionDateText}>{s.date}</Text>
                        <Text style={styles.sessionDayText}>
                          {getDayShortName(s.date)}
                        </Text>
                      </View>

                      <View style={styles.sessionModeCol}>
                        <View
                          style={[
                            styles.sessionModePill,
                            isComp
                              ? styles.pillComp
                              : s.mode === 'office'
                                ? styles.pillOffice
                                : styles.pillWfh,
                          ]}
                        >
                          <Text
                            style={[
                              styles.sessionModePillText,
                              isComp
                                ? styles.pillCompText
                                : s.mode === 'office'
                                  ? styles.pillOfficeText
                                  : styles.pillWfhText,
                            ]}
                          >
                            {isComp ? 'COMP-OFF' : s.mode.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.sessionMethodText}>
                          {s.loggingMode === 'manual' ? 'Manual entry' : 'Timer tracked'}
                        </Text>
                      </View>

                      <View style={styles.sessionHoursCol}>
                        <Text style={styles.sessionHoursText}>
                          {formatHoursTwoDecimals(hours)}
                        </Text>
                        <Text style={styles.sessionStatusText}>
                          {s.status}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </Card>
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  backBtn: {
    padding: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
  },
  headerTitleGroup: {
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: typography.md.fontSize,
    lineHeight: typography.md.lineHeight,
    fontWeight: '800',
    color: colors.text,
  },
  screenSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  headerSpacer: {
    width: 32,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: 3,
    gap: 3,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  periodTabActive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  periodTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  periodTabTextActive: {
    color: colors.text,
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  navArrowBtn: {
    padding: spacing.xs,
  },
  navLabelGroup: {
    alignItems: 'center',
    gap: 2,
  },
  navLabelText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  todayChip: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    backgroundColor: colors.primarySubtle,
    borderRadius: radius.full,
  },
  todayChipText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  kpiCard: {
    width: '48%',
    padding: spacing.sm,
    gap: 2,
    backgroundColor: colors.surface,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  kpiSub: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  avgCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avgLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  avgValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  avgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  avgBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  chartCard: {
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chartTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartTitle: {
    fontSize: typography.xs.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  chartLegend: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chartArea: {
    gap: spacing.sm,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 16,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValueText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  barLabelWeekend: {
    color: colors.sky,
  },
  barDateText: {
    fontSize: 8,
    color: colors.textMuted,
    fontWeight: '600',
  },
  targetRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.xs,
  },
  targetLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderMuted,
  },
  targetRefText: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
  },
  historyCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
    paddingBottom: spacing.xs,
  },
  historyTitle: {
    fontSize: typography.xs.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  historySubtitle: {
    fontSize: 10,
    color: colors.textMuted,
  },
  emptyContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  sessionList: {
    gap: spacing.xs,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  sessionDateCol: {
    width: 80,
  },
  sessionDateText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  sessionDayText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
  },
  sessionModeCol: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 2,
  },
  sessionModePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  pillOffice: {
    backgroundColor: colors.successSubtle,
  },
  pillOfficeText: {
    color: colors.success,
    fontSize: 8,
    fontWeight: '800',
  },
  pillWfh: {
    backgroundColor: colors.warningSubtle,
  },
  pillWfhText: {
    color: colors.warning,
    fontSize: 8,
    fontWeight: '800',
  },
  pillComp: {
    backgroundColor: colors.skySubtle,
  },
  pillCompText: {
    color: colors.sky,
    fontSize: 8,
    fontWeight: '800',
  },
  sessionModePillText: {
    fontSize: 8,
    fontWeight: '800',
  },
  sessionMethodText: {
    fontSize: 8,
    color: colors.textMuted,
  },
  sessionHoursCol: {
    alignItems: 'flex-end',
  },
  sessionHoursText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  sessionStatusText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
})
