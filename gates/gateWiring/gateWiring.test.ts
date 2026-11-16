import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

type WorkflowStep = {
  uses?: string;
  with?: Record<string, unknown>;
  run?: string;
  env?: Record<string, unknown>;
  if?: unknown;
};

type WorkflowJob = {
  if?: unknown;
  needs?: unknown;
  env?: Record<string, unknown>;
  steps?: WorkflowStep[];
};

type Workflow = {
  name?: unknown;
  on?: unknown;
  jobs?: Record<string, WorkflowJob | undefined>;
};

const WORKFLOWS_FOLDER = '.github/workflows';
const PUSH_WORKFLOW = 'ci.yml';
const PULL_REQUEST_WORKFLOW = 'pull-request.yml';
const DAILY_WORKFLOW = 'daily.yml';
const DAILY_SCHEDULE = '0 5 * * *';
const DAILY_COMMANDS = [
  'npm ci',
  'npm run check:audit',
  'npm run check:quarantine',
];
// The gates of Verify the daily job runs too.
const DAILY_GATES = ['check:audit', 'check:quarantine'];
const DAILY_JOBS = ['daily', 'mutation'];
// Electron 45 downloads its binary on the first require('electron'), so every
// job that runs tests installs it in its own step right after npm ci.
const INSTALL_ELECTRON = 'node_modules/.bin/install-electron';
const MUTATION_COMMANDS = ['npm ci', INSTALL_ELECTRON, 'npm run test:mutation'];
const MUTATION_REPORT_NAME = 'mutation-report';
const MUTATION_REPORT_PATH = 'reports/mutation/mutation.html';
const UPLOAD_ACTION = 'actions/upload-artifact';
// The pull-request job allows the Linux sandbox with this step, then runs
// Verify full under a virtual display; nothing passes --no-sandbox.
const SANDBOX_STEP =
  'sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0';
const VIRTUAL_DISPLAY = 'xvfb-run --auto-servernum';
const VERIFY_FULL_UNDER_DISPLAY = `${VIRTUAL_DISPLAY} npm run verify:full`;
const NO_SANDBOX = '--no-sandbox';
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

// The gates of Verify, in their fixed order. Every ticket that adds a gate
// inserts it here at its place.
const VERIFY_GATES = [
  'format:check',
  'lint',
  'typecheck',
  'lint:deps',
  'test',
  'check:commits',
  'check:tickets',
  'check:data-files',
  'check:docs-drift',
  'check:licenses',
  'check:audit',
  'check:quarantine',
];

// A workflow file that does not exist reads as an empty workflow, so every
// check on it fails at its assertion.
function readWorkflow(file: string): Workflow {
  const url = new URL(`../../${WORKFLOWS_FOLDER}/${file}`, import.meta.url);
  if (!existsSync(url)) {
    return {};
  }
  return (parse(readFileSync(url, 'utf8')) ?? {}) as Workflow;
}

function workflowFiles(): string[] {
  return readdirSync(new URL(`../../${WORKFLOWS_FOLDER}/`, import.meta.url))
    .filter((file) => /\.ya?ml$/.test(file))
    .sort();
}

// The events a workflow runs on, as written under its `on:` key.
function triggers(workflow: Workflow): Record<string, unknown> {
  const { on } = workflow;
  if (typeof on === 'string') {
    return { [on]: null };
  }
  if (Array.isArray(on)) {
    return Object.fromEntries(
      on.map((event: unknown) => [String(event), null]),
    );
  }
  return typeof on === 'object' && on !== null
    ? (on as Record<string, unknown>)
    : {};
}

function jobSteps(workflow: Workflow, job: string): WorkflowStep[] {
  return workflow.jobs?.[job]?.steps ?? [];
}

function stepIndex(steps: WorkflowStep[], action: string): number {
  return steps.findIndex((step) => (step.uses ?? '').startsWith(`${action}@`));
}

function jobCommands(workflow: Workflow, job: string): string[] {
  return jobSteps(workflow, job).flatMap((step) =>
    (step.run ?? '')
      .split('\n')
      .map((command) => command.trim())
      .filter((command) => command !== ''),
  );
}

