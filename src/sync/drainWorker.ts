import type { SQLiteDatabase } from 'expo-sqlite'
import {
  trackerApi,
  type CreateLogInput,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from '@/api/client'
import { OutboxRepository, type OutboxEntry } from '@/db/repository/OutboxRepository'

export interface DrainResult {
  processed: number
  errors: number
}

export async function drainOutbox(db: SQLiteDatabase): Promise<DrainResult> {
  const outboxRepo = new OutboxRepository(db)
  const pending = await outboxRepo.getPending()

  let processed = 0
  let errors = 0

  for (const entry of pending) {
    await outboxRepo.markProcessing(entry.id)

    try {
      await executeOutboxOperation(entry)
      await outboxRepo.markDone(entry.id)
      processed++
    } catch (err) {
      errors++
      const message = err instanceof Error ? err.message : 'Unknown outbox sync error'
      await outboxRepo.markFailed(entry.id, message)
    }
  }

  return { processed, errors }
}

async function executeOutboxOperation(entry: OutboxEntry): Promise<void> {
  switch (entry.operation) {
    case 'create_log': {
      const payload = entry.payload as unknown as CreateLogInput
      await trackerApi.createLog(payload)
      break
    }
    case 'update_log': {
      const payload = entry.payload as unknown as Partial<CreateLogInput>
      await trackerApi.updateLog(entry.entityId, payload)
      break
    }
    case 'delete_log': {
      await trackerApi.deleteLog(entry.entityId)
      break
    }
    case 'create_template': {
      const payload = entry.payload as unknown as CreateTemplateInput
      await trackerApi.createTemplate(payload)
      break
    }
    case 'update_template': {
      const payload = entry.payload as unknown as UpdateTemplateInput
      await trackerApi.updateTemplate(entry.entityId, payload)
      break
    }
    case 'delete_template': {
      await trackerApi.deleteTemplate(entry.entityId)
      break
    }
    default:
      // Unknown operation, mark done to avoid queue clog
      break
  }
}
