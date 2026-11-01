import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  commit,
  initSampleRepository,
  runSampleGit as git,
  setOriginMain,
} from '../test-support/sampleRepository/sampleRepository.ts';
import {
  readBranchName,
  readBranchRange,
  resolveBranchName,
} from './readBranchRange.ts';

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

describe('readBranchName', { timeout: 30_000 }, () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'dashcash-branch-name-'));
    initSampleRepository(repo);
    commit(repo, 'Initial commit');
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('reads the current branch when the GitHub variables are empty', () => {
    const env = { GITHUB_HEAD_REF: '', GITHUB_REF_NAME: '' };

    expect(readBranchName(repo, env)).toBe('feat/01-sample');
  });

  it('takes GITHUB_HEAD_REF when it is set', () => {
    const env = { GITHUB_HEAD_REF: 'feat/02-other', GITHUB_REF_NAME: '' };

    expect(readBranchName(repo, env)).toBe('feat/02-other');
  });
});

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
    initSampleRepository(repo);
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
