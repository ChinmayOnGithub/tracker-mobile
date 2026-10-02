import type { SQLiteDatabase } from 'expo-sqlite'
import { trackerApi } from '@/api/client'
import { TemplateRepository, LogRepository } from '@/db/repository'
import { fastCache } from './dataCache'
import { todayYmd } from './date'

let isPrefetching = false

const CACHE_TTL_MS = 30_000
const LOW_PRIORITY_DELAY_MS = 750

function later(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function prefetchTemplates(repo: TemplateRepository): Promise<void> {
  if (fastCache.isFresh('templates', CACHE_TTL_MS)) return
  try {
    const response = await trackerApi.getTemplates()
    if (!response.templates) return
    await repo.upsertFromServer(response.templates)
    fastCache.set('templates', response.templates, CACHE_TTL_MS)
  } catch {
    // Prefetch is opportunistic.
  }
}

async function prefetchLogs(repo: LogRepository, date: string): Promise<void> {
  const key = `logs:${date}`
  if (fastCache.isFresh(key, CACHE_TTL_MS)) return
  try {
    const response = await trackerApi.getLogs(date)
    if (!response.logs) return
    await repo.upsertFromServer(response.logs)
    fastCache.set(key, response.logs, CACHE_TTL_MS)
  } catch {
    // Prefetch is opportunistic.
  }
}

async function prefetchCalendar(month: string): Promise<void> {
  const key = `cal:month:${month}`
  if (fastCache.isFresh(key, CACHE_TTL_MS)) return
  try {
    const response = await trackerApi.getCalendarMonth(month)
    if (response.summaries) fastCache.set(key, response.summaries, CACHE_TTL_MS)
  } catch {
    // Prefetch is opportunistic.
  }
}

async function prefetchSecondary(year: number): Promise<void> {
  await later(LOW_PRIORITY_DELAY_MS)

  await Promise.allSettled([
    (async () => {
      if (fastCache.isFresh('notes', CACHE_TTL_MS)) return
      try {
        const response = await trackerApi.getNotes()
        if (response.notes) fastCache.set('notes', response.notes, CACHE_TTL_MS)
      } catch {
        // Prefetch is opportunistic.
      }
    })(),
    (async () => {
      const key = `leave:${year}`
      if (fastCache.isFresh(key, CACHE_TTL_MS)) return
      try {
        const response = await trackerApi.getLeaveData(year)
        fastCache.set(key, response, CACHE_TTL_MS)
      } catch {
        // Prefetch is opportunistic.
      }
    })(),
    (async () => {
      const key = 'weight_history:7'
      if (fastCache.isFresh(key, CACHE_TTL_MS)) return
      try {
        const response = await trackerApi.getWeightHistory(7)
        if (response.records) fastCache.set(key, response.records, CACHE_TTL_MS)
      } catch {
        // Prefetch is opportunistic.
      }
    })(),
  ])
}

/**
 * Warms the local-first data path without making startup depend on a large
 * network burst. Critical data is fetched first; secondary data is delayed.
 *
 * The UI should never await this function.
 */
export async function prefetchAppData(db: SQLiteDatabase): Promise<void> {
  if (isPrefetching) return
  isPrefetching = true

  const today = todayYmd()
  const monthStr = today.slice(0, 7)
  const currentYear = new Date().getFullYear()

  try {
    const templateRepo = new TemplateRepository(db)
    const logRepo = new LogRepository(db)

    await Promise.allSettled([
      prefetchTemplates(templateRepo),
      prefetchLogs(logRepo, today),
      prefetchCalendar(monthStr),
    ])

    await prefetchSecondary(currentYear)
  } finally {
    // Keep the guard held until every scheduled request finishes so a second
    // mount cannot create another overlapping prefetch burst.
    isPrefetching = false
  }
}
