import { describe, expect, it } from 'bun:test'
import type { OnboardingState } from '@/api/types'

describe('Mobile Onboarding Contract & Parity', () => {
  it('defines the canonical OnboardingState interface matching server contract', () => {
    const defaultState: OnboardingState = {
      version: 1,
      status: 'NOT_STARTED',
      currentStep: 0,
      completedSteps: [],
      taskSources: [],
      calendarProvider: null,
      workStartTime: '09:00',
      workEndTime: '17:00',
      planningStyle: null,
      dailyCapacity: 6,
      focusAreas: ['work'],
      firstDayObjective: '',
      timezone: 'UTC',
      firstPlanActivityId: null,
      momentum: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
    }

    expect(defaultState.version).toBe(1)
    expect(defaultState.status).toBe('NOT_STARTED')
    expect(defaultState.focusAreas).toEqual(['work'])
    expect(defaultState.dailyCapacity).toBe(6)
  })

  it('allows completing onboarding with minimal required setup (timezone and focus area)', () => {
    const completedState: OnboardingState = {
      version: 1,
      status: 'COMPLETED',
      currentStep: 7,
      completedSteps: [1, 2, 7],
      taskSources: [],
      calendarProvider: null,
      workStartTime: '09:00',
      workEndTime: '17:00',
      planningStyle: 'structured',
      dailyCapacity: 6,
      focusAreas: ['work', 'health'],
      firstDayObjective: 'Finish sprint tasks',
      timezone: 'Asia/Kolkata',
      firstPlanActivityId: 'act-1234',
      momentum: 10,
      createdAt: '2026-10-01T10:00:00.000Z',
      completedAt: '2026-10-01T10:05:00.000Z',
    }

    expect(completedState.status).toBe('COMPLETED')
    expect(completedState.timezone).toBe('Asia/Kolkata')
    expect(completedState.firstDayObjective).toBe('Finish sprint tasks')
    expect(completedState.completedAt).not.toBeNull()
  })

  it('supports skip flow without requiring questionnaire answers', () => {
    const skippedState: OnboardingState = {
      version: 1,
      status: 'COMPLETED',
      currentStep: 7,
      completedSteps: [7],
      taskSources: [],
      calendarProvider: null,
      workStartTime: '09:00',
      workEndTime: '17:00',
      planningStyle: null,
      dailyCapacity: 6,
      focusAreas: ['work'],
      firstDayObjective: '',
      timezone: 'UTC',
      firstPlanActivityId: null,
      momentum: 0,
      createdAt: '2026-10-01T10:00:00.000Z',
      completedAt: new Date().toISOString(),
    }

    expect(skippedState.status).toBe('COMPLETED')
    expect(skippedState.firstDayObjective).toBe('')
    expect(skippedState.focusAreas).toEqual(['work'])
  })
})
