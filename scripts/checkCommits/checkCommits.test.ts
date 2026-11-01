import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import load from '@commitlint/load';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  commit,
  initSampleRepository,
  installGateScripts,
  ROOT,
  runSampleGit as git,
  setOriginMain,
} from '../test-support/sampleRepository/sampleRepository.ts';
import { runNpmScript as runScript } from '../test-support/runNpmScript/runNpmScript.ts';
import { lintCommitMessages } from './checkCommits.ts';

const EXPECTED_FORMAT = '<type>: [<feature>]';

// Headers in the forms the issue-loop and the planning chain write.
const CONVENTIONAL_HEADERS = [
  'docs: [sample] add prd',
  'docs: [sample] add tickets',
  'test: [sample] 01 add sample tests, RED',
  'feat: [sample] 01 add sample',
  'fix: [sample] 01 address review',
  'docs: [sample] 01 tick ci criterion',
];

describe('lintCommitMessages', () => {
  let config: Awaited<ReturnType<typeof load>>;

  beforeAll(async () => {
    config = await load({}, { cwd: ROOT, file: 'commitlint.config.js' });
  });

  it('reports nothing for no commits', async () => {
    expect(await lintCommitMessages([], config)).toEqual([]);
  });

  it('reports nothing for headers that follow the convention', async () => {
    expect(await lintCommitMessages(CONVENTIONAL_HEADERS, config)).toEqual([]);
  });

  it('reports nothing for merge, revert, fixup and squash commits', async () => {
    const messages = [
      "Merge branch 'main' into feat/01-sample",
      'Revert "feat: [sample] 01 add sample"\n\nThis reverts commit 1a2b3c4d.',
      'fixup! feat: [sample] 01 add sample',
      'squash! feat: [sample] 01 add sample',
    ];

    expect(await lintCommitMessages(messages, config)).toEqual([]);
  });

  it('reports a header off the pattern with the expected format', async () => {
    const violations = await lintCommitMessages(
      ['feat(sample): add sample'],
      config,
    );

    expect(violations).not.toEqual([]);
    for (const violation of violations) {
      expect(violation.subject).toBe('feat(sample): add sample');
    }
    expect(
      violations.map((violation) => violation.reason).join('\n'),
    ).toContain(EXPECTED_FORMAT);
  });

  it('names a commit with a body by its header', async () => {
    const violations = await lintCommitMessages(
      ['feat: [sample] 01 add sample\n\nexplains why the sample exists'],
      config,
    );

    expect(violations).not.toEqual([]);
    for (const violation of violations) {
      expect(violation.subject).toBe('feat: [sample] 01 add sample');
      expect(violation.reason).not.toBe('');
    }
  });

  it('reports the failing commits of a mixed range, and only those', async () => {
    const violations = await lintCommitMessages(
      [
        'feat: [sample] 01 add sample',
        'wip: [sample] 01 add sample',
        'fix: [sample] 01 address review',
        'feat: [Sample] 1 add sample',
      ],
      config,
    );

    expect(new Set(violations.map((violation) => violation.subject))).toEqual(
      new Set(['wip: [sample] 01 add sample', 'feat: [Sample] 1 add sample']),
    );
  });
});

describe('check:commits', { timeout: 60_000 }, () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'dashcash-commits-'));
    installGateScripts(repo);
    initSampleRepository(repo);
    // main's own history is outside every Branch range, so it may break the
    // convention without failing the check.
    commit(repo, 'Initial commit');
    commit(repo, 'chore: set up sample repository');
    setOriginMain(repo);
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('passes on main, whose range is empty', () => {
    const result = runScript('check:commits', repo);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('passes on a branch whose commits follow the convention', () => {
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    for (const header of CONVENTIONAL_HEADERS) {
      commit(repo, header);
    }
    git(repo, 'switch', '--quiet', 'main');
    commit(repo, 'docs: [other] add plan');
    setOriginMain(repo);
    git(repo, 'switch', '--quiet', 'feat/01-sample');
    git(
      repo,
      'merge',
      '--quiet',
      '--no-ff',
      '-m',
      "Merge branch 'main' into feat/01-sample",
      'main',
    );
    commit(repo, 'fix: [sample] 01 address review');

    const result = runScript('check:commits', repo);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('fails on a branch commit off the convention and names its header', () => {
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    commit(repo, 'feat: [sample] 01 add sample');
    commit(repo, 'feat(sample): add sample');

    const result = runScript('check:commits', repo);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('feat(sample): add sample');
    expect(result.stderr).toContain(EXPECTED_FORMAT);
    expect(result.stderr).not.toContain('feat: [sample] 01 add sample:');
  });

  it('fails on branch commits that break a description rule and names them', () => {
    const breaking = [
      'feat: [sample] 01 add sample, RED',
      'fix: [sample] 01 thank sample@example.invalid',
      'docs: [sample] add prd.',
      'docs: [sample] add a description that is fifty-one characters long',
    ];
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    commit(repo, 'test: [sample] 01 add sample tests, RED');
    for (const header of breaking) {
      commit(repo, header);
    }

    const result = runScript('check:commits', repo);

    expect(result.status).toBe(1);
    for (const header of breaking) {
      expect(result.stderr).toContain(`${header}:`);
    }
    expect(result.stderr).not.toContain(
      'test: [sample] 01 add sample tests, RED:',
    );
  });

  it('exits 1 telling to fetch origin/main when the ref is missing', () => {
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    commit(repo, 'feat: [sample] 01 add sample');
    git(repo, 'update-ref', '-d', 'refs/remotes/origin/main');

    const result = runScript('check:commits', repo);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/fetch.*origin\/main/i);
  });
});
