import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import unitConfig from '../../vitest.config.ts';
import strykerConfig from '../../vitest.stryker.config.ts';

// The coverage reports of both test runs (design log Q32, Q39, A5).
//
// vitest.config.ts (npm test) and vitest.storybook.config.ts (the Story tests)
// always measure coverage with the V8 provider and write one LCOV report each,
// to coverage/unit/ and coverage/stories/. Both measure the same files: the
// Shipping code of apps/, packages/, scripts/ and gates/, never a test, a
// story, test-support/, e2e/ or a declaration file. Coverage turned off, or
// its provider, reporter, report folder or measured and excluded paths
// changed, fails this test.
//
// vitest.stryker.config.ts turns coverage off, so a Mutation run runs as it
// did before; coverage turned on there fails this test.
//
// @vitest/coverage-v8 is an exact root dev dependency on the version of the
// installed Vitest.

type Coverage = {
  enabled?: unknown;
  provider?: unknown;
  reporter?: unknown;
  reportsDirectory?: unknown;
  include?: unknown;
  exclude?: unknown;
};

type PackageJson = { devDependencies?: Record<string, string> };

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const STORY_TEST_CONFIG = 'vitest.storybook.config.ts';
const COVERAGE_PACKAGE = '@vitest/coverage-v8';

const INCLUDE = [
  'apps/**/*.{ts,tsx}',
  'packages/**/*.{ts,tsx}',
  'scripts/**/*.{ts,tsx}',
  'gates/**/*.{ts,tsx}',
];
const EXCLUDE = [
  '**/*.test.{ts,tsx}',
  '**/*.stories.{ts,tsx}',
  '**/test-support/**',
  'e2e/**',
  '**/*.d.ts',
];

// Invented paths of Shipping code, one or more in each measured folder.
const MEASURED_FILES = [
  'apps/desktop/src/renderer/primitives/Icon/Icon.tsx',
  'apps/desktop/src/renderer/primitives/Icon/Icon.styles.ts',
  'apps/desktop/src/main/db/openDb/openDb.ts',
  'apps/desktop/src/preload/preload.ts',
  'packages/domain/src/money/formatCents/formatCents.ts',
  'packages/contract/src/channels/channels.ts',
  'scripts/runGit/runGit.ts',
  'gates/renovate/renovate.ts',
];
// Invented paths no report may list: tests, stories, test-support/, e2e/,
// declaration files, build output and files outside the four folders.
const UNMEASURED_FILES = [
  'apps/desktop/src/renderer/primitives/Icon/Icon.test.tsx',
  'apps/desktop/src/renderer/primitives/Icon/Icon.stories.tsx',
  'apps/desktop/src/renderer/hooks/useRevealOnExpand/useRevealOnExpand.test.ts',
  'packages/domain/src/money/formatCents/formatCents.test.ts',
  'scripts/runGit/runGit.test.ts',
  'gates/coverage/coverage.test.ts',
  'packages/domain/src/test-support/clock/clock.ts',
  'apps/desktop/src/main/test-support/fakeDb/fakeDb.ts',
  'apps/desktop/src/renderer/test-support/renderStory/renderStory.tsx',
  'scripts/test-support/sampleRepo/sampleRepo.ts',
  'gates/test-support/verifyGates/verifyGates.ts',
  'e2e/import-csv.spec.ts',
  'apps/desktop/src/renderer/types/styled.d.ts',
  'apps/desktop/out/main/main.js',
  'vitest.config.ts',
  '.storybook/preview.tsx',
];

// Imports the story-test config in a fresh Node process without Vitest's
// environment, so the Storybook plugin loads no Storybook, and prints its
// coverage settings.
const READ_STORY_COVERAGE = `const { default: storyTests } = await import('./${STORY_TEST_CONFIG}');
console.log(JSON.stringify(storyTests.test?.coverage ?? null));`;

let storyCoverage: Coverage | null | undefined;

