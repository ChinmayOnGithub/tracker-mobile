export const RECURRENCE_TYPES = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'custom',
  'milestone',
  'one_time',
] as const

export type RecurrenceType = (typeof RECURRENCE_TYPES)[number]

export const ACTIVITY_TYPES = [
  'PERSONAL',
  'WORKOUT',
  'MEETING',
  'BILL',
  'MEDICINE',
  'LEAVE',
  'JOURNAL',
  'LEARNING',
  'REMINDER',
  'TASK',
  'CUSTOM',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const PRIORITIES = ['LOW', 'MEDIUM', 'NORMAL', 'HIGH', 'CRITICAL'] as const
export type Priority = (typeof PRIORITIES)[number]

export type ActivityStatus = 'cleared' | 'done' | 'canceled' | 'postponed'

/**
 * Deterministic Activity Status Cycling Machine
 *
 * Daily activities:
 *   cleared -> done -> canceled -> cleared (Postpone is skipped)
 *
 * Non-daily activities:
 *   cleared -> done -> canceled -> postponed -> cleared
 */
export function getNextActivityStatus(
  currentStatus: ActivityStatus | string,
  recurrenceType: string
): ActivityStatus {
  const normalized = (currentStatus || 'cleared').toLowerCase() as ActivityStatus
  const isDaily = recurrenceType.toLowerCase() === 'daily'

  if (isDaily) {
    switch (normalized) {
      case 'cleared':
        return 'done'
      case 'done':
        return 'canceled'
      case 'canceled':
      case 'postponed':
      default:
        return 'cleared'
    }
  }

  // Non-daily
  switch (normalized) {
    case 'cleared':
      return 'done'
    case 'done':
      return 'canceled'
    case 'canceled':
      return 'postponed'
    case 'postponed':
    default:
      return 'cleared'
  }
}