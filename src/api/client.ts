import * as SecureStore from 'expo-secure-store'
import { config } from '@/config'
import type {
  ActivityLog,
  ActivityTemplate,
  ApiEnvelope,
  BinEntityType,
  BinItem,
  CalendarDayDTO,
  CalendarMonthSummaryDTO,
  CalendarWeekDTO,
  CreateLogInput,
  CreateTemplateInput,
  JournalEntry,
  MobileUser,
  NoteItem,
  OnboardingState,
  UpdateTemplateInput,
  WeightRecord,
  WorkSession,
} from './types'

export const TOKEN_KEY = 'tracker.session.token'

type SessionExpiredCallback = () => void

const sessionListeners: Set<SessionExpiredCallback> = new Set()

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  } catch {
    return null
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  })
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  } catch {
    // Ignore deletion errors if key does not exist
  }
}

export class ApiError extends Error {
  readonly code: string
  readonly status?: number
  readonly details?: unknown

  constructor(message: string, code: string, status?: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number
  authenticated?: boolean
  retries?: number
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function performFetch<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeoutMs = 12000,
    authenticated = true,
    retries = options.method === 'GET' || !options.method ? 2 : 0,
    headers: customHeaders,
    ...rest
  } = options

  const token = authenticated ? await getToken() : null
  const headers = new Headers(customHeaders)
  headers.set('Accept', 'application/json')

  if (rest.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const url = `${config.apiUrl}${path}`
  let attempt = 0

  while (attempt <= retries) {
    attempt++
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        ...rest,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timer)

      let payload: ApiEnvelope<T>
      try {
        payload = (await response.json()) as ApiEnvelope<T>
      } catch {
        if (response.status === 401) {
          await clearToken()
          sessionListeners.forEach((fn) => {
            try {
              fn()
            } catch {
              // Ignore listener failures
            }
          })
          throw new ApiError('Session expired. Please sign in again.', 'UNAUTHORIZED', 401)
        }
        throw new ApiError(
          `Server returned status ${response.status}`,
          `HTTP_${response.status}`,
          response.status
        )
      }

      if (!response.ok || !payload.success) {
        if (response.status === 401) {
          await clearToken()
          sessionListeners.forEach((fn) => {
            try {
              fn()
            } catch {
              // Ignore listener failures
            }
          })
        }

        const errorInfo = payload.success
          ? { code: `HTTP_${response.status}`, message: response.statusText }
          : payload.error

        // Retrying idempotent GET requests on 5xx errors
        const isGet = !options.method || options.method === 'GET'
        if (isGet && response.status >= 500 && attempt <= retries) {
          await sleep(250 * Math.pow(2, attempt - 1))
          continue
        }

        throw new ApiError(
          errorInfo.message,
          errorInfo.code,
          response.status,
          'details' in errorInfo ? errorInfo.details : undefined
        )
      }

      return payload.data
    } catch (err: unknown) {
      clearTimeout(timer)

      if (err instanceof ApiError) {
        throw err
      }

      const isAbort =
        err instanceof Error &&
        (err.name === 'AbortError' || err.message.includes('aborted'))

      if (isAbort) {
        throw new ApiError('Request timed out', 'TIMEOUT')
      }

      const isGet = !options.method || options.method === 'GET'
      if (isGet && attempt <= retries) {
        await sleep(250 * Math.pow(2, attempt - 1))
        continue
      }

      throw new ApiError('Unable to connect to Tracker server', 'NETWORK_UNAVAILABLE')
    }
  }

  throw new ApiError('Unable to connect to Tracker server', 'NETWORK_UNAVAILABLE')
}

