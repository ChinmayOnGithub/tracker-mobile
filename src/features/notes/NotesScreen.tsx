import { useCallback, useState } from 'react'
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { trackerApi, type NoteItem } from '@/api/client'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { radius, spacing, typography } from '@/theme/tokens'
import { useTheme } from '@/theme/ThemeContext'
import { fmtRelativeTime } from '@/utils/date'
import {
  countChars,
  countWords,
  filterNotes,
  getNoteCounts,
  stripHtml,
  type NoteFilterType,
} from './notes-presentation'

export function NotesScreen() {
  const { colors } = useTheme()
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<NoteFilterType>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal State
  const [modalVisible, setModalVisible] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadNotes = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await trackerApi.getNotes()
      setNotes(res.notes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notes.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadNotes()
    }, [loadNotes])
  )

  const openCreateModal = () => {
    setEditingNote(null)
    setFormTitle('')
    setFormContent('')
    setFormError(null)
    setModalVisible(true)
  }

  const openEditModal = (note: NoteItem) => {
    setEditingNote(note)
    setFormTitle(note.title || '')
    setFormContent(stripHtml(note.content) || note.content || '')
    setFormError(null)
    setModalVisible(true)
  }

  const handleSave = async () => {
    if (!formContent.trim() && !formTitle.trim()) {
      setFormError('Note must have a title or content.')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      if (editingNote) {
        const res = await trackerApi.updateNote(editingNote.id, formContent, formTitle)
        setNotes((prev) =>
          prev.map((n) => (n.id === editingNote.id ? res.note : n))
        )
      } else {
        const res = await trackerApi.createNote(formContent, formTitle)
        setNotes((prev) => [res.note, ...prev])
      }
      setModalVisible(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save note.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string, title?: string | null) => {
    Alert.alert(
      'Delete Note',
      `Are you sure you want to delete "${title || 'Untitled Note'}"? It will be moved to Bin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await trackerApi.deleteNote(id)
              setNotes((prev) => prev.filter((n) => n.id !== id))
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete note.')
            }
          },
        },
      ]
    )
  }

  if (loading && !refreshing) {
    return (
      <Screen>
        <LoadingState message="Loading notes..." />
      </Screen>
    )
  }

  const filtered = filterNotes(notes, activeFilter, search)
  const counts = getNoteCounts(notes)
  const formWords = countWords(formContent)
  const formChars = countChars(formContent)

  const styles = React.useMemo(() => createStyles(colors), [colors])

  return (
    <Screen onRefresh={() => void loadNotes(true)} refreshing={refreshing}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>Notes</Text>
            <Text style={styles.subtitle}>
              Capture ideas, plans, checklists, and references.
            </Text>
          </View>
          <Button
            label="+ New"
            size="sm"
            onPress={openCreateModal}
            accessibilityLabel="Create new note"
          />
        </View>
      </View>

      {/* Search Input */}
      <Input
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onChangeText={setSearch}
        placeholder="Search notes..."
        value={search}
      />

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'today', 'titled'] as const).map((filterKey) => {
          const isActive = activeFilter === filterKey
          const label =
            filterKey === 'all'
              ? `All (${counts.all})`
              : filterKey === 'today'
              ? `Today (${counts.today})`
              : `Titled (${counts.titled})`

          return (
            <TouchableOpacity
              key={filterKey}
              onPress={() => setActiveFilter(filterKey)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {error ? (
        <ErrorView message={error} onRetry={() => void loadNotes()} />
      ) : null}

      {/* Notes List */}
      {filtered.length === 0 ? (
        <EmptyState
          message={
            search.trim()
              ? `No notes matching "${search}".`
              : activeFilter === 'today'
              ? 'No notes created or updated today.'
              : activeFilter === 'titled'
              ? 'No titled notes found.'
              : 'No notes created yet. Tap "+ New" to add your first note.'
          }
          title={search.trim() ? 'No notes found' : 'Notes is empty'}
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((note) => {
            const stripped = stripHtml(note.content)
            const preview = stripped.slice(0, 140)
            const words = countWords(stripped)
            const chars = countChars(stripped)
            const timeAgo = fmtRelativeTime(note.updatedAt || note.createdAt)

            return (
              <TouchableOpacity
                key={note.id}
                onPress={() => openEditModal(note)}
                activeOpacity={0.8}
              >
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.iconCircle}>
                        <TrackerIcon name="notes" size="xs" color={colors.primary} />
                      </View>
                      <Text style={styles.noteTitle} numberOfLines={1}>
                        {note.title?.trim() || 'Untitled Note'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(note.id, note.title)}
                      style={styles.deleteBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${note.title || 'note'}`}
                    >
                      <TrackerIcon name="trash" size="xs" color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {preview ? (
                    <Text style={styles.previewText} numberOfLines={2}>
                      {preview}
                    </Text>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <Text style={styles.statsBadge}>
                      {words} {words === 1 ? 'word' : 'words'} • {chars} chars
                    </Text>
                    {timeAgo ? (
                      <View style={styles.timeWrap}>
                        <TrackerIcon name="clock" size="xs" color={colors.textSubtle} />
                        <Text style={styles.noteDate}>{timeAgo}</Text>
                      </View>
                    ) : null}
                  </View>
                </Card>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* Create / Edit Note Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingNote ? 'Edit Note' : 'New Note'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Close modal"
              >
                <TrackerIcon name="x" size="sm" color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={styles.label}>Title (optional)</Text>
              <Input
                placeholder="Note title..."
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <View style={styles.contentLabelRow}>
                <Text style={styles.label}>Content</Text>
                <Text style={styles.wordCount}>
                  {formWords} {formWords === 1 ? 'word' : 'words'} • {formChars} chars
                </Text>
              </View>
              <TextInput
                multiline
                placeholder="Write your note here..."
                placeholderTextColor={colors.textMuted}
                value={formContent}
                onChangeText={setFormContent}
                style={styles.textArea}
                textAlignVertical="top"
              />

              {formError ? (
                <Text style={styles.formErrorText}>{formError}</Text>
              ) : null}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setModalVisible(false)}
                disabled={saving}
              />
              <Button
                label={saving ? 'Saving...' : editingNote ? 'Save Changes' : 'Create Note'}
                onPress={handleSave}
                disabled={saving}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: typography.hero.fontSize,
    lineHeight: typography.hero.lineHeight,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteTitle: {
    color: colors.text,
    fontSize: typography.md.fontSize,
    fontWeight: '700',
    flex: 1,
  },
  deleteBtn: {
    padding: spacing.xs,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: 20,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statsBadge: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '500',
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noteDate: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  // Modal styles
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
    maxHeight: '90%',
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
  },
  contentLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    color: colors.textMuted,
    fontSize: 11,
  },
  textArea: {
    color: colors.text,
    fontSize: typography.sm.fontSize,
    lineHeight: 22,
    minHeight: 180,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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