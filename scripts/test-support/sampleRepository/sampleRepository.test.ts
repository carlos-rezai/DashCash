import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildCleanEnv,
  commit,
  commitFiles,
  initSampleRepository,
  installGateScripts,
  runSampleGit,
  setOriginMain,
  writeTreeFile,
} from './sampleRepository.ts';

describe('buildCleanEnv', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('drops every GIT_ variable and PR_TITLE and keeps the rest', () => {
    vi.stubEnv('GIT_DIR', 'elsewhere');
    vi.stubEnv('GIT_INDEX_FILE', 'elsewhere');
    vi.stubEnv('PR_TITLE', 'docs: [sample] add prd');
    vi.stubEnv('SAMPLE_KEPT', 'kept');

    const env = buildCleanEnv();

    expect(Object.keys(env).filter((key) => key.startsWith('GIT_'))).toEqual(
      [],
    );
    expect(env).not.toHaveProperty('PR_TITLE');
    expect(env['SAMPLE_KEPT']).toBe('kept');
  });

  it('blanks GITHUB_HEAD_REF and GITHUB_REF_NAME', () => {
    vi.stubEnv('GITHUB_HEAD_REF', 'feat/01-other');
    vi.stubEnv('GITHUB_REF_NAME', 'feat/01-other');

    const env = buildCleanEnv();

    expect(env['GITHUB_HEAD_REF']).toBe('');
    expect(env['GITHUB_REF_NAME']).toBe('');
  });

  it('applies the extras last', () => {
    vi.stubEnv('GITHUB_HEAD_REF', 'feat/01-other');

    const env = buildCleanEnv({
      GITHUB_HEAD_REF: 'feat/01-sample',
      PR_TITLE: 'docs: [sample] add prd',
      GIT_AUTHOR_NAME: 'Extra Author',
    });

    expect(env['GITHUB_HEAD_REF']).toBe('feat/01-sample');
    expect(env['PR_TITLE']).toBe('docs: [sample] add prd');
    expect(env['GIT_AUTHOR_NAME']).toBe('Extra Author');
  });
});

describe('sample repository', { timeout: 30_000 }, () => {
  let folder: string;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'dashcash-sample-repository-'));
  });

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  describe('runSampleGit', () => {
    it('returns the trimmed standard output', () => {
      initSampleRepository(folder);

      expect(runSampleGit(folder, 'branch', '--show-current')).toBe('main');
    });

    it('throws with the standard error of git on failure', () => {
      expect(() => runSampleGit(folder, 'rev-parse', 'HEAD')).toThrow(
        /not a git repository/,
      );
    });
  });

  describe('initSampleRepository', () => {
    it('starts on main with the sample author and no hooks', () => {
      initSampleRepository(folder);
      commit(folder, 'Initial commit');

      expect(runSampleGit(folder, 'branch', '--show-current')).toBe('main');
      expect(runSampleGit(folder, 'log', '-1', '--format=%an <%ae>')).toBe(
        'Sample Author <author@example.invalid>',
      );
      expect(runSampleGit(folder, 'config', 'core.hooksPath')).toBe('no-hooks');
      expect(runSampleGit(folder, 'config', 'commit.gpgsign')).toBe('false');
    });
  });

  describe('writeTreeFile', () => {
    it('creates the parent folders', () => {
      writeTreeFile(folder, 'docs/features/sample.md', '# Sample\n');

      expect(
        readFileSync(join(folder, 'docs/features/sample.md'), 'utf8'),
      ).toBe('# Sample\n');
    });
  });

  describe('commit', () => {
    it('commits without changes, one paragraph per -m, and returns the hash', () => {
      initSampleRepository(folder);

      const hash = commit(folder, 'docs: [sample] add prd', 'A body line.');

      expect(hash).toMatch(/^[0-9a-f]{40}$/);
      expect(runSampleGit(folder, 'rev-parse', 'HEAD')).toBe(hash);
      expect(runSampleGit(folder, 'log', '-1', '--format=%s')).toBe(
        'docs: [sample] add prd',
      );
      expect(runSampleGit(folder, 'log', '-1', '--format=%b')).toBe(
        'A body line.',
      );
    });
  });

  describe('commitFiles', () => {
    it('commits exactly the given files', () => {
      initSampleRepository(folder);
      writeTreeFile(folder, 'untouched.txt', 'not committed\n');

      commitFiles(folder, 'docs: [sample] add prd', {
        'docs/prd.md': '# PRD\n',
        'README.md': '# Sample\n',
      });

      expect(
        runSampleGit(folder, 'show', '--name-only', '--format=', 'HEAD')
          .split('\n')
          .sort(),
      ).toEqual(['README.md', 'docs/prd.md']);
      expect(runSampleGit(folder, 'log', '-1', '--format=%s')).toBe(
        'docs: [sample] add prd',
      );
      expect(runSampleGit(folder, 'ls-files', '--others')).toBe(
        'untouched.txt',
      );
    });
  });

  describe('setOriginMain', () => {
    it('points refs/remotes/origin/main at HEAD', () => {
      initSampleRepository(folder);
      const first = commit(folder, 'Initial commit');
      setOriginMain(folder);
      const second = commit(folder, 'chore: set up sample repository');

      expect(
        runSampleGit(folder, 'rev-parse', 'refs/remotes/origin/main'),
      ).toBe(first);

      setOriginMain(folder);

      expect(
        runSampleGit(folder, 'rev-parse', 'refs/remotes/origin/main'),
      ).toBe(second);
    });
  });

  describe('installGateScripts', () => {
    it('places the package.json, scripts, commitlint config and node_modules link, untracked', () => {
      initSampleRepository(folder);

      installGateScripts(folder);

      expect(readFileSync(join(folder, 'package.json'), 'utf8')).toContain(
        '"type": "module"',
      );
      expect(
        existsSync(join(folder, 'scripts/checkCommits/checkCommits.ts')),
      ).toBe(true);
      expect(existsSync(join(folder, 'commitlint.config.js'))).toBe(true);
      expect(lstatSync(join(folder, 'node_modules')).isSymbolicLink()).toBe(
        true,
      );
      expect(runSampleGit(folder, 'ls-files')).toBe('');
    });
  });
});
