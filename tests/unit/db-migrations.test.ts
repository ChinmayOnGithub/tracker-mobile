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

  it('contains migration 2 with mutation_queue, versions, and soft-delete columns', async () => {
    const v2 = MIGRATIONS.find((m) => m.version === 2)
    expect(v2).toBeDefined()
    expect(v2?.name).toBe('mutation_queue_and_versioning')

    const executedSql: string[] = []
    const mockDb = {
      execAsync: async (sql: string) => {
        executedSql.push(sql)
      },
    }

    await v2!.up(mockDb as unknown as import('expo-sqlite').SQLiteDatabase)
    const combined = executedSql.join('\n')

    expect(combined).toContain('ALTER TABLE activity_template ADD COLUMN deleted_at TEXT')
    expect(combined).toContain('ALTER TABLE activity_template ADD COLUMN version INTEGER')
    expect(combined).toContain('ALTER TABLE activity_log ADD COLUMN deleted_at TEXT')
    expect(combined).toContain('ALTER TABLE activity_log ADD COLUMN version INTEGER')
    expect(combined).toContain('CREATE TABLE IF NOT EXISTS mutation_queue')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_mutation_queue_created')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_mutation_queue_entity')
  })
})