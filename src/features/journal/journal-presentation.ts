import { colors } from '@/theme/tokens'
import type { JournalEntry } from '@/api/types'

export type JournalSectionTab = 'entry' | 'gratitude' | 'reflections' | 'lessons' | 'plan' | 'history'

export interface MoodOption {
  label: string
  value: string
  color: string
  emoji: string
}

export const JOURNAL_MOODS: MoodOption[] = [
  { label: 'Great', value: 'great', color: colors.emerald, emoji: '😄' },
  { label: 'Good', value: 'good', color: colors.sky, emoji: '🙂' },
  { label: 'Okay', value: 'okay', color: colors.purple, emoji: '😐' },
  { label: 'Low', value: 'low', color: colors.amber, emoji: '😔' },
  { label: 'Tough', value: 'tough', color: colors.danger, emoji: '😫' },
]

export function countWords(text: string): number {
  if (!text) return 0
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return clean ? clean.split(/\s+/).filter(Boolean).length : 0
}

export function countChars(text: string): number {
  if (!text) return 0
  return text.trim().length
}

export function getMoodDetails(moodValue: string | null | undefined): MoodOption | undefined {
  if (!moodValue) return undefined
  return JOURNAL_MOODS.find((m) => m.value.toLowerCase() === moodValue.toLowerCase())
}

export function prepareJournalPayload(data: {
  content: string
  mood: string | null
  gratitude: string
  reflections: string
  lessonsLearned: string
  tomorrowPlan: string
}): Partial<JournalEntry> {
  return {
    content: data.content,
    mood: data.mood,
    gratitude: data.gratitude.trim() || null,
    reflections: data.reflections.trim() || null,
    lessonsLearned: data.lessonsLearned.trim() || null,
    tomorrowPlan: data.tomorrowPlan.trim() || null,
  }
}