// What the Daily run's workflow lacks or holds beyond its wiring, one line
// each, so a check can show which part a workflow is missing.
function findDailyWiringProblems(workflow: Workflow): string[] {
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

function usesAction(step: WorkflowStep, action: string): boolean {
  return (step.uses ?? '').startsWith(`${action}@`);
}

// What the Daily run's mutation job lacks or holds beyond its wiring, one
// line each: checkout at the default depth, setup-node from .nvmrc with the
// npm cache, npm ci, the Mutation run, then the upload of the Mutation report
// on every outcome; beside the daily job, without gitleaks.
function findMutationWiringProblems(workflow: Workflow): string[] {
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

// What the pull-request job lacks in its Mutation run, one line: the run
// after npm run check:pr.
function findPullRequestMutationProblems(workflow: Workflow): string[] {
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

function runsVerifyFull(command: string): boolean {
  return command.includes('npm run verify:full');
}

// What the pull-request job lacks in its Linux sandbox and display wiring,
// one line each: the sysctl step, its place before verify:full, the
// xvfb-run wrapping, and a --no-sandbox anywhere in the job.
function findPullRequestSandboxProblems(workflow: Workflow): string[] {
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

// The workflow files and jobs whose commands hold `text`, as `file: job`.
function jobsRunning(text: string): string[] {
  return workflowFiles().flatMap((file) => {
    const workflow = readWorkflow(file);
    return Object.keys(workflow.jobs ?? {})
      .filter((job) =>
        jobCommands(workflow, job).some((command) => command.includes(text)),
      )
      .map((job) => `${file}: ${job}`);
  });
}

// The workflow with the named job's steps changed by `change`.
function withJobSteps(
  workflow: Workflow,
  job: string,
  change: (steps: WorkflowStep[]) => WorkflowStep[],
): Workflow {
  return {
    ...workflow,
    jobs: {
      ...workflow.jobs,
      [job]: {
        ...workflow.jobs?.[job],
        steps: change(jobSteps(workflow, job)),
      },
    },
  };
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

// The workflow without the named trigger.
function withoutTrigger(workflow: Workflow, event: string): Workflow {
  return {
    ...workflow,
    on: Object.fromEntries(
      Object.entries(triggers(workflow)).filter(([name]) => name !== event),
    ),
  };
}

function withoutFullHistory(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'daily', (steps) =>
    steps.map((step) =>
      (step.uses ?? '').startsWith('actions/checkout@')
        ? {
            ...step,
            with: Object.fromEntries(
              Object.entries(step.with ?? {}).filter(
                ([key]) => key !== 'fetch-depth',
              ),
            ),
          }
        : step,
    ),
  );
}

// The daily job without the command, wherever a step runs it; a step left
// with no command is dropped.
function withoutDailyCommand(
  command: string,
): (workflow: Workflow) => Workflow {
  return (workflow) =>
    withJobSteps(workflow, 'daily', (steps) =>
      steps.flatMap((step) => {
        if (step.run === undefined) {
          return [step];
        }
        const run = step.run
          .split('\n')
          .filter((line) => line.trim() !== command)
          .join('\n');
        return run.trim() === '' ? [] : [{ ...step, run }];
      }),
    );
}

const withoutAuditStep = withoutDailyCommand('npm run check:audit');
const withoutQuarantineStep = withoutDailyCommand('npm run check:quarantine');

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

function isSandboxStep(step: WorkflowStep): boolean {
  return (step.run ?? '').includes(SANDBOX_STEP);
}

function withoutSandboxStep(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'pull-request', (steps) =>
    steps.filter((step) => !isSandboxStep(step)),
  );
}

function withSandboxStepAfterVerifyFull(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'pull-request', (steps) => {
    const others = steps.filter((step) => !isSandboxStep(step));
    const verifyFull = others.findIndex((step) =>
      runsVerifyFull(step.run ?? ''),
    );
    return [
      ...others.slice(0, verifyFull + 1),
      ...steps.filter(isSandboxStep),
      ...others.slice(verifyFull + 1),
    ];
  });
}

function withoutVirtualDisplay(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'pull-request', (steps) =>
    steps.map((step) =>
      step.run === undefined
        ? step
        : { ...step, run: step.run.replace(`${VIRTUAL_DISPLAY} `, '') },
    ),
  );
}

function withNoSandboxOnVerifyFull(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'pull-request', (steps) =>
    steps.map((step) =>
      runsVerifyFull(step.run ?? '')
        ? {
            ...step,
            env: { ...step.env, ELECTRON_EXTRA_LAUNCH_ARGS: NO_SANDBOX },
          }
        : step,
    ),
  );
}

