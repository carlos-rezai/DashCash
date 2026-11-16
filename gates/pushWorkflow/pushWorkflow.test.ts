import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobCommands,
  readWorkflow,
  triggers,
} from '../../scripts/readWorkflow/readWorkflow.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PUSH_WORKFLOW = 'ci.yml';

const pushWorkflow = readWorkflow(ROOT, PUSH_WORKFLOW);

describe('push workflow', () => {
  it('triggers the push workflow, CI, only by push to feat/** and refactor/**', () => {
    expect(pushWorkflow.name).toBe('CI');
    expect(triggers(pushWorkflow)).toEqual({
      push: { branches: ['feat/**', 'refactor/**'] },
    });
  });

  it('gives the push workflow the one job verify', () => {
    expect(Object.keys(pushWorkflow.jobs ?? {})).toEqual(['verify']);
  });

  it('runs npm run verify in the verify job', () => {
    expect(jobCommands(pushWorkflow, 'verify')).toContain('npm run verify');
  });

  it('runs exactly npm ci, then npm run verify in the verify job', () => {
    expect(jobCommands(pushWorkflow, 'verify')).toEqual([
      'npm ci',
      'npm run verify',
    ]);
  });
});
