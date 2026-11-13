import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import playwrightConfig from '../../playwright.config.ts';

// The Playwright configuration (design log Q38, P4): exactly five keys,
// testDir e2e, no retries, .only refused, the list reporter and a trace kept
// only for a failing test. A key gained or lost, or any value changed, fails.
// grepInvert joins as the sixth key with the flaky quarantine (ticket 15).
//
// The harness downloads no browser: the App fixture launches the Electron
// binary already installed, so no npm script runs playwright install.
//
// The root TypeScript project, and so npm run typecheck and ESLint's typed
// linting, covers the Playwright config and every file under e2e/.

type PackageJson = { scripts?: Record<string, string> };

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const CONFIG_KEYS = ['forbidOnly', 'reporter', 'retries', 'testDir', 'use'];

const PACKAGE_FILES = ['package.json', 'apps/desktop/package.json'];

const FLOATING_PROMISE = `export function load(): Promise<number> {
  return Promise.resolve(1);
}

export function run(): void {
  load();
}
`;

function readPackageJson(path: string): PackageJson {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8')) as PackageJson;
}

function e2eFiles(): string[] {
  return readdirSync(join(ROOT, 'e2e'), { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => join('e2e', file));
}

function rootProjectFiles(): string[] {
  const parsed = ts.getParsedCommandLineOfConfigFile(
    join(ROOT, 'tsconfig.json'),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
        );
      },
    },
  );
  return (parsed?.fileNames ?? []).map((file) => resolve(file));
}

describe('the Playwright configuration', () => {
  it('has exactly the keys testDir, retries, forbidOnly, reporter and use', () => {
    expect(Object.keys(playwrightConfig).sort()).toEqual(CONFIG_KEYS);
  });

  it('finds the tests in e2e/', () => {
    expect(playwrightConfig.testDir).toBe('e2e');
  });

  it('retries no test', () => {
    expect(playwrightConfig.retries).toBe(0);
  });

  it('refuses a run that holds .only', () => {
    expect(playwrightConfig.forbidOnly).toBe(true);
  });

  it('reports with the list reporter', () => {
    expect(playwrightConfig.reporter).toBe('list');
  });

  it('keeps a trace only for a failing test, and sets nothing else in use', () => {
    expect(playwrightConfig.use).toStrictEqual({ trace: 'retain-on-failure' });
  });
});

describe('the end-to-end harness', { timeout: 60_000 }, () => {
  it.each(PACKAGE_FILES)('downloads no browser from a script of %s', (path) => {
    for (const [name, script] of Object.entries(
      readPackageJson(path).scripts ?? {},
    )) {
      expect(script, name).not.toMatch(/playwright\s+install/);
    }
  });

  it('typechecks the Playwright config and every file under e2e/ in the root project', () => {
    const files = rootProjectFiles();
    const wanted = ['playwright.config.ts', ...e2eFiles()].map((file) =>
      resolve(ROOT, file),
    );

    expect(wanted).toContain(resolve(ROOT, 'e2e/start-app.spec.ts'));
    expect(files).toEqual(expect.arrayContaining(wanted));
  });

  it.each(['e2e/start-app.spec.ts', 'playwright.config.ts'])(
    'lints %s with type information',
    async (path) => {
      const eslint = new ESLint({ cwd: ROOT });
      const [result] = await eslint.lintText(FLOATING_PROMISE, {
        filePath: join(ROOT, path),
      });

      expect(result?.messages.map(({ ruleId }) => ruleId)).toContain(
        '@typescript-eslint/no-floating-promises',
      );
    },
  );
});
