import { describe, expect, it } from 'bun:test'
import type { LeaveAllowance, LeaveRecord } from '@/api/client'

function calcDays(startStr: string, endStr: string): number {
  const [sy, sm, sd] = startStr.split('-').map(Number)
  const [ey, em, ed] = endStr.split('-').map(Number)
  const startUtc = Date.UTC(sy, sm - 1, sd)
  const endUtc = Date.UTC(ey, em - 1, ed)
  if (isNaN(startUtc) || isNaN(endUtc)) return 1
  const diffDays = Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000))
  return Math.max(1, diffDays + 1)
}

describe('Leave Presentation & Allowance Logic', () => {
  const mockAllowances: LeaveAllowance[] = [
    {
      id: 'al-1',
      userId: 'user-1',
      year: 2026,
      leaveType: 'CASUAL',
      allowance: 12,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'al-2',
      userId: 'user-1',
      year: 2026,
      leaveType: 'SICK',
      allowance: 8,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'al-3',
      userId: 'user-1',
      year: 2026,
      leaveType: 'PTO',
      allowance: 15,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]

  const mockRecords: LeaveRecord[] = [
    {
      id: 'lr-1',
      userId: 'user-1',
      leaveType: 'CASUAL',
      startDate: '2026-05-10',
      endDate: '2026-05-12',
      totalDays: 3,
      status: 'APPROVED',
      notes: 'Short vacation',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    },
    {
      id: 'lr-2',
      userId: 'user-1',
      leaveType: 'CASUAL',
      startDate: '2026-06-01',
      endDate: '2026-06-01',
      totalDays: 1,
      status: 'APPROVED',
      notes: null,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    },
    {
      id: 'lr-3',
      userId: 'user-1',
      leaveType: 'SICK',
      startDate: '2026-07-15',
      endDate: '2026-07-15',
      totalDays: 1,
      status: 'REJECTED', // Rejected does not count toward used days
      notes: null,
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
    },
  ]

  it('calculates used and remaining leave days per leave type', () => {
    const usedByType: Record<string, number> = {}
    mockRecords
      .filter((r) => r.status === 'APPROVED')
      .forEach((r) => {
        usedByType[r.leaveType] = (usedByType[r.leaveType] ?? 0) + r.totalDays
      })

    const casualAllowance = mockAllowances.find((a) => a.leaveType === 'CASUAL')?.allowance ?? 0
    const casualUsed = usedByType['CASUAL'] ?? 0
    const casualRemaining = Math.max(0, casualAllowance - casualUsed)

    expect(casualUsed).toBe(4) // 3 + 1
    expect(casualRemaining).toBe(8) // 12 - 4

    const sickAllowance = mockAllowances.find((a) => a.leaveType === 'SICK')?.allowance ?? 0
    const sickUsed = usedByType['SICK'] ?? 0
    const sickRemaining = Math.max(0, sickAllowance - sickUsed)

    expect(sickUsed).toBe(0) // lr-3 is REJECTED so 0 used
    expect(sickRemaining).toBe(8)
  })

  it('calculates inclusive days correctly across dates', () => {
    expect(calcDays('2026-10-02', '2026-10-02')).toBe(1)
    expect(calcDays('2026-10-02', '2026-10-04')).toBe(3)
    expect(calcDays('2026-10-30', '2026-11-02')).toBe(4) // month boundary
  })

  it('detects whether a user is currently on active leave for a date', () => {
    const isOnLeaveOnMay11 = mockRecords.some(
      (r) =>
        r.status === 'APPROVED' &&
        r.startDate <= '2026-05-11' &&
        r.endDate >= '2026-05-11'
    )
    expect(isOnLeaveOnMay11).toBe(true)

    const isOnLeaveOnMay15 = mockRecords.some(
      (r) =>
        r.status === 'APPROVED' &&
        r.startDate <= '2026-05-15' &&
        r.endDate >= '2026-05-15'
    )
    expect(isOnLeaveOnMay15).toBe(false)
  })
})
