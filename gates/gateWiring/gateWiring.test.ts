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
  env?: Record<string, string | undefined>;
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

const packageJson = JSON.parse(readRootFile('package.json')) as PackageJson;
const pushWorkflow = readWorkflow(PUSH_WORKFLOW);
const pullRequestWorkflow = readWorkflow(PULL_REQUEST_WORKFLOW);
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
