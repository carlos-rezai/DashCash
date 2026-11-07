import { describe, expect, it } from 'vitest';
import {
  ROOT,
  runSampleGit,
} from '../../scripts/test-support/sampleRepository/sampleRepository.ts';

// Whole-repository tests of the Commit-msg hook: they check how git tracks
// the hook in this repository, not code, so the Stryker Vitest config leaves
// this file out of a Mutation run (design log D4). Verify still runs it.

const HOOK_PATH = '.githooks/commit-msg';

describe('the hook file', () => {
  it('is the only file in the hooks folder', () => {
    const tracked = runSampleGit(ROOT, 'ls-files', '--', '.githooks');

    expect(tracked.split('\n')).toEqual([HOOK_PATH]);
  });

  it('is tracked with mode 100755', () => {
    const entry = runSampleGit(ROOT, 'ls-files', '--stage', '--', HOOK_PATH);

    expect(entry.split(' ')[0]).toBe('100755');
  });
});
