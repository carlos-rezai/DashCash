import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

type PackageJson = {
  scripts: Record<string, string | undefined>;
  engines: { node: string };
};

type Workflow = {
  jobs: Record<string, { steps: { run?: string }[] } | undefined>;
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

  it('pins the same Node version in .nvmrc and engines.node', () => {
    expect(readRootFile('.nvmrc').trim()).toBe(packageJson.engines.node);
  });
});
