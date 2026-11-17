import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readWorkflow,
  type Workflow,
} from '../../scripts/readWorkflow/readWorkflow.ts';
import { withJobSteps } from '../test-support/withJobSteps/withJobSteps.ts';
import { findPullRequestMutationProblems } from './pullRequestMutation.ts';

const ROOT = join(import.meta.dirname, '..', '..');
const PULL_REQUEST_WORKFLOW = 'pull-request.yml';

function withoutPullRequestMutation(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'pull-request', (steps) =>
    steps.filter((step) => step.run !== 'npm run test:mutation'),
  );
}

function withPullRequestMutationBeforeCheck(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'pull-request', (steps) => {
    const mutationSteps = steps.filter(
      (step) => step.run === 'npm run test:mutation',
    );
    const others = steps.filter((step) => step.run !== 'npm run test:mutation');
    const check = others.findIndex((step) => step.run === 'npm run check:pr');
    return [
      ...others.slice(0, check),
      ...mutationSteps,
      ...others.slice(check),
    ];
  });
}

const pullRequestWorkflow = readWorkflow(ROOT, PULL_REQUEST_WORKFLOW);

describe('pull-request mutation', () => {
  it('finds nothing missing from the mutation run of the pull-request job', () => {
    expect(findPullRequestMutationProblems(pullRequestWorkflow)).toEqual([]);
  });

  it.each([
    [
      'its mutation step is removed',
      withoutPullRequestMutation,
      'the pull-request job does not run npm run test:mutation',
    ],
    [
      'its mutation step is moved before npm run check:pr',
      withPullRequestMutationBeforeCheck,
      'the pull-request job runs npm run test:mutation before npm run check:pr',
    ],
  ])('fails the pull-request job when %s', (_change, change, problem) => {
    const before = findPullRequestMutationProblems(pullRequestWorkflow);
    const added = findPullRequestMutationProblems(
      change(pullRequestWorkflow),
    ).filter((found) => !before.includes(found));

    expect(added).toEqual([problem]);
  });
});
