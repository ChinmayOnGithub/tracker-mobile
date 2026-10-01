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
import { colors, radius, spacing, typography } from '@/theme/tokens'

export function NotesScreen() {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [search, setSearch] = useState('')
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
    setFormContent(note.content || '')
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

  const query = search.trim().toLowerCase()
  const filtered = notes.filter((n) => {
    if (!query) return true
    const titleMatch = n.title?.toLowerCase().includes(query) ?? false
    const contentMatch = n.content.toLowerCase().includes(query)
    return titleMatch || contentMatch
  })

  const wordCount = formContent.trim() ? formContent.trim().split(/\s+/).length : 0

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

      {error ? (
        <ErrorView message={error} onRetry={() => void loadNotes()} />
      ) : null}

      {/* Notes List */}
      {filtered.length === 0 ? (
        <EmptyState
          message={
            query
              ? `No notes matching "${search}".`
              : 'No notes created yet. Tap "+ New" to add your first note.'
          }
          title={query ? 'No notes found' : 'Notes is empty'}
        />
      ) : (
        <View style={styles.list}>
          {filtered.map((note) => {
            const preview = note.content.slice(0, 140).replace(/\n/g, ' ')
            return (
              <TouchableOpacity
                key={note.id}
                onPress={() => openEditModal(note)}
                activeOpacity={0.8}
              >
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.noteTitle} numberOfLines={1}>
                      {note.title || 'Untitled Note'}
                    </Text>
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
                  <Text style={styles.noteDate}>
                    {note.updatedAt || note.createdAt
                      ? new Date(note.updatedAt || note.createdAt!).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </Text>
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
                <Text style={styles.wordCount}>{wordCount} words</Text>
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

const styles = StyleSheet.create({
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
  noteTitle: {
    color: colors.text,
    fontSize: typography.md.fontSize,
    fontWeight: '700',
    flex: 1,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  previewText: {
    color: colors.textMuted,
    fontSize: typography.sm.fontSize,
    lineHeight: 20,
  },
  noteDate: {
    color: colors.textSubtle,
    fontSize: 11,
    marginTop: 4,
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
