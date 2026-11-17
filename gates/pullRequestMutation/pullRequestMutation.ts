import {
  jobCommands,
  type Workflow,
} from '../../scripts/readWorkflow/readWorkflow.ts';

// What the pull-request job lacks in its Mutation run, one line: the run
// after npm run check:pr.
export function findPullRequestMutationProblems(workflow: Workflow): string[] {
  const commands = jobCommands(workflow, 'pull-request');
  const mutationRun = commands.indexOf('npm run test:mutation');
  if (mutationRun === -1) {
    return ['the pull-request job does not run npm run test:mutation'];
  }
  if (mutationRun < commands.indexOf('npm run check:pr')) {
    return [
      'the pull-request job runs npm run test:mutation before npm run check:pr',
    ];
  }
  return [];
}
