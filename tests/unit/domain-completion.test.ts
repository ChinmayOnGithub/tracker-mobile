import { describe, expect, it } from 'bun:test'
import { MobileCompletionService } from '@/domain/completion'
import { computeTaskOccurrences } from '@/domain/timeline'
import type { ActivityLog, ActivityTemplate } from '@/api/client'

describe('Domain Completion Service & Task Target Values', () => {
  const baseTemplate: ActivityTemplate = {
    id: 'tmpl-fuel',
    name: 'Fuel Refill',
    category: 'transport',
    type: 'TASK',
    icon: 'activity',
    color: 'blue',
    recurrenceType: 'daily',
    isActive: true,
    metadata: JSON.stringify({
      completion: {
        method: 'VALUE',
        value: {
          label: 'Liters',
          unit: 'L',
          required: true,
          inputType: 'decimal',
          minimum: 1,
          maximum: 100,
        },
      },
    }),
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  }

  it('resolves completion config from template metadata', () => {
    const config = MobileCompletionService.getCompletionConfig(baseTemplate)
    expect(config.method).toBe('VALUE')
    expect(config.value?.label).toBe('Liters')
    expect(config.value?.unit).toBe('L')
    expect(MobileCompletionService.needsValuePrompt(baseTemplate)).toBe(true)
  })

  it('defaults to CHECKBOX when no metadata or amount is present', () => {
    const simpleTemplate: ActivityTemplate = {
      ...baseTemplate,
      id: 'tmpl-meditate',
      name: 'Meditate',
      metadata: null,
      amount: null,
    }
    const config = MobileCompletionService.getCompletionConfig(simpleTemplate)
    expect(config.method).toBe('CHECKBOX')
    expect(MobileCompletionService.needsValuePrompt(simpleTemplate)).toBe(false)
  })

  it('infers VALUE config when template has amount > 0', () => {
    const counterTemplate: ActivityTemplate = {
      ...baseTemplate,
      id: 'tmpl-water',
      name: 'Water Intake',
      metadata: null,
      amount: 2000,
    }
    const config = MobileCompletionService.getCompletionConfig(counterTemplate)
    expect(config.method).toBe('VALUE')
    expect(config.value?.label).toBe('Amount')
    expect(MobileCompletionService.needsValuePrompt(counterTemplate)).toBe(true)
  })

  it('validates numeric input with minimum and maximum bounds', () => {
    const config = MobileCompletionService.getCompletionConfig(baseTemplate)

    const tooLow = MobileCompletionService.validateInput(config, '0.5')
    expect(tooLow.success).toBe(false)
    expect(tooLow.error).toContain('at least 1')

    const tooHigh = MobileCompletionService.validateInput(config, '150')
    expect(tooHigh.success).toBe(false)
    expect(tooHigh.error).toContain('at most 100')

    const invalid = MobileCompletionService.validateInput(config, 'not-a-number')
    expect(invalid.success).toBe(false)
    expect(invalid.error).toContain('valid number')

    const valid = MobileCompletionService.validateInput(config, '12.5')
    expect(valid.success).toBe(true)
    expect(valid.parsedValue).toBe(12.5)
  })

  it('formats completion display correctly from payload and amount', () => {
    // Format from payload
    const displayFromPayload = MobileCompletionService.formatCompletionDisplay(
      baseTemplate,
      { value: 14.2, unit: 'L' },
      null
    )
    expect(displayFromPayload).not.toBeNull()
    expect(displayFromPayload?.formatted).toBe('14.2 L')

    // Format from numeric amount
    const displayFromAmount = MobileCompletionService.formatCompletionDisplay(
      baseTemplate,
      null,
      25
    )
    expect(displayFromAmount).not.toBeNull()
    expect(displayFromAmount?.formatted).toBe('25 L')
  })

  it('formats currency completion display with symbol', () => {
    const expenseTemplate: ActivityTemplate = {
      ...baseTemplate,
      id: 'tmpl-groceries',
      name: 'Groceries',
      metadata: JSON.stringify({
        completion: {
          method: 'VALUE',
          value: {
            label: 'Cost',
            unit: 'INR',
            inputType: 'currency',
          },
        },
      }),
    }

    const display = MobileCompletionService.formatCompletionDisplay(expenseTemplate, null, 1250)
    expect(display).not.toBeNull()
    expect(display?.formatted).toBe('₹1250')
    expect(display?.isMoney).toBe(true)
  })

  it('computes completionDisplay inside computeTaskOccurrences when task is done', () => {
    const logs: ActivityLog[] = [
      {
        id: 'log-1',
        activityId: 'tmpl-fuel',
        date: '2026-10-02',
        status: 'done',
        note: 'Filled tank',
        amount: 35.5,
        payload: { value: 35.5, unit: 'L' },
        createdAt: '2026-10-02T10:00:00.000Z',
        updatedAt: '2026-10-02T10:00:00.000Z',
      },
    ]

    const occurrences = computeTaskOccurrences([baseTemplate], logs, '2026-10-02')
    expect(occurrences.length).toBe(1)
    expect(occurrences[0].isCompleted).toBe(true)
    expect(occurrences[0].completionDisplay).not.toBeNull()
    expect(occurrences[0].completionDisplay?.formatted).toBe('35.5 L')
  })
})
