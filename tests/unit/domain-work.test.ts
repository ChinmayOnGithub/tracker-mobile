import { describe, expect, it } from 'bun:test'
import { WorkSessionStateMachine } from '@/domain/work'

describe('Domain Work Session State Machine', () => {
  it('calculates elapsed time accurately with pauses and resumes', () => {
    const machine = new WorkSessionStateMachine()
    const t0 = new Date('2026-10-01T10:00:00Z')
    machine.start(t0)

    const t1 = new Date('2026-10-01T10:30:00Z') // +1800s
    machine.pause(t1)
    expect(machine.getState().accumulatedSeconds).toBe(1800)
    expect(machine.getState().status).toBe('paused')

    const t2 = new Date('2026-10-01T11:00:00Z') // resume
    machine.resume(t2)

    const t3 = new Date('2026-10-01T11:15:00Z') // +900s
    expect(machine.getElapsedSeconds(t3)).toBe(2700)

    const stoppedSeconds = machine.stop(t3)
    expect(stoppedSeconds).toBe(2700)
    expect(machine.getState().status).toBe('completed')
  })
})