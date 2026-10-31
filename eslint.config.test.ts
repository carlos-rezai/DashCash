import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { check, format, resolveConfig } from 'prettier';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type PackageJson = {
  scripts: Record<string, string | undefined>;
};

type Report = { ruleId: string | null; message: string };

const ROOT = fileURLToPath(new URL('.', import.meta.url));

const packageJson = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8'),
) as PackageJson;

// Samples are linted as if they were this file: typed linting needs a path
// the root project includes, and lintText lints the text given, not the file
// on disk. The samples are passed as text, never written.
const SAMPLE_PATH = fileURLToPath(import.meta.url);

const FLOATING_PROMISE = `export function load(): Promise<number> {
  return Promise.resolve(1);
}

export function run(): void {
  load();
}
`;

const AWAITED_PROMISE = `export function load(): Promise<number> {
  return Promise.resolve(1);
}

export async function run(): Promise<void> {
  await load();
}
`;

// Double quotes, no semicolons and a call split over two lines: Prettier
// rewrites all of it, the code itself stays the same. The split call is what
// ESLint's own no-unexpected-multiline reports unless Prettier's config
// turns it off.
const UNFORMATTED = `const double = (value: number): number => value * 2
export const result = double
(2)
export const greeting = "hello"
`;

// Paths ESLint must never lint: docs (the prototype's real JavaScript
// included), dependencies and build and test output.
const IGNORED_PATHS = [
  'docs/design/prototype/support.js',
  'docs/design/prototype/lib/store.js',
  'docs/features/01-sample/docsSample.ts',
  'docs/docsSample.js',
  'node_modules/sample/index.js',
  'dist/main.js',
  'out/main.js',
  'release/main.js',
  '.vite/deps.js',
  'storybook-static/main.js',
  'coverage/report.js',
  'playwright-report/report.js',
  'test-results/result.js',
  '.stryker-tmp/sandbox.js',
  'reports/mutation.js',
];

// Code ESLint must still lint.
const LINTED_PATHS = [
  'rootSample.ts',
  'scripts/scriptSample.ts',
  'apps/desktop/src/main/mainSample.ts',
  'packages/domain/src/money/moneySample.ts',
];

async function lintSample(code: string): Promise<Report[]> {
  const eslint = new ESLint({ cwd: ROOT });
  const [result] = await eslint.lintText(code, { filePath: SAMPLE_PATH });
  if (result === undefined) {
    throw new Error('ESLint returned no result for the sample');
  }
  return result.messages.map(({ ruleId, message }) => ({ ruleId, message }));
}

// Runs an npm script's command the way `npm run` does: through the shell,
// with the root node_modules/.bin on the PATH.
function runScript(
  name: string,
  cwd: string,
): { status: number | null; output: string } {
  const script = packageJson.scripts[name];
  if (script === undefined) {
    throw new Error(`npm script ${name} is missing`);
  }
  const pathKey =
    Object.keys(process.env).find((key) => key.toUpperCase() === 'PATH') ??
    'PATH';
  const result = spawnSync(script, {
    cwd,
    shell: true,
    encoding: 'utf8',
    env: {
      ...process.env,
      [pathKey]: [join(ROOT, 'node_modules', '.bin'), process.env[pathKey]]
        .filter((part) => part !== undefined)
        .join(delimiter),
    },
  });
  return { status: result.status, output: result.stdout + result.stderr };
}

function writeTreeFile(root: string, file: string, content: string): void {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

describe('eslint config', { timeout: 60_000 }, () => {
  it('reports a floating promise', async () => {
    const reports = await lintSample(FLOATING_PROMISE);

    expect(reports.map(({ ruleId }) => ruleId)).toContain(
      '@typescript-eslint/no-floating-promises',
    );
  });

  it('reports nothing on the awaited twin of the floating promise', async () => {
    expect(await lintSample(AWAITED_PROMISE)).toEqual([]);
  });

  it('raises no report on code that differs from Prettier only in formatting', async () => {
    const config = await resolveConfig(SAMPLE_PATH);
    const options = { ...config, filepath: SAMPLE_PATH };
    expect(await check(UNFORMATTED, options)).toBe(false);

    expect(await lintSample(UNFORMATTED)).toEqual([]);
    expect(await lintSample(await format(UNFORMATTED, options))).toEqual([]);
  });

  it.each(IGNORED_PATHS)('ignores %s', async (path) => {
    const eslint = new ESLint({ cwd: ROOT });

    expect(await eslint.isPathIgnored(join(ROOT, path))).toBe(true);
  });

  it.each(LINTED_PATHS)('lints %s', async (path) => {
    const eslint = new ESLint({ cwd: ROOT });

    expect(await eslint.isPathIgnored(join(ROOT, path))).toBe(false);
  });
});

describe('lint script', { timeout: 30_000 }, () => {
  // A tree with its own plain config: one rule that warns, one that errors,
  // so the script's handling of each is checked without the typed setup.
  const TREE_CONFIG = `export default [
  { rules: { 'no-debugger': 'warn', 'no-unused-vars': 'error' } },
];
`;

  let tree: string;

  beforeEach(() => {
    tree = mkdtempSync(join(tmpdir(), 'dashcash-eslint-'));
    writeTreeFile(tree, 'eslint.config.mjs', TREE_CONFIG);
  });

  afterEach(() => {
    rmSync(tree, { recursive: true, force: true });
  });

  it('fails on a warning', () => {
    writeTreeFile(tree, 'src/sample.js', 'debugger;\n');

    const result = runScript('lint', tree);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('no-debugger');
  });

  it('fails on an error', () => {
    writeTreeFile(tree, 'src/sample.js', 'const unused = 1;\n');

    const result = runScript('lint', tree);

    expect(result.status).not.toBe(0);
    expect(result.output).toContain('no-unused-vars');
  });

  it('passes on a tree without reports', () => {
    writeTreeFile(tree, 'src/sample.js', 'export const used = 1;\n');

    const result = runScript('lint', tree);

    expect(result.status, result.output).toBe(0);
  });
});

describe('repository tree', { timeout: 120_000 }, () => {
  it('passes lint', () => {
    const result = runScript('lint', ROOT);

    expect(result.status, result.output).toBe(0);
  });
});
