import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

type PackageJson = {
  scripts: Record<string, string | undefined>;
  engines: { node: string };
};

type WorkflowStep = {
  uses?: string;
  with?: Record<string, unknown>;
  run?: string;
  env?: Record<string, unknown>;
};

type WorkflowJob = {
  if?: unknown;
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
const DAILY_COMMANDS = ['npm ci', 'npm run check:audit'];
const GITLEAKS_ACTION = 'gitleaks/gitleaks-action';
const WORKFLOW_TOKEN = '${{ secrets.GITHUB_TOKEN }}';

// The three jobs that run the Secret scan, each with its workflow file.
const SECRET_SCAN_JOBS: [job: string, file: string][] = [
  ['verify', PUSH_WORKFLOW],
  ['pull-request', PULL_REQUEST_WORKFLOW],
  ['daily', DAILY_WORKFLOW],
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
];

const GATE_COMMANDS: Record<string, string> = {
  'format:check': 'prettier --check .',
  lint: 'eslint . --max-warnings 0',
  typecheck: 'tsc',
  'lint:deps':
    'depcruise --config .dependency-cruiser.js apps packages scripts e2e',
  test: 'vitest run',
  'check:commits': 'node scripts/checkCommits/checkCommits.ts',
  'check:tickets': 'node scripts/checkTickets/checkTickets.ts',
  'check:data-files': 'node scripts/checkDataFiles/checkDataFiles.ts',
  'check:docs-drift': 'node scripts/checkDocsDrift/checkDocsDrift.ts',
  'check:licenses': 'node scripts/checkLicenses/checkLicenses.ts',
  'check:audit': 'node scripts/checkAudit/checkAudit.ts',
};

function readRootFile(path: string): string {
  return readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
}

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

function chainedCommands(script: string | undefined): string[] {
  return (script ?? '').split('&&').map((command) => command.trim());
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
  if (JSON.stringify(jobs) !== JSON.stringify(['daily'])) {
    problems.push(`the jobs are [${jobs.join(', ')}], not the one job daily`);
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

function isGitleaksStep(step: WorkflowStep): boolean {
  return (step.uses ?? '').startsWith(`${GITLEAKS_ACTION}@`);
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

function withoutAuditStep(workflow: Workflow): Workflow {
  return withJobSteps(workflow, 'daily', (steps) =>
    steps.filter((step) => !(step.run ?? '').includes('npm run check:audit')),
  );
}

const packageJson = JSON.parse(readRootFile('package.json')) as PackageJson;
const pushWorkflow = readWorkflow(PUSH_WORKFLOW);
const pullRequestWorkflow = readWorkflow(PULL_REQUEST_WORKFLOW);
const dailyWorkflow = readWorkflow(DAILY_WORKFLOW);
const { scripts } = packageJson;

describe('gate wiring', () => {
  it('runs the gates of verify in order, failing fast', () => {
    expect(chainedCommands(scripts.verify)).toEqual(
      VERIFY_GATES.map((gate) => `npm run ${gate}`),
    );
  });

  it('runs each gate once with its tool', () => {
    for (const [gate, command] of Object.entries(GATE_COMMANDS)) {
      expect(scripts[gate], gate).toBe(command);
    }
  });

  it('runs verify from verify:full', () => {
    expect(chainedCommands(scripts['verify:full'])).toContain('npm run verify');
  });

  it('keeps every npm script free of command substitution, pipes and globs', () => {
    for (const [name, script] of Object.entries(scripts)) {
      expect(script, name).not.toMatch(/\$\(|\||[*?]/);
    }
  });

  it('triggers the push workflow, CI, only by push to feat/** and refactor/**', () => {
    expect(pushWorkflow.name).toBe('CI');
    expect(triggers(pushWorkflow)).toEqual({
      push: { branches: ['feat/**', 'refactor/**'] },
    });
  });

  it('gives the push workflow the one job verify', () => {
    expect(Object.keys(pushWorkflow.jobs ?? {})).toEqual(['verify']);
  });

  it('runs npm run verify in the verify job', () => {
    expect(jobCommands(pushWorkflow, 'verify')).toContain('npm run verify');
  });

  it('triggers the pull-request workflow, Pull request, only by pull_request into main', () => {
    expect(pullRequestWorkflow.name).toBe('Pull request');
    expect(triggers(pullRequestWorkflow)).toEqual({
      pull_request: { branches: ['main'] },
    });
  });

  it('gives the pull-request workflow the one job pull-request', () => {
    expect(Object.keys(pullRequestWorkflow.jobs ?? {})).toEqual([
      'pull-request',
    ]);
  });

  it('checks out full history, then sets up Node from .nvmrc with the npm cache, before npm ci in the pull-request job', () => {
    const steps = jobSteps(pullRequestWorkflow, 'pull-request');
    const checkout = stepIndex(steps, 'actions/checkout');
    const setupNode = stepIndex(steps, 'actions/setup-node');
    const npmCi = steps.findIndex((step) => step.run === 'npm ci');

    expect(checkout).toBe(0);
    expect(steps[checkout]?.with?.['fetch-depth']).toBe(0);
    expect(setupNode).toBeGreaterThan(checkout);
    expect(steps[setupNode]?.with?.['node-version-file']).toBe('.nvmrc');
    expect(steps[setupNode]?.with?.['cache']).toBe('npm');
    expect(npmCi).toBeGreaterThan(setupNode);
  });

  it('runs npm ci, npm run verify:full, then npm run check:pr in the pull-request job', () => {
    expect(jobCommands(pullRequestWorkflow, 'pull-request')).toEqual([
      'npm ci',
      'npm run verify:full',
      'npm run check:pr',
    ]);
  });

  it('runs npm run verify:full in the pull-request job', () => {
    expect(jobCommands(pullRequestWorkflow, 'pull-request')).toContain(
      'npm run verify:full',
    );
  });

  it('runs check:pr from neither verify, verify:full nor the verify job', () => {
    expect(scripts['check:pr']).toBe(
      'node scripts/checkPullRequest/checkPullRequest.ts',
    );
    expect(scripts.verify).not.toMatch(/check:pr|checkPullRequest/);
    expect(scripts['verify:full']).not.toMatch(/check:pr|checkPullRequest/);
    expect(jobCommands(pushWorkflow, 'verify')).not.toContain(
      'npm run check:pr',
    );
  });

  it('runs npm run check:pr after npm run verify:full in the pull-request job', () => {
    const commands = jobCommands(pullRequestWorkflow, 'pull-request');
    const verifyFull = commands.indexOf('npm run verify:full');

    expect(verifyFull).toBeGreaterThanOrEqual(0);
    expect(commands.indexOf('npm run check:pr')).toBeGreaterThan(verifyFull);
  });

  it('hands the pull-request title to check:pr only through PR_TITLE', () => {
    const steps = jobSteps(pullRequestWorkflow, 'pull-request');
    const checkStep = steps.find((step) =>
      (step.run ?? '').includes('npm run check:pr'),
    );

    expect(checkStep?.env?.['PR_TITLE']).toBe(
      '${{ github.event.pull_request.title }}',
    );
    for (const step of steps) {
      expect(step.run ?? '').not.toContain('${{');
    }
  });

  it('triggers the daily workflow, Daily, only by the schedule 0 5 * * * and workflow_dispatch', () => {
    const on = triggers(dailyWorkflow);

    expect(dailyWorkflow.name).toBe('Daily');
    expect(Object.keys(on).sort()).toEqual(['schedule', 'workflow_dispatch']);
    expect(on['schedule']).toEqual([{ cron: DAILY_SCHEDULE }]);
  });

  it('gives the daily workflow the one job daily', () => {
    expect(Object.keys(dailyWorkflow.jobs ?? {})).toEqual(['daily']);
  });

  it('checks out full history, then sets up Node from .nvmrc with the npm cache, before npm ci in the daily job', () => {
    const steps = jobSteps(dailyWorkflow, 'daily');
    const checkout = stepIndex(steps, 'actions/checkout');
    const setupNode = stepIndex(steps, 'actions/setup-node');
    const npmCi = steps.findIndex((step) => step.run === 'npm ci');

    expect(checkout).toBe(0);
    expect(steps[checkout]?.with?.['fetch-depth']).toBe(0);
    expect(setupNode).toBeGreaterThan(checkout);
    expect(steps[setupNode]?.with?.['node-version-file']).toBe('.nvmrc');
    expect(steps[setupNode]?.with?.['cache']).toBe('npm');
    expect(npmCi).toBeGreaterThan(setupNode);
  });

  it('runs npm ci, then npm run check:audit and no other gate of verify in the daily job', () => {
    const commands = jobCommands(dailyWorkflow, 'daily');

    expect(commands).toEqual(DAILY_COMMANDS);
    for (const gate of VERIFY_GATES.filter((name) => name !== 'check:audit')) {
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

  it('keeps every job of every workflow free of if:', () => {
    const conditionalJobs = workflowFiles().flatMap((file) =>
      Object.entries(readWorkflow(file).jobs ?? {})
        .filter(([, job]) => job?.if !== undefined)
        .map(([id]) => `${file}: ${id}`),
    );

    expect(conditionalJobs).toEqual([]);
  });

  it('runs only the CI workflow on push, with its one job verify', () => {
    const pushRuns = workflowFiles()
      .map((file) => readWorkflow(file))
      .filter((workflow) => 'push' in triggers(workflow))
      .map((workflow) => ({
        name: workflow.name,
        jobs: Object.keys(workflow.jobs ?? {}),
      }));

    expect(pushRuns).toEqual([{ name: 'CI', jobs: ['verify'] }]);
  });

  it('pins the same Node version in .nvmrc and engines.node', () => {
    expect(readRootFile('.nvmrc').trim()).toBe(packageJson.engines.node);
  });
});
