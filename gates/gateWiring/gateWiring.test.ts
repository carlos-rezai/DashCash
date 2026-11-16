import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobSteps,
  jobsRunning,
  readWorkflow,
  stepIndex,
  type Workflow,
  type WorkflowStep,
} from '../../scripts/readWorkflow/readWorkflow.ts';
import { withJobSteps } from '../test-support/withJobSteps/withJobSteps.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PUSH_WORKFLOW = 'ci.yml';
const PULL_REQUEST_WORKFLOW = 'pull-request.yml';
const DAILY_WORKFLOW = 'daily.yml';
// Electron 45 downloads its binary on the first require('electron'), so every
// job that runs tests installs it in its own step right after npm ci.
const INSTALL_ELECTRON = 'node_modules/.bin/install-electron';
// The pull-request job runs Verify full under a virtual display.
const VIRTUAL_DISPLAY = 'xvfb-run --auto-servernum';
const VERIFY_FULL_UNDER_DISPLAY = `${VIRTUAL_DISPLAY} npm run verify:full`;
const GITLEAKS_ACTION = 'gitleaks/gitleaks-action';
const WORKFLOW_TOKEN = '${{ secrets.GITHUB_TOKEN }}';

// The three jobs that run the Secret scan, each with its workflow file.
const SECRET_SCAN_JOBS: [job: string, file: string][] = [
  ['verify', PUSH_WORKFLOW],
  ['pull-request', PULL_REQUEST_WORKFLOW],
  ['daily', DAILY_WORKFLOW],
];

// The three jobs that run tests, each with its workflow file and its first
// test command; the daily job runs no tests.
const ELECTRON_INSTALL_JOBS: [job: string, file: string, firstTest: string][] =
  [
    ['verify', PUSH_WORKFLOW, 'npm run verify'],
    ['pull-request', PULL_REQUEST_WORKFLOW, VERIFY_FULL_UNDER_DISPLAY],
    ['mutation', DAILY_WORKFLOW, 'npm run test:mutation'],
  ];

// What a job lacks in its Secret scan wiring, one line each: the gitleaks
// step right after the checkout and before setup-node, with comments off and
// the workflow's GITHUB_TOKEN.
function findSecretScanProblems(workflow: Workflow, job: string): string[] {
  const steps = jobSteps(workflow, job);
  const gitleaks = stepIndex(steps, GITLEAKS_ACTION);
  if (gitleaks === -1) {
    return [`the ${job} job does not run gitleaks`];
  }

  const problems: string[] = [];
  const checkout = stepIndex(steps, 'actions/checkout');
  const setupNode = stepIndex(steps, 'actions/setup-node');
  if (checkout === -1 || gitleaks !== checkout + 1) {
    problems.push(`the ${job} job does not run gitleaks right after checkout`);
  }
  if (setupNode === -1 || gitleaks > setupNode) {
    problems.push(`the ${job} job does not run gitleaks before setup-node`);
  }
  const env = steps[gitleaks]?.env ?? {};
  if (String(env['GITLEAKS_ENABLE_COMMENTS']) !== 'false') {
    problems.push(`the ${job} job runs gitleaks with comments enabled`);
  }
  if (env['GITHUB_TOKEN'] !== WORKFLOW_TOKEN) {
    problems.push(
      `the ${job} job does not hand gitleaks the workflow's GITHUB_TOKEN`,
    );
  }
  return problems;
}

function isInstallElectronStep(step: WorkflowStep): boolean {
  return step.run === INSTALL_ELECTRON;
}

