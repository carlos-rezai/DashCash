import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  chainedCommands,
  jobCommands,
  readWorkflow,
} from '../../scripts/readWorkflow/readWorkflow.ts';
import { VERIFY_GATES } from '../test-support/verifyGates/verifyGates.ts';

type PackageJson = {
  scripts: Record<string, string | undefined>;
  engines: { node: string };
};

const ROOT = join(import.meta.dirname, '..', '..');
const PUSH_WORKFLOW = 'ci.yml';

const GATE_COMMANDS: Record<string, string> = {
  'format:check': 'prettier --check .',
  lint: 'eslint . --max-warnings 0',
  typecheck:
    'tsc && tsc -p apps/desktop/tsconfig.node.json && tsc -p apps/desktop/tsconfig.web.json && tsc -p packages/contract/tsconfig.json && tsc -p packages/domain/tsconfig.json && tsc -p .storybook/tsconfig.json',
  'lint:deps':
    'depcruise --config .dependency-cruiser.js apps packages scripts e2e',
  test: 'vitest run',
  'test:stories': 'vitest run --config vitest.storybook.config.ts',
  'check:stories': 'node scripts/checkStories/checkStories.ts',
  'check:coverage': 'node scripts/checkCoverage/checkCoverage.ts',
  'check:commits': 'node scripts/checkCommits/checkCommits.ts',
  'check:tickets': 'node scripts/checkTickets/checkTickets.ts',
  'check:data-files': 'node scripts/checkDataFiles/checkDataFiles.ts',
  'check:docs-drift': 'node scripts/checkDocsDrift/checkDocsDrift.ts',
  'check:licenses': 'node scripts/checkLicenses/checkLicenses.ts',
  'check:audit': 'node scripts/checkAudit/checkAudit.ts',
  'check:quarantine': 'node scripts/checkQuarantine/checkQuarantine.ts',
};

function readRootFile(path: string): string {
  return readFileSync(join(ROOT, path), 'utf8');
}

const packageJson = JSON.parse(readRootFile('package.json')) as PackageJson;
const pushWorkflow = readWorkflow(ROOT, PUSH_WORKFLOW);
const { scripts } = packageJson;

describe('verify scripts', () => {
  it('runs the gates of verify in order, failing fast', () => {
    expect(chainedCommands(scripts.verify)).toEqual(
      VERIFY_GATES.map((gate) => `npm run ${gate}`),
    );
  });

  it('runs the quarantine check as the last of the fifteen gates of verify', () => {
    const commands = chainedCommands(scripts.verify);

    expect(commands).toHaveLength(15);
    expect(commands.at(-1)).toBe('npm run check:quarantine');
  });

  it('runs the Story check right after the dependency lint in verify', () => {
    const commands = chainedCommands(scripts.verify);

    expect(commands[commands.indexOf('npm run lint:deps') + 1]).toBe(
      'npm run check:stories',
    );
  });

  it('runs the Story tests right after the unit tests in verify', () => {
    const commands = chainedCommands(scripts.verify);

    expect(commands[commands.indexOf('npm run test') + 1]).toBe(
      'npm run test:stories',
    );
  });

  it('runs the coverage check right after the Story tests in verify', () => {
    const commands = chainedCommands(scripts.verify);

    expect(commands[commands.indexOf('npm run test:stories') + 1]).toBe(
      'npm run check:coverage',
    );
  });

  it('serves Storybook on port 6006 without opening a browser from storybook', () => {
    expect(scripts.storybook).toBe('storybook dev --port 6006 --no-open');
  });

  it('runs each gate once with its tool', () => {
    for (const [gate, command] of Object.entries(GATE_COMMANDS)) {
      expect(scripts[gate], gate).toBe(command);
    }
  });

  it('runs exactly verify, the App build, then the end-to-end tests from verify:full, failing fast', () => {
    expect(chainedCommands(scripts['verify:full'])).toEqual([
      'npm run verify',
      'npm run build',
      'npm run test:e2e',
    ]);
  });

  it('runs the end-to-end tests with Playwright from test:e2e', () => {
    expect(scripts['test:e2e']).toBe('playwright test');
  });

  it('keeps every npm script free of command substitution, pipes and globs', () => {
    for (const [name, script] of Object.entries(scripts)) {
      expect(script, name).not.toMatch(/\$\(|\||[*?]/);
    }
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

  it('runs a Mutation run with Stryker from test:mutation, and from neither verify nor verify:full', () => {
    expect(scripts['test:mutation']).toBe('stryker run stryker.config.js');
    expect(chainedCommands(scripts.verify)).toHaveLength(15);
    expect(scripts.verify).not.toMatch(/test:mutation|stryker/);
    expect(scripts['verify:full']).not.toMatch(/test:mutation|stryker/);
  });

  it('pins the same Node version in .nvmrc and engines.node', () => {
    expect(readRootFile('.nvmrc').trim()).toBe(packageJson.engines.node);
  });
});
