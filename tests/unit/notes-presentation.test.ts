import { describe, expect, it } from 'bun:test'
import {
  countChars,
  countWords,
  filterNotes,
  getNoteCounts,
  isNoteFromToday,
  stripHtml,
} from '@/features/notes/notes-presentation'
import type { NoteItem } from '@/api/client'
import { todayYmd } from '@/utils/date'

function createMockNote(overrides: Partial<NoteItem> = {}): NoteItem {
  const today = todayYmd()
  return {
    id: 'note-default',
    userId: 'user-1',
    date: today,
    title: 'Test Note',
    content: 'Sample content',
    createdAt: `${today}T10:00:00Z`,
    updatedAt: `${today}T10:00:00Z`,
    ...overrides,
  }
}

describe('Notes Presentation & Filtering Logic', () => {
  it('strips html tags cleanly and counts words and characters', () => {
    const rawHtml = '<p>Hello <strong>World</strong>!</p><br/><div>How are you today?</div>'
    const stripped = stripHtml(rawHtml)
    expect(stripped).toBe('Hello World! How are you today?')
    expect(countWords(rawHtml)).toBe(6)
    expect(countChars(rawHtml)).toBe(31)
  })

  it('handles empty or whitespace-only html gracefully', () => {
    expect(stripHtml('')).toBe('')
    expect(countWords('')).toBe(0)
    expect(countChars('')).toBe(0)
    expect(stripHtml('   <p>   </p>   ')).toBe('')
    expect(countWords('   <p>   </p>   ')).toBe(0)
  })

  it('correctly identifies whether a note is from today', () => {
    const today = todayYmd()
    const todayNote = createMockNote({
      id: 'note-1',
      title: 'Today Note',
      content: 'Important thoughts',
      createdAt: `${today}T10:00:00Z`,
      updatedAt: `${today}T10:30:00Z`,
    })

    const pastNote = createMockNote({
      id: 'note-2',
      title: 'Past Note',
      content: 'Old thoughts',
      createdAt: '2026-01-01T10:00:00Z',
      updatedAt: '2026-01-01T10:00:00Z',
    })

    expect(isNoteFromToday(todayNote)).toBe(true)
    expect(isNoteFromToday(pastNote)).toBe(false)
  })

  it('calculates counts across filter categories', () => {
    const today = todayYmd()
    const sampleNotes: NoteItem[] = [
      createMockNote({
        id: 'n-1',
        title: 'Project Roadmap',
        content: 'Sprint planning',
        createdAt: `${today}T08:00:00Z`,
        updatedAt: `${today}T08:00:00Z`,
      }),
      createMockNote({
        id: 'n-2',
        title: '',
        content: 'Quick scratchpad',
        createdAt: `${today}T09:00:00Z`,
        updatedAt: `${today}T09:00:00Z`,
      }),
      createMockNote({
        id: 'n-3',
        title: 'Archive',
        content: 'Historical document',
        createdAt: '2025-12-01T12:00:00Z',
        updatedAt: '2025-12-01T12:00:00Z',
      }),
    ]

    const counts = getNoteCounts(sampleNotes)
    expect(counts.all).toBe(3)
    expect(counts.today).toBe(2)
    expect(counts.titled).toBe(2)
  })

  it('filters by category chip and query text simultaneously', () => {
    const today = todayYmd()
    const sampleNotes: NoteItem[] = [
      createMockNote({
        id: 'n-1',
        title: 'Tracker Mobile Architecture',
        content: 'Offline first with SQLite sync',
        createdAt: `${today}T08:00:00Z`,
        updatedAt: `${today}T08:00:00Z`,
      }),
      createMockNote({
        id: 'n-2',
        title: '',
        content: 'Buy milk and groceries',
        createdAt: `${today}T09:00:00Z`,
        updatedAt: `${today}T09:00:00Z`,
      }),
      createMockNote({
        id: 'n-3',
        title: 'Web Tracker Backend',
        content: 'Prisma soft delete safeguards',
        createdAt: '2026-01-01T12:00:00Z',
        updatedAt: '2026-01-01T12:00:00Z',
      }),
    ]

    // All filter
    expect(filterNotes(sampleNotes, 'all', '')).toHaveLength(3)

    // Today filter
    expect(filterNotes(sampleNotes, 'today', '')).toHaveLength(2)

    // Titled filter
    expect(filterNotes(sampleNotes, 'titled', '')).toHaveLength(2)

    // Search query on title
    expect(filterNotes(sampleNotes, 'all', 'backend')).toHaveLength(1)
    expect(filterNotes(sampleNotes, 'all', 'backend')[0].id).toBe('n-3')

    // Search query on content
    expect(filterNotes(sampleNotes, 'all', 'groceries')).toHaveLength(1)
    expect(filterNotes(sampleNotes, 'all', 'groceries')[0].id).toBe('n-2')

    // Combination of Today + query
    expect(filterNotes(sampleNotes, 'today', 'architecture')).toHaveLength(1)
    expect(filterNotes(sampleNotes, 'today', 'backend')).toHaveLength(0) // backend is from past
  })
})
