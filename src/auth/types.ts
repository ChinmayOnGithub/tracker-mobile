import type { MobileUser } from '@/api/types'

export interface AuthState {
  user: MobileUser | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export interface AuthContextValue extends AuthState {
  login: (username: string, secret: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}