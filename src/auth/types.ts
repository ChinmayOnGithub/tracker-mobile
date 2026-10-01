import type { MobileUser } from '@/api/types'

export interface AuthState {
  user: MobileUser | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export interface AuthContextValue extends AuthState {
  login: (username: string, pin: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}