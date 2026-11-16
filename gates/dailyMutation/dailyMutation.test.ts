import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobCommands,
  jobSteps,
  readWorkflow,
  type Workflow,
  type WorkflowJob,
  type WorkflowStep,
} from '../../scripts/readWorkflow/readWorkflow.ts';
import { withJobSteps } from '../test-support/withJobSteps/withJobSteps.ts';
import { findMutationWiringProblems, isGitleaksStep } from './dailyMutation.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const DAILY_WORKFLOW = 'daily.yml';
// Electron 45 downloads its binary on the first require('electron'), so every
// job that runs tests installs it in its own step right after npm ci.
const INSTALL_ELECTRON = 'node_modules/.bin/install-electron';
const MUTATION_COMMANDS = ['npm ci', INSTALL_ELECTRON, 'npm run test:mutation'];
const MUTATION_REPORT_NAME = 'mutation-report';
const MUTATION_REPORT_PATH = 'reports/mutation/mutation.html';
const UPLOAD_ACTION = 'actions/upload-artifact';

function usesAction(step: WorkflowStep, action: string): boolean {
  return (step.uses ?? '').startsWith(`${action}@`);
}

function withMutationJob(
  workflow: Workflow,
  change: (job: WorkflowJob) => WorkflowJob,
): Workflow {
  return {
    ...workflow,
    jobs: {
      ...workflow.jobs,
      mutation: change(workflow.jobs?.['mutation'] ?? {}),
    },
  };
}

function withoutMutationStep(
  isRemoved: (step: WorkflowStep) => boolean,
): (workflow: Workflow) => Workflow {
  return (workflow) =>
    withJobSteps(workflow, 'mutation', (steps) =>
      steps.filter((step) => !isRemoved(step)),
    );
}

function withoutMutationStepSetting(
  action: string,
  key: string,
): (workflow: Workflow) => Workflow {
  return (workflow) =>
    withJobSteps(workflow, 'mutation', (steps) =>
      steps.map((step) =>
        usesAction(step, action)
          ? {
              ...step,
              with: Object.fromEntries(
                Object.entries(step.with ?? {}).filter(
                  ([name]) => name !== key,
                ),
              ),
            }
          : step,
      ),
    );
}

function withoutUploadCondition(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'mutation', (steps) =>
    steps.map((step) =>
      usesAction(step, UPLOAD_ACTION)
        ? (Object.fromEntries(
            Object.entries(step).filter(([key]) => key !== 'if'),
          ) as WorkflowStep)
        : step,
    ),
  );
}

// The mutation job with `added` inserted right after the first step that
// `isAnchor` matches.
function withMutationStepAfter(
  isAnchor: (step: WorkflowStep) => boolean,
  added: (workflow: Workflow) => WorkflowStep,
): (workflow: Workflow) => Workflow {
  return (workflow) =>
    withJobSteps(workflow, 'mutation', (steps) => {
      const anchor = steps.findIndex(isAnchor);
      return [
        ...steps.slice(0, anchor + 1),
        added(workflow),
        ...steps.slice(anchor + 1),
      ];
    });
}

// The daily job's own gitleaks step, copied as it is.
function dailyGitleaksStep(workflow: Workflow): WorkflowStep {
  return jobSteps(workflow, 'daily').find(isGitleaksStep) ?? {};
}

const dailyWorkflow = readWorkflow(ROOT, DAILY_WORKFLOW);