// Read once: the config is a committed file no test changes.
function readStoryCoverage(): Coverage {
  if (storyCoverage === undefined) {
    const env = { ...process.env };
    delete env.VITEST;
    const { status, stdout, stderr } = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', READ_STORY_COVERAGE],
      { cwd: ROOT, encoding: 'utf8', env },
    );
    if (status !== 0) {
      throw new Error(`reading ${STORY_TEST_CONFIG} failed: ${stderr}`);
    }
    storyCoverage = JSON.parse(stdout) as Coverage | null;
  }
  return storyCoverage ?? {};
}

function readUnitCoverage(): Coverage {
  return unitConfig.test?.coverage ?? {};
}

// mergeConfig types its result loosely: read it through the settings checked.
function readStrykerCoverage(): Coverage {
  const config = strykerConfig as { test?: { coverage?: Coverage } };
  return config.test?.coverage ?? {};
}

// The reporter as a list: one name written alone counts as a list of one.
function reporters(coverage: Coverage): unknown {
  return typeof coverage.reporter === 'string'
    ? [coverage.reporter]
    : coverage.reporter;
}

function patterns(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((pattern) => typeof pattern === 'string')
    : [];
}

// Coverage lists a file that matches an include pattern and no exclude
// pattern.
function isMeasured(path: string, coverage: Coverage): boolean {
  return (
    patterns(coverage.include).some((pattern) => matchesGlob(path, pattern)) &&
    !patterns(coverage.exclude).some((pattern) => matchesGlob(path, pattern))
  );
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
}

function installedVersion(packageName: string): unknown {
  const path = join('node_modules', packageName, 'package.json');
  expect(existsSync(join(ROOT, path)), `${packageName} is installed`).toBe(
    true,
  );
  return (readJson(path) as { version?: unknown }).version;
}

describe('the coverage reports', { timeout: 60_000 }, () => {
  describe.each([
    ['the unit-test config', readUnitCoverage, 'coverage/unit'],
    ['the story-test config', readStoryCoverage, 'coverage/stories'],
  ])('%s', (_name, readCoverage, reportsDirectory) => {
    it('always measures coverage', () => {
      expect(readCoverage().enabled).toBe(true);
    });

    it('measures with the V8 provider', () => {
      expect(readCoverage().provider).toBe('v8');
    });

    it('writes exactly one LCOV report', () => {
      expect(reporters(readCoverage())).toStrictEqual(['lcov']);
    });

    it(`writes its report to ${reportsDirectory}/`, () => {
      expect(readCoverage().reportsDirectory).toBe(reportsDirectory);
    });

    it('measures exactly the four folders of Shipping code', () => {
      expect(readCoverage().include).toStrictEqual(INCLUDE);
    });

    it('excludes exactly tests, stories, test-support/, e2e/ and declaration files', () => {
      expect(readCoverage().exclude).toStrictEqual(EXCLUDE);
    });

    it('lists the Shipping code of the four folders and no test, story, test-support/, e2e/, declaration or outside file', () => {
      const coverage = readCoverage();

      expect(
        [...MEASURED_FILES, ...UNMEASURED_FILES].filter((path) =>
          isMeasured(path, coverage),
        ),
      ).toStrictEqual(MEASURED_FILES);
    });
  });
});

describe('the Stryker Vitest config', () => {
  it('turns coverage off, so a Mutation run runs as before', () => {
    expect(readStrykerCoverage().enabled).toBe(false);
  });
});

describe('the coverage provider', () => {
  it('is an exact root dev dependency on the version of Vitest', () => {
    const { devDependencies = {} } = readJson('package.json') as PackageJson;

    expect(devDependencies[COVERAGE_PACKAGE]).toEqual(
      expect.stringMatching(/^\d+\.\d+\.\d+$/),
    );
    expect(devDependencies[COVERAGE_PACKAGE]).toBe(devDependencies.vitest);
  });

  it('is installed on the version of the installed Vitest', () => {
    expect(installedVersion(COVERAGE_PACKAGE)).toBe(installedVersion('vitest'));
  });
});
