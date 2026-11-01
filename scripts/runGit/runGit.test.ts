import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listHeadPaths,
  listTrackedPaths,
  readHeadFile,
  runGit,
} from './runGit.ts';

describe('runGit', { timeout: 30_000 }, () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'dashcash-run-git-'));
    runGit(repo, ['init', '--quiet', '--initial-branch=main']);
    runGit(repo, ['config', 'user.name', 'Sample Author']);
    runGit(repo, ['config', 'user.email', 'author@example.invalid']);
    runGit(repo, ['config', 'commit.gpgsign', 'false']);
    runGit(repo, ['config', 'core.hooksPath', 'no-hooks']);
    mkdirSync(join(repo, 'docs'));
    writeFileSync(join(repo, 'docs', 'note.md'), 'committed\n');
    writeFileSync(join(repo, 'a.txt'), 'first\n');
    runGit(repo, ['add', '--', 'docs/note.md', 'a.txt']);
    runGit(repo, ['commit', '--quiet', '-m', 'Initial commit']);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(repo, { recursive: true, force: true });
  });

  it('runs git in the given folder and returns its output', () => {
    expect(runGit(repo, ['branch', '--show-current']).trim()).toBe('main');
  });

  it('throws when git fails', () => {
    expect(() => runGit(repo, ['rev-parse', '--verify', 'nope'])).toThrow();
  });

  it('acts on the repository in cwd even when a hook has set GIT_DIR', () => {
    vi.stubEnv('GIT_DIR', join(tmpdir(), 'dashcash-no-such-git-dir'));

    expect(runGit(repo, ['branch', '--show-current']).trim()).toBe('main');
  });

  it('lists the tracked paths, staged ones included', () => {
    writeFileSync(join(repo, 'b.txt'), 'staged\n');
    writeFileSync(join(repo, 'untracked.txt'), 'untracked\n');
    runGit(repo, ['add', '--', 'b.txt']);

    expect(listTrackedPaths(repo).sort()).toEqual([
      'a.txt',
      'b.txt',
      'docs/note.md',
    ]);
  });

  it('lists the paths committed at HEAD, not the staged ones', () => {
    writeFileSync(join(repo, 'b.txt'), 'staged\n');
    runGit(repo, ['add', '--', 'b.txt']);

    expect(listHeadPaths(repo).sort()).toEqual(['a.txt', 'docs/note.md']);
  });

  it('reads a file as committed at HEAD, not as changed in the working tree', () => {
    writeFileSync(join(repo, 'docs', 'note.md'), 'changed\n');

    expect(readHeadFile(repo, 'docs/note.md')).toBe('committed\n');
  });
});
