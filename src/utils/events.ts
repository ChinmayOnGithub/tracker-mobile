export type AppEventType =
  | 'tasks:changed'
  | 'activities:changed'
  | 'calendar:changed'
  | 'journal:changed'
  | 'notes:changed'
  | 'leave:changed'
  | 'weight:changed'
  | 'vault:changed'
  | 'work_session:changed'
  | 'sync:completed'
  | 'date:changed'

type Listener = () => void

class AppEventBus {
  private listeners: Map<AppEventType, Set<Listener>> = new Map()

  subscribe(event: AppEventType, callback: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  on(event: AppEventType, callback: Listener): () => void {
    return this.subscribe(event, callback)
  }

  emit(event: AppEventType): void {
    const set = this.listeners.get(event)
    if (set) {
      set.forEach((cb) => {
        try {
          cb()
        } catch (err) {
          console.warn(`[AppEventBus] Error in listener for ${event}:`, err)
        }
      })
    }
  }
}

export const appEvents = new AppEventBus()
