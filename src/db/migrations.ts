import type { SQLiteDatabase } from 'expo-sqlite'

export interface Migration {
  version: number
  name: string
  up: (db: SQLiteDatabase) => Promise<void>
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: async (db: SQLiteDatabase) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_state (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity_template (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          type TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL,
          recurrence_type TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS activity_log (
          id TEXT PRIMARY KEY NOT NULL,
          activity_id TEXT NOT NULL,
          date TEXT NOT NULL,
          status TEXT NOT NULL,
          note TEXT,
          amount REAL,
          payload_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_activity_log_date
          ON activity_log(date);

        CREATE INDEX IF NOT EXISTS idx_activity_log_activity_date
          ON activity_log(activity_id, date);
      `)
    },
  },
  {
    version: 2,
    name: 'mutation_queue_and_versioning',
    up: async (db: SQLiteDatabase) => {
      await db.execAsync(`
        ALTER TABLE activity_template ADD COLUMN deleted_at TEXT;
        ALTER TABLE activity_template ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

        ALTER TABLE activity_log ADD COLUMN deleted_at TEXT;
        ALTER TABLE activity_log ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

        CREATE TABLE IF NOT EXISTS mutation_queue (
          id TEXT PRIMARY KEY NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          operation TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_mutation_queue_created
          ON mutation_queue(created_at);

        CREATE INDEX IF NOT EXISTS idx_mutation_queue_entity
          ON mutation_queue(entity_type, entity_id);
      `)
    },
  },
]

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `)

  const appliedRows = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version ASC;'
  )
  const appliedVersions = new Set(appliedRows.map((r) => r.version))

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      await db.withTransactionAsync(async () => {
        await migration.up(db)
        await db.runAsync(
          'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
          [migration.version, migration.name, new Date().toISOString()]
        )
      })
    }
  }
}