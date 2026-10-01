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