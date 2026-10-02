import { useEffect, useState } from 'react'
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import type { ActivityTemplate, CreateTemplateInput } from '@/api/client'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { TrackerIcon } from '@/components/TrackerIcon'
import { SymbolPicker } from './SymbolPicker'
import { useTheme } from '@/theme/ThemeContext'
import { paletteColors, radius, spacing, typography } from '@/theme/tokens'

const FORM_CATEGORIES = ['work', 'personal', 'fitness', 'health', 'learning', 'finance']
const RECURRENCE_OPTIONS: CreateTemplateInput['recurrenceType'][] = [
  'daily',
  'weekly',
  'monthly',
  'custom',
  'one_time',
]
const PRIORITY_OPTIONS = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL']

export interface ActivityFormData {
  id?: string
  name: string
  category: string
  recurrenceType: CreateTemplateInput['recurrenceType']
  color: string
  priority: string
  icon?: string
  notes?: string | null
}

interface ActivityFormModalProps {
  visible: boolean
  saving: boolean
  error: string | null
  initialData?: ActivityTemplate | null
  onClose: () => void
  onSubmit: (data: ActivityFormData) => Promise<void>
}

export function ActivityFormModal({
  visible,
  saving,
  error,
  initialData,
  onClose,
  onSubmit,
}: ActivityFormModalProps) {
  const { colors } = useTheme()
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('work')
  const [formRecurrence, setFormRecurrence] = useState<CreateTemplateInput['recurrenceType']>('daily')
  const [formColor, setFormColor] = useState<string>(paletteColors[0])
  const [formPriority, setFormPriority] = useState<string>('NORMAL')
  const [formIcon, setFormIcon] = useState<string>('activity')
  const [formNotes, setFormNotes] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (initialData) {
      setFormName(initialData.name)
      setFormCategory(initialData.category || 'work')
      setFormRecurrence((initialData.recurrenceType as CreateTemplateInput['recurrenceType']) || 'daily')
      setFormColor(initialData.color || paletteColors[0])
      setFormPriority(
        'priority' in initialData && typeof initialData.priority === 'string'
          ? initialData.priority
          : 'NORMAL'
      )
      setFormIcon(initialData.icon || 'activity')
      setFormNotes(initialData.notes || '')
    } else {
      setFormName('')
      setFormCategory('work')
      setFormRecurrence('daily')
      setFormColor(paletteColors[0])
      setFormPriority('NORMAL')
      setFormIcon('activity')
      setFormNotes('')
    }
    setValidationError(null)
  }, [initialData, visible])

  const handleClose = () => {
    setValidationError(null)
    onClose()
  }

  const handleSubmit = async () => {
    const trimmed = formName.trim()
    if (!trimmed) {
      setValidationError('Activity name is required.')
      return
    }
    setValidationError(null)

    await onSubmit({
      id: initialData?.id,
      name: trimmed,
      category: formCategory,
      recurrenceType: formRecurrence,
      color: formColor,
      priority: formPriority,
      icon: formIcon,
      notes: formNotes.trim() || null,
    })
  }

  const displayError = validationError || error
  const isEditing = !!initialData

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEditing ? 'Edit Activity Template' : 'New Activity Template'}
            </Text>
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
            <Text style={[styles.label, { color: colors.text }]}>Activity Name</Text>
            <Input
              placeholder="e.g. Morning Workout"
              value={formName}
              onChangeText={setFormName}
              autoFocus={!isEditing}
            />

            {/* Symbol Picker */}
            <Text style={[styles.label, { color: colors.text }]}>Activity Symbol</Text>
            <SymbolPicker
              selectedSymbol={formIcon}
              color={formColor}
              onSelect={(symbol) => setFormIcon(symbol.value)}
            />

            <Text style={[styles.label, { color: colors.text }]}>Category</Text>
            <View style={styles.optionRow}>
              {FORM_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setFormCategory(cat)}
                  style={[
                    styles.optionChip,
                    { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                    formCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select category ${cat}`}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      { color: colors.textMuted },
                      formCategory === cat && { color: colors.white, fontWeight: '700' },
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Recurrence</Text>
            <View style={styles.optionRow}>
              {RECURRENCE_OPTIONS.map((rec) => (
                <TouchableOpacity
                  key={rec}
                  onPress={() => setFormRecurrence(rec)}
                  style={[
                    styles.optionChip,
                    { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                    formRecurrence === rec && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select recurrence ${rec}`}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      { color: colors.textMuted },
                      formRecurrence === rec && { color: colors.white, fontWeight: '700' },
                    ]}
                  >
                    {rec === 'one_time' ? 'One-time' : rec.charAt(0).toUpperCase() + rec.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Priority</Text>
            <View style={styles.optionRow}>
              {PRIORITY_OPTIONS.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setFormPriority(p)}
                  style={[
                    styles.optionChip,
                    { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                    formPriority === p && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select priority ${p}`}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      { color: colors.textMuted },
                      formPriority === p && { color: colors.white, fontWeight: '700' },
                    ]}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Notes / Instructions (Optional)</Text>
            <Input
              placeholder="e.g. 3 sets of 10 reps"
              value={formNotes}
              onChangeText={setFormNotes}
            />

            <Text style={[styles.label, { color: colors.text }]}>Accent Color</Text>
            <View style={styles.colorPalette}>
              {paletteColors.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setFormColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    formColor === c && [styles.colorCircleSelected, { borderColor: colors.text }],
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select color ${c}`}
                />
              ))}
            </View>

            {displayError ? (
              <Text style={[styles.formErrorText, { color: colors.danger }]}>{displayError}</Text>
            ) : null}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={handleClose}
              disabled={saving}
            />
            <Button
              label={saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Activity'}
              onPress={handleSubmit}
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
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.lg.fontSize,
    fontWeight: '700',
  },
  modalBody: {
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  label: {
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
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: typography.xs.fontSize,
    fontWeight: '500',
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
  },
  formErrorText: {
    fontSize: typography.xs.fontSize,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
})
