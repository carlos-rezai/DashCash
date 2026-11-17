import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  chainedCommands,
  jobCommands,
  jobSteps,
  jobsRunning,
  readWorkflow,
  stepIndex,
  triggers,
  workflowFiles,
  type Workflow,
  type WorkflowStep,
} from './readWorkflow.ts';

// An invented workflow, written as a workflow file would be.
const SAMPLE_WORKFLOW_TEXT = `name: Sample
on:
  push:
    branches: [sample/**]
jobs:
  build:
    steps:
      - uses: actions/checkout@0000000000000000000000000000000000000000
        with:
          fetch-depth: 0
      - uses: actions/setup-node@1111111111111111111111111111111111111111
      - run: npm ci
      - name: Two commands in one step
        run: |
          npm run sample:first

            npm run sample:second
      - uses: sample/upload-action@v1
  lint:
    steps:
      - run: npm run sample:lint
  empty: {}
`;

function sampleWorkflow(text: string = SAMPLE_WORKFLOW_TEXT): Workflow {
  return parse(text) as Workflow;
}

describe('readWorkflow', () => {
  let root: string;

  function writeWorkflowFile(file: string, content: string): void {
    const folder = join(root, '.github', 'workflows');
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, file), content);
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dashcash-read-workflow-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('parses the workflow file of that name under the given root', () => {
    writeWorkflowFile('sample.yml', SAMPLE_WORKFLOW_TEXT);

    expect(readWorkflow(root, 'sample.yml')).toEqual(sampleWorkflow());
  });

  it('reads a workflow file that does not exist as an empty workflow', () => {
    writeWorkflowFile('sample.yml', SAMPLE_WORKFLOW_TEXT);

    expect(readWorkflow(root, 'missing.yml')).toEqual({});
  });

  it('reads a workflow file without content as an empty workflow', () => {
    writeWorkflowFile('blank.yml', '');

    expect(readWorkflow(root, 'blank.yml')).toEqual({});
  });
});

describe('workflowFiles', () => {
  let root: string;

  function writeWorkflowFile(file: string): void {
    const folder = join(root, '.github', 'workflows');
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, file), 'name: Sample\n');
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dashcash-workflow-files-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('lists the .yml and .yaml files of the workflows folder in sorted order', () => {
    writeWorkflowFile('zeta.yml');
    writeWorkflowFile('alpha.yaml');
    writeWorkflowFile('middle.yml');

    expect(workflowFiles(root)).toEqual([
      'alpha.yaml',
      'middle.yml',
      'zeta.yml',
    ]);
  });

  it('leaves out every other file of the workflows folder', () => {
    writeWorkflowFile('sample.yml');
    writeWorkflowFile('README.md');
    writeWorkflowFile('sample.json');
    writeWorkflowFile('sample.yml.bak');

    expect(workflowFiles(root)).toEqual(['sample.yml']);
  });

  it('lists only the workflows folder of the given root', () => {
    writeWorkflowFile('sample.yml');
    writeFileSync(join(root, 'outside.yml'), 'name: Outside\n');

    expect(workflowFiles(root)).toEqual(['sample.yml']);
  });
});

describe('triggers', () => {
  it('reads a single event as that event without settings', () => {
    expect(triggers(sampleWorkflow('on: push\n'))).toEqual({ push: null });
  });

  it('reads a list of events as those events without settings', () => {
    expect(triggers(sampleWorkflow('on: [push, pull_request]\n'))).toEqual({
      push: null,
      pull_request: null,
    });
  });

  it('reads events with settings as they are written', () => {
    expect(
      triggers(
        sampleWorkflow(
          "on:\n  schedule:\n    - cron: '0 1 * * *'\n  workflow_dispatch:\n",
        ),
      ),
    ).toEqual({ schedule: [{ cron: '0 1 * * *' }], workflow_dispatch: null });
  });

  it('reads a workflow without an on: key as no events', () => {
    expect(triggers(sampleWorkflow('name: Sample\n'))).toEqual({});
  });

  it('reads an on: key without events as no events', () => {
    expect(triggers(sampleWorkflow('on:\n'))).toEqual({});
  });
});

describe('jobSteps', () => {
  it('returns the steps of the named job in their order', () => {
    expect(jobSteps(sampleWorkflow(), 'lint')).toEqual([
      { run: 'npm run sample:lint' },
    ]);
    expect(
      jobSteps(sampleWorkflow(), 'build').map((step) => step.uses ?? step.run),
    ).toEqual([
      'actions/checkout@0000000000000000000000000000000000000000',
      'actions/setup-node@1111111111111111111111111111111111111111',
      'npm ci',
      'npm run sample:first\n\n  npm run sample:second\n',
      'sample/upload-action@v1',
    ]);
  });

  it('returns no steps for a job without steps', () => {
    expect(jobSteps(sampleWorkflow(), 'empty')).toEqual([]);
  });

  it('returns no steps for a job the workflow does not hold', () => {
    expect(jobSteps(sampleWorkflow(), 'missing')).toEqual([]);
  });

  it('returns no steps for a workflow without jobs', () => {
    expect(jobSteps(sampleWorkflow('name: Sample\n'), 'build')).toEqual([]);
  });
});