export const trackerApi = {
  onSessionExpired(callback: SessionExpiredCallback): () => void {
    sessionListeners.add(callback)
    return () => sessionListeners.delete(callback)
  },

  async login(username: string, secret: string) {
    return performFetch<{ token: string; user: MobileUser }>(
      '/api/mobile/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password: secret, pin: secret }),
        authenticated: false,
        retries: 0,
      }
    )
  },

  async register(username: string, password: string) {
    return performFetch<{ token: string; user: MobileUser }>(
      '/api/mobile/v1/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
        authenticated: false,
        retries: 0,
      }
    )
  },

  async me() {
    return performFetch<MobileUser>('/api/mobile/v1/auth/me')
  },

  async getTemplates() {
    return performFetch<{ templates: ActivityTemplate[] }>(
      '/api/mobile/v1/activities/templates'
    )
  },

  async getLogs(date: string) {
    return performFetch<{ logs: ActivityLog[] }>(
      `/api/mobile/v1/activities/logs?date=${encodeURIComponent(date)}`
    )
  },

  async createLog(input: CreateLogInput) {
    return performFetch<{ log: ActivityLog }>('/api/mobile/v1/activities/logs', {
      method: 'POST',
      body: JSON.stringify(input),
      retries: 0,
    })
  },

  async updateLog(id: string, input: Partial<CreateLogInput>) {
    return performFetch<{ log: ActivityLog }>(
      `/api/mobile/v1/activities/logs/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
        retries: 0,
      }
    )
  },

  async deleteLog(id: string) {
    return performFetch<{ deleted: boolean; id: string }>(
      `/api/mobile/v1/activities/logs/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        retries: 0,
      }
    )
  },

  async getWorkSession(date?: string) {
    const q = date ? `?date=${encodeURIComponent(date)}` : ''
    return performFetch<{ activeSession: WorkSession | null; sessionForDate: WorkSession | null }>(
      `/api/mobile/v1/work/session${q}`
    )
  },

  async startWorkSession(date: string, mode: 'office' | 'wfh' = 'office', inTime?: string) {
    return performFetch<{ session: WorkSession }>('/api/mobile/v1/work/session', {
      method: 'POST',
      body: JSON.stringify({ action: 'start', date, mode, inTime }),
      retries: 0,
    })
  },

  async pauseWorkSession(id: string) {
    return performFetch<{ session: WorkSession }>('/api/mobile/v1/work/session', {
      method: 'PATCH',
      body: JSON.stringify({ id, action: 'pause' }),
      retries: 0,
    })
  },

  async resumeWorkSession(id: string) {
    return performFetch<{ session: WorkSession }>('/api/mobile/v1/work/session', {
      method: 'PATCH',
      body: JSON.stringify({ id, action: 'resume' }),
      retries: 0,
    })
  },

  async finishWorkSession(id: string) {
    return performFetch<{ session: WorkSession }>('/api/mobile/v1/work/session', {
      method: 'PATCH',
      body: JSON.stringify({ id, action: 'finish' }),
      retries: 0,
    })
  },

  async logManualWorkSession(date: string, mode: 'office' | 'wfh', durationMinutes: number) {
    return performFetch<{ session: WorkSession }>('/api/mobile/v1/work/session', {
      method: 'POST',
      body: JSON.stringify({ action: 'manual', date, mode, durationMinutes }),
      retries: 0,
    })
  },

  async getWeightHistory(days = 30) {
    return performFetch<{ records: WeightRecord[] }>(
      `/api/mobile/v1/weight?days=${days}`
    )
  },

  async logWeight(date: string, weight: number, notes?: string, consentToCreateActivity = true) {
    return performFetch<{ record: WeightRecord }>('/api/mobile/v1/weight', {
      method: 'POST',
      body: JSON.stringify({ date, weight, notes, consentToCreateActivity }),
      retries: 0,
    })
  },

  async createTemplate(input: CreateTemplateInput) {
    return performFetch<{ template: ActivityTemplate }>('/api/mobile/v1/activities/templates', {
      method: 'POST',
      body: JSON.stringify(input),
      retries: 0,
    })
  },

  async updateTemplate(id: string, input: UpdateTemplateInput) {
    return performFetch<{ template: ActivityTemplate }>(
      `/api/mobile/v1/activities/templates/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
        retries: 0,
      }
    )
  },

  async deleteTemplate(id: string) {
    return performFetch<{ deleted: boolean }>(
      `/api/mobile/v1/activities/templates/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        retries: 0,
      }
    )
  },

  async getJournalEntry(date: string) {
    return performFetch<{ entry: JournalEntry | null }>(
      `/api/mobile/v1/journal?date=${encodeURIComponent(date)}`
    )
  },

  async upsertJournalEntry(date: string, fields: Partial<JournalEntry>) {
    return performFetch<{ entry: JournalEntry }>('/api/mobile/v1/journal', {
      method: 'POST',
      body: JSON.stringify({ date, ...fields }),
      retries: 0,
    })
  },

  async deleteJournalEntry(id: string) {
    return performFetch<{ success: boolean }>(
      `/api/mobile/v1/journal?id=${encodeURIComponent(id)}`,
      { method: 'DELETE', retries: 0 }
    )
  },

  async getNotes() {
    return performFetch<{ notes: NoteItem[] }>('/api/mobile/v1/notes')
  },

  async createNote(content: string, title?: string | null, date?: string) {
    return performFetch<{ note: NoteItem }>('/api/mobile/v1/notes', {
      method: 'POST',
      body: JSON.stringify({ content, title, date }),
      retries: 0,
    })
  },

  async updateNote(id: string, content: string, title?: string | null) {
    return performFetch<{ note: NoteItem }>(
      `/api/mobile/v1/notes?id=${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ content, title }),
        retries: 0,
      }
    )
  },

  async deleteNote(id: string) {
    return performFetch<{ success: boolean }>(
      `/api/mobile/v1/notes?id=${encodeURIComponent(id)}`,
      { method: 'DELETE', retries: 0 }
    )
  },

  async getBinItems() {
    return performFetch<{ items: BinItem[] }>('/api/mobile/v1/bin')
  },

  async restoreBinItem(entityType: BinEntityType, id: string) {
    return performFetch<{ restored: boolean }>('/api/mobile/v1/bin', {
      method: 'POST',
      body: JSON.stringify({ entityType, id, action: 'restore' }),
      retries: 0,
    })
  },

  async getOnboardingState() {
    return performFetch<{ state: OnboardingState | null }>('/api/mobile/v1/onboarding')
  },

  async saveOnboardingState(state: OnboardingState) {
    return performFetch<{ state: OnboardingState }>('/api/mobile/v1/onboarding', {
      method: 'POST',
      body: JSON.stringify(state),
      retries: 0,
    })
  },

  async completeOnboarding(state: OnboardingState) {
    return performFetch<{
      state: OnboardingState
      plan: {
        created: boolean
        activityIds: string[]
        activities: { id: string; name: string; scheduledTime: string | null; estimatedDuration: number; category: string }[]
      }
    }>('/api/mobile/v1/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(state),
      retries: 0,
    })
  },

  async getCalendarMonth(month?: string, timezone?: string) {
    const params = new URLSearchParams()
    if (month) params.set('month', month)
    if (timezone) params.set('timezone', timezone)
    const q = params.toString() ? `?${params.toString()}` : ''
    return performFetch<{ summaries: CalendarMonthSummaryDTO[]; year: number; month: number }>(
      `/api/mobile/v1/calendar/month${q}`
    )
  },

  async getCalendarWeek(startDate: string, timezone?: string) {
    const params = new URLSearchParams({ startDate })
    if (timezone) params.set('timezone', timezone)
    return performFetch<{ week: CalendarWeekDTO }>(
      `/api/mobile/v1/calendar/week?${params.toString()}`
    )
  },

  async getCalendarDay(date: string) {
    return performFetch<{ day: CalendarDayDTO }>(
      `/api/mobile/v1/calendar/day?date=${encodeURIComponent(date)}`
    )
  },

  async syncCalendar() {
    return performFetch<{ synced: boolean; result: unknown }>(
      '/api/mobile/v1/calendar/sync',
      { method: 'POST', retries: 0 }
    )
  },

  async getLeaveData(year?: number) {
    const q = year ? `?year=${year}` : ''
    return performFetch<{ year: number; allowances: import('./types').LeaveAllowance[]; records: import('./types').LeaveRecord[] }>(
      `/api/mobile/v1/leave${q}`
    )
  },

  async createLeaveRequest(input: import('./types').CreateLeaveInput) {
    return performFetch<{ record: import('./types').LeaveRecord }>('/api/mobile/v1/leave', {
      method: 'POST',
      body: JSON.stringify(input),
      retries: 0,
    })
  },

  async deleteLeaveRequest(id: string) {
    return performFetch<{ success: boolean }>(
      `/api/mobile/v1/leave?id=${encodeURIComponent(id)}`,
      { method: 'DELETE', retries: 0 }
    )
  },

  async updateLeaveAllowance(input: import('./types').UpdateLeaveAllowanceInput) {
    return performFetch<{ allowance: import('./types').LeaveAllowance }>('/api/mobile/v1/leave', {
      method: 'PATCH',
      body: JSON.stringify(input),
      retries: 0,
    })
  },

  async getBilling() {
    return performFetch<import('./types').BillingEntitlementsResponse>('/api/mobile/v1/billing')
  },

  async getVaultItems(parentId?: string | null) {
    const q = parentId ? `?parentId=${encodeURIComponent(parentId)}` : ''
    return performFetch<{
      items: import('./types').VaultItem[]
      breadcrumbs: import('./types').VaultBreadcrumb[]
    }>(`/api/mobile/v1/vault${q}`)
  },

  async createVaultFolder(name: string, parentId?: string | null) {
    return performFetch<{ item: import('./types').VaultItem }>('/api/mobile/v1/vault', {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
      retries: 0,
    })
  },

  async deleteVaultItem(id: string) {
    return performFetch<{ deleted: boolean; id: string }>(
      `/api/mobile/v1/vault?id=${encodeURIComponent(id)}`,
      { method: 'DELETE', retries: 0 }
    )
  },
}
export * from './types'
