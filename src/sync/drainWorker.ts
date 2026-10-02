import type { SQLiteDatabase } from 'expo-sqlite'
import {
  trackerApi,
  type CreateLogInput,
  type CreateTemplateInput,
  type UpdateTemplateInput,
} from '@/api/client'
import { OutboxRepository, type OutboxEntry } from '@/db/repository/OutboxRepository'

// Max attempts before a mutation is moved to permanent failure (dead letter)
const MAX_ATTEMPTS = 20

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
      // 401 is a permanent auth failure — stop draining immediately
      if (err instanceof Error && err.message.includes('UNAUTHORIZED')) {
        errors++
        break // Stop processing mutations, allow app to handle logout
      }

      errors++
      const message = err instanceof Error ? err.message : 'Unknown outbox sync error'
      
      // After MAX_ATTEMPTS, move to permanent failure (dead letter) instead of retrying
      if (entry.attemptCount >= MAX_ATTEMPTS) {
        await outboxRepo.markPermanentlyFailed(entry.id, `Permanent failure after ${MAX_ATTEMPTS} attempts: ${message}`)
      } else {
        await outboxRepo.markFailed(entry.id, message)
      }
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
