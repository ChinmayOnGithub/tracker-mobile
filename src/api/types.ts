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

export interface BinItem {
  id: string
  entityType: 'journal' | 'note' | 'activity_template' | 'weight'
  title: string
  preview?: string | null
  deletedAt: string
}