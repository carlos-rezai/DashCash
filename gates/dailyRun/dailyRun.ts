import {
  jobCommands,
  jobSteps,
  stepIndex,
  triggers,
  type Workflow,
} from '../../scripts/readWorkflow/readWorkflow.ts';

const DAILY_SCHEDULE = '0 5 * * *';
const DAILY_COMMANDS = [
  'npm ci',
  'npm run check:audit',
  'npm run check:quarantine',
];
const DAILY_JOBS = ['daily', 'mutation'];

// What the Daily run's workflow lacks or holds beyond its wiring, one line
// each, so a check can show which part a workflow is missing.
export function findDailyWiringProblems(workflow: Workflow): string[] {
  const problems: string[] = [];
  if (workflow.name !== 'Daily') {
    problems.push('the workflow is not named Daily');
  }

  const on = triggers(workflow);
  if (
    JSON.stringify(on['schedule']) !==
    JSON.stringify([{ cron: DAILY_SCHEDULE }])
  ) {
    problems.push(`no schedule trigger ${DAILY_SCHEDULE}`);
  }
  if (!('workflow_dispatch' in on)) {
    problems.push('no workflow_dispatch trigger');
  }
  for (const event of Object.keys(on)) {
    if (event !== 'schedule' && event !== 'workflow_dispatch') {
      problems.push(`also triggered by ${event}`);
    }
  }

  const jobs = Object.keys(workflow.jobs ?? {});
  if (JSON.stringify(jobs) !== JSON.stringify(DAILY_JOBS)) {
    problems.push(
      `the jobs are [${jobs.join(', ')}], not exactly daily and mutation`,
    );
  }

  const steps = jobSteps(workflow, 'daily');
  const checkout = stepIndex(steps, 'actions/checkout');
  const setupNode = stepIndex(steps, 'actions/setup-node');
  if (checkout !== 0) {
    problems.push('the daily job does not start with a checkout');
  }
  if (steps[checkout]?.with?.['fetch-depth'] !== 0) {
    problems.push('the daily job does not check out full history');
  }
  const setupNodeWith = steps[setupNode]?.with ?? {};
  if (
    setupNode <= checkout ||
    setupNodeWith['node-version-file'] !== '.nvmrc' ||
    setupNodeWith['cache'] !== 'npm'
  ) {
    problems.push(
      'the daily job does not set up Node from .nvmrc with the npm cache after the checkout',
    );
  }

  const commands = jobCommands(workflow, 'daily');
  const npmCi = commands.indexOf('npm ci');
  const audit = commands.indexOf('npm run check:audit');
  const quarantine = commands.indexOf('npm run check:quarantine');
  const npmCiStep = steps.findIndex((step) => step.run === 'npm ci');
  if (
    npmCi === -1 ||
    npmCiStep <= setupNode ||
    (audit !== -1 && audit < npmCi)
  ) {
    problems.push(
      'the daily job does not run npm ci after setting up Node and before the audit',
    );
  }
  if (audit === -1) {
    problems.push('the daily job does not run npm run check:audit');
  }
  if (quarantine === -1) {
    problems.push('the daily job does not run npm run check:quarantine');
  } else if (npmCi === -1 || quarantine < npmCi) {
    problems.push(
      'the daily job does not run npm ci before the quarantine check',
    );
  }
  for (const command of commands) {
    if (!DAILY_COMMANDS.includes(command)) {
      problems.push(`the daily job also runs ${command}`);
    }
  }
  return problems;
}
