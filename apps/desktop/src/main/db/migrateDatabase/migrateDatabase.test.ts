import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Migration } from '../migrations/migrations.ts';
import { migrateDatabase } from './migrateDatabase.ts';

// The runner against real SQLite, with invented sample migrations. Each
// sample records its run in `log`, so a test sees which ran and in what order.

let log: string[];
let folder: string;
let open: DatabaseSync[];

beforeEach(() => {
  log = [];
  open = [];
  folder = mkdtempSync(join(tmpdir(), 'dashcash-migrate-'));
});

afterEach(() => {
  for (const db of open) {
    if (db.isOpen) {
      db.close();
    }
  }
  rmSync(folder, { recursive: true, force: true });
});

function openDb(path = ':memory:'): DatabaseSync {
  const db = new DatabaseSync(path);
  open.push(db);
  return db;
}

function migration(
  version: number,
  name: string,
  sql: string,
  fail = false,
): Migration {
  return {
    version,
    name,
    up: (db) => {
      log.push(name);
      db.exec(sql);
      if (fail) {
        throw new Error(`invented failure in ${name}`);
      }
    },
  };
}

const CREATE_ACCOUNTS = migration(
  1,
  'create accounts',
  'CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT NOT NULL)',
);
const CREATE_GOALS = migration(
  2,
  'create goals',
  'CREATE TABLE goals (id INTEGER PRIMARY KEY, title TEXT NOT NULL)',
);
const CREATE_STREAKS = migration(
  3,
  'create streaks',
  'CREATE TABLE streaks (id INTEGER PRIMARY KEY, days INTEGER NOT NULL)',
);

function schemaVersion(db: DatabaseSync): unknown {
  return db.prepare('PRAGMA user_version').get()?.['user_version'];
}

function tables(db: DatabaseSync): unknown[] {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all()
    .map((row) => row['name']);
}

describe('migrateDatabase', () => {
  it('leaves a new Database at schema version 0 with an empty list', () => {
    const db = openDb();

    migrateDatabase(db, []);

    expect(schemaVersion(db)).toBe(0);
    expect(tables(db)).toStrictEqual([]);
  });

  it('runs pending migrations in order and sets the schema version', () => {
    const db = openDb();

    migrateDatabase(db, [CREATE_ACCOUNTS, CREATE_GOALS, CREATE_STREAKS]);

    expect(log).toStrictEqual([
      'create accounts',
      'create goals',
      'create streaks',
    ]);
    expect(schemaVersion(db)).toBe(3);
    expect(tables(db)).toStrictEqual(['accounts', 'goals', 'streaks']);
  });

  it('runs only the pending migrations of a Database already migrated', () => {
    const path = join(folder, 'dashcash.db');
    const first = openDb(path);
    migrateDatabase(first, [CREATE_ACCOUNTS]);
    first.close();
    log.length = 0;

    const second = openDb(path);
    migrateDatabase(second, [CREATE_ACCOUNTS, CREATE_GOALS]);

    expect(log).toStrictEqual(['create goals']);
    expect(schemaVersion(second)).toBe(2);
    expect(tables(second)).toStrictEqual(['accounts', 'goals']);
  });

  it('runs nothing again on a Database at the newest version', () => {
    const db = openDb();
    migrateDatabase(db, [CREATE_ACCOUNTS, CREATE_GOALS]);
    log.length = 0;

    migrateDatabase(db, [CREATE_ACCOUNTS, CREATE_GOALS]);

    expect(log).toStrictEqual([]);
    expect(schemaVersion(db)).toBe(2);
  });

  it('leaves the previous version and tables when a migration fails', () => {
    const db = openDb();
    const failing = migration(
      2,
      'create goals, then fail',
      'CREATE TABLE goals (id INTEGER PRIMARY KEY, title TEXT NOT NULL)',
      true,
    );

    expect(() => {
      migrateDatabase(db, [CREATE_ACCOUNTS, failing, CREATE_STREAKS]);
    }).toThrow('invented failure in create goals, then fail');

    expect(log).toStrictEqual(['create accounts', 'create goals, then fail']);
    expect(schemaVersion(db)).toBe(1);
    expect(tables(db)).toStrictEqual(['accounts']);
  });

  it.each([
    { case: 'a gap', versions: [1, 3], n: 2 },
    { case: 'a list not starting at 1', versions: [2, 3], n: 2 },
    { case: 'a duplicate', versions: [1, 2, 2], n: 3 },
  ])('refuses $case and runs nothing', ({ versions, n }) => {
    const db = openDb();
    const migrations = versions.map((version) =>
      migration(
        version,
        `create table${String(version)}`,
        `CREATE TABLE IF NOT EXISTS t${String(version)} (id INTEGER)`,
      ),
    );

    expect(() => {
      migrateDatabase(db, migrations);
    }).toThrow(
      `The migrations are not numbered 1 to ${String(n)} without gaps or duplicates.`,
    );

    expect(log).toStrictEqual([]);
    expect(schemaVersion(db)).toBe(0);
    expect(tables(db)).toStrictEqual([]);
  });

  it('refuses a Database from a newer DashCash and runs nothing', () => {
    const db = openDb();
    db.exec('PRAGMA user_version = 3');

    expect(() => {
      migrateDatabase(db, [CREATE_ACCOUNTS, CREATE_GOALS]);
    }).toThrow(
      'dashcash.db has schema version 3, but this DashCash knows only up to 2.',
    );

    expect(log).toStrictEqual([]);
    expect(schemaVersion(db)).toBe(3);
    expect(tables(db)).toStrictEqual([]);
  });
});
