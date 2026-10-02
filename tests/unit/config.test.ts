import { describe, expect, it } from 'bun:test'
import { config } from '@/config'

describe('API URL Configuration', () => {
  it('defines config with valid string apiUrl', () => {
    expect(typeof config.apiUrl).toBe('string')
    expect(config.apiUrl.length).toBeGreaterThan(0)
    expect(config.apiUrl.endsWith('/')).toBe(false)
  })
})
