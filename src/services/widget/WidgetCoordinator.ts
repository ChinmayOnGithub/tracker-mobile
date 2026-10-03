import type { SQLiteDatabase } from 'expo-sqlite'
import { appEvents, type AppEventType } from '@/utils/events'
import {
  TemplateRepository,
  LogRepository,
  CalendarRepository,
} from '@/db/repository'
import { WidgetService } from './WidgetService'
import { todayYmd } from '@/utils/date'

export class WidgetCoordinator {
  private static instance: WidgetCoordinator | null = null
  private unsubs: (() => void)[] = []
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private readonly DEBOUNCE_MS = 300

  private constructor(private readonly db: SQLiteDatabase) {}

  static init(db: SQLiteDatabase): WidgetCoordinator {
    if (this.instance) {
      this.instance.destroy()
    }
    this.instance = new WidgetCoordinator(db)
    this.instance.subscribeToEvents()
    // Perform initial snapshot sync in background
    void this.instance.triggerUpdate()
    return this.instance
  }

  static getInstance(): WidgetCoordinator | null {
    return this.instance
  }

  private subscribeToEvents(): void {
    const events: AppEventType[] = [
      'tasks:changed',
      'activities:changed',
      'calendar:changed',
      'work_session:changed',
      'sync:completed',
      'date:changed',
    ]

    for (const evt of events) {
      const unsub = appEvents.subscribe(evt, () => {
        this.scheduleUpdate()
      })
      this.unsubs.push(unsub)
    }
  }

  private scheduleUpdate(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => {
      void this.triggerUpdate()
    }, this.DEBOUNCE_MS)
  }

  async triggerUpdate(): Promise<void> {
    try {
      const dateStr = todayYmd()
      const templateRepo = new TemplateRepository(this.db)
      const logRepo = new LogRepository(this.db)
      const calendarRepo = new CalendarRepository(this.db)

      const [templates, logs, calendarEvents] = await Promise.all([
        templateRepo.getActiveTemplates(),
        logRepo.getByDate(dateStr),
        calendarRepo.getByDate(dateStr),
      ])

      await WidgetService.refreshAll({
        templates,
        logs,
        calendarEvents,
        dateStr,
      })
    } catch (err) {
      // Must never crash host app if widget update fails
      console.warn('[WidgetCoordinator] Background widget snapshot update failed:', err)
    }
  }

  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.unsubs.forEach((unsub) => unsub())
    this.unsubs = []
    if (WidgetCoordinator.instance === this) {
      WidgetCoordinator.instance = null
    }
  }
}
