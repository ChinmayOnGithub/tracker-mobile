import { describe, expect, it } from 'bun:test'
import {
  addUTCDays,
  addUTCMonths,
  addUTCYears,
  analyzeRecurrence,
  diffUTCDays,
  formatUTCDate,
  parseUTCDate,
  type ActivityTemplateDomain,
} from '@/domain/recurrence'

describe('Domain Recurrence Analysis', () => {
  it('correctly performs UTC date arithmetic', () => {
    const parsed = parseUTCDate('2026-10-01')
    expect(formatUTCDate(parsed)).toBe('2026-10-01')
    expect(addUTCDays('2026-10-01', 5)).toBe('2026-10-06')
    expect(addUTCMonths('2026-01-31', 1)).toBe('2026-02-28') // Clamped to month end
    expect(addUTCYears('2024-02-29', 1)).toBe('2025-02-28') // Non-leap year clamp
    expect(diffUTCDays('2026-10-10', '2026-10-01')).toBe(9)
  })

  it('marks daily activity as overdue if completed before today', () => {
    const template: ActivityTemplateDomain = {
      id: 'tmpl-1',
      name: 'Exercise',
      category: 'Fitness',
      recurrenceType: 'daily',
    }

    const analysis = analyzeRecurrence(
      template,
      [{ activityId: 'tmpl-1', date: '2026-09-29', status: 'done' }],
      '2026-10-01'
    )

    expect(analysis.overdue).toBe(true)
    expect(analysis.nextDueDate).toBe('2026-09-30')
    expect(analysis.daysSinceLast).toBe(2)
  })

  it('reschedules postponed non-daily activity to next day', () => {
    const template: ActivityTemplateDomain = {
      id: 'tmpl-2',
      name: 'Deep Reading',
      category: 'Learning',
      recurrenceType: 'weekly',
    }

    const analysis = analyzeRecurrence(
      template,
      [{ activityId: 'tmpl-2', date: '2026-10-01', status: 'postponed' }],
      '2026-10-01'
    )

    expect(analysis.statusMessage).toBe('Postponed')
    expect(analysis.nextDueDate).toBe('2026-10-02')
  })
})