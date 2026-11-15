import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Migration } from '../migrations/migrations.ts';
import {
  watchConnections,
  type ConnectionWatch,
} from '../test-support/watchConnections/watchConnections.ts';
import { openDatabase } from './openDatabase.ts';

// openDatabase against real SQLite in a temporary folder (design log Q30–Q32,
// A5), with invented sample migrations.

// SQLite's message for a file that is not a database (SQLITE_NOTADB).
const NOT_A_DATABASE = 'file is not a database';

let folder: string;
let path: string;
let watch: ConnectionWatch;
let opened: DatabaseSync[];

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'dashcash-open-database-'));
  path = join(folder, 'dashcash.db');
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
  rmSync(folder, { recursive: true, force: true });
});

function open(migrations: readonly Migration[] = []): DatabaseSync {
  const db = openDatabase(path, migrations);
  opened.push(db);
  return db;
}

function pragma(db: DatabaseSync, name: string): unknown {
  return db.prepare(`PRAGMA ${name}`).get()?.[name];
}

// Whether each connection used since the watch began is still open.
function openStates(): boolean[] {
  return watch.connections().map((db) => db.isOpen);
}

const CREATE_ACCOUNTS: Migration = {
  version: 1,
  name: 'create accounts',
  up: (db) => {
    db.exec(
      'CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
    );
  },
};

describe('openDatabase', () => {
  it('creates dashcash.db and returns an open connection to it', () => {
    expect(existsSync(path)).toBe(false);

    const db = open();

    expect(existsSync(path)).toBe(true);
    expect(db.isOpen).toBe(true);
    expect(db.location()).toBe(path);
  });

  it('turns foreign_keys on', () => {
    const db = open();

    expect(pragma(db, 'foreign_keys')).toBe(1);
  });

  it("keeps SQLite's default rollback journal, not WAL", () => {
    const db = open();

    expect(pragma(db, 'journal_mode')).toBe('delete');
  });

  it('migrates the Database with the given migrations', () => {
    const db = open([CREATE_ACCOUNTS]);

    expect(pragma(db, 'user_version')).toBe(1);
    expect(
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => row['name']),
    ).toStrictEqual(['accounts']);
  });

  it('fails on a file that is not SQLite, leaves it as it was and the connection closed', () => {
    const content = 'invented, not a SQLite database\n'.repeat(8);
    writeFileSync(path, content);

    expect(() => open()).toThrow(NOT_A_DATABASE);

    expect(readFileSync(path, 'utf8')).toBe(content);
    expect(openStates()).not.toContain(true);
  });

  it('fails with the cause when the Database cannot be migrated, and leaves the connection closed', () => {
    // A Database from a newer DashCash, at schema version 3.
    const newer = new DatabaseSync(path);
    newer.exec('PRAGMA user_version = 3');
    newer.close();

    expect(() => open([CREATE_ACCOUNTS])).toThrow(
      'dashcash.db has schema version 3, but this DashCash knows only up to 1.',
    );

    expect(openStates()).not.toContain(true);
  });
});
