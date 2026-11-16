import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  buildCleanEnv,
  commit,
  initSampleRepository,
  runSampleGit,
} from '../../scripts/test-support/sampleRepository/sampleRepository.ts';

// The dangerous-git hook: a PreToolUse hook that refuses destructive git
// commands. It is driven the way Claude Code drives it: the tool call as JSON
// on standard input, the verdict in the exit code (2 blocks) and the reason
// on standard error. It reads the current branch from the cwd of the call,
// so each case runs against an invented repository on the branch it names.

const ROOT = join(import.meta.dirname, '..', '..');
const HOOK = join(ROOT, '.claude', 'hooks', 'block-dangerous-git.sh');

const CHAINED = 'git push chained with another command';

type Branch = 'main' | 'feat/sample' | 'refactor/sample';

const BRANCHES: Branch[] = ['main', 'feat/sample', 'refactor/sample'];

const repositories = new Map<Branch, string>();

beforeAll(() => {
  for (const branch of BRANCHES) {
    const cwd = mkdtempSync(join(tmpdir(), 'dashcash-git-guard-'));
    initSampleRepository(cwd);
    commit(cwd, 'chore: start the sample repository');
    if (branch !== 'main') {
      runSampleGit(cwd, 'checkout', '--quiet', '-b', branch);
    }
    repositories.set(branch, cwd);
  }
});

afterAll(() => {
  for (const cwd of repositories.values()) {
    rmSync(cwd, { recursive: true, force: true });
  }
});

interface HookResult {
  status: number | null;
  stderr: string;
}

function repositoryOn(branch: Branch): string {
  const cwd = repositories.get(branch);
  if (cwd === undefined) {
    throw new Error(`no sample repository on ${branch}`);
  }
  return cwd;
}

function runHookInput(input: string): HookResult {
  const result = spawnSync('bash', [HOOK], {
    input,
    encoding: 'utf8',
    env: buildCleanEnv(),
  });
  return { status: result.status, stderr: result.stderr };
}

function runHook(command: string, branch: Branch): HookResult {
  return runHookInput(
    JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      cwd: repositoryOn(branch),
      tool_input: { command },
    }),
  );
}

describe('a git push chained with another command', () => {
  const chainedPushes = [
    'git push && gh pr create --base main',
    'git switch main && git push',
    'git add . ; git push',
    'git push | cat',
    'git push || echo invented',
    'git add .\ngit push',
  ];

  it.each(
    chainedPushes.flatMap((command) =>
      (['feat/sample', 'refactor/sample'] as const).map(
        (branch) => [JSON.stringify(command), branch, command] as const,
      ),
    ),
  )('blocks %s from %s', (_label, branch, command) => {
    const result = runHook(command, branch);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain(`'${CHAINED}'`);
  });
});

describe('a lone git push', () => {
  it.each<[string, Branch]>([
    ['git push', 'feat/sample'],
    ['git push', 'refactor/sample'],
    ['git push origin feat/x', 'feat/sample'],
    ['git push -u origin HEAD', 'feat/sample'],
    ['git push -u origin HEAD', 'refactor/sample'],
  ])('allows %s from %s', (command, branch) => {
    const result = runHook(command, branch);

    expect(result.status, result.stderr).toBe(0);
  });

  it.each(['git push origin main', 'git push origin HEAD:main'])(
    'blocks %s from a feat/* branch as a push to main',
    (command) => {
      const result = runHook(command, 'feat/sample');

      expect(result.status).toBe(2);
      expect(result.stderr).toContain(`'git push to main'`);
    },
  );

  it('blocks a push from main', () => {
    const result = runHook('git push', 'main');

    expect(result.status).toBe(2);
    expect(result.stderr).toContain(`'git push from 'main''`);
  });
});

describe('a pull request against main without a push', () => {
  it('allows gh pr create --base main on its own', () => {
    const result = runHook('gh pr create --base main', 'feat/sample');

    expect(result.status, result.stderr).toBe(0);
  });
});

describe('every other rule', () => {
  it.each([
    ['git reset --hard HEAD~1', 'git reset --hard'],
    ['git clean -fd', 'git clean -fd'],
    ['git clean -f', 'git clean -f'],
    ['git branch -D feat/old', 'git branch -D'],
    ['git checkout .', 'git checkout \\.'],
    ['git restore .', 'git restore \\.'],
    ['git push --force', 'push --force'],
    ['git push -f', 'push -f( |$)'],
    ['git commit --no-verify -m invented', '--no-verify'],
    ['gh pr merge 12', 'gh pr merge'],
    ['git -C invented reset --hard', 'reset --hard'],
    ['git stash drop', 'git stash (drop|clear)'],
    ['git stash clear', 'git stash (drop|clear)'],
    ['git tag v1.0.0', 'git tag'],
  ])('blocks %s as %s', (command, pattern) => {
    const result = runHook(command, 'feat/sample');

    expect(result.status).toBe(2);
    expect(result.stderr).toContain(`matches dangerous pattern '${pattern}'`);
  });

  it.each(['git tag', 'git tag -l', 'git tag --list v1*'])(
    'allows listing tags with %s',
    (command) => {
      const result = runHook(command, 'feat/sample');

      expect(result.status, result.stderr).toBe(0);
    },
  );

  it('blocks a commit on main', () => {
    const result = runHook('git commit -m invented', 'main');

    expect(result.status).toBe(2);
    expect(result.stderr).toContain(`'git commit on main'`);
  });

  it('allows a commit on a feat/* branch', () => {
    const result = runHook('git commit -m invented', 'feat/sample');

    expect(result.status, result.stderr).toBe(0);
  });

  it('blocks input it cannot parse', () => {
    const result = runHookInput('{ not json');

    expect(result.status).toBe(2);
    expect(result.stderr).toContain(
      'BLOCKED: git guardrail hook could not parse tool input.',
    );
  });
});
