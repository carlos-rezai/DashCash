import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobSteps,
  readWorkflow,
  type Workflow,
} from '../../scripts/readWorkflow/readWorkflow.ts';
import { isGitleaksStep } from '../dailyMutation/dailyMutation.ts';
import { withJobSteps } from '../test-support/withJobSteps/withJobSteps.ts';
import { findSecretScanProblems } from './secretScan.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PUSH_WORKFLOW = 'ci.yml';
const PULL_REQUEST_WORKFLOW = 'pull-request.yml';
const DAILY_WORKFLOW = 'daily.yml';

// The three jobs that run the Secret scan, each with its workflow file.
const SECRET_SCAN_JOBS: [job: string, file: string][] = [
  ['verify', PUSH_WORKFLOW],
  ['pull-request', PULL_REQUEST_WORKFLOW],
  ['daily', DAILY_WORKFLOW],
];

function withoutGitleaks(workflow: Workflow, job: string): Workflow {
  return withJobSteps(workflow, job, (steps) =>
    steps.filter((step) => !isGitleaksStep(step)),
  );
}

function withGitleaksBeforeCheckout(workflow: Workflow, job: string): Workflow {
  return withJobSteps(workflow, job, (steps) => [
    ...steps.filter(isGitleaksStep),
    ...steps.filter((step) => !isGitleaksStep(step)),
  ]);
}

function withGitleaksComments(workflow: Workflow, job: string): Workflow {
  return withJobSteps(workflow, job, (steps) =>
    steps.map((step) =>
      isGitleaksStep(step)
        ? { ...step, env: { ...step.env, GITLEAKS_ENABLE_COMMENTS: true } }
        : step,
    ),
  );
}

describe('secret scan', () => {
  it.each(SECRET_SCAN_JOBS)(
    'runs gitleaks in the %s job right after checkout and before setup-node, with comments off and the workflow GITHUB_TOKEN',
    (job, file) => {
      expect(findSecretScanProblems(readWorkflow(ROOT, file), job)).toEqual([]);
    },
  );

  it.each(
    SECRET_SCAN_JOBS.flatMap(
      ([job, file]) =>
        [
          [
            job,
            'its gitleaks step is removed',
            file,
            withoutGitleaks,
            `the ${job} job does not run gitleaks`,
          ],
          [
            job,
            'its gitleaks step is moved before checkout',
            file,
            withGitleaksBeforeCheckout,
            `the ${job} job does not run gitleaks right after checkout`,
          ],
          [
            job,
            'its gitleaks step has comments enabled',
            file,
            withGitleaksComments,
            `the ${job} job runs gitleaks with comments enabled`,
          ],
        ] as const,
    ),
  )('fails the %s job when %s', (job, _change, file, change, problem) => {
    const workflow = readWorkflow(ROOT, file);
    const before = findSecretScanProblems(workflow, job);
    const after = findSecretScanProblems(change(workflow, job), job);

    expect(before).toEqual([]);
    expect(after).toEqual([problem]);
  });

  it.each(SECRET_SCAN_JOBS)(
    'runs exactly one gitleaks step in the %s job',
    (job, file) => {
      expect(
        jobSteps(readWorkflow(ROOT, file), job).filter(isGitleaksStep),
      ).toHaveLength(1);
    },
  );

  it('scans with the default gitleaks rules: a gitleaks step in each job, no gitleaks config file and no .gitleaksignore', () => {
    const configFiles = readdirSync(new URL('../../', import.meta.url)).filter(
      (name) => /gitleaks/i.test(name),
    );
    const configuredSteps = SECRET_SCAN_JOBS.flatMap(([job, file]) =>
      jobSteps(readWorkflow(ROOT, file), job)
        .filter(isGitleaksStep)
        .filter(
          (step) =>
            step.with !== undefined ||
            Object.keys(step.env ?? {}).some((name) =>
              name.startsWith('GITLEAKS_CONFIG'),
            ),
        )
        .map(() => job),
    );
    const jobsWithGitleaks = SECRET_SCAN_JOBS.filter(([job, file]) =>
      jobSteps(readWorkflow(ROOT, file), job).some(isGitleaksStep),
    ).map(([job]) => job);

    expect(jobsWithGitleaks).toEqual(SECRET_SCAN_JOBS.map(([job]) => job));
    expect(configFiles).toEqual([]);
    expect(configuredSteps).toEqual([]);
  });
});
