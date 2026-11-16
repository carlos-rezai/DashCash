import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobCommands,
  readWorkflow,
  triggers,
} from '../../scripts/readWorkflow/readWorkflow.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PUSH_WORKFLOW = 'ci.yml';
// Electron 45 downloads its binary on the first require('electron'), so every
// job that runs tests installs it in its own step right after npm ci.
const INSTALL_ELECTRON = 'node_modules/.bin/install-electron';

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

  it('runs exactly npm ci, node_modules/.bin/install-electron, then npm run verify in the verify job', () => {
    expect(jobCommands(pushWorkflow, 'verify')).toEqual([
      'npm ci',
      INSTALL_ELECTRON,
      'npm run verify',
    ]);
  });
});