describe('stepIndex', () => {
  const steps: WorkflowStep[] = [
    { run: 'npm ci' },
    { uses: 'actions/setup-node-extra@v1' },
    { uses: 'actions/setup-node@1111111111111111111111111111111111111111' },
    { uses: 'actions/setup-node@v4' },
    { uses: 'actions/checkout' },
  ];

  it('finds the first step that uses the action, at any version', () => {
    expect(stepIndex(steps, 'actions/setup-node')).toBe(2);
  });

  it('finds the step of the sample workflow that uses the action', () => {
    expect(
      stepIndex(jobSteps(sampleWorkflow(), 'build'), 'actions/checkout'),
    ).toBe(0);
  });

  it('does not match an action whose name only starts with the given one', () => {
    expect(stepIndex(steps, 'actions/setup')).toBe(-1);
  });

  it('does not match a step that uses the action without a version', () => {
    expect(stepIndex(steps, 'actions/checkout')).toBe(-1);
  });

  it('returns -1 when no step uses the action', () => {
    expect(stepIndex(steps, 'sample/missing-action')).toBe(-1);
    expect(stepIndex([], 'actions/setup-node')).toBe(-1);
  });
});

describe('jobCommands', () => {
  it('returns every command line of the job, trimmed, in order, without blank lines', () => {
    expect(jobCommands(sampleWorkflow(), 'build')).toEqual([
      'npm ci',
      'npm run sample:first',
      'npm run sample:second',
    ]);
  });

  it('returns the commands of the named job only', () => {
    expect(jobCommands(sampleWorkflow(), 'lint')).toEqual([
      'npm run sample:lint',
    ]);
  });

  it('returns no commands for a job without steps or one the workflow does not hold', () => {
    expect(jobCommands(sampleWorkflow(), 'empty')).toEqual([]);
    expect(jobCommands(sampleWorkflow(), 'missing')).toEqual([]);
  });
});

describe('chainedCommands', () => {
  it('splits an && chain into its commands, trimmed, in order', () => {
    expect(
      chainedCommands('npm run sample:a&&npm run sample:b  &&  sample-tool'),
    ).toEqual(['npm run sample:a', 'npm run sample:b', 'sample-tool']);
  });

  it('reads a script without && as its one command', () => {
    expect(chainedCommands('  sample-tool --flag  ')).toEqual([
      'sample-tool --flag',
    ]);
  });

  it('does not split at a single &, a pipe or ||', () => {
    expect(
      chainedCommands('sample-a & sample-b || sample-c | sample-d'),
    ).toEqual(['sample-a & sample-b || sample-c | sample-d']);
  });

  it('reads a missing script as one empty command', () => {
    expect(chainedCommands(undefined)).toEqual(['']);
  });
});

describe('jobsRunning', () => {
  let root: string;

  function writeWorkflowFile(file: string, content: string): void {
    const folder = join(root, '.github', 'workflows');
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, file), content);
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dashcash-jobs-running-'));
    writeWorkflowFile('second.yml', SAMPLE_WORKFLOW_TEXT);
    writeWorkflowFile(
      'first.yaml',
      [
        'jobs:',
        '  zeta:',
        '    steps:',
        '      - run: npm run sample:first --extra',
        '  alpha:',
        '    steps:',
        '      - uses: sample/npm-run-sample-first@v1',
        '        name: npm run sample:first',
        '      - run: npm run sample:other',
        '  beta:',
        '    steps:',
        '      - run: |',
        '          npm ci',
        '          npm run sample:first',
        '',
      ].join('\n'),
    );
    writeWorkflowFile('notes.md', 'npm run sample:first\n');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('lists the jobs whose commands hold the text as file: job, by file, then job order', () => {
    expect(jobsRunning(root, 'npm run sample:first')).toEqual([
      'first.yaml: zeta',
      'first.yaml: beta',
      'second.yml: build',
    ]);
  });

  it('does not list a job that names the text only outside its commands', () => {
    expect(jobsRunning(root, 'npm run sample:other')).toEqual([
      'first.yaml: alpha',
    ]);
    expect(jobsRunning(root, 'sample/upload-action')).toEqual([]);
  });

  it('lists no job when no command holds the text', () => {
    expect(jobsRunning(root, 'sample-missing-command')).toEqual([]);
  });
});
