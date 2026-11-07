import { matchesGlob } from 'node:path';
import { configDefaults } from 'vitest/config';
import { describe, expect, it } from 'vitest';
import vitestConfig from '../../vitest.config.ts';

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
