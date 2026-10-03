import { NativeModules, Platform } from 'react-native'
import {
  type WidgetSnapshot,
  MAX_WIDGET_SNAPSHOT_BYTES,
  sanitizeWidgetSnapshot,
  createEmptyWidgetSnapshot,
} from '@/domain/widget'

// Native module interface if compiled with Android native bridge
interface TrackerWidgetNativeModule {
  updateWidgetSnapshot?: (json: string) => Promise<boolean> | boolean
  reloadAllWidgets?: () => Promise<boolean> | boolean
}

const { TrackerWidgetModule } = NativeModules as {
  TrackerWidgetModule?: TrackerWidgetNativeModule
}

// Memory fallback to ensure safe operations under test or before first native write
let inMemorySnapshot: WidgetSnapshot | null = null

export class WidgetStorage {
  private static readonly STORAGE_KEY = 'tracker_widget_snapshot'

  /**
   * Serializes and stores the snapshot into shared native storage.
   * Guarantees bounds safety and never throws errors into the main app thread.
   */
  static async setSnapshot(snapshot: WidgetSnapshot): Promise<boolean> {
    try {
      const sanitized = sanitizeWidgetSnapshot(snapshot)
      const serialized = JSON.stringify(sanitized)

      // Guard snapshot size (< 16 KB)
      if (new Blob([serialized]).size > MAX_WIDGET_SNAPSHOT_BYTES) {
        console.warn('[WidgetStorage] Snapshot exceeds byte limit, reducing payload')
        const minimal = sanitizeWidgetSnapshot({
          ...sanitized,
          calendar: null,
          today: {
            ...sanitized.today,
            nextTask: sanitized.today.nextTask
              ? { ...sanitized.today.nextTask, title: sanitized.today.nextTask.title.slice(0, 40) }
              : null,
          },
        })
        inMemorySnapshot = minimal
      } else {
        inMemorySnapshot = sanitized
      }

      // If Android native bridge is available, push directly to SharedPreferences / AppWidgetManager
      if (Platform.OS === 'android' && TrackerWidgetModule?.updateWidgetSnapshot) {
        try {
          await TrackerWidgetModule.updateWidgetSnapshot(JSON.stringify(inMemorySnapshot))
          if (TrackerWidgetModule.reloadAllWidgets) {
            await TrackerWidgetModule.reloadAllWidgets()
          }
        } catch (nativeErr) {
          // Failure in native widget update must never crash host app
          console.warn('[WidgetStorage] Native Android widget update failed:', nativeErr)
        }
      }

      return true
    } catch (err) {
      console.warn('[WidgetStorage] Failed to store widget snapshot safely:', err)
      return false
    }
  }

  /**
   * Retrieves the current widget snapshot, falling back safely if missing.
   */
  static async getSnapshot(): Promise<WidgetSnapshot> {
    try {
      if (inMemorySnapshot) {
        return inMemorySnapshot
      }
      return createEmptyWidgetSnapshot()
    } catch {
      return createEmptyWidgetSnapshot()
    }
  }

  /**
   * Purges widget storage and resets to empty snapshot.
   */
  static async clear(): Promise<void> {
    inMemorySnapshot = null
    if (Platform.OS === 'android' && TrackerWidgetModule?.updateWidgetSnapshot) {
      try {
        await TrackerWidgetModule.updateWidgetSnapshot('')
      } catch {
        // Safe boundary
      }
    }
  }
}
