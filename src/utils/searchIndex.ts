import type { JournalEntry, NoteItem } from '@/api/client'
import type { SQLiteDatabase } from 'expo-sqlite'
import { SearchRepository, type SearchDocument } from '@/db/repository'

function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function noteDocument(note: NoteItem): SearchDocument {
  return {
    entityType: 'note',
    entityId: note.id,
    title: note.title?.trim() || 'Untitled Note',
    body: stripHtml(note.content),
    updatedAt: note.updatedAt ?? note.createdAt ?? null,
  }
}

function journalDocument(entry: JournalEntry): SearchDocument {
  return {
    entityType: 'journal',
    entityId: entry.id,
    title: entry.date,
    body: [
      entry.content,
      entry.gratitude,
      entry.reflections,
      entry.lessonsLearned,
      entry.tomorrowPlan,
      entry.mood,
    ].filter(Boolean).join(' '),
    updatedAt: entry.updatedAt ?? entry.createdAt ?? null,
  }
}

export async function indexNotes(
  db: SQLiteDatabase,
  notes: NoteItem[],
): Promise<void> {
  await new SearchRepository(db).upsertMany(notes.map(noteDocument))
}

export async function indexNote(
  db: SQLiteDatabase,
  note: NoteItem,
): Promise<void> {
  await new SearchRepository(db).upsert(noteDocument(note))
}

export async function removeNoteFromSearch(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await new SearchRepository(db).remove('note', id)
}

export async function indexJournal(
  db: SQLiteDatabase,
  entry: JournalEntry | null,
): Promise<void> {
  if (!entry) return
  await new SearchRepository(db).upsert(journalDocument(entry))
}

export async function removeJournalFromSearch(
  db: SQLiteDatabase,
  id: string,
): Promise<void> {
  await new SearchRepository(db).remove('journal', id)
}
