import { describe, expect, it, mock } from 'bun:test'

mock.module('expo-secure-store', () => ({
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}))

mock.module('react-native', () => ({
  Platform: { OS: 'ios' },
}))

// Import after mocks are registered
const { ApiError, TOKEN_KEY, trackerApi } = await import('@/api/client')

describe('API Client', () => {
  it('instantiates ApiError with code, status and details', () => {
    const error = new ApiError('Invalid PIN', 'INVALID_PIN', 400, { attemptsRemaining: 2 })
    expect(error.message).toBe('Invalid PIN')
    expect(error.code).toBe('INVALID_PIN')
    expect(error.status).toBe(400)
    expect(error.details).toEqual({ attemptsRemaining: 2 })
    expect(error.name).toBe('ApiError')
  })

  it('uses the canonical token key for SecureStore', () => {
    expect(TOKEN_KEY).toBe('tracker.session.token')
  })

  it('supports session expiration subscriber registration', () => {
    let fired = false
    const unsubscribe = trackerApi.onSessionExpired(() => {
      fired = true
    })
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
    expect(fired).toBe(false)
  })
})