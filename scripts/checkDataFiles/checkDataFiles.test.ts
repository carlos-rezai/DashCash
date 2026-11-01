import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findDataFiles } from './checkDataFiles.ts';

type PackageJson = {
  scripts: Record<string, string | undefined>;
};

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

const packageJson = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8'),
) as PackageJson;

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

// Environment without the GIT_* variables a git hook sets, so the commands
// below act on the temporary repository only, never on this one.
function cleanEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
}

function git(cwd: string, ...args: string[]): void {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: cleanEnv(),
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  }
}

function writeTreeFile(root: string, file: string, content: string): void {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

// Runs an npm script's command the way `npm run` does: through the shell, in
// the given folder.
function runScript(
  name: string,
  cwd: string,
): { status: number | null; stdout: string; stderr: string } {
  const script = packageJson.scripts[name];
  if (script === undefined) {
    throw new Error(`npm script ${name} is missing`);
  }
  const result = spawnSync(script, {
    cwd,
    shell: true,
    encoding: 'utf8',
    env: cleanEnv(),
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe('check:data-files', { timeout: 30_000 }, () => {
  let tree: string;

  beforeEach(() => {
    // A fresh repository with this repository's gate scripts beside it, so
    // the npm script's relative path resolves; the scripts stay untracked.
    tree = mkdtempSync(join(tmpdir(), 'dashcash-data-files-'));
    cpSync(join(ROOT, 'scripts'), join(tree, 'scripts'), { recursive: true });
    writeTreeFile(tree, 'package.json', '{ "type": "module" }\n');
    git(tree, 'init', '--quiet');
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
