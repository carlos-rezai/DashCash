import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  commit,
  initSampleRepository,
  installGateScripts,
  setOriginMain,
  writeTreeFile,
} from '../sampleRepository/sampleRepository.ts';
import { runNpmScript } from './runNpmScript.ts';

const BAD_TITLE = 'feat: [sample] 01 add sample';

describe('runNpmScript', { timeout: 60_000 }, () => {
  let folder: string;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'dashcash-npm-'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(folder, { recursive: true, force: true });
  });

  it('throws for an unknown script, naming it', () => {
    expect(() => runNpmScript('no:such-script', folder)).toThrow(
      'no:such-script',
    );
  });

  describe('with the gate scripts beside a sample repository', () => {
    beforeEach(() => {
      initSampleRepository(folder);
      commit(folder, 'docs: [sample] add plan');
      setOriginMain(folder);
      installGateScripts(folder);
    });

    it('runs the script in the given folder and returns status, output and both streams joined', () => {
      const result = runNpmScript('check:pr', folder, {
        env: { PR_TITLE: BAD_TITLE, GITHUB_HEAD_REF: 'feat/01-sample' },
      });

      expect(result.status).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toContain(BAD_TITLE);
      expect(result.output).toBe(result.stdout + result.stderr);
    });

    it('returns status 0 and empty output for a passing script', () => {
      const result = runNpmScript('check:data-files', folder);

      expect(result.status, result.stderr).toBe(0);
      expect(result.output).toBe('');
    });

    it('runs with the clean environment, so an ambient PR_TITLE is not seen', () => {
      vi.stubEnv('PR_TITLE', BAD_TITLE);

      const result = runNpmScript('check:pr', folder, {
        env: { GITHUB_HEAD_REF: 'feat/01-sample' },
      });

      expect(result.status).toBe(1);
      expect(result.stderr).not.toContain(BAD_TITLE);
    });
  });

  describe('with the root node_modules/.bin first on the PATH', () => {
    it('finds the root tools whatever the case of the PATH variable', () => {
      writeTreeFile(folder, 'sample.json', '{ "sample": 1 }\n');

      const result = runNpmScript('format:check', folder, { rootBin: true });

      expect(result.status, result.output).toBe(0);
    });

    it('finds the root tools when the variable is spelled in odd case', () => {
      writeTreeFile(folder, 'sample.json', '{ "sample": 1 }\n');
      const pathKey = Object.keys(process.env).find(
        (key) => key.toUpperCase() === 'PATH',
      );
      const original = pathKey === undefined ? '' : process.env[pathKey];
      for (const key of Object.keys(process.env)) {
        if (key.toUpperCase() === 'PATH') {
          vi.stubEnv(key, undefined);
        }
      }
      vi.stubEnv('pAtH', original);

      const result = runNpmScript('format:check', folder, { rootBin: true });

      expect(result.status, result.output).toBe(0);
    });
  });
});
