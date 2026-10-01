export interface ActivityTemplateDomain {
  id: string
  name: string
  category: string
  recurrenceType: string
  recurrenceInterval?: number | null
  recurrenceDaysOfWeek?: string | null
  recurrenceDayOfMonth?: number | null
  recurrenceMonth?: number | null
  targetDate?: string | null
  remindBeforeDays?: number | null
  effectiveFrom?: string | Date | null
  isActive?: boolean
}

export interface ActivityLogDomain {
  id?: string
  activityId: string
  date: string
  status: string
}

export interface RecurrenceAnalysis {
  lastCompletedDate: string | null
  nextDueDate: string | null
  overdue: boolean
  daysSinceLast: number | null
  monthsSinceLast: number | null
  streak: number
  statusMessage: string
}

// Timezone-safe YYYY-MM-DD date parsing and arithmetic
export function parseUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatUTCDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addUTCDays(dateStr: string, days: number): string {
  const date = parseUTCDate(dateStr)
  date.setUTCDate(date.getUTCDate() + days)
  return formatUTCDate(date)
}

export function addUTCMonths(dateStr: string, months: number): string {
  const date = parseUTCDate(dateStr)
  const originalDay = date.getUTCDate()
  date.setUTCMonth(date.getUTCMonth() + months)
  // Prevent date overflow (e.g. Jan 31 + 1 month -> March 3 instead of Feb 28)
  if (date.getUTCDate() !== originalDay) {
    date.setUTCDate(0) // Go back to the last day of the previous month
  }
  return formatUTCDate(date)
}

export function addUTCYears(dateStr: string, years: number): string {
  const date = parseUTCDate(dateStr)
  const isFeb29 = date.getUTCMonth() === 1 && date.getUTCDate() === 29
  date.setUTCFullYear(date.getUTCFullYear() + years)
  if (isFeb29 && date.getUTCMonth() !== 1) {
    date.setUTCDate(0) // clamp to Feb 28
  }
  return formatUTCDate(date)
}

export function diffUTCDays(dateStr1: string, dateStr2: string): number {
  const d1 = parseUTCDate(dateStr1)
  const d2 = parseUTCDate(dateStr2)
  const diffTime = d1.getTime() - d2.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

export function getTodayDateStr(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isOccurrenceValidForDate(template: ActivityTemplateDomain, dateStr: string): boolean {
  if (!template.effectiveFrom) return true
  const effStr =
    template.effectiveFrom instanceof Date
      ? formatUTCDate(template.effectiveFrom)
      : template.effectiveFrom
  return dateStr >= effStr
}

export function analyzeRecurrence(
  template: ActivityTemplateDomain,
  logs: ActivityLogDomain[],
  todayStr: string = getTodayDateStr()
): RecurrenceAnalysis {
  if (!isOccurrenceValidForDate(template, todayStr)) {
    return {
      lastCompletedDate: null,
      nextDueDate: null,
      overdue: false,
      daysSinceLast: null,
      monthsSinceLast: null,
      streak: 0,
      statusMessage: 'Not active',
    }
  }

  // Sort logs newest first
  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null

  // Postponed non-daily items are due on the next day
  if (latestLog && latestLog.status === 'postponed' && template.recurrenceType !== 'one_time') {
    const nextDueDate = addUTCDays(latestLog.date, 1)
    const daysSinceLast = diffUTCDays(todayStr, latestLog.date)
    return {
      lastCompletedDate: null,
      nextDueDate,
      overdue: nextDueDate <= todayStr,
      daysSinceLast,
      monthsSinceLast: null,
      streak: 0,
      statusMessage: 'Postponed',
    }
  }

  const completionLogs = logs
    .filter((log) => log.status !== 'skipped' && log.status !== 'postponed' && log.status !== 'reminder' && log.status !== 'canceled')
    .sort((a, b) => b.date.localeCompare(a.date))

  const lastCompletedDate = completionLogs.length > 0 ? completionLogs[0].date : null
  let nextDueDate: string | null = null
  let overdue = false
  let daysSinceLast: number | null = null
  let monthsSinceLast: number | null = null

  if (lastCompletedDate) {
    daysSinceLast = diffUTCDays(todayStr, lastCompletedDate)
    const d1 = parseUTCDate(todayStr)
    const d2 = parseUTCDate(lastCompletedDate)
    const yearDiff = d1.getUTCFullYear() - d2.getUTCFullYear()
    const monthDiff = d1.getUTCMonth() - d2.getUTCMonth()
    const dayDiff = d1.getUTCDate() - d2.getUTCDate()
    monthsSinceLast = Math.max(0, parseFloat((yearDiff * 12 + monthDiff + dayDiff / 30.0).toFixed(1)))
  }

  // Calculate nextDueDate based on recurrenceType
  switch (template.recurrenceType) {
    case 'daily':
      nextDueDate = lastCompletedDate ? addUTCDays(lastCompletedDate, 1) : todayStr
      overdue = nextDueDate < todayStr
      break
    case 'weekly': {
      const interval = template.recurrenceInterval || 1
      nextDueDate = lastCompletedDate ? addUTCDays(lastCompletedDate, interval * 7) : todayStr
      overdue = nextDueDate < todayStr
      break
    }
    case 'monthly': {
      const interval = template.recurrenceInterval || 1
      nextDueDate = lastCompletedDate ? addUTCMonths(lastCompletedDate, interval) : todayStr
      overdue = nextDueDate < todayStr
      break
    }
    case 'yearly': {
      const interval = template.recurrenceInterval || 1
      nextDueDate = lastCompletedDate ? addUTCYears(lastCompletedDate, interval) : todayStr
      overdue = nextDueDate < todayStr
      break
    }
    case 'one_time':
    case 'milestone':
      nextDueDate = template.targetDate || null
      overdue = nextDueDate ? nextDueDate < todayStr && !lastCompletedDate : false
      break
    default:
      nextDueDate = todayStr
      overdue = false
  }

  let statusMessage = 'On track'
  if (overdue) statusMessage = 'Overdue'
  else if (lastCompletedDate === todayStr) statusMessage = 'Completed today'

  return {
    lastCompletedDate,
    nextDueDate,
    overdue,
    daysSinceLast,
    monthsSinceLast,
    streak: lastCompletedDate === todayStr ? 1 : 0,
    statusMessage,
  }
}