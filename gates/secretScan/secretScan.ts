import {
  jobSteps,
  stepIndex,
  type Workflow,
} from '../../scripts/readWorkflow/readWorkflow.ts';

const GITLEAKS_ACTION = 'gitleaks/gitleaks-action';
const WORKFLOW_TOKEN = '${{ secrets.GITHUB_TOKEN }}';

// What a job lacks in its Secret scan wiring, one line each: the gitleaks
// step right after the checkout and before setup-node, with comments off and
// the workflow's GITHUB_TOKEN.
export function findSecretScanProblems(
  workflow: Workflow,
  job: string,
): string[] {
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
