import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import ts from 'typescript';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import playwrightConfig from '../../playwright.config.ts';
import {
  buildQuarantinePatterns,
  readQuarantine,
} from '../../scripts/readQuarantine/readQuarantine.ts';
import {
  installGateScripts,
  writeTreeFile,
} from '../../scripts/test-support/sampleRepository/sampleRepository.ts';

// The Playwright configuration (design log Q38, A8, A9): exactly six keys,
// testDir e2e, no retries, .only refused, the list reporter, a trace kept
// only for a failing test, and grepInvert leaving out the tests of the
// committed Quarantine. A key gained or lost, or any value changed, fails.
// The config throws on a Quarantine it cannot read or that is malformed, so
// test:e2e never runs or skips tests silently.
//
// The harness downloads no browser: the App fixture launches the Electron
// binary already installed, so no npm script runs playwright install.
//
// The root TypeScript project, and so npm run typecheck and ESLint's typed
// linting, covers the Playwright config and every file under e2e/.

type PackageJson = { scripts?: Record<string, string> };

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const CONFIG_KEYS = [
  'forbidOnly',
  'grepInvert',
  'reporter',
  'retries',
  'testDir',
  'use',
];

const QUARANTINE_FILE = 'quality/flaky-quarantine.json';

// An invented entry: the ticket and the owner exist nowhere.
const FLAKY_ENTRY = {
  file: 'e2e/start-app.spec.ts',
  title: 'Start the app',
  ticket: 'docs/features/04-desktop-shell/17-flaky-start.md',
  owner: 'sample-owner',
  added: '2026-11-10',
  expires: '2026-12-01',
};

// An invented Quarantine for Playwright's own listing (design log Q11, A7):
// a tagged and an untagged test in a subfolder spec, and a test whose title
// holds regex characters in a top-level spec. Tickets and owners exist
// nowhere.
const LISTED_QUARANTINE = [
  {
    ...FLAKY_ENTRY,
    file: 'e2e/sub/start.spec.ts',
    title: 'Start the app',
  },
  {
    ...FLAKY_ENTRY,
    file: 'e2e/sub/start.spec.ts',
    title: 'Close the app',
  },
  {
    ...FLAKY_ENTRY,
    file: 'e2e/start.spec.ts',
    title: 'Import report.csv (draft)?',
  },
];

// Invented specs: every body throws, so a run instead of a listing fails, and
// none takes a fixture, so listing them starts no app, no browser and no
// network.
const SAMPLE_SPECS: Record<string, string> = {
  'e2e/sub/start.spec.ts': `import { test } from '@playwright/test';

test('Start the app', { tag: ['@slow', '@smoke'] }, () => {
  throw new Error('a listing runs no test');
});

test('Close the app', () => {
  throw new Error('a listing runs no test');
});

test('Open the settings', () => {
  throw new Error('a listing runs no test');
});
`,
  'e2e/start.spec.ts': `import { test } from '@playwright/test';

test('Start the app', { tag: '@slow' }, () => {
  throw new Error('a listing runs no test');
});

test('Import report.csv (draft)?', () => {
  throw new Error('a listing runs no test');
});

test('Import report.csv (draft)? twice', () => {
  throw new Error('a listing runs no test');
});

test('Import reportXcsv draft', () => {
  throw new Error('a listing runs no test');
});
`,
};

// What Playwright lists from the sample specs with the invented Quarantine,
// as file relative to e2e/ and title: the third test of the subfolder spec,
// and every look-alike of a quarantined test (the same title in another
// file, a longer title, a title its regex characters would match loosely).
const LISTED_TESTS = [
  'start.spec.ts › Import report.csv (draft)? twice',
  'start.spec.ts › Import reportXcsv draft',
  'start.spec.ts › Start the app',
  'sub/start.spec.ts › Open the settings',
];

type ListedSuite = {
  specs?: { file: string; title: string }[];
  suites?: ListedSuite[];
};

type ListReport = { suites?: ListedSuite[]; errors?: unknown[] };

// Imports the Playwright config in a fresh Node process whose working folder
// is the sample tree, and prints its grepInvert as the regular expressions'
// source text.
const IMPORT_CONFIG = `const { default: config } = await import('./playwright.config.ts');
console.log(JSON.stringify(config.grepInvert?.map(String) ?? null));`;

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

// Every test of a JSON listing, as file relative to e2e/, with `/` on every
// platform, and title.
function collectListedTests(suites: readonly ListedSuite[]): string[] {
  return suites.flatMap((suite) => [
    ...(suite.specs ?? []).map(
      ({ file, title }) => `${file.replaceAll('\\', '/')} › ${title}`,
    ),
    ...collectListedTests(suite.suites ?? []),
  ]);
}

function readCommittedQuarantine(): unknown {
  return JSON.parse(readFileSync(join(ROOT, QUARANTINE_FILE), 'utf8'));
}

