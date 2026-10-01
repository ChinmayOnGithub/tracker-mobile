import * as SecureStore from 'expo-secure-store'
import { config } from '@/config'
import type {
  ActivityLog,
  ActivityTemplate,
  ApiEnvelope,
  CreateLogInput,
  MobileUser,
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

  async login(username: string, pin: string) {
    return performFetch<{ token: string; user: MobileUser }>(
      '/api/mobile/v1/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, pin }),
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
        method: 'PUT',
        body: JSON.stringify(input),
        retries: 0,
      }
    )
  },
}
export * from './types'
