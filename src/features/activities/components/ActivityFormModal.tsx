import { useState } from 'react'
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import type { CreateTemplateInput } from '@/api/client'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { TrackerIcon } from '@/components/TrackerIcon'
import { colors, paletteColors, radius, spacing, typography } from '@/theme/tokens'

const FORM_CATEGORIES = ['work', 'personal', 'fitness', 'health', 'learning']
const RECURRENCE_OPTIONS: CreateTemplateInput['recurrenceType'][] = [
  'daily',
  'weekly',
  'monthly',
  'custom',
]

interface ActivityFormData {
  name: string
  category: string
  recurrenceType: CreateTemplateInput['recurrenceType']
  color: string
}

interface ActivityFormModalProps {
  visible: boolean
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (data: ActivityFormData) => Promise<void>
}

export function ActivityFormModal({
  visible,
  saving,
  error,
  onClose,
  onSubmit,
}: ActivityFormModalProps) {
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('work')
  const [formRecurrence, setFormRecurrence] = useState<CreateTemplateInput['recurrenceType']>('daily')
  const [formColor, setFormColor] = useState<string>(paletteColors[0])
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleClose = () => {
    setFormName('')
    setFormCategory('work')
    setFormRecurrence('daily')
    setFormColor(paletteColors[0])
    setValidationError(null)
    onClose()
  }

  const handleCreate = async () => {
    const trimmed = formName.trim()
    if (!trimmed) {
      setValidationError('Activity name is required.')
      return
    }
    setValidationError(null)

    await onSubmit({
      name: trimmed,
      category: formCategory,
      recurrenceType: formRecurrence,
      color: formColor,
    })
  }

  const displayError = validationError || error

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Activity Template</Text>
            <TouchableOpacity
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              hitSlop={8}
            >
              <TrackerIcon name="x" size="sm" color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.label}>Activity Name</Text>
            <Input
              placeholder="e.g. Morning Workout"
              value={formName}
              onChangeText={setFormName}
              autoFocus
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.optionRow}>
              {FORM_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setFormCategory(cat)}
                  style={[
                    styles.optionChip,
                    formCategory === cat && styles.optionChipActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select category ${cat}`}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      formCategory === cat && styles.optionChipTextActive,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Recurrence</Text>
            <View style={styles.optionRow}>
              {RECURRENCE_OPTIONS.map((rec) => (
                <TouchableOpacity
                  key={rec}
                  onPress={() => setFormRecurrence(rec)}
                  style={[
                    styles.optionChip,
                    formRecurrence === rec && styles.optionChipActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select recurrence ${rec}`}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      formRecurrence === rec && styles.optionChipTextActive,
                    ]}
                  >
                    {rec.charAt(0).toUpperCase() + rec.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Accent Color</Text>
            <View style={styles.colorPalette}>
              {paletteColors.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setFormColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    formColor === c && styles.colorCircleSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select color ${c}`}
                />
              ))}
            </View>

            {displayError ? (
              <Text style={styles.formErrorText}>{displayError}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={handleClose}
              disabled={saving}
            />
            <Button
              label={saving ? 'Saving...' : 'Create Activity'}
              onPress={handleCreate}
              disabled={saving}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.lg.fontSize,
    fontWeight: '700',
  },
  modalBody: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  optionChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  optionChipText: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  colorPalette: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: colors.white,
  },
  formErrorText: {
    color: colors.danger,
    fontSize: typography.xs.fontSize,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
})
