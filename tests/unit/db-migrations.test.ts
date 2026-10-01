import { describe, expect, it } from 'bun:test'
import { MIGRATIONS } from '@/db/migrations'

describe('SQLite Database Migrations', () => {
  it('defines migrations in strictly sequential ascending order', () => {
    expect(MIGRATIONS.length).toBeGreaterThan(0)
    for (let i = 0; i < MIGRATIONS.length; i++) {
      expect(MIGRATIONS[i].version).toBe(i + 1)
      expect(MIGRATIONS[i].name).toBeTruthy()
      expect(typeof MIGRATIONS[i].up).toBe('function')
    }
  })

  it('contains initial schema with sync_state, activity_template, activity_log and indexes', async () => {
    const initial = MIGRATIONS.find((m) => m.version === 1)
    expect(initial).toBeDefined()
    expect(initial?.name).toBe('initial_schema')

    // Mock SQLite database to capture executed statements
    const executedSql: string[] = []
    const mockDb = {
      execAsync: async (sql: string) => {
        executedSql.push(sql)
      },
    }

    await initial!.up(mockDb as unknown as import('expo-sqlite').SQLiteDatabase)
    const combined = executedSql.join('\n')

    expect(combined).toContain('CREATE TABLE IF NOT EXISTS sync_state')
    expect(combined).toContain('CREATE TABLE IF NOT EXISTS activity_template')
    expect(combined).toContain('CREATE TABLE IF NOT EXISTS activity_log')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_activity_log_date')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_activity_log_activity_date')
  })
})