function withNoSandboxOnJob(workflow: Workflow): Workflow {
  const job = workflow.jobs?.['pull-request'] ?? {};
  return {
    ...workflow,
    jobs: {
      ...workflow.jobs,
      'pull-request': {
        ...job,
        env: { ...job.env, ELECTRON_EXTRA_LAUNCH_ARGS: NO_SANDBOX },
      },
    },
  };
}

const pullRequestWorkflow = readWorkflow(PULL_REQUEST_WORKFLOW);
const dailyWorkflow = readWorkflow(DAILY_WORKFLOW);

describe('gate wiring', () => {
  it.each(ELECTRON_INSTALL_JOBS)(
    'installs the Electron binary in its own step directly after npm ci and before the first test command in the %s job',
    (job, file, firstTest) => {
      expect(
        findElectronInstallProblems(readWorkflow(file), job, firstTest),
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
      const workflow = readWorkflow(file);
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
    expect(jobsRunning(INSTALL_ELECTRON)).toEqual([
      `${PUSH_WORKFLOW}: verify`,
      `${DAILY_WORKFLOW}: mutation`,
      `${PULL_REQUEST_WORKFLOW}: pull-request`,
    ]);
  });

  it('finds nothing missing from the sandbox and display wiring of the pull-request job', () => {
    expect(findPullRequestSandboxProblems(pullRequestWorkflow)).toEqual([]);
  });

  it.each([
    [
      'its sysctl step is removed',
      withoutSandboxStep,
      `the pull-request job does not run ${SANDBOX_STEP}`,
    ],
    [
      'its sysctl step is moved after npm run verify:full',
      withSandboxStepAfterVerifyFull,
      'the pull-request job runs the sysctl step after npm run verify:full',
    ],
    [
      'its xvfb-run wrapping is removed',
      withoutVirtualDisplay,
      `the pull-request job does not run npm run verify:full under ${VIRTUAL_DISPLAY}`,
    ],
    [
      'its verify:full step passes --no-sandbox',
      withNoSandboxOnVerifyFull,
      `the pull-request job passes ${NO_SANDBOX}`,
    ],
    [
      'the job passes --no-sandbox',
      withNoSandboxOnJob,
      `the pull-request job passes ${NO_SANDBOX}`,
    ],
  ])(
    'fails the sandbox wiring of the pull-request job when %s',
    (_change, change, problem) => {
      const before = findPullRequestSandboxProblems(pullRequestWorkflow);
      const after = findPullRequestSandboxProblems(change(pullRequestWorkflow));

      expect(before).toEqual([]);
      expect(after).toEqual([problem]);
    },
  );

  it('runs the sysctl step and xvfb-run only in the pull-request job, and --no-sandbox in no job', () => {
    expect(jobsRunning(SANDBOX_STEP)).toEqual([
      `${PULL_REQUEST_WORKFLOW}: pull-request`,
    ]);
    expect(jobsRunning(VIRTUAL_DISPLAY)).toEqual([
      `${PULL_REQUEST_WORKFLOW}: pull-request`,
    ]);
    expect(jobsRunning(NO_SANDBOX)).toEqual([]);
  });

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

  it('runs npm run verify:full under xvfb-run --auto-servernum in the pull-request job', () => {
    expect(jobCommands(pullRequestWorkflow, 'pull-request')).toContain(
      VERIFY_FULL_UNDER_DISPLAY,
    );
  });

  it('triggers the daily workflow, Daily, only by the schedule 0 5 * * * and workflow_dispatch', () => {
    const on = triggers(dailyWorkflow);

    expect(dailyWorkflow.name).toBe('Daily');
    expect(Object.keys(on).sort()).toEqual(['schedule', 'workflow_dispatch']);
    expect(on['schedule']).toEqual([{ cron: DAILY_SCHEDULE }]);
  });

  it('gives the daily workflow exactly the jobs daily and mutation', () => {
    expect(Object.keys(dailyWorkflow.jobs ?? {})).toEqual(DAILY_JOBS);
  });

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

  it('runs npm ci, then npm run check:audit and npm run check:quarantine and no other gate of verify in the daily job', () => {
    const commands = jobCommands(dailyWorkflow, 'daily');

    expect(commands).toEqual(DAILY_COMMANDS);
    for (const gate of VERIFY_GATES.filter(
      (name) => !DAILY_GATES.includes(name),
    )) {
      expect(commands, gate).not.toContain(`npm run ${gate}`);
    }
    expect(commands).not.toContain('npm run verify');
    expect(commands).not.toContain('npm run verify:full');
  });

  it('finds nothing missing from the daily wiring', () => {
    expect(findDailyWiringProblems(dailyWorkflow)).toEqual([]);
  });

  it.each([
    [
      'schedule',
      (workflow: Workflow) => withoutTrigger(workflow, 'schedule'),
      `no schedule trigger ${DAILY_SCHEDULE}`,
    ],
    [
      'manual trigger',
      (workflow: Workflow) => withoutTrigger(workflow, 'workflow_dispatch'),
      'no workflow_dispatch trigger',
    ],
    [
      'full-history checkout',
      withoutFullHistory,
      'the daily job does not check out full history',
    ],
    [
      'audit step',
      withoutAuditStep,
      'the daily job does not run npm run check:audit',
    ],
    [
      'quarantine step',
      withoutQuarantineStep,
      'the daily job does not run npm run check:quarantine',
    ],
  ])(
    'fails the daily wiring when the %s is removed',
    (_part, remove, problem) => {
      const before = findDailyWiringProblems(dailyWorkflow);
      const added = findDailyWiringProblems(remove(dailyWorkflow)).filter(
        (found) => !before.includes(found),
      );

      expect(added).toEqual([problem]);
    },
  );

  it.each(SECRET_SCAN_JOBS)(
    'runs gitleaks in the %s job right after checkout and before setup-node, with comments off and the workflow GITHUB_TOKEN',
    (job, file) => {
      expect(findSecretScanProblems(readWorkflow(file), job)).toEqual([]);
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
    const workflow = readWorkflow(file);
    const before = findSecretScanProblems(workflow, job);
    const after = findSecretScanProblems(change(workflow, job), job);

    expect(before).toEqual([]);
    expect(after).toEqual([problem]);
  });

  it.each(SECRET_SCAN_JOBS)(
    'runs exactly one gitleaks step in the %s job',
    (job, file) => {
      expect(
        jobSteps(readWorkflow(file), job).filter(isGitleaksStep),
      ).toHaveLength(1);
    },
  );

  it('scans with the default gitleaks rules: a gitleaks step in each job, no gitleaks config file and no .gitleaksignore', () => {
    const configFiles = readdirSync(new URL('../../', import.meta.url)).filter(
      (name) => /gitleaks/i.test(name),
    );
    const configuredSteps = SECRET_SCAN_JOBS.flatMap(([job, file]) =>
      jobSteps(readWorkflow(file), job)
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
      jobSteps(readWorkflow(file), job).some(isGitleaksStep),
    ).map(([job]) => job);

    expect(jobsWithGitleaks).toEqual(SECRET_SCAN_JOBS.map(([job]) => job));
    expect(configFiles).toEqual([]);
    expect(configuredSteps).toEqual([]);
  });
});
