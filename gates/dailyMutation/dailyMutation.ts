import {
  jobCommands,
  stepIndex,
  type Workflow,
  type WorkflowStep,
} from '../../scripts/readWorkflow/readWorkflow.ts';

const INSTALL_ELECTRON = 'node_modules/.bin/install-electron';
const MUTATION_COMMANDS = ['npm ci', INSTALL_ELECTRON, 'npm run test:mutation'];
const MUTATION_REPORT_NAME = 'mutation-report';
const MUTATION_REPORT_PATH = 'reports/mutation/mutation.html';
const UPLOAD_ACTION = 'actions/upload-artifact';
const GITLEAKS_ACTION = 'gitleaks/gitleaks-action';

export function isGitleaksStep(step: WorkflowStep): boolean {
  return (step.uses ?? '').startsWith(`${GITLEAKS_ACTION}@`);
}

// What the Daily run's mutation job lacks or holds beyond its wiring, one
// line each: checkout at the default depth, setup-node from .nvmrc with the
// npm cache, npm ci, the Mutation run, then the upload of the Mutation report
// on every outcome; beside the daily job, without gitleaks.
export function findMutationWiringProblems(workflow: Workflow): string[] {
  const job = workflow.jobs?.['mutation'];
  if (job === undefined) {
    return ['the daily workflow has no mutation job'];
  }

  const problems: string[] = [];
  if (job.if !== undefined) {
    problems.push('the mutation job has a condition');
  }
  if (job.needs !== undefined) {
    problems.push('the mutation job waits for another job');
  }

  const steps = job.steps ?? [];
  const checkout = stepIndex(steps, 'actions/checkout');
  if (checkout !== 0) {
    problems.push('the mutation job does not start with a checkout');
  } else if (steps[checkout]?.with !== undefined) {
    problems.push('the mutation job does not check out at the default depth');
  }

  const setupNode = stepIndex(steps, 'actions/setup-node');
  if (setupNode === -1) {
    problems.push('the mutation job does not set up Node');
  } else {
    const setupNodeWith = steps[setupNode]?.with ?? {};
    if (setupNodeWith['node-version-file'] !== '.nvmrc') {
      problems.push('the mutation job does not take Node from .nvmrc');
    }
    if (setupNodeWith['cache'] !== 'npm') {
      problems.push('the mutation job does not use the npm cache');
    }
  }

  const npmCi = steps.findIndex((step) => step.run === 'npm ci');
  if (npmCi === -1) {
    problems.push('the mutation job does not run npm ci');
  }
  const mutationRun = steps.findIndex(
    (step) => step.run === 'npm run test:mutation',
  );
  if (mutationRun === -1) {
    problems.push('the mutation job does not run npm run test:mutation');
  }

  const upload = stepIndex(steps, UPLOAD_ACTION);
  if (upload === -1) {
    problems.push('the mutation job does not upload the mutation report');
  } else {
    const uploadStep = steps[upload] ?? {};
    const uploadWith = uploadStep.with ?? {};
    if (uploadWith['name'] !== MUTATION_REPORT_NAME) {
      problems.push(
        `the mutation job does not name its upload ${MUTATION_REPORT_NAME}`,
      );
    }
    if (uploadWith['path'] !== MUTATION_REPORT_PATH) {
      problems.push(`the mutation job does not upload ${MUTATION_REPORT_PATH}`);
    }
    for (const key of Object.keys(uploadWith)) {
      if (key !== 'name' && key !== 'path') {
        problems.push(`the mutation job also sets ${key} on its upload`);
      }
    }
    if (uploadStep.if !== 'always()') {
      problems.push('the mutation job does not upload on every outcome');
    }
  }

  const order = [checkout, setupNode, npmCi, mutationRun, upload].filter(
    (index) => index !== -1,
  );
  if (order.some((index, at) => at > 0 && index <= (order[at - 1] ?? -1))) {
    problems.push(
      'the mutation job does not run checkout, setup-node, npm ci, the mutation run and the upload in that order',
    );
  }

  if (steps.some(isGitleaksStep)) {
    problems.push('the mutation job runs gitleaks');
  }
  for (const command of jobCommands(workflow, 'mutation')) {
    if (!MUTATION_COMMANDS.includes(command)) {
      problems.push(`the mutation job also runs ${command}`);
    }
  }
  return problems;
}
