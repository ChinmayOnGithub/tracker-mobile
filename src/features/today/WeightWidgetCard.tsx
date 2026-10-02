import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { StyleSheet, Text, View, Modal, Pressable, TouchableOpacity } from 'react-native'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { TrackerIcon } from '@/components/TrackerIcon'
import { trackerApi, type WeightRecord } from '@/api/client'
import { radius, spacing, typography } from '@/theme/tokens'
import { useTheme } from '@/theme/ThemeContext'

interface WeightWidgetCardProps {
  date: string
  onWeightLogged?: () => void
}

export function WeightWidgetCard({ date, onWeightLogged }: WeightWidgetCardProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [weightInput, setWeightInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWeight = useCallback(async () => {
    try {
      const res = await trackerApi.getWeightHistory(7)
      setRecords(res.records || [])
    } catch {
      // Handled silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    trackerApi.getWeightHistory(7)
      .then((res) => {
        if (mounted) {
          setRecords(res.records || [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  const latestRecord = records[records.length - 1] || null
  const firstRecord = records.length > 1 ? records[0] : null
  const netChange = latestRecord && firstRecord ? Number((latestRecord.weight - firstRecord.weight).toFixed(1)) : null

  const handleAdjustWeight = (delta: number) => {
    const current = parseFloat(weightInput.trim()) || latestRecord?.weight || 70.0
    const updated = Math.max(20, Math.min(500, Number((current + delta).toFixed(1))))
    setWeightInput(String(updated))
  }

  const handleSave = async () => {
    setError(null)
    const val = parseFloat(weightInput.trim())
    if (isNaN(val) || val < 20 || val > 500) {
      setError('Please enter a valid weight between 20 and 500 kg.')
      return
    }

    setSubmitting(true)
    try {
      await trackerApi.logWeight(date, val, notesInput.trim() || undefined, true)
      setModalOpen(false)
      setWeightInput('')
      setNotesInput('')
      await loadWeight()
      onWeightLogged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log weight.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return null
  }

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <TrackerIcon name="weight" size="sm" color={colors.primary} />
            <Text style={styles.title}>Weight</Text>
            {netChange !== null && (
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor:
                      netChange < 0
                        ? colors.successSubtle
                        : netChange > 0
                        ? colors.coralSubtle
                        : colors.surfaceRaised,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.trendText,
                    {
                      color:
                        netChange < 0
                          ? colors.emerald
                          : netChange > 0
                          ? colors.coral
                          : colors.textMuted,
                    },
                  ]}
                >
                  {netChange > 0 ? `+${netChange}` : `${netChange}`} kg
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerActions}>
            {records.length > 0 && (
              <Button
                label={showHistory ? 'Hide' : 'History'}
                onPress={() => setShowHistory((prev) => !prev)}
                size="sm"
                variant="ghost"
              />
            )}
            <Button
              label={latestRecord ? 'Update' : 'Log'}
              onPress={() => {
                if (latestRecord) {
                  setWeightInput(String(latestRecord.weight))
                }
                setModalOpen(true)
              }}
              size="sm"
              variant="outline"
            />
          </View>
        </View>

        <View style={styles.contentRow}>
          {latestRecord ? (
            <View style={styles.statGroup}>
              <View style={styles.weightNumRow}>
                <Text style={styles.weightNum}>{latestRecord.weight}</Text>
                <Text style={styles.weightUnit}>kg</Text>
              </View>
              <Text style={styles.dateLabel}>
                Logged on {String(latestRecord.date).slice(0, 10)}
                {latestRecord.notes ? ` • ${latestRecord.notes}` : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No weight logged this week</Text>
          )}
        </View>

        {/* 7-Day History List */}
        {showHistory && records.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyHeading}>Recent 7-Day Entries</Text>
            <View style={styles.historyList}>
              {records
                .slice()
                .reverse()
                .map((rec, idx) => (
                  <View key={rec.id || idx} style={styles.historyRow}>
                    <Text style={styles.historyDate}>
                      {String(rec.date).slice(0, 10)}
                    </Text>
                    <View style={styles.historyRight}>
                      {rec.notes ? (
                        <Text numberOfLines={1} style={styles.historyNotes}>
                          {rec.notes}
                        </Text>
                      ) : null}
                      <Text style={styles.historyWeight}>{rec.weight} kg</Text>
                    </View>
                  </View>
                ))}
            </View>
          </View>
        )}
      </Card>

      {/* Quick Entry Modal with Quick-Adjust Steps */}
      <Modal
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
        transparent
        visible={modalOpen}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Weight</Text>
              <Pressable
                accessibilityLabel="Close modal"
                hitSlop={8}
                onPress={() => setModalOpen(false)}
              >
                <TrackerIcon name="close" size="sm" color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.modalForm}>
              <Input
                keyboardType="decimal-pad"
                label="Weight (kg)"
                onChangeText={setWeightInput}
                placeholder="e.g. 72.5"
                value={weightInput}
              />

              {/* Quick Stepper Buttons matching Web WeightPanel */}
              <View style={styles.steppersRow}>
                <TouchableOpacity
                  onPress={() => handleAdjustWeight(-1.0)}
                  style={styles.stepBtn}
                >
                  <Text style={styles.stepBtnText}>-1.0</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAdjustWeight(-0.1)}
                  style={styles.stepBtn}
                >
                  <Text style={styles.stepBtnText}>-0.1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAdjustWeight(0.1)}
                  style={styles.stepBtn}
                >
                  <Text style={styles.stepBtnText}>+0.1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleAdjustWeight(1.0)}
                  style={styles.stepBtn}
                >
                  <Text style={styles.stepBtnText}>+1.0</Text>
                </TouchableOpacity>
              </View>

              <Input
                label="Notes (optional)"
                onChangeText={setNotesInput}
                placeholder="e.g. Morning fasted"
                value={notesInput}
              />

              {error ? <Text style={styles.modalError}>{error}</Text> : null}

              <Button
                disabled={submitting}
                label={submitting ? 'Saving...' : 'Save Weight'}
                loading={submitting}
                onPress={() => void handleSave()}
                size="lg"
                variant="primary"
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: '700',
    color: colors.text,
  },
  trendBadge: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '800',
  },
  contentRow: {
    paddingVertical: spacing.xs,
  },
  statGroup: {
    gap: 2,
  },
  weightNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  weightNum: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  weightUnit: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
    color: colors.textMuted,
  },
  dateLabel: {
    fontSize: typography.xs.fontSize,
    color: colors.textSubtle,
  },
  emptyText: {
    fontSize: typography.sm.fontSize,
    color: colors.textMuted,
  },
  historySection: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    gap: spacing.xs,
  },
  historyHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyList: {
    gap: spacing.xs,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.sm,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyNotes: {
    fontSize: 11,
    color: colors.textSubtle,
    maxWidth: 120,
  },
  historyWeight: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: typography.md.fontSize,
    fontWeight: '800',
    color: colors.text,
  },
  modalForm: {
    gap: spacing.md,
  },
  steppersRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    justifyContent: 'space-between',
  },
  stepBtn: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  modalError: {
    color: colors.danger,
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
  },
})