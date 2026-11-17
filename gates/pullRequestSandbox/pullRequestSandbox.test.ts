import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobCommands,
  jobsRunning,
  readWorkflow,
  type Workflow,
  type WorkflowStep,
} from '../../scripts/readWorkflow/readWorkflow.ts';
import { withJobSteps } from '../test-support/withJobSteps/withJobSteps.ts';
import {
  findPullRequestSandboxProblems,
  runsVerifyFull,
} from './pullRequestSandbox.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PULL_REQUEST_WORKFLOW = 'pull-request.yml';
// The pull-request job allows the Linux sandbox with this step, then runs
// Verify full under a virtual display; nothing passes --no-sandbox.
const SANDBOX_STEP =
  'sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0';
const VIRTUAL_DISPLAY = 'xvfb-run --auto-servernum';
const VERIFY_FULL_UNDER_DISPLAY = `${VIRTUAL_DISPLAY} npm run verify:full`;
const NO_SANDBOX = '--no-sandbox';

function isSandboxStep(step: WorkflowStep): boolean {
  return (step.run ?? '').includes(SANDBOX_STEP);
}

function withoutSandboxStep(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'pull-request', (steps) =>
    steps.filter((step) => !isSandboxStep(step)),
  );
}

function withSandboxStepAfterVerifyFull(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'pull-request', (steps) => {
    const others = steps.filter((step) => !isSandboxStep(step));
    const verifyFull = others.findIndex((step) =>
      runsVerifyFull(step.run ?? ''),
    );
    return [
      ...others.slice(0, verifyFull + 1),
      ...steps.filter(isSandboxStep),
      ...others.slice(verifyFull + 1),
    ];
  });
}

function withoutVirtualDisplay(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'pull-request', (steps) =>
    steps.map((step) =>
      step.run === undefined
        ? step
        : { ...step, run: step.run.replace(`${VIRTUAL_DISPLAY} `, '') },
    ),
  );
}

function withNoSandboxOnVerifyFull(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'pull-request', (steps) =>
    steps.map((step) =>
      runsVerifyFull(step.run ?? '')
        ? {
            ...step,
            env: { ...step.env, ELECTRON_EXTRA_LAUNCH_ARGS: NO_SANDBOX },
          }
        : step,
    ),
  );
}

function withNoSandboxOnJob(workflow: Workflow): Workflow {
  const job = workflow.jobs?.['pull-request'] ?? {};
  return {
    ...workflow,
    jobs: {
      ...workflow.jobs,
      'pull-request': {
        ...job,
        env: { ...job.env, ELECTRON_EXTRA_LAUNCH_ARGS: NO_SANDBOX },
      },
    },
  };
}

const pullRequestWorkflow = readWorkflow(ROOT, PULL_REQUEST_WORKFLOW);

describe('pull-request sandbox', () => {
  it('finds nothing missing from the sandbox and display wiring of the pull-request job', () => {
    expect(findPullRequestSandboxProblems(pullRequestWorkflow)).toEqual([]);
  });

  it.each([
    [
      'its sysctl step is removed',
      withoutSandboxStep,
      `the pull-request job does not run ${SANDBOX_STEP}`,
    ],
    [
      'its sysctl step is moved after npm run verify:full',
      withSandboxStepAfterVerifyFull,
      'the pull-request job runs the sysctl step after npm run verify:full',
    ],
    [
      'its xvfb-run wrapping is removed',
      withoutVirtualDisplay,
      `the pull-request job does not run npm run verify:full under ${VIRTUAL_DISPLAY}`,
    ],
    [
      'its verify:full step passes --no-sandbox',
      withNoSandboxOnVerifyFull,
      `the pull-request job passes ${NO_SANDBOX}`,
    ],
    [
      'the job passes --no-sandbox',
      withNoSandboxOnJob,
      `the pull-request job passes ${NO_SANDBOX}`,
    ],
  ])(
    'fails the sandbox wiring of the pull-request job when %s',
    (_change, change, problem) => {
      const before = findPullRequestSandboxProblems(pullRequestWorkflow);
      const after = findPullRequestSandboxProblems(change(pullRequestWorkflow));

      expect(before).toEqual([]);
      expect(after).toEqual([problem]);
    },
  );

  it('runs the sysctl step and xvfb-run only in the pull-request job, and --no-sandbox in no job', () => {
    expect(jobsRunning(ROOT, SANDBOX_STEP)).toEqual([
      `${PULL_REQUEST_WORKFLOW}: pull-request`,
    ]);
    expect(jobsRunning(ROOT, VIRTUAL_DISPLAY)).toEqual([
      `${PULL_REQUEST_WORKFLOW}: pull-request`,
    ]);
    expect(jobsRunning(ROOT, NO_SANDBOX)).toEqual([]);
  });

  it('runs npm run verify:full under xvfb-run --auto-servernum in the pull-request job', () => {
    expect(jobCommands(pullRequestWorkflow, 'pull-request')).toContain(
      VERIFY_FULL_UNDER_DISPLAY,
    );
  });
});
