import { describe, expect, it } from 'bun:test'
import { clearUserLocalData } from '@/db/database'
import { fastCache } from '@/utils/dataCache'
import { computeTaskOccurrences } from '@/domain/timeline'
import type { ActivityLog, ActivityTemplate } from '@/api/types'

describe('Today Scheduling & User Data Isolation', () => {
  it('clearUserLocalData wipes user tables and ensures zero data leakage', async () => {
    const executedQueries: string[] = []
    const fakeDb = {
      withTransactionAsync: async (cb: () => Promise<void>) => {
        await cb()
      },
      execAsync: async (sql: string) => {
        executedQueries.push(sql)
      },
    } as any

    await clearUserLocalData(fakeDb)

    expect(executedQueries.length).toBe(1)
    const sql = executedQueries[0]
    expect(sql).toContain('DELETE FROM activity_log;')
    expect(sql).toContain('DELETE FROM activity_template;')
    expect(sql).toContain('DELETE FROM calendar_event;')
    expect(sql).toContain('DELETE FROM tracker_search;')
    expect(sql).toContain('DELETE FROM mutation_queue;')
    expect(sql).toContain('DELETE FROM tombstones;')
    expect(sql).toContain('DELETE FROM onboarding_state;')
    expect(sql).toContain('DELETE FROM sync_state;')
  })

  it('fastCache.clear() removes all user-scoped hot caches', () => {
    fastCache.set('templates', [{ id: 't1' }])
    fastCache.set('notes', [{ id: 'n1' }])
    fastCache.set('journal:2026-10-03', { id: 'j1' })

    expect(fastCache.has('templates')).toBe(true)
    expect(fastCache.has('notes')).toBe(true)

    fastCache.clear()

    expect(fastCache.has('templates')).toBe(false)
    expect(fastCache.has('notes')).toBe(false)
    expect(fastCache.has('journal:2026-10-03')).toBe(false)
  })

  it('scheduling an existing template as a task computes an occurrence today without creating duplicate templates', () => {
    const existingTemplate: ActivityTemplate = {
      id: 'template-work-1',
      name: 'Deep Work Session',
      category: 'work',
      type: 'TASK',
      icon: 'briefcase',
      color: '#3b82f6',
      recurrenceType: 'one_time',
      isActive: true,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    }

    const templates = [existingTemplate]
    const logsBefore: ActivityLog[] = []
    const todayStr = '2026-10-03'

    // Before scheduling, one_time task with no targetDate is not on today's schedule
    const tasksBefore = computeTaskOccurrences(templates, logsBefore, todayStr)
    expect(tasksBefore.find((t) => t.templateId === existingTemplate.id)).toBeUndefined()

    // When scheduled from activities, a log with status cleared is created for today
    const scheduledLog: ActivityLog = {
      id: 'log-scheduled-1',
      activityId: existingTemplate.id,
      date: todayStr,
      status: 'cleared',
      note: null,
      amount: null,
      createdAt: '2026-10-03T10:00:00Z',
      updatedAt: '2026-10-03T10:00:00Z',
    }

    const logsAfter = [...logsBefore, scheduledLog]
    const tasksAfter = computeTaskOccurrences(templates, logsAfter, todayStr)

    // Occurrence is now active for today, pointing to the original template ID
    const todayOccurrence = tasksAfter.find((t) => t.templateId === existingTemplate.id)
    expect(todayOccurrence).toBeDefined()
    expect(todayOccurrence?.templateId).toBe('template-work-1')
    expect(todayOccurrence?.title).toBe('Deep Work Session')
    expect(todayOccurrence?.status).toBe('cleared')
    expect(todayOccurrence?.logId).toBe('log-scheduled-1')

    // Verifies templates count remained exactly 1 (no duplicate template created)
    expect(templates.length).toBe(1)
  })
})
