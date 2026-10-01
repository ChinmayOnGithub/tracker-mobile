import React, { useEffect, useState, useCallback } from 'react'
import { StyleSheet, Text, View, Modal, Pressable } from 'react-native'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { TrackerIcon } from '@/components/TrackerIcon'
import { trackerApi, type WeightRecord } from '@/api/client'
import { colors, radius, spacing, typography } from '@/theme/tokens'

interface WeightWidgetCardProps {
  date: string
  onWeightLogged?: () => void
}

export function WeightWidgetCard({ date, onWeightLogged }: WeightWidgetCardProps) {
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [loading, setLoading] = useState(true)
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
    void loadWeight()
  }, [loadWeight])

  const latestRecord = records[records.length - 1] || null

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
          </View>

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

        <View style={styles.contentRow}>
          {latestRecord ? (
            <View style={styles.statGroup}>
              <View style={styles.weightNumRow}>
                <Text style={styles.weightNum}>{latestRecord.weight}</Text>
                <Text style={styles.weightUnit}>kg</Text>
              </View>
              <Text style={styles.dateLabel}>
                Logged on {String(latestRecord.date).slice(0, 10)}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No weight logged this week</Text>
          )}
        </View>
      </Card>

      {/* Quick Entry Modal */}
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
              <Input
                label="Notes (optional)"
                onChangeText={setNotesInput}
                placeholder="e.g. Post-workout"
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

const styles = StyleSheet.create({
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
  title: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
    fontWeight: '700',
    color: colors.text,
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
  modalError: {
    color: colors.danger,
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
  },
})
