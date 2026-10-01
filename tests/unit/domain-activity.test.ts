import { describe, expect, it } from 'bun:test'
import { getNextActivityStatus } from '@/domain/activity'

describe('Domain Activity State Machine', () => {
  it('cycles daily activities through cleared -> done -> canceled -> cleared (skipping postponed)', () => {
    expect(getNextActivityStatus('cleared', 'daily')).toBe('done')
    expect(getNextActivityStatus('done', 'daily')).toBe('canceled')
    expect(getNextActivityStatus('canceled', 'daily')).toBe('cleared')
    expect(getNextActivityStatus('postponed', 'daily')).toBe('cleared')
  })

  it('cycles non-daily activities through cleared -> done -> canceled -> postponed -> cleared', () => {
    expect(getNextActivityStatus('cleared', 'weekly')).toBe('done')
    expect(getNextActivityStatus('done', 'weekly')).toBe('canceled')
    expect(getNextActivityStatus('canceled', 'weekly')).toBe('postponed')
    expect(getNextActivityStatus('postponed', 'weekly')).toBe('cleared')
  })
})