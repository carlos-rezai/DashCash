import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  jobsRunning,
  readWorkflow,
  workflowFiles,
  type Workflow,
} from '../../scripts/readWorkflow/readWorkflow.ts';
import { findElectronInstallProblems } from './electronInstall.ts';

const ROOT = join(import.meta.dirname, '..', '..');
// npm ci installs the Electron binary and the headless Chromium of the Story
// tests through the root postinstall script, so no workflow step installs
// Electron and no test downloads a browser.
const INSTALL_ELECTRON = 'install-electron';
const POSTINSTALL =
  'install-electron && playwright install --only-shell chromium';

type Scripts = Record<string, string>;
type Workflows = Record<string, Workflow>;

function readScripts(): Scripts {
  const packageJson = JSON.parse(
    readFileSync(join(ROOT, 'package.json'), 'utf8'),
  ) as { scripts?: Scripts };
  return packageJson.scripts ?? {};
}

function readWorkflows(): Workflows {
  return Object.fromEntries(
    workflowFiles(ROOT).map((file) => [file, readWorkflow(ROOT, file)]),
  );
}

function readNpmrc(): string {
  const path = join(ROOT, '.npmrc');
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

// An invented, sound configuration: each sample changes one part of it.
const SCRIPTS_WITHOUT_POSTINSTALL: Scripts = {
  verify: 'npm run lint && npm run test',
};
const SOUND_SCRIPTS: Scripts = {
  postinstall: POSTINSTALL,
  ...SCRIPTS_WITHOUT_POSTINSTALL,
};
const SOUND_WORKFLOWS: Workflows = {
  'ci.yml': {
    jobs: {
      verify: {
        steps: [
          { uses: 'actions/checkout@v4' },
          { run: 'npm ci' },
          { run: 'npm run verify' },
        ],
      },
    },
  },
  'daily.yml': {
    jobs: {
      mutation: {
        steps: [{ run: 'npm ci' }, { run: 'npm run test:mutation' }],
      },
    },
  },
};
const SOUND_NPMRC = 'engine-strict=true\nsave-exact=true\n';

function withSteps(
  file: string,
  job: string,
  steps: { run?: string; uses?: string }[],
): Workflows {
  return {
    ...SOUND_WORKFLOWS,
    [file]: {
      ...SOUND_WORKFLOWS[file],
      jobs: { ...SOUND_WORKFLOWS[file]?.jobs, [job]: { steps } },
    },
  };
}

describe('electron install', () => {
  it('finds no Electron install problem in the committed package.json, workflows and .npmrc', () => {
    expect(
      findElectronInstallProblems(readScripts(), readWorkflows(), readNpmrc()),
    ).toEqual([]);
  });

  it('installs Electron, then only the headless Chromium, from the committed postinstall', () => {
    expect(readScripts()['postinstall']).toBe(POSTINSTALL);
  });

  it('no workflow step runs install-electron', () => {
    expect(jobsRunning(ROOT, INSTALL_ELECTRON)).toEqual([]);
  });

  it('finds nothing in a sound sample configuration', () => {
    expect(
      findElectronInstallProblems(SOUND_SCRIPTS, SOUND_WORKFLOWS, SOUND_NPMRC),
    ).toEqual([]);
  });

  it('finds nothing when .npmrc is missing, read as empty text', () => {
    expect(
      findElectronInstallProblems(SOUND_SCRIPTS, SOUND_WORKFLOWS, ''),
    ).toEqual([]);
  });

  it('names a missing postinstall script', () => {
    expect(
      findElectronInstallProblems(
        SCRIPTS_WITHOUT_POSTINSTALL,
        SOUND_WORKFLOWS,
        SOUND_NPMRC,
      ),
    ).toEqual([
      `the postinstall script is missing; it must be exactly ${POSTINSTALL}`,
    ]);
  });

  it.each([
    ['install-electron'],
    ['node_modules/.bin/install-electron'],
    ['install-electron && echo done'],
    ['install-electron && playwright install chromium'],
    ['install-electron && playwright install --only-shell'],
    ['playwright install --only-shell chromium && install-electron'],
    [` ${POSTINSTALL}`],
    [''],
  ])(
    'names the postinstall script %j as not exactly the Electron and Chromium install',
    (postinstall) => {
      expect(
        findElectronInstallProblems(
          { ...SOUND_SCRIPTS, postinstall },
          SOUND_WORKFLOWS,
          SOUND_NPMRC,
        ),
      ).toEqual([
        `the postinstall script is ${JSON.stringify(postinstall)}; it must be exactly ${POSTINSTALL}`,
      ]);
    },
  );

  it.each([
    ['node_modules/.bin/install-electron'],
    ['npm exec install-electron'],
  ])('names a workflow step that runs %s by its file and job', (command) => {
    const workflows = withSteps('ci.yml', 'verify', [
      { run: 'npm ci' },
      { run: command },
      { run: 'npm run verify' },
    ]);

    expect(
      findElectronInstallProblems(SOUND_SCRIPTS, workflows, SOUND_NPMRC),
    ).toEqual(['ci.yml: the verify job runs install-electron in a step']);
  });

  it('names a step that runs install-electron among other commands', () => {
    const workflows = withSteps('daily.yml', 'mutation', [
      { run: 'npm ci\nnode_modules/.bin/install-electron' },
      { run: 'npm run test:mutation' },
    ]);

    expect(
      findElectronInstallProblems(SOUND_SCRIPTS, workflows, SOUND_NPMRC),
    ).toEqual(['daily.yml: the mutation job runs install-electron in a step']);
  });

  it('names every workflow step that runs install-electron, one line each', () => {
    const workflows: Workflows = {
      ...withSteps('ci.yml', 'verify', [
        { run: 'npm ci' },
        { run: 'node_modules/.bin/install-electron' },
        { run: 'npm run verify' },
      ]),
      'daily.yml': {
        jobs: {
          mutation: {
            steps: [
              { run: 'npm ci' },
              { run: 'node_modules/.bin/install-electron' },
              { run: 'node_modules/.bin/install-electron' },
              { run: 'npm run test:mutation' },
            ],
          },
        },
      },
    };

    expect(
      findElectronInstallProblems(SOUND_SCRIPTS, workflows, SOUND_NPMRC),
    ).toEqual([
      'ci.yml: the verify job runs install-electron in a step',
      'daily.yml: the mutation job runs install-electron in a step',
      'daily.yml: the mutation job runs install-electron in a step',
    ]);
  });

  it.each([
    ['engine-strict=true\nignore-scripts=true\n'],
    ['ignore-scripts=true'],
    ['engine-strict=true\r\nignore-scripts=true\r\n'],
    ['ignore-scripts = true\n'],
  ])('names an ignore-scripts=true line in .npmrc %j', (npmrc) => {
    expect(
      findElectronInstallProblems(SOUND_SCRIPTS, SOUND_WORKFLOWS, npmrc),
    ).toEqual(['.npmrc sets ignore-scripts=true, so npm ci skips postinstall']);
  });

  it('finds nothing for ignore-scripts=false in .npmrc', () => {
    expect(
      findElectronInstallProblems(
        SOUND_SCRIPTS,
        SOUND_WORKFLOWS,
        'ignore-scripts=false\n',
      ),
    ).toEqual([]);
  });

  it('names every problem at once, one line each', () => {
    const workflows = withSteps('ci.yml', 'verify', [
      { run: 'npm ci' },
      { run: 'node_modules/.bin/install-electron' },
      { run: 'npm run verify' },
    ]);

    expect(
      findElectronInstallProblems(
        SCRIPTS_WITHOUT_POSTINSTALL,
        workflows,
        'ignore-scripts=true\n',
      ),
    ).toEqual([
      `the postinstall script is missing; it must be exactly ${POSTINSTALL}`,
      'ci.yml: the verify job runs install-electron in a step',
      '.npmrc sets ignore-scripts=true, so npm ci skips postinstall',
    ]);
  });
});
