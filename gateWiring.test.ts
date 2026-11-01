import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

type PackageJson = {
  scripts: Record<string, string | undefined>;
  engines: { node: string };
};

type WorkflowStep = {
  run?: string;
  env?: Record<string, string | undefined>;
};

type Workflow = {
  jobs: Record<string, { steps: WorkflowStep[] } | undefined>;
};

// The gates of Verify, in their fixed order. Every ticket that adds a gate
// inserts it here at its place.
const VERIFY_GATES = [
  'format:check',
  'lint',
  'typecheck',
  'test',
  'check:commits',
  'check:tickets',
  'check:data-files',
];

const GATE_COMMANDS: Record<string, string> = {
  'format:check': 'prettier --check .',
  lint: 'eslint . --max-warnings 0',
  typecheck: 'tsc',
  test: 'vitest run',
  'check:commits': 'node scripts/checkCommits/checkCommits.ts',
  'check:tickets': 'node scripts/checkTickets/checkTickets.ts',
  'check:data-files': 'node scripts/checkDataFiles/checkDataFiles.ts',
};

function readRootFile(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

function chainedCommands(script: string | undefined): string[] {
  return (script ?? '').split('&&').map((command) => command.trim());
}

function jobCommands(workflow: Workflow, job: string): string[] {
  return (workflow.jobs[job]?.steps ?? []).flatMap((step) =>
    (step.run ?? '')
      .split('\n')
      .map((command) => command.trim())
      .filter((command) => command !== ''),
  );
}

const packageJson = JSON.parse(readRootFile('package.json')) as PackageJson;
const workflow = parse(readRootFile('.github/workflows/ci.yml')) as Workflow;
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

  it('runs npm run verify in the verify job', () => {
    expect(jobCommands(workflow, 'verify')).toContain('npm run verify');
  });

  it('runs npm run verify:full in the pull-request job', () => {
    expect(jobCommands(workflow, 'pull-request')).toContain(
      'npm run verify:full',
    );
  });

  it('runs check:pr from neither verify, verify:full nor the verify job', () => {
    expect(scripts['check:pr']).toBe(
      'node scripts/checkPullRequest/checkPullRequest.ts',
    );
    expect(scripts.verify).not.toMatch(/check:pr|checkPullRequest/);
    expect(scripts['verify:full']).not.toMatch(/check:pr|checkPullRequest/);
    expect(jobCommands(workflow, 'verify')).not.toContain('npm run check:pr');
  });

  it('runs npm run check:pr after npm run verify:full in the pull-request job', () => {
    const commands = jobCommands(workflow, 'pull-request');
    const verifyFull = commands.indexOf('npm run verify:full');

    expect(verifyFull).toBeGreaterThanOrEqual(0);
    expect(commands.indexOf('npm run check:pr')).toBeGreaterThan(verifyFull);
  });

  it('hands the pull-request title to check:pr only through PR_TITLE', () => {
    const steps = workflow.jobs['pull-request']?.steps ?? [];
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

  it('pins the same Node version in .nvmrc and engines.node', () => {
    expect(readRootFile('.nvmrc').trim()).toBe(packageJson.engines.node);
  });
});
