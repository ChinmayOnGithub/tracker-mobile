import type { SQLiteDatabase } from 'expo-sqlite'
import { trackerApi } from '@/api/client'
import { TemplateRepository, LogRepository } from '@/db/repository'
import { fastCache } from './dataCache'
import { todayYmd } from './date'

let isPrefetching = false

/**
 * Proactively prefetches critical app data (templates, today's logs, calendar month, notes)
 * in the background on app startup and caches it in SQLite + memory.
 * Ensures all tab navigations are instant with 0ms perceived latency.
 */
export async function prefetchAppData(db: SQLiteDatabase): Promise<void> {
  if (isPrefetching) return
  isPrefetching = true

  const today = todayYmd()
  const monthStr = today.slice(0, 7)

  try {
    const templateRepo = new TemplateRepository(db)
    const logRepo = new LogRepository(db)

    const currentYear = new Date().getFullYear()

    // Parallel fetch in background without blocking UI
    const [templatesRes, logsRes, calRes, notesRes, leaveRes, weightRes] = await Promise.allSettled([
      trackerApi.getTemplates(),
      trackerApi.getLogs(today),
      trackerApi.getCalendarMonth(monthStr),
      trackerApi.getNotes(),
      trackerApi.getLeaveData(currentYear),
      trackerApi.getWeightHistory(7),
    ])

    if (templatesRes.status === 'fulfilled' && templatesRes.value.templates) {
      await templateRepo.upsertFromServer(templatesRes.value.templates)
      fastCache.set('templates', templatesRes.value.templates)
    }

    if (logsRes.status === 'fulfilled' && logsRes.value.logs) {
      await logRepo.upsertFromServer(logsRes.value.logs)
      fastCache.set(`logs:${today}`, logsRes.value.logs)
    }

    if (calRes.status === 'fulfilled' && calRes.value.summaries) {
      fastCache.set(`cal:month:${monthStr}`, calRes.value.summaries)
    }

    if (notesRes.status === 'fulfilled' && notesRes.value.notes) {
      fastCache.set('notes', notesRes.value.notes)
    }

    if (leaveRes.status === 'fulfilled' && leaveRes.value) {
      fastCache.set(`leave:${currentYear}`, leaveRes.value)
    }

    if (weightRes.status === 'fulfilled' && weightRes.value?.records) {
      fastCache.set('weight_history:7', weightRes.value.records)
    }
  } catch {
    // Non-blocking background prefetch
  } finally {
    isPrefetching = false
  }
}
