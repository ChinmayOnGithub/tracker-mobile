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

    // On Oct 2 (next day): automatically due as nextDueDate with postponement metadata
    const occOct2 = computeTaskOccurrences([weeklyTemplate], logs, '2026-10-02')
    expect(occOct2.length).toBe(1)
    expect(occOct2[0].status).toBe('cleared') // Fresh pending task for the new day
    expect(occOct2[0].isPostponedOccurrence).toBe(true)
    expect(occOct2[0].postponedFromDate).toBe('2026-10-01')
    expect(occOct2[0].postponedLogId).toBe('log-postponed')

    // Re-postpone / unpostpone: deleting the postponed log removes the task from Oct 2
    const revertedLogs = logs.filter((l) => l.id !== 'log-postponed')
    // Next due date for weekly without postpone log is not Oct 2
    const occReverted = computeTaskOccurrences(
      [{ ...weeklyTemplate, recurrenceInterval: 1 } as any],
      revertedLogs,
      '2026-10-02'
    )
    expect(occReverted.length).toBe(1)
    expect(occReverted[0].isPostponedOccurrence).toBe(false)
  })

  it('supports repeated postpone (Monday -> Tuesday -> Wednesday)', () => {
    const weeklyTemplate: ActivityTemplate = {
      ...baseTemplate,
      id: 't-weekly',
      name: 'Weekly Review',
      recurrenceType: 'weekly',
    }

    // Postponed on Oct 1, then postponed again on Oct 2
    const logs: ActivityLog[] = [
      {
        id: 'log-postpone-1',
        activityId: 't-weekly',
        date: '2026-10-01',
        status: 'postponed',
        note: null,
        amount: null,
        createdAt: '2026-10-01T12:00:00.000Z',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
      {
        id: 'log-postpone-2',
        activityId: 't-weekly',
        date: '2026-10-02',
        status: 'postponed',
        note: null,
        amount: null,
        createdAt: '2026-10-02T12:00:00.000Z',
        updatedAt: '2026-10-02T12:00:00.000Z',
      },
    ]

    // On Oct 2: shown as postponed (history preserved on Oct 2)
    const occOct2 = computeTaskOccurrences([weeklyTemplate], logs, '2026-10-02')
    expect(occOct2.length).toBe(1)
    expect(occOct2[0].status).toBe('postponed')
    expect(occOct2[0].isPostponed).toBe(true)

    // On Oct 3: due as postponed occurrence from Oct 2
    const occOct3 = computeTaskOccurrences([weeklyTemplate], logs, '2026-10-03')
    expect(occOct3.length).toBe(1)
    expect(occOct3[0].status).toBe('cleared')
    expect(occOct3[0].isPostponedOccurrence).toBe(true)
    expect(occOct3[0].postponedFromDate).toBe('2026-10-02')
    expect(occOct3[0].postponedLogId).toBe('log-postpone-2')
  })

  it('handles one-time task postpone and unpostpone targetDate reversion', () => {
    const oneTimeTemplate: ActivityTemplate = {
      ...baseTemplate,
      id: 't-onetime',
      name: 'File Taxes',
      recurrenceType: 'one_time',
      targetDate: '2026-10-02', // Postponed to Oct 2
    } as any

    const logs: ActivityLog[] = [
      {
        id: 'log-onetime-postponed',
        activityId: 't-onetime',
        date: '2026-10-01',
        status: 'postponed',
        note: null,
        amount: null,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
    ]

    // On Oct 2: due as postponed occurrence
    const occOct2 = computeTaskOccurrences([oneTimeTemplate], logs, '2026-10-02')
    expect(occOct2.length).toBe(1)
    expect(occOct2[0].isPostponedOccurrence).toBe(true)
    expect(occOct2[0].postponedFromDate).toBe('2026-10-01')
    expect(occOct2[0].postponedLogId).toBe('log-onetime-postponed')

    // On unpostpone: targetDate reverted to 2026-10-01, log deleted
    const revertedTemplate: ActivityTemplate = {
      ...oneTimeTemplate,
      targetDate: '2026-10-01',
    } as any

    // On Oct 2: no longer due!
    const occOct2AfterRevert = computeTaskOccurrences([revertedTemplate], [], '2026-10-02')
    expect(occOct2AfterRevert.length).toBe(0)

    // On Oct 1: due on original date!
    const occOct1AfterRevert = computeTaskOccurrences([revertedTemplate], [], '2026-10-01')
    expect(occOct1AfterRevert.length).toBe(1)
    expect(occOct1AfterRevert[0].status).toBe('cleared')
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

  it('includes orphaned activity logs that have no active template', () => {
    const templates = [baseTemplate]
    const logs: ActivityLog[] = [
      {
        id: 'orphan-log-1',
        activityId: 'deleted-or-unmatched-template',
        date: '2026-10-02',
        status: 'done',
        note: 'Spontaneous entry',
        amount: 5,
        createdAt: '2026-10-02T15:00:00.000Z',
        updatedAt: '2026-10-02T15:00:00.000Z',
      },
    ]

    const occurrences = computeTaskOccurrences(templates, logs, '2026-10-02')
    expect(occurrences.length).toBe(2)
    const orphanOcc = occurrences.find((o) => o.id === 'orphan_orphan-log-1')
    expect(orphanOcc).toBeDefined()
    expect(orphanOcc?.isCompleted).toBe(true)
    expect(orphanOcc?.status).toBe('done')
    expect(orphanOcc?.logId).toBe('orphan-log-1')
  })
})
