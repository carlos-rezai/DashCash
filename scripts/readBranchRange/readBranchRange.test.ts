import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readBranchRange, resolveBranchName } from './readBranchRange.ts';

describe('resolveBranchName', () => {
  it.each([
    {
      case: 'takes GITHUB_HEAD_REF first',
      env: {
        GITHUB_HEAD_REF: 'feat/01-csv-import',
        GITHUB_REF_NAME: '12/merge',
      },
      current: 'main',
      expected: 'feat/01-csv-import',
    },
    {
      case: 'takes GITHUB_REF_NAME when GITHUB_HEAD_REF is missing',
      env: { GITHUB_REF_NAME: 'feat/02-accounts' },
      current: 'main',
      expected: 'feat/02-accounts',
    },
    {
      case: 'takes GITHUB_REF_NAME when GITHUB_HEAD_REF is empty',
      env: { GITHUB_HEAD_REF: '', GITHUB_REF_NAME: 'refactor/01-csv-import' },
      current: 'main',
      expected: 'refactor/01-csv-import',
    },
    {
      case: 'takes the current branch when both variables are missing',
      env: {},
      current: 'feat/03-goals',
      expected: 'feat/03-goals',
    },
    {
      case: 'takes the current branch when both variables are empty',
      env: { GITHUB_HEAD_REF: '', GITHUB_REF_NAME: '' },
      current: 'feat/03-goals',
      expected: 'feat/03-goals',
    },
    {
      case: 'returns nothing when every source is empty',
      env: { GITHUB_HEAD_REF: '', GITHUB_REF_NAME: '' },
      current: '',
      expected: undefined,
    },
    {
      case: 'returns nothing without variables and without a current branch',
      env: {},
      current: undefined,
      expected: undefined,
    },
  ])('$case', ({ env, current, expected }) => {
    expect(resolveBranchName(env, current)).toBe(expected);
  });
});

// Environment without the GIT_* variables a git hook sets, so the commands
// below act on the temporary repository only, never on this one.
function cleanEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  );
}

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: cleanEnv(),
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

// Commits without changes and returns the new commit's hash. Each paragraph
// becomes its own -m, so a second one is the body.
function commit(cwd: string, ...paragraphs: string[]): string {
  git(
    cwd,
    'commit',
    '--allow-empty',
    '--quiet',
    ...paragraphs.flatMap((paragraph) => ['-m', paragraph]),
  );
  return git(cwd, 'rev-parse', 'HEAD');
}

// A fake origin/main: a remote-tracking ref set by hand, no remote needed.
function setOriginMain(cwd: string): void {
  git(cwd, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
}

function trimMessages(
  commits: readonly { hash: string; message: string }[],
): { hash: string; message: string }[] {
  return commits.map(({ hash, message }) => ({
    hash,
    message: message.trim(),
  }));
}

describe('readBranchRange', { timeout: 30_000 }, () => {
  let repo: string;

  beforeEach(() => {
    // The branch must come from the repository, not from the CI run that
    // executes these tests; empty values are skipped.
    vi.stubEnv('GITHUB_HEAD_REF', '');
    vi.stubEnv('GITHUB_REF_NAME', '');
    repo = mkdtempSync(join(tmpdir(), 'dashcash-branch-range-'));
    git(repo, 'init', '--quiet', '--initial-branch=main');
    git(repo, 'config', 'user.name', 'Sample Author');
    git(repo, 'config', 'user.email', 'author@example.invalid');
    git(repo, 'config', 'commit.gpgsign', 'false');
    git(repo, 'config', 'core.hooksPath', 'no-hooks');
    commit(repo, 'Initial commit');
    commit(repo, 'chore: set up sample repository');
    setOriginMain(repo);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(repo, { recursive: true, force: true });
  });

  it("reads the branch's commits since it left main, and only those", () => {
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    const first = commit(repo, 'test: [sample] 01 add sample tests, RED');
    const second = commit(repo, 'feat: [sample] 01 add sample');
    git(repo, 'switch', '--quiet', 'main');
    commit(repo, 'docs: [other] add plan');
    setOriginMain(repo);
    git(repo, 'switch', '--quiet', 'feat/01-sample');

    const range = readBranchRange(repo);

    expect(range.branch).toBe('feat/01-sample');
    expect(trimMessages(range.commits)).toHaveLength(2);
    expect(trimMessages(range.commits)).toEqual(
      expect.arrayContaining([
        { hash: first, message: 'test: [sample] 01 add sample tests, RED' },
        { hash: second, message: 'feat: [sample] 01 add sample' },
      ]),
    );
  });

  it('reads the whole message of a commit, body included', () => {
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    const hash = commit(
      repo,
      'feat: [sample] 01 add sample',
      'explains why the sample exists',
    );

    const range = readBranchRange(repo);

    expect(trimMessages(range.commits)).toEqual([
      {
        hash,
        message:
          'feat: [sample] 01 add sample\n\nexplains why the sample exists',
      },
    ]);
  });

  it('reads an empty range on main', () => {
    const range = readBranchRange(repo);

    expect(range.branch).toBe('main');
    expect(range.commits).toEqual([]);
  });

  it('throws an error telling to fetch origin/main when the ref is missing', () => {
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    commit(repo, 'feat: [sample] 01 add sample');
    git(repo, 'update-ref', '-d', 'refs/remotes/origin/main');

    expect(() => readBranchRange(repo)).toThrow(/fetch.*origin\/main/i);
  });
});
