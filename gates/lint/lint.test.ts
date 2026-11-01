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
import tseslint from 'typescript-eslint';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

type PackageJson = {
  scripts: Record<string, string | undefined>;
};

type Report = { ruleId: string | null; message: string; severity: number };

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

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

async function lintWith(
  eslint: ESLint,
  code: string,
  filePath: string,
): Promise<Report[]> {
  const [result] = await eslint.lintText(code, { filePath });
  if (result === undefined) {
    throw new Error('ESLint returned no result for the sample');
  }
  return result.messages.map(({ ruleId, message, severity }) => ({
    ruleId,
    message,
    severity,
  }));
}

async function lintSample(code: string): Promise<Report[]> {
  return lintWith(new ESLint({ cwd: ROOT }), code, SAMPLE_PATH);
}

// No tsconfig includes packages/domain yet (its project joins through a
// project reference once the domain has code), so typed linting cannot parse
// a sample there. The domain rule is syntax only: these samples are linted
// with the real config and type information switched off, at paths inside
// and outside packages/domain.
async function lintUntyped(code: string, path: string): Promise<Report[]> {
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfig: [tseslint.configs.disableTypeChecked],
  });
  return lintWith(eslint, code, join(ROOT, path));
}

function ruleIds(reports: Report[]): (string | null)[] {
  return reports.map(({ ruleId }) => ruleId);
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

// Project rules: one violating and one clean sample each. Every sample is
// text passed to lintText, never committed code.
const EXPLICIT_ANY = `export function isText(value: any): boolean {
  return typeof value === 'string';
}
`;

const UNKNOWN_INSTEAD_OF_ANY = `export function isText(value: unknown): boolean {
  return typeof value === 'string';
}
`;

const CONSOLE_LOG = `export function report(): void {
  console.log('loaded');
}
`;

const CONSOLE_ERROR_AND_WARN = `export function report(): void {
  console.error('failed');
  console.warn('slow');
}
`;

const TS_IGNORE = `// @ts-ignore: the sample assigns a number to a string
export const label: string = 1;
`;

const TS_EXPECT_ERROR = `// @ts-expect-error: the sample assigns a number to a string
export const label: string = 1;
`;

const WITHOUT_TS_COMMENT = `export const label = 'one';
`;

const FOCUSED_TEST = `import { expect, it } from 'vitest';

it.only('adds', () => {
  expect(1 + 1).toBe(2);
});
`;

const DISABLED_TEST = `import { expect, it } from 'vitest';

it.skip('adds', () => {
  expect(1 + 1).toBe(2);
});
`;

const PLAIN_TEST = `import { expect, it } from 'vitest';

it('adds', () => {
  expect(1 + 1).toBe(2);
});
`;

const UNUSED_DISABLE_DIRECTIVE = `// eslint-disable-next-line no-console
export const value = 1;
`;

const USED_DISABLE_DIRECTIVE = `// eslint-disable-next-line no-debugger
debugger;
`;

const DATE_NOW = `export const today = Date.now();
`;

const NEW_DATE = `export const today = new Date();
`;

const NEW_DATE_FROM_VALUE = `export function parseDate(value: string): Date {
  return new Date(value);
}
`;

const DOMAIN_PATH = 'packages/domain/src/money/domainSample.ts';
const OUTSIDE_DOMAIN_PATH = 'packages/contract/src/contractSample.ts';

const TODAY_IS_A_PARAMETER = /today is a parameter/i;

describe('project rules', { timeout: 60_000 }, () => {
  it('reports an explicit any and passes unknown', async () => {
    expect(ruleIds(await lintSample(EXPLICIT_ANY))).toContain(
      '@typescript-eslint/no-explicit-any',
    );
    expect(await lintSample(UNKNOWN_INSTEAD_OF_ANY)).toEqual([]);
  });

  it('reports console.log and passes console.error and console.warn', async () => {
    expect(ruleIds(await lintSample(CONSOLE_LOG))).toContain('no-console');
    expect(await lintSample(CONSOLE_ERROR_AND_WARN)).toEqual([]);
  });

  it('reports @ts-ignore and @ts-expect-error and passes code without them', async () => {
    expect(ruleIds(await lintSample(TS_IGNORE))).toContain(
      '@typescript-eslint/ban-ts-comment',
    );
    expect(ruleIds(await lintSample(TS_EXPECT_ERROR))).toContain(
      '@typescript-eslint/ban-ts-comment',
    );
    expect(await lintSample(WITHOUT_TS_COMMENT)).toEqual([]);
  });

  it('reports .only in a test and passes a plain test', async () => {
    expect(ruleIds(await lintSample(FOCUSED_TEST))).toContain(
      'vitest/no-focused-tests',
    );
    expect(await lintSample(PLAIN_TEST)).toEqual([]);
  });

  it('reports .skip in a test and passes a plain test', async () => {
    expect(ruleIds(await lintSample(DISABLED_TEST))).toContain(
      'vitest/no-disabled-tests',
    );
    expect(await lintSample(PLAIN_TEST)).toEqual([]);
  });

  it('reports an unused eslint-disable directive as an error and passes a used one', async () => {
    const unused = (await lintSample(UNUSED_DISABLE_DIRECTIVE)).filter(
      ({ ruleId, message }) =>
        ruleId === null && message.includes('Unused eslint-disable directive'),
    );
    expect(unused.map(({ severity }) => severity)).toEqual([2]);
    expect(await lintSample(USED_DISABLE_DIRECTIVE)).toEqual([]);
  });

  it.each([
    ['Date.now()', DATE_NOW],
    ['new Date()', NEW_DATE],
  ])(
    'reports %s under packages/domain with the today message, and passes it outside',
    async (_name, code) => {
      const today = (await lintUntyped(code, DOMAIN_PATH)).filter(
        ({ message }) => TODAY_IS_A_PARAMETER.test(message),
      );
      expect(
        today.map(({ ruleId, severity }) => ({ ruleId, severity })),
      ).toEqual([{ ruleId: 'no-restricted-syntax', severity: 2 }]);
      expect(await lintUntyped(code, OUTSIDE_DOMAIN_PATH)).toEqual([]);
      expect(await lintSample(code)).toEqual([]);
    },
  );

  it('passes new Date(value) under packages/domain', async () => {
    expect(await lintUntyped(NEW_DATE_FROM_VALUE, DOMAIN_PATH)).toEqual([]);
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
