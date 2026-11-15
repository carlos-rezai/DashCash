import type { DatabaseSync } from 'node:sqlite';
import type { Migration } from '../migrations/migrations.ts';

function storedVersion(db: DatabaseSync): number {
  const row = db.prepare('PRAGMA user_version').get();
  return Number(row?.['user_version'] ?? 0);
}

function assertNumbered(migrations: readonly Migration[]): void {
  const numbered = migrations.every(
    (migration, index) => migration.version === index + 1,
  );
  if (!numbered) {
    throw new Error(
      `The migrations are not numbered 1 to ${String(migrations.length)} without gaps or duplicates.`,
    );
  }
}

// Brings the Database up to the newest schema version: each pending Migration
// runs with its user_version bump in one transaction, so a failing one leaves
// the previous version and tables intact.
export function migrateDatabase(
  db: DatabaseSync,
  migrations: readonly Migration[],
): void {
  assertNumbered(migrations);

  const stored = storedVersion(db);
  if (stored > migrations.length) {
    throw new Error(
      `dashcash.db has schema version ${String(stored)}, but this DashCash knows only up to ${String(migrations.length)}.`,
    );
  }

  for (const migration of migrations.slice(stored)) {
    db.exec('BEGIN');
    try {
      migration.up(db);
      db.exec(`PRAGMA user_version = ${String(migration.version)}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}
