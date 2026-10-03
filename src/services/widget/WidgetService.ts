import type { ActivityLog, ActivityTemplate } from '@/api/client'
import { computeTaskOccurrences } from '@/domain/timeline'
import {
  type WidgetSnapshot,
  type WidgetTodayData,
  type WidgetWorkData,
  type WidgetCalendarData,
  WIDGET_SCHEMA_VERSION,
  createEmptyWidgetSnapshot,
} from '@/domain/widget'
import { WidgetStorage } from './WidgetStorage'
import type { LocalCalendarEvent } from '@/db/repository'

export interface BuildSnapshotParams {
  templates: ActivityTemplate[]
  logs: ActivityLog[]
  dateStr: string
  timezone?: string
  workSession?: {
    isActive: boolean
    elapsedSeconds: number
    activityName?: string | null
  } | null
  calendarEvents?: LocalCalendarEvent[] | null
}

export class WidgetService {
  /**
   * Constructs a safe, bounded snapshot from domain models without querying SQLite directly.
   */
  static buildSnapshot(params: BuildSnapshotParams): WidgetSnapshot {
    const {
      templates,
      logs,
      dateStr,
      timezone = 'UTC',
      workSession,
      calendarEvents,
    } = params

    // 1. Compute task occurrences for the active date
    const occurrences = computeTaskOccurrences(templates, logs, dateStr)
    const completedTasks = occurrences.filter((t) => t.isCompleted)
    const pendingTasks = occurrences.filter((t) => !t.isCompleted && !t.isCanceled && !t.isPostponed)

    const completedCount = completedTasks.length
    const totalCount = occurrences.length
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    // Next task to show on widget
    const nextItem = pendingTasks[0] ?? null
    const nextTask = nextItem
      ? {
          id: nextItem.templateId,
          title: nextItem.title,
          time: nextItem.scheduledTime ?? null,
          priority: nextItem.priority,
          isCompleted: false,
        }
      : null

    const todayData: WidgetTodayData = {
      completedCount,
      totalCount,
      progressPercent,
      nextTask,
    }

    // 2. Work session summary
    const workData: WidgetWorkData | null = workSession
      ? {
          isActive: Boolean(workSession.isActive),
          elapsedSeconds: Math.max(0, workSession.elapsedSeconds),
          activityName: workSession.activityName || null,
        }
      : null

    // 3. Calendar next event
    let calendarData: WidgetCalendarData | null = null
    if (calendarEvents && calendarEvents.length > 0) {
      const activeEvents = calendarEvents
        .filter((e) => !e.isDeleted)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

      const nextEvt = activeEvents[0]
      if (nextEvt) {
        calendarData = {
          nextEvent: {
            id: nextEvt.id,
            title: nextEvt.title,
            startAt: nextEvt.startDate,
            allDay: nextEvt.allDay,
          },
        }
      }
    }

    return {
      version: WIDGET_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      date: dateStr,
      timezone,
      today: todayData,
      work: workData,
      calendar: calendarData,
    }
  }

  /**
   * Refreshes the today section of the widget snapshot and stores it.
   */
  static async refreshToday(params: {
    templates: ActivityTemplate[]
    logs: ActivityLog[]
    dateStr: string
    timezone?: string
  }): Promise<boolean> {
    try {
      const current = await WidgetStorage.getSnapshot()
      const updated = this.buildSnapshot({
        ...params,
        workSession: current.work,
      })
      return await WidgetStorage.setSnapshot(updated)
    } catch (err) {
      console.warn('[WidgetService] Failed to refresh today widget:', err)
      return false
    }
  }

  /**
   * Refreshes the work session section of the widget snapshot.
   */
  static async refreshWork(workSession: {
    isActive: boolean
    elapsedSeconds: number
    activityName?: string | null
  }): Promise<boolean> {
    try {
      const current = await WidgetStorage.getSnapshot()
      const updated: WidgetSnapshot = {
        ...current,
        generatedAt: new Date().toISOString(),
        work: {
          isActive: Boolean(workSession.isActive),
          elapsedSeconds: Math.max(0, workSession.elapsedSeconds),
          activityName: workSession.activityName || null,
        },
      }
      return await WidgetStorage.setSnapshot(updated)
    } catch (err) {
      console.warn('[WidgetService] Failed to refresh work widget:', err)
      return false
    }
  }

  /**
   * Refreshes the calendar section of the widget snapshot.
   */
  static async refreshCalendar(calendarEvents: LocalCalendarEvent[]): Promise<boolean> {
    try {
      const current = await WidgetStorage.getSnapshot()
      const activeEvents = calendarEvents
        .filter((e) => !e.isDeleted)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      const nextEvt = activeEvents[0] ?? null

      const updated: WidgetSnapshot = {
        ...current,
        generatedAt: new Date().toISOString(),
        calendar: nextEvt
          ? {
              nextEvent: {
                id: nextEvt.id,
                title: nextEvt.title,
                startAt: nextEvt.startDate,
                allDay: nextEvt.allDay,
              },
            }
          : null,
      }
      return await WidgetStorage.setSnapshot(updated)
    } catch (err) {
      console.warn('[WidgetService] Failed to refresh calendar widget:', err)
      return false
    }
  }

  /**
   * Complete snapshot refresh across all domains.
   */
  static async refreshAll(params: BuildSnapshotParams): Promise<boolean> {
    try {
      const snapshot = this.buildSnapshot(params)
      return await WidgetStorage.setSnapshot(snapshot)
    } catch (err) {
      console.warn('[WidgetService] Failed to refresh all widgets:', err)
      return false
    }
  }

  /**
   * Returns current snapshot or empty fallback.
   */
  static async getSnapshot(): Promise<WidgetSnapshot> {
    return WidgetStorage.getSnapshot()
  }

  /**
   * Resets snapshot.
   */
  static async clear(): Promise<void> {
    await WidgetStorage.clear()
  }
}
