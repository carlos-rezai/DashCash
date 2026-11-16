import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobsRunning,
  readWorkflow,
  type Workflow,
  type WorkflowStep,
} from '../../scripts/readWorkflow/readWorkflow.ts';
import { withJobSteps } from '../test-support/withJobSteps/withJobSteps.ts';
import { findElectronInstallProblems } from './electronInstall.ts';

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

// The three jobs that run tests, each with its workflow file and its first
// test command; the daily job runs no tests.
const ELECTRON_INSTALL_JOBS: [job: string, file: string, firstTest: string][] =
  [
    ['verify', PUSH_WORKFLOW, 'npm run verify'],
    ['pull-request', PULL_REQUEST_WORKFLOW, VERIFY_FULL_UNDER_DISPLAY],
    ['mutation', DAILY_WORKFLOW, 'npm run test:mutation'],
  ];

function isInstallElectronStep(step: WorkflowStep): boolean {
  return step.run === INSTALL_ELECTRON;
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

describe('electron install', () => {
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
});
