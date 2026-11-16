import {
  jobSteps,
  type Workflow,
  type WorkflowStep,
} from '../../scripts/readWorkflow/readWorkflow.ts';

// Electron 45 downloads its binary on the first require('electron'), so every
// job that runs tests installs it in its own step right after npm ci.
const INSTALL_ELECTRON = 'node_modules/.bin/install-electron';

function isInstallElectronStep(step: WorkflowStep): boolean {
  return step.run === INSTALL_ELECTRON;
}

// What a job lacks in its Electron install, one line each: the install in its
// own step, directly after the npm ci step and before the job's first test
// command.
export function findElectronInstallProblems(
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
