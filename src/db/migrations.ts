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
  {
    version: 3,
    name: 'outbox_hardening_and_production_tables',
    up: async (db: SQLiteDatabase) => {
      await db.execAsync(`
        -- Harden mutation_queue with idempotency and retry tracking.
        ALTER TABLE mutation_queue ADD COLUMN mutation_id TEXT;
        ALTER TABLE mutation_queue ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE mutation_queue ADD COLUMN next_attempt_at TEXT;
        ALTER TABLE mutation_queue ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
        ALTER TABLE mutation_queue ADD COLUMN last_error TEXT;

        CREATE INDEX IF NOT EXISTS idx_mutation_queue_status
          ON mutation_queue(status, next_attempt_at);

        -- activity_template: index updated_at for incremental sync cursors
        CREATE INDEX IF NOT EXISTS idx_activity_template_updated
          ON activity_template(updated_at);

        -- activity_log: index updated_at for incremental sync cursors
        CREATE INDEX IF NOT EXISTS idx_activity_log_updated
          ON activity_log(updated_at);

        -- calendar_event: local cache of Google Calendar events
        CREATE TABLE IF NOT EXISTS calendar_event (
          id TEXT PRIMARY KEY NOT NULL,
          google_event_id TEXT NOT NULL,
          calendar_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          location TEXT,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          all_day INTEGER NOT NULL DEFAULT 0,
          color TEXT,
          status TEXT NOT NULL DEFAULT 'confirmed',
          tracker_artifact_id TEXT,
          tracker_artifact_type TEXT,
          is_deleted INTEGER NOT NULL DEFAULT 0,
          synced_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_calendar_event_start
          ON calendar_event(start_date);

        CREATE INDEX IF NOT EXISTS idx_calendar_event_range
          ON calendar_event(start_date, end_date);

        CREATE INDEX IF NOT EXISTS idx_calendar_event_updated
          ON calendar_event(updated_at);

        CREATE INDEX IF NOT EXISTS idx_calendar_event_google_id
          ON calendar_event(google_event_id);

        -- onboarding_state: persist wizard progress between app restarts
        CREATE TABLE IF NOT EXISTS onboarding_state (
          id INTEGER PRIMARY KEY NOT NULL DEFAULT 1,
          state_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- tombstones: track remotely deleted entities to prevent re-creation on sync
        CREATE TABLE IF NOT EXISTS tombstones (
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          deleted_at TEXT NOT NULL,
          PRIMARY KEY (entity_type, entity_id)
        );

        CREATE INDEX IF NOT EXISTS idx_tombstones_deleted
          ON tombstones(deleted_at);
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