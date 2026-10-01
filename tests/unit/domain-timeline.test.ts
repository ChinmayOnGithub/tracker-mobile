import { describe, expect, it } from 'bun:test'
import type { ActivityLog, ActivityTemplate } from '@/api/client'
import { computeTaskOccurrences } from '@/domain/timeline'

describe('Domain Task Occurrence Generation (computeTaskOccurrences)', () => {
  const baseTemplate: ActivityTemplate = {
    id: 't-daily',
    name: 'Morning Meditation',
    category: 'health',
    type: 'PERSONAL',
    icon: 'activity',
    color: '#ff7557',
    recurrenceType: 'daily',
    isActive: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }

  it('generates pending occurrence for due daily activity with no log', () => {
    const templates = [baseTemplate]
    const logs: ActivityLog[] = []
    const occurrences = computeTaskOccurrences(templates, logs, '2026-10-02')

    expect(occurrences.length).toBe(1)
    expect(occurrences[0].id).toBe('task_t-daily')
    expect(occurrences[0].status).toBe('cleared')
    expect(occurrences[0].isCompleted).toBe(false)
    expect(occurrences[0].logId).toBeNull()
  })

  it('reflects completed status when log exists with status=done', () => {
    const templates = [baseTemplate]
    const logs: ActivityLog[] = [
      {
        id: 'log-1',
        activityId: 't-daily',
        date: '2026-10-02',
        status: 'done',
        note: null,
        amount: null,
        createdAt: '2026-10-02T10:00:00.000Z',
        updatedAt: '2026-10-02T10:00:00.000Z',
      },
    ]
    const occurrences = computeTaskOccurrences(templates, logs, '2026-10-02')

    expect(occurrences.length).toBe(1)
    expect(occurrences[0].status).toBe('done')
    expect(occurrences[0].isCompleted).toBe(true)
    expect(occurrences[0].logId).toBe('log-1')
  })

  it('reschedules postponed non-daily activity to next day and includes on that day', () => {
    const weeklyTemplate: ActivityTemplate = {
      ...baseTemplate,
      id: 't-weekly',
      name: 'Weekly Review',
      recurrenceType: 'weekly',
    }

    // Postponed on Oct 1
    const logs: ActivityLog[] = [
      {
        id: 'log-postponed',
        activityId: 't-weekly',
        date: '2026-10-01',
        status: 'postponed',
        note: null,
        amount: null,
        createdAt: '2026-10-01T12:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
    ]

    // On Oct 1: shown as postponed
    const occOct1 = computeTaskOccurrences([weeklyTemplate], logs, '2026-10-01')
    expect(occOct1.length).toBe(1)
    expect(occOct1[0].status).toBe('postponed')
    expect(occOct1[0].isPostponed).toBe(true)

    // On Oct 2 (next day): automatically due as nextDueDate
    const occOct2 = computeTaskOccurrences([weeklyTemplate], logs, '2026-10-02')
    expect(occOct2.length).toBe(1)
    expect(occOct2[0].status).toBe('cleared') // Fresh pending task for the new day
  })

  it('orders timed activities before untimed activities, then by priority', () => {
    const untimedLow: ActivityTemplate = {
      ...baseTemplate,
      id: 't-untimed-low',
      name: 'Low Priority Habit',
      recurrenceType: 'daily',
      priority: 'LOW',
    } as any

    const untimedCritical: ActivityTemplate = {
      ...baseTemplate,
      id: 't-untimed-crit',
      name: 'Critical Priority Habit',
      recurrenceType: 'daily',
      priority: 'CRITICAL',
    } as any

    const timedActivity: ActivityTemplate = {
      ...baseTemplate,
      id: 't-timed',
      name: 'Standup Call',
      recurrenceType: 'daily',
      scheduledTime: '09:30',
    } as any

    const occurrences = computeTaskOccurrences(
      [untimedLow, untimedCritical, timedActivity],
      [],
      '2026-10-02'
    )

    expect(occurrences.length).toBe(3)
    // Timed item should come first
    expect(occurrences[0].id).toBe('task_t-timed')
    // Then Critical priority untimed item
    expect(occurrences[1].id).toBe('task_t-untimed-crit')
    // Then Low priority untimed item
    expect(occurrences[2].id).toBe('task_t-untimed-low')
  })
})
