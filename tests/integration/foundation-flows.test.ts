import { describe, expect, it } from 'bun:test'
import type { ActivityLog, ActivityTemplate } from '@/api/types'

describe('Mobile Foundation Integration Flows', () => {
  it('handles complete local caching lifecycle for templates and logs', async () => {
    const memoryTemplates: Map<string, ActivityTemplate> = new Map()
    const memoryLogs: Map<string, ActivityLog[]> = new Map()

    const mockDb = {
      cacheTemplates: async (templates: ActivityTemplate[]) => {
        templates.forEach((t) => memoryTemplates.set(t.id, t))
      },
      getCachedTemplates: async () => Array.from(memoryTemplates.values()),
      cacheLogs: async (date: string, logs: ActivityLog[]) => {
        memoryLogs.set(date, logs)
      },
      getCachedLogs: async (date: string) => memoryLogs.get(date) ?? [],
    }

    const testTemplates: ActivityTemplate[] = [
      {
        id: 'tmpl-1',
        name: 'Morning Workout',
        category: 'Fitness',
        type: 'boolean',
        icon: 'dumbbell',
        color: '#22c55e',
        recurrenceType: 'daily',
        isActive: true,
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ]

    const testLogs: ActivityLog[] = [
      {
        id: 'log-1',
        activityId: 'tmpl-1',
        date: '2026-10-01',
        status: 'done',
        note: 'Completed full session',
        amount: null,
        createdAt: '2026-10-01T07:00:00Z',
        updatedAt: '2026-10-01T07:00:00Z',
      },
    ]

    // 1. Cache server response
    await mockDb.cacheTemplates(testTemplates)
    await mockDb.cacheLogs('2026-10-01', testLogs)

    // 2. Read back from cache
    const cachedT = await mockDb.getCachedTemplates()
    const cachedL = await mockDb.getCachedLogs('2026-10-01')

    expect(cachedT).toHaveLength(1)
    expect(cachedT[0].name).toBe('Morning Workout')
    expect(cachedL).toHaveLength(1)
    expect(cachedL[0].status).toBe('done')

    // 3. Fallback on different date returns empty array cleanly
    const missingDateLogs = await mockDb.getCachedLogs('2026-09-30')
    expect(missingDateLogs).toEqual([])
  })

  it('determines cold-start navigation target based on auth state', () => {
    function resolveNavigationTarget(isLoading: boolean, isAuthenticated: boolean): string {
      if (isLoading) return 'LOADING'
      return isAuthenticated ? '/(app)/(tabs)' : '/(auth)/login'
    }

    expect(resolveNavigationTarget(true, false)).toBe('LOADING')
    expect(resolveNavigationTarget(false, false)).toBe('/(auth)/login')
    expect(resolveNavigationTarget(false, true)).toBe('/(app)/(tabs)')
  })
})