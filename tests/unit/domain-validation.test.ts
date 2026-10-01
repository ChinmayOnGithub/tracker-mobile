import { describe, expect, it } from 'bun:test'
import { createLogSchema, createTemplateSchema, createWeightSchema } from '@/domain'

describe('Domain Zod Validation Contracts', () => {
  it('validates createLogSchema correctly', () => {
    const valid = createLogSchema.safeParse({
      activityId: 'act-1',
      date: '2026-10-01',
      status: 'done',
    })
    expect(valid.success).toBe(true)

    const invalidDate = createLogSchema.safeParse({
      activityId: 'act-1',
      date: '2026/10/01',
      status: 'done',
    })
    expect(invalidDate.success).toBe(false)
  })

  it('validates createTemplateSchema recurrence and types', () => {
    const valid = createTemplateSchema.safeParse({
      name: 'Read Paper',
      category: 'Research',
      icon: 'book',
      color: '#6366f1',
      recurrenceType: 'daily',
    })
    expect(valid.success).toBe(true)

    const invalidRecurrence = createTemplateSchema.safeParse({
      name: 'Read Paper',
      category: 'Research',
      icon: 'book',
      color: '#6366f1',
      recurrenceType: 'hourly', // Invalid
    })
    expect(invalidRecurrence.success).toBe(false)
  })

  it('validates createWeightSchema and boundaries', () => {
    const valid = createWeightSchema.safeParse({
      date: '2026-10-01',
      weight: 72.5,
      unit: 'kg',
    })
    expect(valid.success).toBe(true)

    const invalidWeight = createWeightSchema.safeParse({
      date: '2026-10-01',
      weight: -5,
      unit: 'kg',
    })
    expect(invalidWeight.success).toBe(false)
  })
})