import {
  jobCommands,
  type Workflow,
} from '../../scripts/readWorkflow/readWorkflow.ts';

// The pull-request job allows the Linux sandbox with this step, then runs
// Verify full under a virtual display; nothing passes --no-sandbox.
const SANDBOX_STEP =
  'sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0';
const VIRTUAL_DISPLAY = 'xvfb-run --auto-servernum';
const VERIFY_FULL_UNDER_DISPLAY = `${VIRTUAL_DISPLAY} npm run verify:full`;
const NO_SANDBOX = '--no-sandbox';

export function runsVerifyFull(command: string): boolean {
  return command.includes('npm run verify:full');
}

// What the pull-request job lacks in its Linux sandbox and display wiring,
// one line each: the sysctl step, its place before verify:full, the
// xvfb-run wrapping, and a --no-sandbox anywhere in the job.
export function findPullRequestSandboxProblems(workflow: Workflow): string[] {
  const problems: string[] = [];
  const commands = jobCommands(workflow, 'pull-request');
  const sandboxStep = commands.indexOf(SANDBOX_STEP);
  const verifyFull = commands.findIndex(runsVerifyFull);
  if (sandboxStep === -1) {
    problems.push(`the pull-request job does not run ${SANDBOX_STEP}`);
  } else if (verifyFull !== -1 && sandboxStep > verifyFull) {
    problems.push(
      'the pull-request job runs the sysctl step after npm run verify:full',
    );
  }
  if (!commands.includes(VERIFY_FULL_UNDER_DISPLAY)) {
    problems.push(
      `the pull-request job does not run npm run verify:full under ${VIRTUAL_DISPLAY}`,
    );
  }
  if (
    JSON.stringify(workflow.jobs?.['pull-request'] ?? {}).includes(NO_SANDBOX)
  ) {
    problems.push(`the pull-request job passes ${NO_SANDBOX}`);
  }
  return problems;
}
