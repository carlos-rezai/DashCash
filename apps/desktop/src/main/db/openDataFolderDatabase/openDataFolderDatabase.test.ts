import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS } from '../migrations/migrations.ts';
import {
  watchConnections,
  type ConnectionWatch,
} from '../test-support/watchConnections/watchConnections.ts';
import { openDataFolderDatabase } from './openDataFolderDatabase.ts';

// openDataFolderDatabase against real SQLite in a temporary folder, with the
// committed Migrations.

// SQLite's message for a file that is not a database (SQLITE_NOTADB).
const NOT_A_DATABASE = 'file is not a database';

let root: string;
let watch: ConnectionWatch;
let opened: DatabaseSync[];

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dashcash-data-folder-database-'));
  watch = watchConnections();
  opened = [];
});

afterEach(() => {
  watch.stop();
  for (const db of [...opened, ...watch.connections()]) {
    if (db.isOpen) {
      db.close();
    }
  }
  rmSync(root, { recursive: true, force: true });
});

function open(folder: string): DatabaseSync {
  const db = openDataFolderDatabase(folder);
  opened.push(db);
  return db;
}

describe('openDataFolderDatabase', () => {
  it('creates a missing Data folder with its parents and dashcash.db in it', () => {
    const folder = join(root, 'parent', 'data');

    const db = open(folder);

    expect(db.isOpen).toBe(true);
    expect(readdirSync(folder)).toContain('dashcash.db');
    expect(db.location()).toBe(join(folder, 'dashcash.db'));
  });

  it('keeps what an existing Data folder holds', () => {
    const folder = join(root, 'data');
    mkdirSync(folder);
    writeFileSync(join(folder, 'notes.txt'), 'invented notes');

    open(folder);

    expect(readFileSync(join(folder, 'notes.txt'), 'utf8')).toBe(
      'invented notes',
    );
    expect(existsSync(join(folder, 'dashcash.db'))).toBe(true);
  });

  it('migrates the Database to the number of committed Migrations', () => {
    const db = open(join(root, 'data'));

    expect(db.prepare('PRAGMA user_version').get()?.['user_version']).toBe(
      MIGRATIONS.length,
    );
  });

  it('fails on a dashcash.db that is not SQLite, leaves it as it was and the connection closed', () => {
    const folder = join(root, 'data');
    mkdirSync(folder);
    const content = 'invented, not a SQLite database\n'.repeat(8);
    writeFileSync(join(folder, 'dashcash.db'), content);

    expect(() => open(folder)).toThrow(NOT_A_DATABASE);

    expect(readFileSync(join(folder, 'dashcash.db'), 'utf8')).toBe(content);
    expect(watch.connections().map((db) => db.isOpen)).not.toContain(true);
  });
});