describe('daily mutation', () => {
  it('runs the mutation job beside the daily job: no if: and no needs:', () => {
    const job = dailyWorkflow.jobs?.['mutation'];

    expect(job).toBeDefined();
    expect(job?.if).toBeUndefined();
    expect(job?.needs).toBeUndefined();
  });

  it('runs checkout, setup-node, npm ci, node_modules/.bin/install-electron, npm run test:mutation, then the upload of the mutation report in the mutation job', () => {
    const steps = jobSteps(dailyWorkflow, 'mutation');
    const kinds = steps.map(
      (step) => step.run ?? (step.uses ?? '').split('@')[0],
    );

    expect(kinds).toEqual([
      'actions/checkout',
      'actions/setup-node',
      'npm ci',
      INSTALL_ELECTRON,
      'npm run test:mutation',
      UPLOAD_ACTION,
    ]);
    expect(steps[0]?.with).toBeUndefined();
    expect(steps[1]?.with).toEqual({
      'node-version-file': '.nvmrc',
      cache: 'npm',
    });
    expect(steps[5]?.with).toEqual({
      name: MUTATION_REPORT_NAME,
      path: MUTATION_REPORT_PATH,
    });
    expect(steps[5]?.if).toBe('always()');
  });

  it('runs exactly npm ci, node_modules/.bin/install-electron, then npm run test:mutation in the mutation job', () => {
    expect(jobCommands(dailyWorkflow, 'mutation')).toEqual(MUTATION_COMMANDS);
  });

  it('finds nothing missing from the mutation wiring', () => {
    expect(findMutationWiringProblems(dailyWorkflow)).toEqual([]);
  });

  it.each([
    [
      'its checkout is removed',
      withoutMutationStep((step) => usesAction(step, 'actions/checkout')),
      'the mutation job does not start with a checkout',
    ],
    [
      'its setup-node is removed',
      withoutMutationStep((step) => usesAction(step, 'actions/setup-node')),
      'the mutation job does not set up Node',
    ],
    [
      'its .nvmrc is removed',
      withoutMutationStepSetting('actions/setup-node', 'node-version-file'),
      'the mutation job does not take Node from .nvmrc',
    ],
    [
      'its npm cache is removed',
      withoutMutationStepSetting('actions/setup-node', 'cache'),
      'the mutation job does not use the npm cache',
    ],
    [
      'its npm ci is removed',
      withoutMutationStep((step) => step.run === 'npm ci'),
      'the mutation job does not run npm ci',
    ],
    [
      'its mutation run is removed',
      withoutMutationStep((step) => step.run === 'npm run test:mutation'),
      'the mutation job does not run npm run test:mutation',
    ],
    [
      'its upload is removed',
      withoutMutationStep((step) => usesAction(step, UPLOAD_ACTION)),
      'the mutation job does not upload the mutation report',
    ],
    [
      "its upload's name is removed",
      withoutMutationStepSetting(UPLOAD_ACTION, 'name'),
      `the mutation job does not name its upload ${MUTATION_REPORT_NAME}`,
    ],
    [
      "its upload's path is removed",
      withoutMutationStepSetting(UPLOAD_ACTION, 'path'),
      `the mutation job does not upload ${MUTATION_REPORT_PATH}`,
    ],
    [
      "its upload's if: always() is removed",
      withoutUploadCondition,
      'the mutation job does not upload on every outcome',
    ],
    [
      'the job gains another npm command',
      withMutationStepAfter(
        (step) => step.run === 'npm ci',
        () => ({ run: 'npm run lint' }),
      ),
      'the mutation job also runs npm run lint',
    ],
    [
      'the job gains a gitleaks step',
      withMutationStepAfter(
        (step) => usesAction(step, 'actions/checkout'),
        dailyGitleaksStep,
      ),
      'the mutation job runs gitleaks',
    ],
    [
      'the job gains an if:',
      (workflow: Workflow) =>
        withMutationJob(workflow, (job) => ({ ...job, if: 'always()' })),
      'the mutation job has a condition',
    ],
    [
      'the job gains a needs:',
      (workflow: Workflow) =>
        withMutationJob(workflow, (job) => ({ ...job, needs: 'daily' })),
      'the mutation job waits for another job',
    ],
  ])('fails the mutation wiring when %s', (_change, change, problem) => {
    const before = findMutationWiringProblems(dailyWorkflow);
    const added = findMutationWiringProblems(change(dailyWorkflow)).filter(
      (found) => !before.includes(found),
    );

    expect(added).toEqual([problem]);
  });
});
