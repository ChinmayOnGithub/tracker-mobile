import { describe, expect, it } from 'bun:test'
import {
  WorkSessionStateMachine,
  getWeekDates,
  formatHoursTwoDecimals,
  formatTimer,
  isWeekend,
  calculateSessionSeconds,
  calculateSessionHours,
} from '@/domain/work'

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

  it('Issue #35 / Phase C: accurately anchors backdated start time', () => {
    const machine = new WorkSessionStateMachine()
    // Work began at 09:00
    const startAnchor = new Date('2026-10-01T09:00:00Z')
    machine.start(startAnchor)

    // User opens app at 11:00 (2 hours later)
    const now11 = new Date('2026-10-01T11:00:00Z')
    expect(machine.getElapsedSeconds(now11)).toBe(7200) // 2 hours = 7200s

    // At 12:00 (3 hours after work began)
    const now12 = new Date('2026-10-01T12:00:00Z')
    expect(machine.getElapsedSeconds(now12)).toBe(10800) // 3 hours = 10800s

    // Pausing at 12:00 captures 3 full hours into accumulatedSeconds
    machine.pause(now12)
    expect(machine.getState().accumulatedSeconds).toBe(10800)
    expect(machine.getState().status).toBe('paused')

    // Resuming at 13:00 and checking at 14:00 gives 4 hours total
    const resume13 = new Date('2026-10-01T13:00:00Z')
    machine.resume(resume13)
    const now14 = new Date('2026-10-01T14:00:00Z')
    expect(machine.getElapsedSeconds(now14)).toBe(14400) // 4 hours = 14400s
  })

  it('guarantees all 7 days of the week starting Monday and ending Sunday', () => {
    const week = getWeekDates('2026-10-03', 'monday') // Saturday Oct 3, 2026
    expect(week).toHaveLength(7)
    expect(week[0]).toBe('2026-09-28') // Monday
    expect(week[1]).toBe('2026-09-29') // Tuesday
    expect(week[2]).toBe('2026-09-30') // Wednesday
    expect(week[3]).toBe('2026-10-01') // Thursday
    expect(week[4]).toBe('2026-10-02') // Friday
    expect(week[5]).toBe('2026-10-03') // Saturday (weekend comp-off)
    expect(week[6]).toBe('2026-10-04') // Sunday (weekend comp-off)

    expect(isWeekend(week[5])).toBe(true)
    expect(isWeekend(week[6])).toBe(true)
    expect(isWeekend(week[0])).toBe(false)
  })

  it('formats hours with exact 2 decimal accuracy', () => {
    expect(formatHoursTwoDecimals(8.25)).toBe('8.25h')
    expect(formatHoursTwoDecimals(4.5)).toBe('4.50h')
    expect(formatHoursTwoDecimals(0)).toBe('0.00h')
    expect(formatHoursTwoDecimals(8)).toBe('8.00h')
    expect(formatHoursTwoDecimals(8.333333)).toBe('8.33h')
  })

  it('preserves elapsed seconds and never resets on pause', () => {
    // Paused session with 45 seconds accumulated
    const session = {
      status: 'PAUSED',
      startedAt: null,
      durationSeconds: 45,
      durationMinutes: 1,
    }
    const seconds = calculateSessionSeconds(session)
    expect(seconds).toBe(45)
    expect(formatTimer(seconds)).toBe('00:00:45')
    expect(formatHoursTwoDecimals(calculateSessionHours(session))).toBe('0.01h')
  })
})