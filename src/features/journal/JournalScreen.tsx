import { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { trackerApi, type JournalEntry } from '@/api/client'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { addDays, formatDisplayDate, todayYmd } from '@/utils/date'
import { colors, radius, spacing, typography } from '@/theme/tokens'

const MOODS = [
  { label: 'Great', value: 'great', color: colors.emerald, emoji: '😄' },
  { label: 'Good', value: 'good', color: colors.sky, emoji: '🙂' },
  { label: 'Okay', value: 'okay', color: colors.purple, emoji: '😐' },
  { label: 'Low', value: 'low', color: colors.amber, emoji: '😔' },
  { label: 'Tough', value: 'tough', color: colors.danger, emoji: '😫' },
]

type SectionTab = 'entry' | 'gratitude' | 'plan' | 'history'

export function JournalScreen() {
  const [selectedDate, setSelectedDate] = useState(todayYmd())
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | null>(null)
  const [activeTab, setActiveTab] = useState<SectionTab>('entry')

  // Form Fields
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<string | null>(null)
  const [gratitude, setGratitude] = useState('')
  const [tomorrowPlan, setTomorrowPlan] = useState('')

  const isToday = selectedDate === todayYmd()

  const pastDays = useMemo(() => {
    const days: { dateStr: string; displayDate: string; isToday: boolean }[] = []
    const today = todayYmd()
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, -i)
      days.push({
        dateStr: d,
        displayDate: formatDisplayDate(d),
        isToday: d === today,
      })
    }
    return days
  }, [])

  const loadJournal = useCallback(async (dateStr: string) => {
    setLoading(true)
    setSaveStatus(null)
    try {
      const res = await trackerApi.getJournalEntry(dateStr)
      if (res.entry) {
        setEntry(res.entry)
        setContent(res.entry.content || '')
        setMood(res.entry.mood || null)
        setGratitude(res.entry.gratitude || '')
        setTomorrowPlan(res.entry.tomorrowPlan || '')
        setSaveStatus('saved')
      } else {
        setEntry(null)
        setContent('')
        setMood(null)
        setGratitude('')
        setTomorrowPlan('')
        setSaveStatus(null)
      }
    } catch {
      setEntry(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadJournal(selectedDate)
    }, [selectedDate, loadJournal])
  )

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('saving')
    try {
      const res = await trackerApi.upsertJournalEntry(selectedDate, {
        content,
        mood,
        gratitude: gratitude.trim() || null,
        tomorrowPlan: tomorrowPlan.trim() || null,
      })
      setEntry(res.entry)
      setSaveStatus('saved')
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save journal entry.')
      setSaveStatus('dirty')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = () => {
    if (!entry) return
    Alert.alert(
      'Delete Journal Entry',
      'Are you sure you want to delete this journal entry? It will be moved to Bin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await trackerApi.deleteJournalEntry(entry.id)
              setEntry(null)
              setContent('')
              setMood(null)
              setGratitude('')
              setTomorrowPlan('')
              setSaveStatus(null)
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete entry.')
            }
          },
        },
      ]
    )
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        {/* Date Navigator */}
        <View style={styles.dateBar}>
          <TouchableOpacity
            onPress={() => setSelectedDate(addDays(selectedDate, -1))}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Previous day"
          >
            <TrackerIcon name="chevron-left" size="sm" color={colors.text} />
          </TouchableOpacity>

          <View style={styles.dateLabelWrap}>
            <Text style={styles.dateTitle}>{formatDisplayDate(selectedDate)}</Text>
            {isToday ? (
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>TODAY</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setSelectedDate(todayYmd())}
                style={styles.jumpTodayBtn}
                accessibilityRole="button"
                accessibilityLabel="Jump to today"
              >
                <Text style={styles.jumpTodayText}>Jump to Today</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setSelectedDate(addDays(selectedDate, 1))}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Next day"
          >
            <TrackerIcon name="chevron-right" size="sm" color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <LoadingState message="Loading journal entry..." />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Mood Selector Card */}
            <Card style={styles.moodCard}>
              <Text style={styles.sectionHeading}>Daily Mood</Text>
              <View style={styles.moodRow}>
                {MOODS.map((m) => {
                  const isSelected = mood === m.value
                  return (
                    <TouchableOpacity
                      key={m.value}
                      onPress={() => {
                        setMood(isSelected ? null : m.value)
                        setSaveStatus('dirty')
                      }}
                      style={[
                        styles.moodChip,
                        isSelected && { borderColor: m.color, backgroundColor: `${m.color}22` },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Mood ${m.label}`}
                    >
                      <Text style={styles.moodEmoji}>{m.emoji}</Text>
                      <Text
                        style={[
                          styles.moodLabel,
                          isSelected && { color: m.color, fontWeight: '700' },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </Card>

            {/* Section Switcher Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                onPress={() => setActiveTab('entry')}
                style={[styles.sectionTab, activeTab === 'entry' && styles.sectionTabActive]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.sectionTabText,
                    activeTab === 'entry' && styles.sectionTabTextActive,
                  ]}
                >
                  Entry
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('gratitude')}
                style={[styles.sectionTab, activeTab === 'gratitude' && styles.sectionTabActive]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.sectionTabText,
                    activeTab === 'gratitude' && styles.sectionTabTextActive,
                  ]}
                >
                  Gratitude
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('plan')}
                style={[styles.sectionTab, activeTab === 'plan' && styles.sectionTabActive]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.sectionTabText,
                    activeTab === 'plan' && styles.sectionTabTextActive,
                  ]}
                >
                  {"Tomorrow's Plan"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('history')}
                style={[styles.sectionTab, activeTab === 'history' && styles.sectionTabActive]}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.sectionTabText,
                    activeTab === 'history' && styles.sectionTabTextActive,
                  ]}
                >
                  History
                </Text>
              </TouchableOpacity>
            </View>

            {/* Input Card depending on active tab */}
            {activeTab === 'entry' && (
              <Card style={styles.editorCard}>
                <View style={styles.editorMetaRow}>
                  <Text style={styles.editorHint}>Write your thoughts, events, and lessons...</Text>
                  <Text style={styles.wordCount}>{wordCount} words</Text>
                </View>
                <TextInput
                  multiline
                  placeholder="How was your day? What challenged or inspired you?"
                  placeholderTextColor={colors.textMuted}
                  value={content}
                  onChangeText={(txt) => {
                    setContent(txt)
                    setSaveStatus('dirty')
                  }}
                  style={styles.textArea}
                  textAlignVertical="top"
                />
              </Card>
            )}

            {activeTab === 'gratitude' && (
              <Card style={styles.editorCard}>
                <Text style={styles.editorHint}>3 things you are grateful for today:</Text>
                <TextInput
                  multiline
                  placeholder="1. ...&#10;2. ...&#10;3. ..."
                  placeholderTextColor={colors.textMuted}
                  value={gratitude}
                  onChangeText={(txt) => {
                    setGratitude(txt)
                    setSaveStatus('dirty')
                  }}
                  style={styles.textAreaShort}
                  textAlignVertical="top"
                />
              </Card>
            )}

            {activeTab === 'plan' && (
              <Card style={styles.editorCard}>
                <Text style={styles.editorHint}>Top priorities for tomorrow:</Text>
                <TextInput
                  multiline
                  placeholder="What must get done tomorrow?"
                  placeholderTextColor={colors.textMuted}
                  value={tomorrowPlan}
                  onChangeText={(txt) => {
                    setTomorrowPlan(txt)
                    setSaveStatus('dirty')
                  }}
                  style={styles.textAreaShort}
                  textAlignVertical="top"
                />
              </Card>
            )}

            {activeTab === 'history' && (
              <Card style={styles.editorCard}>
                <Text style={styles.editorHint}>Recent 14 Days Journal History:</Text>
                <View style={styles.historyList}>
                  {pastDays.map((d) => {
                    const isCurrent = d.dateStr === selectedDate
                    return (
                      <TouchableOpacity
                        key={d.dateStr}
                        onPress={() => {
                          setSelectedDate(d.dateStr)
                          setActiveTab('entry')
                        }}
                        style={[
                          styles.historyRow,
                          isCurrent && styles.historyRowActive,
                        ]}
                      >
                        <View style={styles.historyRowTextCol}>
                          <Text
                            style={[
                              styles.historyDateText,
                              isCurrent && styles.historyDateTextActive,
                            ]}
                          >
                            {d.displayDate}
                          </Text>
                          {d.isToday ? (
                            <Text style={styles.historyTodayTag}>TODAY</Text>
                          ) : null}
                        </View>
                        <TrackerIcon
                          name="chevron-right"
                          size="xs"
                          color={isCurrent ? colors.coral : colors.textSubtle}
                        />
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </Card>
            )}

            {/* Footer Actions & Status */}
            {activeTab !== 'history' && (
              <View style={styles.footerRow}>
                <View style={styles.statusIndicator}>
                  {saveStatus === 'saved' && (
                    <Text style={styles.statusTextSaved}>✓ Saved</Text>
                  )}
                  {saveStatus === 'saving' && (
                    <Text style={styles.statusTextSaving}>Saving...</Text>
                  )}
                  {saveStatus === 'dirty' && (
                    <Text style={styles.statusTextDirty}>• Unsaved changes</Text>
                  )}
                </View>

                <View style={styles.actionsRight}>
                  {entry && (
                    <Button
                      label="Delete"
                      variant="destructive"
                      size="sm"
                      onPress={handleDelete}
                      disabled={saving}
                      accessibilityLabel="Delete journal entry"
                    />
                  )}
                  <Button
                    label={saving ? 'Saving...' : 'Save Journal'}
                    size="sm"
                    onPress={handleSave}
                    disabled={saving}
                    accessibilityLabel="Save journal entry"
                  />
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  navBtn: {
    padding: spacing.xs,
  },
  dateLabelWrap: {
    alignItems: 'center',
    gap: 2,
  },
  dateTitle: {
    color: colors.text,
    fontSize: typography.md.fontSize,
    fontWeight: '700',
  },
  todayBadge: {
    backgroundColor: colors.coralSubtle,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  todayBadgeText: {
    color: colors.coral,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  jumpTodayBtn: {
    paddingVertical: 1,
  },
  jumpTodayText: {
    color: colors.coral,
    fontSize: 10,
    fontWeight: '600',
  },
  scrollContent: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  moodCard: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  sectionHeading: {
    color: colors.text,
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  moodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    marginHorizontal: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  moodEmoji: {
    fontSize: 18,
  },
  moodLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  sectionTabActive: {
    backgroundColor: colors.coral,
    borderColor: colors.coral,
  },
  sectionTabText: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
    fontWeight: '600',
  },
  sectionTabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  editorCard: {
    padding: spacing.md,
    gap: spacing.xs,
    minHeight: 220,
  },
  editorMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editorHint: {
    color: colors.textMuted,
    fontSize: typography.xs.fontSize,
  },
  wordCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  textArea: {
    color: colors.text,
    fontSize: typography.sm.fontSize,
    lineHeight: 22,
    minHeight: 180,
    paddingTop: spacing.xs,
  },
  textAreaShort: {
    color: colors.text,
    fontSize: typography.sm.fontSize,
    lineHeight: 22,
    minHeight: 140,
    paddingTop: spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  statusIndicator: {
    flex: 1,
  },
  statusTextSaved: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextSaving: {
    color: colors.textMuted,
    fontSize: 12,
  },
  statusTextDirty: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRight: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  historyList: {
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  historyRowActive: {
    borderColor: colors.coral,
    backgroundColor: 'rgba(255, 117, 87, 0.08)',
  },
  historyRowTextCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  historyDateText: {
    fontSize: typography.sm.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  historyDateTextActive: {
    color: colors.coral,
    fontWeight: '700',
  },
  historyTodayTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.coral,
    backgroundColor: colors.coralSubtle,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
})
