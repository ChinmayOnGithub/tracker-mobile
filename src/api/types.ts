export interface MobileUser {
  id: string
  username: string
  email: string | null
  isOwner: boolean
}

export interface ActivityTemplate {
  id: string
  name: string
  category: string
  type: string
  icon: string
  color: string
  recurrenceType: string
  isActive: boolean
  sortOrder?: number
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface ActivityLog {
  id: string
  activityId: string
  date: string
  status: string
  note: string | null
  amount: number | null
  payload?: unknown
  createdAt: string
  updatedAt: string
}

export interface CreateLogInput {
  id?: string
  activityId: string
  date: string
  status: string
  note?: string | null
  amount?: number | null
  payload?: Record<string, unknown>
}

export type ApiSuccess<T> = {
  success: true
  data: T
}

export interface ApiErrorDetail {
  code: string
  message: string
  details?: unknown
}

export type ApiFailure = {
  success: false
  error: ApiErrorDetail
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure

export interface WorkSession {
  id: string
  userId: string
  date: string
  mode: 'office' | 'wfh'
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  startedAt: string | null
  endedAt: string | null
  durationMinutes: number
  durationSeconds?: number
  loggingMode: 'timer' | 'manual'
  manualMinutes?: number
  createdAt?: string
  updatedAt?: string
}

export interface WeightRecord {
  id: string
  userId: string
  date: string
  weight: number
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CreateTemplateInput {
  name: string
  category: string
  type?: string
  priority?: string
  estimatedDuration?: number
  icon: string
  color: string
  notes?: string | null
  amount?: number | null
  recurrenceType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | 'milestone' | 'one_time'
  recurrenceInterval?: number | null
  recurrenceDaysOfWeek?: string | null
  recurrenceDayOfMonth?: number | null
  recurrenceMonth?: number | null
  targetDate?: string | null
  remindBeforeDays?: number | null
  scheduledTime?: string | null
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  isActive?: boolean
  sortOrder?: number
}

export interface JournalEntry {
  id: string
  userId: string
  journalDate: string
  content: string
  mood: string | null
  gratitude: string | null
  reflections: string | null
  lessonsLearned: string | null
  tomorrowPlan: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export interface NoteItem {
  id: string
  userId: string
  date: string
  title: string | null
  content: string
  version?: number
  createdAt?: string
  updatedAt?: string
}

export type BinEntityType = 'journal' | 'note' | 'activity_template' | 'weight'

export interface BinItem {
  id: string
  entityType: BinEntityType
  title: string
  preview?: string | null
  deletedAt: string
}

export type OnboardingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'

export interface OnboardingState {
  version: 1
  status: OnboardingStatus
  currentStep: number
  completedSteps: number[]
  taskSources: string[]
  calendarProvider: string | null
  workStartTime: string
  workEndTime: string
  planningStyle: string | null
  dailyCapacity: number
  focusAreas: string[]
  firstDayObjective: string
  timezone: string
  firstPlanActivityId: string | null
  momentum: number
  createdAt: string
  completedAt: string | null
}

export interface CalendarMonthSummaryDTO {
  date: string // "YYYY-MM-DD"
  taskCount: number
  eventCount: number
  workedHours: number
  highestPriorityTask: {
    id: string
    title: string
    priority: 'LOW' | 'MEDIUM' | 'NORMAL' | 'HIGH' | 'CRITICAL'
    color: string
  } | null
  hasJournal: boolean
  hasWeight: boolean
  hasLeave: boolean
  statusColor: string
}

export interface CalendarWeekEventDTO {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  color: string | null
  type: string
  trackerArtifactId: string | null
  trackerArtifactType: string | null
  status?: string
}

export interface CalendarWeekDayDTO {
  date: string
  events: CalendarWeekEventDTO[]
  workedHours: number
  isLeave: boolean
}

export interface CalendarWeekDTO {
  days: CalendarWeekDayDTO[]
}

export interface CalendarDayEventDTO {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  color: string | null
  type: string
  trackerArtifactId: string | null
  trackerArtifactType: string | null
  status: string
  description: string | null
}

export interface CalendarDayDTO {
  date: string
  events: CalendarDayEventDTO[]
  tasks: {
    id: string
    title: string
    status: string
    priority: string
    color: string
  }[]
  workedHours: number
  workStatus: 'office' | 'wfh' | 'cleared'
  workDetails: {
    inTime?: string
    outTime?: string
    hours?: number
  } | null
  journalEntry: {
    id: string
    title: string | null
    content: string
  } | null
  weight: number | null
  habits: {
    id: string
    name: string
    completed: boolean
    streak: number
  }[]
  isLeave: boolean
  leaveDetails: {
    type: string
    status: string
  } | null
}