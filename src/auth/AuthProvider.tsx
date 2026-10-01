import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { clearToken, getToken, setToken, trackerApi, type MobileUser } from '@/api/client'

type AuthContextValue = {
  user: MobileUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, pin: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const restore = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      setUser(await trackerApi.me())
    } catch {
      await clearToken()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    void restore().finally(() => setIsLoading(false))
  }, [restore])

  const login = useCallback(async (username: string, pin: string) => {
    const result = await trackerApi.login(username.trim(), pin)
    await setToken(result.token)
    setUser(result.user)
  }, [])

  const logout = useCallback(async () => {
    await clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: user !== null, login, logout }),
    [user, isLoading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}