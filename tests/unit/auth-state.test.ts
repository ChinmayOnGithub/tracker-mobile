import { describe, expect, it } from 'bun:test'

describe('Auth Validation & State Logic', () => {
  function validateLoginInput(username: string, pin: string): string | null {
    if (!username.trim()) return 'Username is required.'
    if (!/^\d{4}$/.test(pin)) return 'PIN must be exactly 4 digits.'
    return null
  }

  it('rejects empty username', () => {
    expect(validateLoginInput('', '1234')).toBe('Username is required.')
    expect(validateLoginInput('   ', '1234')).toBe('Username is required.')
  })

  it('rejects invalid PIN formats', () => {
    expect(validateLoginInput('chinmay', '123')).toBe('PIN must be exactly 4 digits.')
    expect(validateLoginInput('chinmay', '12345')).toBe('PIN must be exactly 4 digits.')
    expect(validateLoginInput('chinmay', 'abcd')).toBe('PIN must be exactly 4 digits.')
    expect(validateLoginInput('chinmay', '12 4')).toBe('PIN must be exactly 4 digits.')
  })

  it('accepts valid credentials', () => {
    expect(validateLoginInput('chinmay', '1234')).toBeNull()
    expect(validateLoginInput(' admin ', '0000')).toBeNull()
  })
})