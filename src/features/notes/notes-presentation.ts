import type { NoteItem } from '@/api/client'
import { todayYmd } from '@/utils/date'

export type NoteFilterType = 'all' | 'today' | 'titled'

export function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function countWords(text: string): number {
  const stripped = stripHtml(text)
  return stripped ? stripped.split(/\s+/).filter(Boolean).length : 0
}

export function countChars(text: string): number {
  return stripHtml(text).length
}

export function isNoteFromToday(note: NoteItem): boolean {
  const today = todayYmd()
  if (note.createdAt && note.createdAt.startsWith(today)) return true
  if (note.updatedAt && note.updatedAt.startsWith(today)) return true
  return false
}

export function filterNotes(
  notes: NoteItem[],
  filter: NoteFilterType,
  query: string
): NoteItem[] {
  const cleanQuery = query.trim().toLowerCase()

  return notes.filter((n) => {
    // 1. Filter by category chip
    if (filter === 'today' && !isNoteFromToday(n)) {
      return false
    }
    if (filter === 'titled' && (!n.title || !n.title.trim())) {
      return false
    }

    // 2. Filter by search query
    if (cleanQuery) {
      const titleMatch = (n.title || '').toLowerCase().includes(cleanQuery)
      const contentMatch = (stripHtml(n.content) || '').toLowerCase().includes(cleanQuery)
      return titleMatch || contentMatch
    }

    return true
  })
}

export function getNoteCounts(notes: NoteItem[]): Record<NoteFilterType, number> {
  let todayCount = 0
  let titledCount = 0

  for (const n of notes) {
    if (isNoteFromToday(n)) todayCount++
    if (n.title && n.title.trim()) titledCount++
  }

  return {
    all: notes.length,
    today: todayCount,
    titled: titledCount,
  }
}
