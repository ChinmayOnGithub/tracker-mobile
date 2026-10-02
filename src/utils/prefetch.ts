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

/**
 * Warms the local-first data path without making startup depend on a large
 * burst of network requests. Critical data is fetched first; secondary data
 * is intentionally deferred.
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

    // Critical warm-up: run independently so one slow endpoint never delays
    // the cache population of the others.
    void (async () => {
      if (fastCache.isFresh('templates', CACHE_TTL_MS)) return
      try {
        const response = await trackerApi.getTemplates()
        if (!response.templates) return
        await templateRepo.upsertFromServer(response.templates)
        fastCache.set('templates', response.templates, CACHE_TTL_MS)
      } catch {
        // Prefetch is opportunistic.
      }
    })()

    void (async () => {
      const key = `logs:${today}`
      if (fastCache.isFresh(key, CACHE_TTL_MS)) return
      try {
        const response = await trackerApi.getLogs(today)
        if (!response.logs) return
        await logRepo.upsertFromServer(response.logs)
        fastCache.set(key, response.logs, CACHE_TTL_MS)
      } catch {
        // Prefetch is opportunistic.
      }
    })()

    void (async () => {
      const key = `cal:month:${monthStr}`
      if (fastCache.isFresh(key, CACHE_TTL_MS)) return
      try {
        const response = await trackerApi.getCalendarMonth(monthStr)
        if (response.summaries) {
          fastCache.set(key, response.summaries, CACHE_TTL_MS)
        }
      } catch {
        // Prefetch is opportunistic.
      }
    })()

    // Secondary data is deliberately delayed so opening the app does not
    // compete with the first interactive render.
    await later(LOW_PRIORITY_DELAY_MS)

    void (async () => {
      if (fastCache.isFresh('notes', CACHE_TTL_MS)) return
      try {
        const response = await trackerApi.getNotes()
        if (response.notes) fastCache.set('notes', response.notes, CACHE_TTL_MS)
      } catch {
        // Prefetch is opportunistic.
      }
    })()

    void (async () => {
      const key = `leave:${currentYear}`
      if (fastCache.isFresh(key, CACHE_TTL_MS)) return
      try {
        const response = await trackerApi.getLeaveData(currentYear)
        fastCache.set(key, response, CACHE_TTL_MS)
      } catch {
        // Prefetch is opportunistic.
      }
    })()

    void (async () => {
      const key = 'weight_history:7'
      if (fastCache.isFresh(key, CACHE_TTL_MS)) return
      try {
        const response = await trackerApi.getWeightHistory(7)
        if (response.records) fastCache.set(key, response.records, CACHE_TTL_MS)
      } catch {
        // Prefetch is opportunistic.
      }
    })()
  } finally {
    // The function only schedules work; do not keep the global guard held
    // while low-priority requests are running.
    isPrefetching = false
  }
}
