import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobSteps,
  readWorkflow,
  stepIndex,
  triggers,
  workflowFiles,
} from '../../scripts/readWorkflow/readWorkflow.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PULL_REQUEST_WORKFLOW = 'pull-request.yml';
const DAILY_WORKFLOW = 'daily.yml';

const pullRequestWorkflow = readWorkflow(ROOT, PULL_REQUEST_WORKFLOW);
const dailyWorkflow = readWorkflow(ROOT, DAILY_WORKFLOW);

describe('workflows', () => {
  it.each([
    ['pull-request', pullRequestWorkflow],
    ['daily', dailyWorkflow],
  ] as const)(
    'checks out full history, then sets up Node from .nvmrc with the npm cache, before npm ci in the %s job',
    (job, workflow) => {
      const steps = jobSteps(workflow, job);
      const checkout = stepIndex(steps, 'actions/checkout');
      const setupNode = stepIndex(steps, 'actions/setup-node');
      const npmCi = steps.findIndex((step) => step.run === 'npm ci');

      expect(checkout).toBe(0);
      expect(steps[checkout]?.with?.['fetch-depth']).toBe(0);
      expect(setupNode).toBeGreaterThan(checkout);
      expect(steps[setupNode]?.with?.['node-version-file']).toBe('.nvmrc');
      expect(steps[setupNode]?.with?.['cache']).toBe('npm');
      expect(npmCi).toBeGreaterThan(setupNode);
    },
  );

  it('keeps every job of every workflow free of if:', () => {
    const conditionalJobs = workflowFiles(ROOT).flatMap((file) =>
      Object.entries(readWorkflow(ROOT, file).jobs ?? {})
        .filter(([, job]) => job?.if !== undefined)
        .map(([id]) => `${file}: ${id}`),
    );

    expect(conditionalJobs).toEqual([]);
  });

  it('runs only the CI workflow on push, with its one job verify', () => {
    const pushRuns = workflowFiles(ROOT)
      .map((file) => readWorkflow(ROOT, file))
      .filter((workflow) => 'push' in triggers(workflow))
      .map((workflow) => ({
        name: workflow.name,
        jobs: Object.keys(workflow.jobs ?? {}),
      }));

    expect(pushRuns).toEqual([{ name: 'CI', jobs: ['verify'] }]);
  });
});
