import { existsSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { configDefaults } from 'vitest/config';
import { describe, expect, it } from 'vitest';
import vitestConfig from '../../vitest.config.ts';

// The Stryker configuration: exactly six keys, the Vitest runner with
// per-test coverage pointed at the Stryker Vitest config, the non-test .ts
// files of the domain, scripts/ and gates/ as the mutate patterns, three
// reporters, and the thresholds: high 80, low 60 and a Break threshold that is
// a whole number from 1 to 100, so it cannot be removed or turned off
// silently. A key gained or lost, or any of these values changed, fails. No
// test runs Stryker.
//
// The Stryker Vitest config: the root Vitest config plus an exclude of exactly
// the three files that hold the whole-repository tests, listed by file name,
// never by pattern. Those tests check the state of the repository, not code,
// and fail inside Stryker's sandbox; they still run in Verify. A file gained,
// lost or replaced, or a pattern in place of a name, fails.
//
// The Vitest configuration: a cancelled Mutation run leaves copies of the
// tests in .stryker-tmp/sandbox-*, and npm test must never run them. The
// exclude keeps every one of Vitest's own defaults and adds one pattern
// anchored at the repository root, so a Vitest started inside a sandbox, where
// the same tests sit at their usual paths, still collects them.

const SANDBOX_PATTERN = '.stryker-tmp/**';
const INCLUDE = ['**/*.test.ts', '**/*.test.tsx'];

const SANDBOX_TEST =
  '.stryker-tmp/sandbox-1a2b3c/scripts/runGit/runGit.test.ts';
const REPOSITORY_TEST = 'scripts/runGit/runGit.test.ts';

const exclude: readonly string[] = vitestConfig.test?.exclude ?? [];

const matchesAnyExclude = (path: string): boolean =>
  exclude.some((pattern) => matchesGlob(path, pattern));

describe('the Vitest configuration', () => {
  it("keeps every one of Vitest's default excludes", () => {
    expect(exclude).toEqual(
      expect.arrayContaining([...configDefaults.exclude]),
    );
  });

  it('adds only the root-anchored sandbox pattern and leaves include unchanged', () => {
    const added = exclude.filter(
      (pattern) => !configDefaults.exclude.includes(pattern),
    );

    expect(added).toEqual([SANDBOX_PATTERN]);
    expect(vitestConfig.test?.include).toEqual(INCLUDE);
  });

  it('excludes a sandbox copy of a test but not the test at its usual path', () => {
    expect(matchesAnyExclude(SANDBOX_TEST)).toBe(true);
    expect(matchesAnyExclude(REPOSITORY_TEST)).toBe(false);
  });
});

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const STRYKER_CONFIG = join(ROOT, 'stryker.config.js');

const STRYKER_KEYS = [
  'coverageAnalysis',
  'mutate',
  'reporters',
  'testRunner',
  'thresholds',
  'vitest',
];
const VITEST_RUNNER = { configFile: 'vitest.stryker.config.ts' };
const MUTATE = [
  'packages/domain/src/**/*.ts',
  'scripts/**/*.ts',
  'gates/**/*.ts',
  '!**/*.test.ts',
  '!**/test-support/**',
];
const REPORTERS = ['clear-text', 'progress', 'html'];
const THRESHOLD_KEYS = ['break', 'high', 'low'];
const HIGH = 80;
const LOW = 60;

// Invented paths, each in one of the three mutated folders.
const MUTATED_FILES = [
  'packages/domain/src/money/formatCents/formatCents.ts',
  'scripts/runGit/runGit.ts',
  'gates/renovate/renovate.ts',
];
const SPARED_FILES = [
  'packages/domain/src/money/formatCents/formatCents.test.ts',
  'scripts/runGit/runGit.test.ts',
  'gates/mutationTesting/mutationTesting.test.ts',
  'packages/domain/src/test-support/clock/clock.ts',
  'apps/desktop/src/main/test-support/fakeDb/fakeDb.ts',
  'apps/desktop/src/main/db/openDb/openDb.ts',
  'e2e/import-csv.spec.ts',
  'vitest.config.ts',
];

const loadStrykerConfig = async (): Promise<Record<string, unknown>> => {
  expect(
    existsSync(STRYKER_CONFIG),
    'stryker.config.js at the repository root',
  ).toBe(true);
  const module = (await import(pathToFileURL(STRYKER_CONFIG).href)) as {
    default: Record<string, unknown>;
  };
  return module.default;
};

// Stryker mutates a file that matches a pattern and no negated pattern.
const isMutated = (path: string, patterns: readonly string[]): boolean => {
  const included = patterns.filter((pattern) => !pattern.startsWith('!'));
  const excluded = patterns
    .filter((pattern) => pattern.startsWith('!'))
    .map((pattern) => pattern.slice(1));
  return (
    included.some((pattern) => matchesGlob(path, pattern)) &&
    !excluded.some((pattern) => matchesGlob(path, pattern))
  );
};

describe('the Stryker configuration', () => {
  it('has exactly the six keys', async () => {
    const config = await loadStrykerConfig();

    expect(Object.keys(config).sort()).toEqual(STRYKER_KEYS);
  });

  it('runs the tests with the Vitest runner and per-test coverage', async () => {
    const config = await loadStrykerConfig();

    expect(config.testRunner).toBe('vitest');
    expect(config.coverageAnalysis).toBe('perTest');
  });

  it('points the Vitest runner at the Stryker Vitest config, its other options at their defaults', async () => {
    const config = await loadStrykerConfig();

    expect(config.vitest).toStrictEqual(VITEST_RUNNER);
  });

  it('mutates the non-test files of the domain, scripts and gates', async () => {
    const config = await loadStrykerConfig();

    expect(config.mutate).toEqual(MUTATE);
  });

  it('never mutates a test, a test-support file or a file outside the three folders', async () => {
    const config = await loadStrykerConfig();
    const mutate = Array.isArray(config.mutate)
      ? config.mutate.filter((pattern) => typeof pattern === 'string')
      : [];

    expect(MUTATED_FILES.filter((path) => !isMutated(path, mutate))).toEqual(
      [],
    );
    expect(SPARED_FILES.filter((path) => isMutated(path, mutate))).toEqual([]);
  });

  it('reports to the terminal, the progress bar and the HTML report', async () => {
    const config = await loadStrykerConfig();

    expect(config.reporters).toEqual(REPORTERS);
  });

  it('keeps high at 80 and low at 60 beside the Break threshold', async () => {
    const config = await loadStrykerConfig();
    const thresholds = (config.thresholds ?? {}) as Record<string, unknown>;

    expect(Object.keys(thresholds).sort()).toEqual(THRESHOLD_KEYS);
    expect(thresholds.high).toBe(HIGH);
    expect(thresholds.low).toBe(LOW);
  });

  it('sets a Break threshold that is a whole number from 1 to 100', async () => {
    const config = await loadStrykerConfig();
    const hasBreakThreshold = await loadBreakThresholdCheck();

    expect(hasBreakThreshold(config.thresholds)).toBe(true);
  });
});

const BREAK_THRESHOLD_CHECK = join(
  ROOT,
  'gates',
  'mutationTesting',
  'mutationTesting.ts',
);

type BreakThresholdCheck = (thresholds: unknown) => boolean;

const loadBreakThresholdCheck = async (): Promise<BreakThresholdCheck> => {
  expect(
    existsSync(BREAK_THRESHOLD_CHECK),
    'gates/mutationTesting/mutationTesting.ts beside the gate test',
  ).toBe(true);
  const module = (await import(pathToFileURL(BREAK_THRESHOLD_CHECK).href)) as {
    hasBreakThreshold?: unknown;
  };
  expect(
    typeof module.hasBreakThreshold,
    'hasBreakThreshold exported by the Break threshold check',
  ).toBe('function');
  return module.hasBreakThreshold as BreakThresholdCheck;
};

// Invented thresholds: high and low as configured, the Break threshold varied.
const thresholdsWith = (value: unknown): Record<string, unknown> => ({
  high: HIGH,
  low: LOW,
  break: value,
});

describe('the Break threshold check', () => {
  it.each([
    ['null, which turns the Break threshold off', thresholdsWith(null)],
    ['a missing break', { high: HIGH, low: LOW }],
    ['0', thresholdsWith(0)],
    ['101', thresholdsWith(101)],
    ['a fraction', thresholdsWith(72.5)],
    ['a string', thresholdsWith('72')],
  ])('fails %s', async (_case, thresholds) => {
    const hasBreakThreshold = await loadBreakThresholdCheck();

    expect(hasBreakThreshold(thresholds)).toBe(false);
  });

  it.each([1, 100])('passes the whole number %i', async (value) => {
    const hasBreakThreshold = await loadBreakThresholdCheck();

    expect(hasBreakThreshold(thresholdsWith(value))).toBe(true);
  });
});

const STRYKER_VITEST_CONFIG = join(ROOT, 'vitest.stryker.config.ts');

// The files of the whole-repository tests, by name (design log D4).
const WHOLE_REPOSITORY_TEST_FILES = [
  'gates/commitMsgHook/commitMsgHookTracking.test.ts',
  'gates/formatting/formattingTree.test.ts',
  'gates/lint/lintTree.test.ts',
];
// The files the moved tests leave, and an unrelated test: all still run.
const COLLECTED_TEST_FILES = [
  'gates/commitMsgHook/commitMsgHook.test.ts',
  'gates/formatting/formatting.test.ts',
  'gates/lint/lint.test.ts',
  'gates/mutationTesting/mutationTesting.test.ts',
  'scripts/runGit/runGit.test.ts',
];

type VitestConfig = { test?: { exclude?: string[] } };

const loadStrykerVitestConfig = async (): Promise<VitestConfig> => {
  expect(
    existsSync(STRYKER_VITEST_CONFIG),
    'vitest.stryker.config.ts at the repository root',
  ).toBe(true);
  const module = (await import(pathToFileURL(STRYKER_VITEST_CONFIG).href)) as {
    default: VitestConfig;
  };
  return module.default;
};

const strykerExcludeOf = (config: VitestConfig): readonly string[] =>
  config.test?.exclude ?? [];

const addedExcludes = (config: VitestConfig): string[] =>
  strykerExcludeOf(config).filter((pattern) => !exclude.includes(pattern));

const withoutExclude = (config: VitestConfig): Record<string, unknown> => {
  // toEqual treats a key set to undefined as absent.
  return { ...config, test: { ...config.test, exclude: undefined } };
};

describe('the Stryker Vitest configuration', () => {
  it('excludes exactly the three whole-repository test files, by name', async () => {
    const config = await loadStrykerVitestConfig();

    expect(addedExcludes(config).sort()).toEqual(WHOLE_REPOSITORY_TEST_FILES);
  });

  it('still collects every other test, the files the moved tests left included', async () => {
    const config = await loadStrykerVitestConfig();
    const added = addedExcludes(config);

    expect(
      COLLECTED_TEST_FILES.filter((path) =>
        added.some((pattern) => matchesGlob(path, pattern)),
      ),
    ).toEqual([]);
  });

  it('keeps every other setting of the root config, its exclude included', async () => {
    const config = await loadStrykerVitestConfig();

    expect(
      strykerExcludeOf(config).filter(
        (pattern) => !WHOLE_REPOSITORY_TEST_FILES.includes(pattern),
      ),
    ).toEqual(exclude);
    expect(withoutExclude(config)).toEqual(withoutExclude(vitestConfig));
  });
});
