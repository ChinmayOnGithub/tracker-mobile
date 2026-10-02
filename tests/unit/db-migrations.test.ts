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
  it('contains migration 3 with outbox hardening, calendar_event, onboarding_state, tombstones', async () => {
    const v3 = MIGRATIONS.find((m) => m.version === 3)
    expect(v3).toBeDefined()
    expect(v3?.name).toBe('outbox_hardening_and_production_tables')

    const executedSql: string[] = []
    const mockDb = {
      execAsync: async (sql: string) => {
        executedSql.push(sql)
      },
    }

    await v3!.up(mockDb as unknown as import('expo-sqlite').SQLiteDatabase)
    const combined = executedSql.join('\n')

    expect(combined).toContain('ALTER TABLE mutation_queue ADD COLUMN mutation_id TEXT')
    expect(combined).toContain('ALTER TABLE mutation_queue ADD COLUMN attempt_count INTEGER')
    expect(combined).toContain('ALTER TABLE mutation_queue ADD COLUMN status TEXT')
    expect(combined).toContain('ALTER TABLE mutation_queue ADD COLUMN last_error TEXT')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_mutation_queue_status')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_activity_template_updated')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_activity_log_updated')
    expect(combined).toContain('CREATE TABLE IF NOT EXISTS calendar_event')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_calendar_event_start')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_calendar_event_range')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_calendar_event_google_id')
    expect(combined).toContain('CREATE TABLE IF NOT EXISTS onboarding_state')
    expect(combined).toContain('CREATE TABLE IF NOT EXISTS tombstones')
    expect(combined).toContain('CREATE INDEX IF NOT EXISTS idx_tombstones_deleted')
  })
})