describe('the Playwright configuration', () => {
  it('has exactly the keys testDir, retries, forbidOnly, reporter, use and grepInvert', () => {
    expect(Object.keys(playwrightConfig).sort()).toEqual(CONFIG_KEYS);
  });

  it('leaves out the tests of the committed Quarantine', () => {
    const { entries, violations } = readQuarantine(readCommittedQuarantine());

    expect(violations).toEqual([]);
    expect(playwrightConfig.grepInvert).toEqual(
      buildQuarantinePatterns(entries),
    );
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

describe('the flaky quarantine', () => {
  it('is committed empty', () => {
    expect(readCommittedQuarantine()).toStrictEqual([]);
  });

  it('leaves out nothing for an empty Quarantine', () => {
    expect(buildQuarantinePatterns(readQuarantine([]).entries)).toEqual([]);
  });
});

describe(
  'the Playwright configuration read in a sample tree',
  { timeout: 60_000 },
  () => {
    let tree: string;

    beforeEach(() => {
      tree = mkdtempSync(join(tmpdir(), 'dashcash-playwright-config-'));
      installGateScripts(tree);
      copyFileSync(
        join(ROOT, 'playwright.config.ts'),
        join(tree, 'playwright.config.ts'),
      );
    });

    afterEach(() => {
      rmSync(tree, { recursive: true, force: true });
    });

    function importConfig(): {
      status: number | null;
      stdout: string;
      stderr: string;
    } {
      const { status, stdout, stderr } = spawnSync(
        process.execPath,
        ['--input-type=module', '--eval', IMPORT_CONFIG],
        { cwd: tree, encoding: 'utf8' },
      );
      return { status, stdout, stderr };
    }

    it('sets grepInvert to the patterns of the Quarantine it reads', () => {
      writeTreeFile(tree, QUARANTINE_FILE, JSON.stringify([FLAKY_ENTRY]));

      const { status, stdout, stderr } = importConfig();

      expect(stderr).toBe('');
      expect(status).toBe(0);
      expect(JSON.parse(stdout)).toEqual(
        buildQuarantinePatterns([FLAKY_ENTRY]).map(String),
      );
    });

    // Playwright's own listing on the platform it runs on: CI's Linux run
    // proves the `/` separator, a Windows run `\` (design log Q11).
    it('lists neither quarantined test in a subfolder, tagged or not, and every look-alike', () => {
      writeTreeFile(tree, QUARANTINE_FILE, JSON.stringify(LISTED_QUARANTINE));
      for (const [file, content] of Object.entries(SAMPLE_SPECS)) {
        writeTreeFile(tree, file, content);
      }

      const { status, stdout, stderr } = spawnSync(
        process.execPath,
        [
          join('node_modules', '@playwright', 'test', 'cli.js'),
          'test',
          '--list',
          '--reporter=json',
        ],
        { cwd: tree, encoding: 'utf8' },
      );

      expect(stderr).toBe('');
      expect(status).toBe(0);
      const report = JSON.parse(stdout) as ListReport;
      expect(report.errors ?? []).toEqual([]);
      expect(collectListedTests(report.suites ?? []).sort()).toEqual(
        LISTED_TESTS,
      );
    });

    it('sets grepInvert to an empty list for an empty Quarantine', () => {
      writeTreeFile(tree, QUARANTINE_FILE, '[]\n');

      const { status, stdout } = importConfig();

      expect(status).toBe(0);
      expect(JSON.parse(stdout)).toEqual([]);
    });

    it('throws when the Quarantine is missing', () => {
      const { status, stderr } = importConfig();

      expect(status).not.toBe(0);
      expect(stderr).toContain(QUARANTINE_FILE);
    });

    it('throws when the Quarantine is not JSON', () => {
      writeTreeFile(tree, QUARANTINE_FILE, '[{ "file": ');

      const { status, stderr } = importConfig();

      expect(status).not.toBe(0);
      expect(stderr).toContain(QUARANTINE_FILE);
    });

    it('throws when the Quarantine is not an array', () => {
      writeTreeFile(tree, QUARANTINE_FILE, JSON.stringify({ entries: [] }));

      const { status, stderr } = importConfig();

      expect(status).not.toBe(0);
      expect(stderr).toContain(
        `${QUARANTINE_FILE}: must be an array of quarantine entries`,
      );
    });

    it('throws when an entry is malformed, though another is well formed', () => {
      writeTreeFile(
        tree,
        QUARANTINE_FILE,
        JSON.stringify([FLAKY_ENTRY, { ...FLAKY_ENTRY, owner: '' }]),
      );

      const { status, stderr } = importConfig();

      expect(status).not.toBe(0);
      expect(stderr).toContain(
        `${QUARANTINE_FILE}: entry 1, field owner: must not be empty`,
      );
    });
  },
);

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
