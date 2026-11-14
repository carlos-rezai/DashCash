import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

// Design log D1: `node:sqlite` is proven in Electron's own Node before the
// Database is built on it. The pinned Electron runs as plain Node
// (`ELECTRON_RUN_AS_NODE=1`), without a flag, on a script that loads
// `node:sqlite` and opens an in-memory DatabaseSync.

const require = createRequire(import.meta.url);

// The electron npm package exports the path of its pinned binary.
const ELECTRON_BINARY: unknown = require('electron');

const PROBE_SCRIPT = [
  "const { DatabaseSync } = require('node:sqlite');",
  "const db = new DatabaseSync(':memory:');",
  "const { one } = db.prepare('SELECT 1 AS one').get();",
  'process.stdout.write(JSON.stringify({ open: db.isOpen, one }));',
  'db.close();',
].join('\n');

function runProbe(binary: string): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const env: NodeJS.ProcessEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
  // No NODE_OPTIONS: the probe runs without any flag.
  delete env.NODE_OPTIONS;
  const result = spawnSync(binary, ['-e', PROBE_SCRIPT], {
    env,
    encoding: 'utf8',
    timeout: 30_000,
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe('node:sqlite in the pinned Electron', { timeout: 60_000 }, () => {
  it('loads and opens an in-memory database without a flag or a warning', () => {
    expect(typeof ELECTRON_BINARY, 'the electron binary path').toBe('string');
    const { status, stdout, stderr } = runProbe(String(ELECTRON_BINARY));

    expect(status, stderr).toBe(0);
    expect(JSON.parse(stdout)).toStrictEqual({ open: true, one: 1 });
    expect(stderr).toBe('');
  });
});
