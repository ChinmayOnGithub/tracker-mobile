import type { ActivityLog, ActivityTemplate } from '@/api/client'
import { normalizeColor } from '@/theme/tokens'
import {
  addUTCDays,
  analyzeRecurrence,
  isOccurrenceValidForDate,
  type RecurrenceAnalysis,
} from './recurrence'
import type { ActivityStatus } from './activity'
import { MobileCompletionService } from './completion'

export interface TaskOccurrence {
  id: string
  templateId: string
  template: ActivityTemplate
  title: string
  status: ActivityStatus
  logId: string | null
  isCompleted: boolean
  isCanceled: boolean
  isPostponed: boolean
  isPostponedOccurrence: boolean
  postponedFromDate: string | null
  postponedLogId: string | null
  priority: string
  category: string
  color: string
  icon: string
  estimatedDuration: number
  isTimed: boolean
  scheduledTime: string | null
  analysis: RecurrenceAnalysis
  completionDisplay: { formatted: string; isMoney: boolean } | null
}

export function computeTaskOccurrences(
  templates: ActivityTemplate[],
  logs: ActivityLog[],
  dateStr: string
): TaskOccurrence[] {
  const activeTemplates = templates.filter((t) => t.isActive && !('deletedAt' in t && t.deletedAt))

  const occurrences: TaskOccurrence[] = []

  for (const template of activeTemplates) {
    if (template.recurrenceType === 'yearly' || template.recurrenceType === 'milestone') {
      continue
    }

    if (!isOccurrenceValidForDate(template, dateStr)) {
      continue
    }

    // Filter logs for this template
    const templateLogs = logs.filter((l) => l.activityId === template.id)
    const logForDate = templateLogs.find((l) => l.date === dateStr)
    const hasLogToday = !!logForDate

    const analysis = analyzeRecurrence(template, templateLogs, dateStr)

    // Check if item is due on this date
    let isDue = false
    if (hasLogToday) {
      isDue = true
    } else if (analysis.nextDueDate) {
      if (template.recurrenceType === 'one_time') {
        isDue = analysis.nextDueDate === dateStr
      } else {
        isDue = analysis.nextDueDate <= dateStr
      }
    }

    if (!isDue) continue

    const rawStatus = (logForDate?.status || 'cleared').toLowerCase()
    let status: ActivityStatus = 'cleared'
    if (rawStatus === 'done' || rawStatus === 'paid' || rawStatus === 'completed') {
      status = 'done'
    } else if (rawStatus === 'canceled' || rawStatus === 'skipped') {
      status = 'canceled'
    } else if (rawStatus === 'postponed') {
      status = 'postponed'
    }

    const isCompleted = status === 'done'
    const isCanceled = status === 'canceled'
    const isPostponed = status === 'postponed'

    // Detect if this occurrence is active today because it was postponed from an earlier date
    const priorPostponeLog = !hasLogToday
      ? templateLogs
          .filter((l) => l.status === 'postponed' && l.date < dateStr)
          .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
      : null

    const isPostponedOccurrence = !!priorPostponeLog && (
      template.recurrenceType === 'one_time' ||
      analysis.statusMessage === 'Postponed' ||
      addUTCDays(priorPostponeLog.date, 1) === dateStr
    )
    const postponedFromDate = isPostponedOccurrence ? priorPostponeLog.date : null
    const postponedLogId = isPostponedOccurrence ? (priorPostponeLog.id ?? null) : null

    const scheduledTime = ('scheduledTime' in template ? template.scheduledTime : null) as string | null
    const isTimed = !!scheduledTime

    occurrences.push({
      id: `task_${template.id}`,
      templateId: template.id,
      template,
      title: template.name,
      status,
      logId: logForDate?.id ?? null,
      isCompleted,
      isCanceled,
      isPostponed,
      isPostponedOccurrence,
      postponedFromDate,
      postponedLogId,
      priority: ('priority' in template ? (template as Record<string, unknown>).priority : 'NORMAL') as string,
      category: template.category,
      color: normalizeColor(template.color),
      icon: template.icon || 'activity',
      estimatedDuration: ('estimatedDuration' in template ? Number((template as Record<string, unknown>).estimatedDuration) : 0) || 0,
      isTimed,
      scheduledTime,
      analysis,
      completionDisplay: isCompleted
        ? MobileCompletionService.formatCompletionDisplay(
            template,
            logForDate?.payload,
            logForDate?.amount
          )
        : null,
    })
  }

  // Sort: Timed items first, then by priority (CRITICAL -> HIGH -> NORMAL -> LOW)
  const priorityWeight: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    NORMAL: 2,
    MEDIUM: 2,
    LOW: 1,
  }

  return occurrences.sort((a, b) => {
    // Completed/canceled/postponed items sort below active items
    const aActive = a.status === 'cleared'
    const bActive = b.status === 'cleared'
    if (aActive !== bActive) return aActive ? -1 : 1

    if (a.isTimed !== b.isTimed) return a.isTimed ? -1 : 1
    if (a.isTimed && b.isTimed && a.scheduledTime && b.scheduledTime) {
      return a.scheduledTime.localeCompare(b.scheduledTime)
    }

    const wA = priorityWeight[a.priority.toUpperCase()] || 0
    const wB = priorityWeight[b.priority.toUpperCase()] || 0
    return wB - wA
  })
}
