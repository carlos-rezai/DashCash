import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS } from '../migrations/migrations.ts';
import { openDatabase } from '../openDatabase/openDatabase.ts';

const DATABASE_FILE_NAME = 'dashcash.db';

// Creates the Data folder with its parents when missing, then opens the
// Database in it (dashcash.db) and migrates it with the committed Migrations.
// Any failure throws with its cause, as openDatabase does.
export function openDataFolderDatabase(folder: string): DatabaseSync {
  mkdirSync(folder, { recursive: true });
  return openDatabase(join(folder, DATABASE_FILE_NAME), MIGRATIONS);
}
