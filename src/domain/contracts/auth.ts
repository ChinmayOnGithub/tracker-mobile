import { z } from 'zod'

export const loginRequestSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  pin: z.string().regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
})

export type LoginRequest = z.infer<typeof loginRequestSchema>

export interface MobileUser {
  id: string
  username: string
  email: string | null
  isOwner: boolean
}

export interface LoginResponse {
  token: string
  user: MobileUser
}