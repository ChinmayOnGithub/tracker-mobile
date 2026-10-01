import { describe, expect, it } from 'bun:test'
import { addDays, formatDisplayDate, isValidYmd, todayYmd } from '@/utils/date'

describe('Date Utilities', () => {
  it('generates today in YYYY-MM-DD format', () => {
    const today = todayYmd()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(isValidYmd(today)).toBe(true)
  })

  it('validates YYYY-MM-DD strings accurately', () => {
    expect(isValidYmd('2026-10-01')).toBe(true)
    expect(isValidYmd('2026-02-28')).toBe(true)
    expect(isValidYmd('2026-02-29')).toBe(false) // 2026 is not a leap year
    expect(isValidYmd('2024-02-29')).toBe(true) // 2024 is a leap year
    expect(isValidYmd('2026-13-01')).toBe(false)
    expect(isValidYmd('invalid')).toBe(false)
    expect(isValidYmd('')).toBe(false)
  })

  it('formats display date correctly', () => {
    const formatted = formatDisplayDate('2026-10-01')
    expect(formatted).toContain('2026')
    expect(formatted).toContain('Oct')
    expect(formatted).toContain('1')
  })

  it('adds and subtracts days across month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('invalid', 5)).toBe('invalid')
  })
})