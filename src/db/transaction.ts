import type { SQLiteDatabase } from 'expo-sqlite'

const TX_KEY = Symbol('IS_IN_TRANSACTION')

/**
 * Executes an action within a safe, re-entrant transaction boundary.
 *
 * Expo SQLite's NativeDatabase rejects nested transactions with:
 * "cannot start a transaction within a transaction"
 * followed by:
 * "cannot rollback - no transaction is active"
 *
 * This wrapper guarantees single transaction ownership:
 * - If a transaction is already active on this database handle, it executes the action
 *   directly within that active transaction.
 * - If no transaction is active, it starts one via `withTransactionAsync`, committing
 *   on success or rolling back if an exception is thrown.
 * - Captures and returns the result of the action (since withTransactionAsync returns Promise<void>).
 */
export async function withSafeTransaction<T>(
  db: SQLiteDatabase,
  action: () => Promise<T>
): Promise<T> {
  const dbAny = db as unknown as Record<symbol, boolean>

  if (dbAny[TX_KEY]) {
    // Already inside an active transaction; execute directly without nesting BEGIN.
    return await action()
  }

  let result!: T
  dbAny[TX_KEY] = true
  try {
    await db.withTransactionAsync(async () => {
      result = await action()
    })
    return result
  } finally {
    dbAny[TX_KEY] = false
  }
}
