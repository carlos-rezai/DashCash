import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runNpmScript as runScript } from '../test-support/runNpmScript/runNpmScript.ts';
import {
  initSampleRepository,
  installGateScripts,
  runSampleGit as git,
  writeTreeFile,
} from '../test-support/sampleRepository/sampleRepository.ts';
import { findDataFiles } from './checkDataFiles.ts';

// Tracked paths the check must reject: databases with their journal and WAL
// files, CSV files outside fixtures/, upper-case extensions, and every .env
// file but .env.example, wherever it sits.
const DATA_FILES = [
  'app.db',
  'apps/desktop/data/app.db',
  'app.db-journal',
  'app.db-wal',
  'app.db-shm',
  'store.sqlite',
  'backup/store.sqlite',
  'store.sqlite-journal',
  'store.sqlite-wal',
  'statement.csv',
  'docs/exports/statement.csv',
  'apps/desktop/src/main/db/seed.csv',
  'APP.DB',
  'App.Db-Journal',
  'STORE.SQLITE',
  'store.SQLite-WAL',
  'Statement.CSV',
  'exports/STATEMENT.CSV',
  '.env',
  'apps/desktop/.env',
  'fixtures/.env',
  '.env.local',
  '.env.production',
  'packages/domain/.env.test',
  'fixtures/.env.local',
];

// Tracked paths the check must allow: CSV files under fixtures/, .env.example
// and ordinary files whose names only resemble a data file.
const ALLOWED_FILES = [
  'fixtures/statement.csv',
  'fixtures/bank-a/statement.csv',
  'fixtures/bank-b/STATEMENT.CSV',
  '.env.example',
  'apps/desktop/.env.example',
  'README.md',
  'package.json',
  'scripts/checkDataFiles/checkDataFiles.ts',
  'apps/desktop/src/main/db/.gitkeep',
  'docs/database.md',
  'docs/csv-import.md',
  'notes.csv.md',
  'app.dbx',
  'store.sqlite3.md',
  'environment.ts',
];

describe('findDataFiles', () => {
  it.each(DATA_FILES)('rejects %s', (path) => {
    expect(findDataFiles([path])).toEqual([path]);
  });

  it.each(ALLOWED_FILES)('allows %s', (path) => {
    expect(findDataFiles([path])).toEqual([]);
  });

  it('returns nothing for an empty tree', () => {
    expect(findDataFiles([])).toEqual([]);
  });

  it('returns every data file of a mixed tree, and only those', () => {
    const tracked = [...ALLOWED_FILES, ...DATA_FILES];

    const found = findDataFiles(tracked);

    expect(found).toHaveLength(DATA_FILES.length);
    expect(found).toEqual(expect.arrayContaining(DATA_FILES));
  });
});

describe('check:data-files', { timeout: 30_000 }, () => {
  let tree: string;

  beforeEach(() => {
    // A fresh repository with this repository's gate scripts beside it, so
    // the npm script's relative path resolves; the scripts stay untracked.
    tree = mkdtempSync(join(tmpdir(), 'dashcash-data-files-'));
    installGateScripts(tree);
    initSampleRepository(tree);
    writeTreeFile(tree, '.gitignore', '*.db\n*.csv\n.env\n');
    writeTreeFile(tree, 'README.md', '# Sample\n');
    git(tree, 'add', '.gitignore', 'README.md');
  });

  afterEach(() => {
    rmSync(tree, { recursive: true, force: true });
  });

  it('fails on a force-added data file and names it', () => {
    writeTreeFile(tree, 'exports/statement.csv', 'date,amount\n2026-01-01,1\n');
    writeTreeFile(tree, 'app.db', 'invented');
    git(tree, 'add', '-f', 'exports/statement.csv', 'app.db');

    const result = runScript('check:data-files', tree);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('exports/statement.csv');
    expect(result.stderr).toContain('app.db');
  });

  it('exits 0 without output on a tree without a data file', () => {
    writeTreeFile(tree, 'fixtures/statement.csv', 'date,amount\n');
    writeTreeFile(tree, '.env.example', 'SAMPLE=1\n');
    git(tree, 'add', '-f', 'fixtures/statement.csv', '.env.example');

    const result = runScript('check:data-files', tree);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });
});
