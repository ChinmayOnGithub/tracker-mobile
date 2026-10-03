import { describe, it, expect, mock } from 'bun:test'
import { withSafeTransaction } from '@/db/transaction'
import type { SQLiteDatabase } from 'expo-sqlite'

describe('withSafeTransaction', () => {
  it('starts a transaction when none is active', async () => {
    let txStarted = 0
    const mockDb = {
      withTransactionAsync: async (fn: () => Promise<void>) => {
        txStarted++
        await fn()
      },
    } as unknown as SQLiteDatabase

    const result = await withSafeTransaction(mockDb, async () => {
      return 'success'
    })

    expect(result).toBe('success')
    expect(txStarted).toBe(1)
  })

  it('prevents nested transaction collision and runs inner action directly', async () => {
    let txStarted = 0
    const executionOrder: string[] = []

    const mockDb = {
      withTransactionAsync: async (fn: () => Promise<void>) => {
        txStarted++
        await fn()
      },
    } as unknown as SQLiteDatabase

    const result = await withSafeTransaction(mockDb, async () => {
      executionOrder.push('outer-start')

      const innerResult = await withSafeTransaction(mockDb, async () => {
        executionOrder.push('inner-run')
        return 'inner-val'
      })

      executionOrder.push('outer-end')
      return innerResult
    })

    expect(result).toBe('inner-val')
    // withTransactionAsync should only have been called ONCE for the outer transaction!
    expect(txStarted).toBe(1)
    expect(executionOrder).toEqual(['outer-start', 'inner-run', 'outer-end'])
  })

  it('propagates error from inner action and resets transaction state', async () => {
    let txStarted = 0

    const mockDb = {
      withTransactionAsync: async (fn: () => Promise<void>) => {
        txStarted++
        await fn()
      },
    } as unknown as SQLiteDatabase

    let caughtError: Error | null = null
    try {
      await withSafeTransaction(mockDb, async () => {
        await withSafeTransaction(mockDb, async () => {
          throw new Error('Inner failure')
        })
      })
    } catch (err) {
      caughtError = err as Error
    }

    expect(caughtError).not.toBeNull()
    expect(caughtError?.message).toBe('Inner failure')
    expect(txStarted).toBe(1)

    // Verify next transaction can start cleanly
    const nextResult = await withSafeTransaction(mockDb, async () => 'recovered')
    expect(nextResult).toBe('recovered')
    expect(txStarted).toBe(2)
  })
})
