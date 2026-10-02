import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { radius, spacing, typography } from '@/theme/tokens'
import { useTheme } from '@/theme/ThemeContext'
import { fastCache } from '@/utils/dataCache'
import { appEvents } from '@/utils/events'
import { useSQLiteContext } from 'expo-sqlite'
import { indexJournal, removeJournalFromSearch } from '@/utils/searchIndex'
import {
  JOURNAL_MOODS,
  countChars,
  countWords,
  getMoodDetails,
  prepareJournalPayload,
  type JournalSectionTab,
} from './journal-presentation'

export function JournalScreen() {
  const db = useSQLiteContext()
  const { colors } = useTheme()
  const [selectedDate, setSelectedDate] = useState(todayYmd())
  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | null>(null)
  const [activeTab, setActiveTab] = useState<JournalSectionTab>('entry')

  // Form Fields
  const [content, setContent] = useState('')
  const [mood, setMood] = useState<string | null>(null)
  const [gratitude, setGratitude] = useState('')
  const [reflections, setReflections] = useState('')
  const [lessonsLearned, setLessonsLearned] = useState('')
  const [tomorrowPlan, setTomorrowPlan] = useState('')

  const isToday = selectedDate === todayYmd()

  // Track whether form has unsaved user edits
  const isDirtyRef = useRef(false)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    setSaveStatus(null)
    isDirtyRef.current = false

    // Check fastCache first for instant 0ms render
    const cacheKey = `journal:${dateStr}`
    const cached = fastCache.get<JournalEntry | null>(cacheKey)
    if (fastCache.has(cacheKey)) {
      if (cached) {
        setEntry(cached)
        setContent(cached.content || '')
        setMood(cached.mood || null)
        setGratitude(cached.gratitude || '')
        setReflections(cached.reflections || '')
        setLessonsLearned(cached.lessonsLearned || '')
        setTomorrowPlan(cached.tomorrowPlan || '')
        setSaveStatus('saved')
      } else {
        setEntry(null)
        setContent('')
        setMood(null)
        setGratitude('')
        setReflections('')
        setLessonsLearned('')
        setTomorrowPlan('')
        setSaveStatus(null)
      }
      setLoading(false)
    } else {
      setLoading(true)
    }

    try {
      const res = await trackerApi.getJournalEntry(dateStr)
      fastCache.set(`journal:${dateStr}`, res.entry)
      await indexJournal(db, res.entry)
      if (res.entry) {
        setEntry(res.entry)
        setContent(res.entry.content || '')
        setMood(res.entry.mood || null)
        setGratitude(res.entry.gratitude || '')
        setReflections(res.entry.reflections || '')
        setLessonsLearned(res.entry.lessonsLearned || '')
        setTomorrowPlan(res.entry.tomorrowPlan || '')
        setSaveStatus('saved')
      } else {
        setEntry(null)
        setContent('')
        setMood(null)
        setGratitude('')
        setReflections('')
        setLessonsLearned('')
        setTomorrowPlan('')
        setSaveStatus(null)
      }
    } catch {
      if (cached === undefined) {
        setEntry(null)
      }
    } finally {
      setLoading(false)
      isDirtyRef.current = false
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadJournal(selectedDate)
    }, [selectedDate, loadJournal])
  )

  useEffect(() => {
    return appEvents.on('journal:changed', () => {
      void loadJournal(selectedDate)
    })
  }, [selectedDate, loadJournal])

  const performSave = useCallback(
    async (targetDate: string, isSilent = false) => {
      if (saving) return
      if (!isSilent) setSaving(true)
      setSaveStatus('saving')

      try {
        const payload = prepareJournalPayload({
          content,
          mood,
          gratitude,
          reflections,
          lessonsLearned,
          tomorrowPlan,
        })
        const res = await trackerApi.upsertJournalEntry(targetDate, payload)
        setEntry(res.entry)
        fastCache.set(`journal:${targetDate}`, res.entry)
        appEvents.emit('journal:changed')
        setSaveStatus('saved')
        isDirtyRef.current = false
      } catch (err) {
        if (!isSilent) {
          Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save journal entry.')
        }
        setSaveStatus('dirty')
      } finally {
        if (!isSilent) setSaving(false)
      }
    },
    [content, mood, gratitude, reflections, lessonsLearned, tomorrowPlan, saving]
  )

  // Debounced Autosave (1500ms after user stops typing)
  useEffect(() => {
    if (!isDirtyRef.current || loading) return

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(() => {
      void performSave(selectedDate, true)
    }, 1500)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [content, mood, gratitude, reflections, lessonsLearned, tomorrowPlan, selectedDate, loading, performSave])

  const handleNavigateDate = async (newDate: string) => {
    if (newDate === selectedDate) return

    // Flush any pending unsaved changes before moving
    if (isDirtyRef.current) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
      await performSave(selectedDate, true)
    }

    setSelectedDate(newDate)
  }

  const markDirty = () => {
    isDirtyRef.current = true
    setSaveStatus('dirty')
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
              fastCache.set(`journal:${selectedDate}`, null)
              await removeJournalFromSearch(db, entry.id)
              appEvents.emit('journal:changed')
              setContent('')
              setMood(null)
              setGratitude('')
              setReflections('')
              setLessonsLearned('')
              setTomorrowPlan('')
              setSaveStatus(null)
              isDirtyRef.current = false
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete entry.')
            }
          },
        },
      ]
    )
  }

  const contentWords = countWords(content)
  const contentChars = countChars(content)

  const styles = useMemo(() => createStyles(colors), [colors])

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardWrap}
      >
        {/* Date Navigator */}
        <View style={styles.dateBar}>
          <TouchableOpacity
            onPress={() => void handleNavigateDate(addDays(selectedDate, -1))}
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
                onPress={() => void handleNavigateDate(todayYmd())}
                style={styles.jumpTodayBtn}
                accessibilityRole="button"
                accessibilityLabel="Jump to today"
              >
                <Text style={styles.jumpTodayText}>Jump to Today</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => void handleNavigateDate(addDays(selectedDate, 1))}
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
              <View style={styles.moodHeaderRow}>
                <Text style={styles.sectionHeading}>Daily Mood</Text>
                {mood ? (
                  <Text style={styles.activeMoodText}>
                    {getMoodDetails(mood)?.label} {getMoodDetails(mood)?.emoji}
                  </Text>
                ) : null}
              </View>
              <View style={styles.moodRow}>
                {JOURNAL_MOODS.map((m) => {
                  const isSelected = mood === m.value
                  return (
                    <TouchableOpacity
                      key={m.value}
                      onPress={() => {
                        setMood(isSelected ? null : m.value)
                        markDirty()
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollRow}>
              {(
                [
                  { key: 'entry', label: 'Entry' },
                  { key: 'gratitude', label: 'Gratitude' },
                  { key: 'reflections', label: 'Reflections' },
                  { key: 'lessons', label: 'Lessons' },
                  { key: 'plan', label: "Tomorrow's Plan" },
                  { key: 'history', label: 'History' },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={[styles.sectionTab, isActive && styles.sectionTabActive]}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.sectionTabText,
                        isActive && styles.sectionTabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>

            {/* Input Card depending on active tab */}
            {activeTab === 'entry' && (
              <Card style={styles.editorCard}>
                <View style={styles.editorMetaRow}>
                  <Text style={styles.editorHint}>Write your thoughts, events, and lessons...</Text>
                  <Text style={styles.wordCount}>
                    {contentWords} {contentWords === 1 ? 'word' : 'words'} • {contentChars} chars
                  </Text>
                </View>
                <TextInput
                  multiline
                  placeholder="How was your day? What challenged or inspired you?"
                  placeholderTextColor={colors.textMuted}
                  value={content}
                  onChangeText={(txt) => {
                    setContent(txt)
                    markDirty()
                  }}
                  style={styles.textArea}
                  textAlignVertical="top"
                />
              </Card>
            )}

            {activeTab === 'gratitude' && (
              <Card style={styles.editorCard}>
                <View style={styles.editorMetaRow}>
                  <Text style={styles.editorHint}>3 things you are grateful for today:</Text>
                  <Text style={styles.wordCount}>{countWords(gratitude)} words</Text>
                </View>
                <TextInput
                  multiline
                  placeholder="1. ...&#10;2. ...&#10;3. ..."
                  placeholderTextColor={colors.textMuted}
                  value={gratitude}
                  onChangeText={(txt) => {
                    setGratitude(txt)
                    markDirty()
                  }}
                  style={styles.textAreaShort}
                  textAlignVertical="top"
                />
              </Card>
            )}

            {activeTab === 'reflections' && (
              <Card style={styles.editorCard}>
                <View style={styles.editorMetaRow}>
                  <Text style={styles.editorHint}>Deep reflections & mindful thoughts:</Text>
                  <Text style={styles.wordCount}>{countWords(reflections)} words</Text>
                </View>
                <TextInput
                  multiline
                  placeholder="What went well today? What patterns did you notice?"
                  placeholderTextColor={colors.textMuted}
                  value={reflections}
                  onChangeText={(txt) => {
                    setReflections(txt)
                    markDirty()
                  }}
                  style={styles.textAreaShort}
                  textAlignVertical="top"
                />
              </Card>
            )}

            {activeTab === 'lessons' && (
              <Card style={styles.editorCard}>
                <View style={styles.editorMetaRow}>
                  <Text style={styles.editorHint}>Key lessons learned today:</Text>
                  <Text style={styles.wordCount}>{countWords(lessonsLearned)} words</Text>
                </View>
                <TextInput
                  multiline
                  placeholder="What would you do differently next time?"
                  placeholderTextColor={colors.textMuted}
                  value={lessonsLearned}
                  onChangeText={(txt) => {
                    setLessonsLearned(txt)
                    markDirty()
                  }}
                  style={styles.textAreaShort}
                  textAlignVertical="top"
                />
              </Card>
            )}

            {activeTab === 'plan' && (
              <Card style={styles.editorCard}>
                <View style={styles.editorMetaRow}>
                  <Text style={styles.editorHint}>Top priorities for tomorrow:</Text>
                  <Text style={styles.wordCount}>{countWords(tomorrowPlan)} words</Text>
                </View>
                <TextInput
                  multiline
                  placeholder="What must get done tomorrow?"
                  placeholderTextColor={colors.textMuted}
                  value={tomorrowPlan}
                  onChangeText={(txt) => {
                    setTomorrowPlan(txt)
                    markDirty()
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
                          void handleNavigateDate(d.dateStr)
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
                    onPress={() => void performSave(selectedDate, false)}
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

const createStyles = (colors: any) => StyleSheet.create({
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
  moodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeMoodText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.coral,
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
  tabScrollRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: 2,
  },
  sectionTab: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
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
    backgroundColor: colors.coralSubtle,
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