// What a job lacks in its Electron install, one line each: the install in its
// own step, directly after the npm ci step and before the job's first test
// command.
function findElectronInstallProblems(
  workflow: Workflow,
  job: string,
  firstTest: string,
): string[] {
  const steps = jobSteps(workflow, job);
  const install = steps.findIndex(isInstallElectronStep);
  if (install === -1) {
    return [`the ${job} job does not run ${INSTALL_ELECTRON}`];
  }

  const problems: string[] = [];
  const npmCi = steps.findIndex((step) => step.run === 'npm ci');
  if (npmCi === -1 || install !== npmCi + 1) {
    problems.push(
      `the ${job} job does not run ${INSTALL_ELECTRON} directly after npm ci`,
    );
  }
  const test = steps.findIndex((step) => step.run === firstTest);
  if (test === -1 || install > test) {
    problems.push(
      `the ${job} job does not run ${INSTALL_ELECTRON} before ${firstTest}`,
    );
  }
  return problems;
}

function withoutInstallElectron(workflow: Workflow, job: string): Workflow {
  return withJobSteps(workflow, job, (steps) =>
    steps.filter((step) => !isInstallElectronStep(step)),
  );
}

// The job with its install step moved to just before (offset 0) or just
// after (offset 1) the first step whose command is `anchor`.
function withInstallElectronMoved(
  anchor: (firstTest: string) => string,
  offset: 0 | 1,
): (workflow: Workflow, job: string, firstTest: string) => Workflow {
  return (workflow, job, firstTest) =>
    withJobSteps(workflow, job, (steps) => {
      const others = steps.filter((step) => !isInstallElectronStep(step));
      const at =
        others.findIndex((step) => step.run === anchor(firstTest)) + offset;
      return [
        ...others.slice(0, at),
        ...steps.filter(isInstallElectronStep),
        ...others.slice(at),
      ];
    });
}

const withInstallElectronBeforeNpmCi = withInstallElectronMoved(
  () => 'npm ci',
  0,
);
const withInstallElectronAfterFirstTest = withInstallElectronMoved(
  (firstTest) => firstTest,
  1,
);

function isGitleaksStep(step: WorkflowStep): boolean {
  return (step.uses ?? '').startsWith(`${GITLEAKS_ACTION}@`);
}

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

describe('gate wiring', () => {
  it.each(ELECTRON_INSTALL_JOBS)(
    'installs the Electron binary in its own step directly after npm ci and before the first test command in the %s job',
    (job, file, firstTest) => {
      expect(
        findElectronInstallProblems(readWorkflow(ROOT, file), job, firstTest),
      ).toEqual([]);
    },
  );

  it.each(
    ELECTRON_INSTALL_JOBS.flatMap(
      ([job, file, firstTest]) =>
        [
          [
            job,
            'its install-electron step is removed',
            file,
            firstTest,
            withoutInstallElectron,
            [`the ${job} job does not run ${INSTALL_ELECTRON}`],
          ],
          [
            job,
            'its install-electron step is moved before npm ci',
            file,
            firstTest,
            withInstallElectronBeforeNpmCi,
            [
              `the ${job} job does not run ${INSTALL_ELECTRON} directly after npm ci`,
            ],
          ],
          [
            job,
            'its install-electron step is moved after its first test command',
            file,
            firstTest,
            withInstallElectronAfterFirstTest,
            [
              `the ${job} job does not run ${INSTALL_ELECTRON} directly after npm ci`,
              `the ${job} job does not run ${INSTALL_ELECTRON} before ${firstTest}`,
            ],
          ],
        ] as const,
    ),
  )(
    'fails the Electron install of the %s job when %s',
    (job, _change, file, firstTest, change, problems) => {
      const workflow = readWorkflow(ROOT, file);
      const before = findElectronInstallProblems(workflow, job, firstTest);
      const after = findElectronInstallProblems(
        change(workflow, job, firstTest),
        job,
        firstTest,
      );

      expect(before).toEqual([]);
      expect(after).toEqual(problems);
    },
  );

  it('installs the Electron binary only in the verify, pull-request and mutation jobs', () => {
    expect(jobsRunning(ROOT, INSTALL_ELECTRON)).toEqual([
      `${PUSH_WORKFLOW}: verify`,
      `${DAILY_WORKFLOW}: mutation`,
      `${PULL_REQUEST_WORKFLOW}: pull-request`,
    ]);
  });

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
