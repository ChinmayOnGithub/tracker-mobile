import { parseUTCDate, formatUTCDate } from './recurrence'

export type WorkSessionStatus = 'idle' | 'running' | 'paused' | 'completed'

export interface WorkSessionState {
  status: WorkSessionStatus
  startedAt: string | null // ISO string
  currentSegmentStartedAt: string | null // ISO string
  accumulatedSeconds: number
  note?: string | null
}

export class WorkSessionStateMachine {
  private state: WorkSessionState

  constructor(initialState?: Partial<WorkSessionState>) {
    this.state = {
      status: initialState?.status ?? 'idle',
      startedAt: initialState?.startedAt ?? null,
      currentSegmentStartedAt: initialState?.currentSegmentStartedAt ?? null,
      accumulatedSeconds: initialState?.accumulatedSeconds ?? 0,
      note: initialState?.note ?? null,
    }
  }

  getState(): Readonly<WorkSessionState> {
    return { ...this.state }
  }

  start(startTime: Date = new Date(), note?: string): void {
    if (this.state.status === 'running') return
    const nowIso = startTime.toISOString()
    this.state = {
      status: 'running',
      startedAt: this.state.startedAt ?? nowIso,
      currentSegmentStartedAt: nowIso,
      accumulatedSeconds: this.state.accumulatedSeconds,
      note: note ?? this.state.note,
    }
  }

  pause(pauseTime: Date = new Date()): void {
    if (this.state.status !== 'running' || !this.state.currentSegmentStartedAt) return
    const segmentStart = new Date(this.state.currentSegmentStartedAt).getTime()
    const currentPause = pauseTime.getTime()
    const elapsedSegmentSeconds = Math.max(0, Math.floor((currentPause - segmentStart) / 1000))

    this.state = {
      status: 'paused',
      startedAt: this.state.startedAt,
      currentSegmentStartedAt: null,
      accumulatedSeconds: this.state.accumulatedSeconds + elapsedSegmentSeconds,
      note: this.state.note,
    }
  }

  resume(resumeTime: Date = new Date()): void {
    if (this.state.status !== 'paused') return
    this.state = {
      status: 'running',
      startedAt: this.state.startedAt,
      currentSegmentStartedAt: resumeTime.toISOString(),
      accumulatedSeconds: this.state.accumulatedSeconds,
      note: this.state.note,
    }
  }

  stop(stopTime: Date = new Date()): number {
    if (this.state.status === 'running') {
      this.pause(stopTime)
    }
    const finalSeconds = this.state.accumulatedSeconds
    this.state = {
      status: 'completed',
      startedAt: this.state.startedAt,
      currentSegmentStartedAt: null,
      accumulatedSeconds: finalSeconds,
      note: this.state.note,
    }
    return finalSeconds
  }

  reset(): void {
    this.state = {
      status: 'idle',
      startedAt: null,
      currentSegmentStartedAt: null,
      accumulatedSeconds: 0,
      note: null,
    }
  }

  getElapsedSeconds(now: Date = new Date()): number {
    let elapsed = this.state.accumulatedSeconds
    if (this.state.status === 'running' && this.state.currentSegmentStartedAt) {
      const segStart = new Date(this.state.currentSegmentStartedAt).getTime()
      const current = now.getTime()
      elapsed += Math.max(0, Math.floor((current - segStart) / 1000))
    }
    return elapsed
  }
}

export function getWeekDates(dateStr: string, startOfWeekPref: 'monday' | 'sunday' = 'monday'): string[] {
  const current = parseUTCDate(dateStr)
  const day = current.getUTCDay()

  let diff = 0
  if (startOfWeekPref === 'monday') {
    diff = day === 0 ? -6 : 1 - day
  } else {
    diff = -day
  }

  const start = new Date(current)
  start.setUTCDate(current.getUTCDate() + diff)

  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const temp = new Date(start)
    temp.setUTCDate(start.getUTCDate() + i)
    dates.push(formatUTCDate(temp))
  }
  return dates
}

export function formatHoursTwoDecimals(hours: number): string {
  return `${hours.toFixed(2)}h`
}

export function formatTimer(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function getDayShortName(dateStr: string): string {
  const d = parseUTCDate(dateStr)
  return SHORT_DAYS[d.getUTCDay()]
}

export function getDayOfMonth(dateStr: string): string {
  const parts = dateStr.split('-')
  return String(parseInt(parts[2] || '1', 10))
}

export function isWeekend(dateStr: string): boolean {
  const d = parseUTCDate(dateStr)
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

export function calculateSessionSeconds(
  session: {
    status: string
    startedAt?: string | null
    durationSeconds?: number
    durationMinutes?: number
  },
  nowMs: number = Date.now()
): number {
  let sec = (session.durationSeconds && session.durationSeconds > 0)
    ? session.durationSeconds
    : ((session.durationMinutes || 0) * 60)

  if (session.status === 'ACTIVE' && session.startedAt) {
    const startMs = new Date(session.startedAt).getTime()
    const seg = Math.max(0, Math.floor((nowMs - startMs) / 1000))
    sec += seg
  }

  return sec
}

export function calculateSessionHours(
  session: {
    status: string
    startedAt?: string | null
    durationSeconds?: number
    durationMinutes?: number
  },
  nowMs: number = Date.now()
): number {
  return calculateSessionSeconds(session, nowMs) / 3600
}