import * as SecureStore from 'expo-secure-store'
import { config } from '@/config'

const TOKEN_KEY = 'tracker.session.token'

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } }

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  })
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  const token = authenticated ? await getToken() : null
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${config.apiUrl}${path}`, { ...init, headers })
  } catch {
    throw new Error('NETWORK_UNAVAILABLE')
  }

  let payload: ApiEnvelope<T>
  try {
    payload = (await response.json()) as ApiEnvelope<T>
  } catch {
    throw new Error(`HTTP_${response.status}`)
  }

  if (!response.ok || !payload.success) {
    const error = payload.success
      ? { code: `HTTP_${response.status}`, message: response.statusText }
      : payload.error
    if (response.status === 401) await clearToken()
    throw new Error(`${error.code}:${error.message}`)
  }

  return payload.data
}

export type MobileUser = {
  id: string
  username: string
  email: string | null
  isOwner: boolean
}

export type ActivityTemplate = {
  id: string
  name: string
  category: string
  type: string
  icon: string
  color: string
  recurrenceType: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ActivityLog = {
  id: string
  activityId: string
  date: string
  status: string
  note: string | null
  amount: number | null
  payload: unknown
  createdAt: string
  updatedAt: string
}

export const trackerApi = {
  login(username: string, pin: string) {
    return request<{ token: string; user: MobileUser }>(
      '/api/mobile/v1/auth/login',
      { method: 'POST', body: JSON.stringify({ username, pin }) },
      false
    )
  },
  me() {
    return request<MobileUser>('/api/mobile/v1/auth/me')
  },
  getTemplates() {
    return request<{ templates: ActivityTemplate[] }>('/api/mobile/v1/activities/templates')
  },
  getLogs(date: string) {
    return request<{ logs: ActivityLog[] }>(
      `/api/mobile/v1/activities/logs?date=${encodeURIComponent(date)}`
    )
  },
}