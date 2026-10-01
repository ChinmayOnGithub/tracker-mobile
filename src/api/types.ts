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