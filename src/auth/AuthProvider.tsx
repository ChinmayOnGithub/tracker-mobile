import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { clearToken, getToken, setToken, trackerApi } from '@/api/client'
import type { MobileUser } from '@/api/types'
import type { AuthContextValue } from './types'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<MobileUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  useEffect(() => {
    let active = true

    async function restoreSession() {
      try {
        const token = await getToken()
        if (!token) {
          if (active) {
            setUser(null)
            setIsLoading(false)
          }
          return
        }

        const me = await trackerApi.me()
        if (active) {
          setUser(me)
          setIsLoading(false)
        }
      } catch {
        await clearToken()
        if (active) {
          setUser(null)
          setIsLoading(false)
        }
      }
    }

    void restoreSession()

    const unsubscribe = trackerApi.onSessionExpired(() => {
      if (active) {
        setUser(null)
        setError('Your session has expired. Please sign in again.')
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const login = useCallback(async (username: string, secret: string) => {
    setError(null)
    const result = await trackerApi.login(username.trim(), secret)
    await setToken(result.token)
    setUser(result.user)
  }, [])

  const register = useCallback(async (username: string, secret: string) => {
    setError(null)
    const result = await trackerApi.register(username.trim(), secret)
    await setToken(result.token)
    setUser(result.user)
  }, [])

  const logout = useCallback(async () => {
    await clearToken()
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      error,
      login,
      register,
      logout,
      clearError,
    }),
    [user, isLoading, error, login, register, logout, clearError]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}