import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobCommands,
  jobSteps,
  readWorkflow,
  triggers,
} from '../../scripts/readWorkflow/readWorkflow.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PULL_REQUEST_WORKFLOW = 'pull-request.yml';
// The pull-request job allows the Linux sandbox with this step, then runs
// Verify full under a virtual display; nothing passes --no-sandbox.
const SANDBOX_STEP =
  'sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0';
const VIRTUAL_DISPLAY = 'xvfb-run --auto-servernum';
const VERIFY_FULL_UNDER_DISPLAY = `${VIRTUAL_DISPLAY} npm run verify:full`;
const PULL_REQUEST_COMMANDS = [
  'npm ci',
  VERIFY_FULL_UNDER_DISPLAY,
  'npm run check:pr',
  'npm run test:mutation',
];

const pullRequestWorkflow = readWorkflow(ROOT, PULL_REQUEST_WORKFLOW);

describe('pull-request workflow', () => {
  it('triggers the pull-request workflow, Pull request, only by pull_request into main', () => {
    expect(pullRequestWorkflow.name).toBe('Pull request');
    expect(triggers(pullRequestWorkflow)).toEqual({
      pull_request: { branches: ['main'] },
    });
  });

  it('gives the pull-request workflow the one job pull-request', () => {
    expect(Object.keys(pullRequestWorkflow.jobs ?? {})).toEqual([
      'pull-request',
    ]);
  });

  it('runs npm ci, npm run verify:full under xvfb-run, npm run check:pr, then npm run test:mutation in the pull-request job, beside the sysctl step', () => {
    const commands = jobCommands(pullRequestWorkflow, 'pull-request');

    expect(commands.filter((command) => command === SANDBOX_STEP)).toEqual([
      SANDBOX_STEP,
    ]);
    expect(commands.filter((command) => command !== SANDBOX_STEP)).toEqual(
      PULL_REQUEST_COMMANDS,
    );
  });

  it('runs npm run check:pr after npm run verify:full in the pull-request job', () => {
    const commands = jobCommands(pullRequestWorkflow, 'pull-request');
    const verifyFull = commands.indexOf(VERIFY_FULL_UNDER_DISPLAY);

    expect(verifyFull).toBeGreaterThanOrEqual(0);
    expect(commands.indexOf('npm run check:pr')).toBeGreaterThan(verifyFull);
  });

  it('hands the pull-request title to check:pr only through PR_TITLE', () => {
    const steps = jobSteps(pullRequestWorkflow, 'pull-request');
    const checkStep = steps.find((step) =>
      (step.run ?? '').includes('npm run check:pr'),
    );

    expect(checkStep?.env?.['PR_TITLE']).toBe(
      '${{ github.event.pull_request.title }}',
    );
    for (const step of steps) {
      expect(step.run ?? '').not.toContain('${{');
    }
  });
});
