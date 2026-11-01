import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, getFileInfo, resolveConfig } from 'prettier';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runNpmScript } from '../../scripts/test-support/runNpmScript/runNpmScript.ts';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const IGNORE_FILE = join(ROOT, '.prettierignore');

const DOUBLE_QUOTED = 'const greeting = "hello";\n';
const SINGLE_QUOTED = "const greeting = 'hello';\n";

// Files Prettier must leave alone: Markdown, the design sources, the lockfile
// and build and test output (the output folders of .gitignore).
const IGNORED_FILES = [
  'README.md',
  'docs/features/01-sample/01-sample-ticket.md',
  'docs/design/SPEC.html',
  'docs/design/prototype/screen.js',
  'package-lock.json',
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

// Code Prettier must still check, wherever it sits, docs outside docs/design/
// included. Distinct names, so the check output names each one.
const CHECKED_FILES = [
  'rootSample.ts',
  'apps/desktop/src/main/mainSample.ts',
  'packages/domain/src/money/moneySample.ts',
  'scripts/scriptSample.ts',
  'docs/features/01-sample/docsSample.ts',
];

// Unformatted content for each ignored file, by extension.
const UNFORMATTED: Record<string, string> = {
  md: '#  Sample\n\n*  item\n',
  html: '<div><p>sample</p>\n\n\n</div>',
  js: 'const sample = "x"',
  json: '{"sample":1}',
};

function unformattedFor(file: string): string {
  const extension = file.slice(file.lastIndexOf('.') + 1);
  const content = UNFORMATTED[extension];
  if (content === undefined) {
    throw new Error(`no unformatted sample for ${file}`);
  }
  return content;
}

function writeTreeFile(root: string, file: string, content: string): void {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function readTreeFile(root: string, file: string): string {
  return readFileSync(join(root, file), 'utf8');
}

function runScript(
  name: string,
  cwd: string,
): { status: number | null; output: string } {
  const { status, output } = runNpmScript(name, cwd, { rootBin: true });
  return { status, output };
}

describe('prettier config', () => {
  const samplePath = join(ROOT, 'sample.ts');

  it('resolves to Prettier defaults with single quotes', async () => {
    expect(await resolveConfig(samplePath)).toEqual({ singleQuote: true });
  });

  it('reports a double-quoted TypeScript sample as unformatted', async () => {
    const config = await resolveConfig(samplePath);
    expect(
      await check(DOUBLE_QUOTED, { ...config, filepath: samplePath }),
    ).toBe(false);
  });

  it('reports a single-quoted TypeScript sample as formatted', async () => {
    const config = await resolveConfig(samplePath);
    expect(
      await check(SINGLE_QUOTED, { ...config, filepath: samplePath }),
    ).toBe(true);
  });
});

describe('prettier ignore file', () => {
  it.each(IGNORED_FILES)('ignores %s', async (file) => {
    const info = await getFileInfo(join(ROOT, file), {
      ignorePath: IGNORE_FILE,
    });
    expect(info.ignored).toBe(true);
  });
});

describe('format scripts', { timeout: 30_000 }, () => {
  let tree: string;

  beforeEach(() => {
    tree = mkdtempSync(join(tmpdir(), 'dashcash-prettier-'));
    copyFileSync(
      join(ROOT, '.prettierrc.json'),
      join(tree, '.prettierrc.json'),
    );
    copyFileSync(IGNORE_FILE, join(tree, '.prettierignore'));
  });

  afterEach(() => {
    rmSync(tree, { recursive: true, force: true });
  });

  it('format:check fails on any file Prettier would change', () => {
    for (const file of CHECKED_FILES) {
      writeTreeFile(tree, file, DOUBLE_QUOTED);
    }

    const result = runScript('format:check', tree);

    expect(result.status).not.toBe(0);
    for (const file of CHECKED_FILES) {
      expect(result.output, file).toContain(basename(file));
    }
  });

  it('format:check passes on a formatted tree', () => {
    writeTreeFile(tree, 'src/sample.ts', SINGLE_QUOTED);

    expect(runScript('format:check', tree).status).toBe(0);
  });

  it('format fixes formatting in place', () => {
    writeTreeFile(tree, 'src/sample.ts', DOUBLE_QUOTED);

    expect(runScript('format', tree).status).toBe(0);

    expect(readTreeFile(tree, 'src/sample.ts')).toBe(SINGLE_QUOTED);
    expect(runScript('format:check', tree).status).toBe(0);
  });

  it('format:check never checks the ignored files', () => {
    writeTreeFile(tree, 'src/sample.ts', SINGLE_QUOTED);
    for (const file of IGNORED_FILES) {
      writeTreeFile(tree, file, unformattedFor(file));
    }

    expect(runScript('format:check', tree).status).toBe(0);
  });

  it('format never rewrites the ignored files', () => {
    writeTreeFile(tree, 'src/sample.ts', SINGLE_QUOTED);
    for (const file of IGNORED_FILES) {
      writeTreeFile(tree, file, unformattedFor(file));
    }

    runScript('format', tree);

    for (const file of IGNORED_FILES) {
      expect(readTreeFile(tree, file), file).toBe(unformattedFor(file));
    }
  });
});

describe('repository tree', { timeout: 60_000 }, () => {
  it('passes format:check', () => {
    const result = runScript('format:check', ROOT);
    expect(result.status, result.output).toBe(0);
  });
});
