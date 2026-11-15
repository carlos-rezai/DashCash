import { DatabaseSync } from 'node:sqlite';
import { migrateDatabase } from '../migrateDatabase/migrateDatabase.ts';
import type { Migration } from '../migrations/migrations.ts';

// Opens the Database at `path`, turns foreign keys on (SQLite's default
// rollback journal stays) and migrates it. Any failure closes the connection
// and throws with its cause.
export function openDatabase(
  path: string,
  migrations: readonly Migration[],
): DatabaseSync {
  const db = new DatabaseSync(path);
  try {
    db.exec('PRAGMA foreign_keys = ON');
    migrateDatabase(db, migrations);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
