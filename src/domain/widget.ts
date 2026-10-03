/**
 * Widget Domain Models & Validation
 *
 * Lightweight, versioned, bounded snapshot designed for OS Home Screen Widgets (Android / iOS).
 * Invariant: Never contains sensitive journal text, private notes, vault documents, or auth tokens.
 */

export interface WidgetTodayTask {
  id: string
  title: string
  time?: string | null
  priority?: string | null
  isCompleted: boolean
}

export interface WidgetTodayData {
  completedCount: number
  totalCount: number
  progressPercent: number
  nextTask?: WidgetTodayTask | null
}

export interface WidgetWorkData {
  isActive: boolean
  elapsedSeconds: number
  activityName?: string | null
}

export interface WidgetCalendarData {
  nextEvent?: {
    id: string
    title: string
    startAt: string
    allDay?: boolean
  } | null
}

export interface WidgetSnapshot {
  version: number
  generatedAt: string
  date: string
  timezone: string
  today: WidgetTodayData
  work?: WidgetWorkData | null
  calendar?: WidgetCalendarData | null
}

export const WIDGET_SCHEMA_VERSION = 1
export const MAX_WIDGET_SNAPSHOT_BYTES = 16 * 1024 // 16 KB hard boundary

/**
 * Valid destinations for tracker deep links
 */
export type WidgetDeepLinkDestination =
  | 'today'
  | 'work'
  | 'calendar'
  | 'search'
  | 'notes'
  | 'journal'
  | 'vault'

/**
 * Constructs a secure, validated tracker:// deep link
 */
export function createWidgetDeepLink(
  destination: WidgetDeepLinkDestination,
  params?: { id?: string; q?: string }
): string {
  const scheme = 'tracker://'
  switch (destination) {
    case 'today':
      return params?.id ? `${scheme}today/task/${encodeURIComponent(params.id)}` : `${scheme}today`
    case 'work':
      return `${scheme}work`
    case 'calendar':
      return `${scheme}calendar`
    case 'search':
      return params?.q ? `${scheme}search?q=${encodeURIComponent(params.q)}` : `${scheme}search`
    case 'notes':
      return `${scheme}notes`
    case 'journal':
      return `${scheme}journal`
    case 'vault':
      return `${scheme}vault`
    default:
      return `${scheme}today`
  }
}

/**
 * Validates that a widget snapshot contains only allowed, non-sensitive summary fields
 * and does NOT leak any private notes, journal content, or document payloads.
 */
export function sanitizeWidgetSnapshot(snapshot: WidgetSnapshot): WidgetSnapshot {
  const sanitizedToday: WidgetTodayData = {
    completedCount: Math.max(0, Number(snapshot.today?.completedCount || 0)),
    totalCount: Math.max(0, Number(snapshot.today?.totalCount || 0)),
    progressPercent: Math.min(100, Math.max(0, Number(snapshot.today?.progressPercent || 0))),
    nextTask: snapshot.today?.nextTask
      ? {
          id: String(snapshot.today.nextTask.id).slice(0, 128),
          title: String(snapshot.today.nextTask.title || 'Task').slice(0, 100),
          time: snapshot.today.nextTask.time ? String(snapshot.today.nextTask.time).slice(0, 20) : null,
          priority: snapshot.today.nextTask.priority ? String(snapshot.today.nextTask.priority).slice(0, 20) : null,
          isCompleted: Boolean(snapshot.today.nextTask.isCompleted),
        }
      : null,
  }

  const sanitizedWork: WidgetWorkData | null = snapshot.work
    ? {
        isActive: Boolean(snapshot.work.isActive),
        elapsedSeconds: Math.max(0, Number(snapshot.work.elapsedSeconds || 0)),
        activityName: snapshot.work.activityName
          ? String(snapshot.work.activityName).slice(0, 80)
          : null,
      }
    : null

  const sanitizedCalendar: WidgetCalendarData | null = snapshot.calendar?.nextEvent
    ? {
        nextEvent: {
          id: String(snapshot.calendar.nextEvent.id).slice(0, 128),
          title: String(snapshot.calendar.nextEvent.title || 'Event').slice(0, 100),
          startAt: String(snapshot.calendar.nextEvent.startAt).slice(0, 40),
          allDay: Boolean(snapshot.calendar.nextEvent.allDay),
        },
      }
    : null

  return {
    version: WIDGET_SCHEMA_VERSION,
    generatedAt: snapshot.generatedAt || new Date().toISOString(),
    date: snapshot.date || new Date().toISOString().slice(0, 10),
    timezone: snapshot.timezone || 'UTC',
    today: sanitizedToday,
    work: sanitizedWork,
    calendar: sanitizedCalendar,
  }
}

/**
 * Generates a safe fallback snapshot for empty or uninitialized states
 */
export function createEmptyWidgetSnapshot(dateStr?: string, timezone = 'UTC'): WidgetSnapshot {
  const d = dateStr || new Date().toISOString().slice(0, 10)
  return {
    version: WIDGET_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    date: d,
    timezone,
    today: {
      completedCount: 0,
      totalCount: 0,
      progressPercent: 0,
      nextTask: null,
    },
    work: {
      isActive: false,
      elapsedSeconds: 0,
      activityName: null,
    },
    calendar: null,
  }
}
