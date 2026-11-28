import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runNpmScript as runScript } from '../test-support/runNpmScript/runNpmScript.ts';
import {
  initSampleRepository,
  installGateScripts,
  runSampleGit as git,
  writeTreeFile,
} from '../test-support/sampleRepository/sampleRepository.ts';
import { findMissingStories, listCandidatePaths } from './checkStories.ts';

const RENDERER = 'apps/desktop/src/renderer';

// One component in each of the three places a component lives, with the
// stories file that belongs beside it and the name the line reports.
const COMPONENTS = [
  {
    place: 'primitives/',
    component: `${RENDERER}/primitives/Button/Button.tsx`,
    stories: `${RENDERER}/primitives/Button/Button.stories.tsx`,
    reason: 'has no Button.stories.tsx',
  },
  {
    place: 'components/',
    component: `${RENDERER}/components/Card/Card.tsx`,
    stories: `${RENDERER}/components/Card/Card.stories.tsx`,
    reason: 'has no Card.stories.tsx',
  },
  {
    place: 'features/<feature>/',
    component: `${RENDERER}/features/import/ImportPanel/ImportPanel.tsx`,
    stories: `${RENDERER}/features/import/ImportPanel/ImportPanel.stories.tsx`,
    reason: 'has no ImportPanel.stories.tsx',
  },
];

// Paths that are not components, so they need no stories file: lower-case
// folders, nested folders, layouts and pages, a name that does not match its
// folder, non-component files, and files outside the renderer.
const NOT_COMPONENTS: [string, string][] = [
  [
    'a lower-case folder in primitives/',
    `${RENDERER}/primitives/button/button.tsx`,
  ],
  [
    'a lower-case folder in components/',
    `${RENDERER}/components/card/card.tsx`,
  ],
  [
    'a lower-case folder in a feature',
    `${RENDERER}/features/import/importPanel/importPanel.tsx`,
  ],
  [
    'a folder nested in a primitive',
    `${RENDERER}/primitives/Button/Spinner/Spinner.tsx`,
  ],
  [
    'a folder nested in a component',
    `${RENDERER}/components/Card/Header/Header.tsx`,
  ],
  [
    'a folder nested in a feature',
    `${RENDERER}/features/import/panels/ImportPanel/ImportPanel.tsx`,
  ],
  ['a layout', `${RENDERER}/layouts/MainLayout/MainLayout.tsx`],
  ['a page', `${RENDERER}/pages/HomePage/HomePage.tsx`],
  [
    'a name that does not match its folder in primitives/',
    `${RENDERER}/primitives/Button/ButtonIcon.tsx`,
  ],
  [
    'a name that does not match its folder in components/',
    `${RENDERER}/components/Card/CardHeader.tsx`,
  ],
  [
    'a name that does not match its folder in a feature',
    `${RENDERER}/features/import/ImportPanel/ImportRow.tsx`,
  ],
  ['a styles file', `${RENDERER}/primitives/Button/Button.styles.ts`],
  ['a test file', `${RENDERER}/primitives/Button/Button.test.tsx`],
  ['a stories file', `${RENDERER}/primitives/Spinner/Spinner.stories.tsx`],
  ['a TypeScript module', `${RENDERER}/primitives/Button/Button.ts`],
  ['a category barrel', `${RENDERER}/primitives/index.ts`],
  ['a feature barrel', `${RENDERER}/features/import/index.ts`],
  ['a hook', `${RENDERER}/features/import/useImport/useImport.ts`],
  [
    'a component outside the renderer',
    'packages/ui/primitives/Button/Button.tsx',
  ],
];

describe('findMissingStories', () => {
  it.each(COMPONENTS)(
    'reports a component in $place without its stories file',
    ({ component, reason }) => {
      expect(findMissingStories([component])).toEqual([
        { subject: component, reason },
      ]);
    },
  );

  it.each(COMPONENTS)(
    'reports nothing for a component in $place with its stories file',
    ({ component, stories }) => {
      expect(findMissingStories([component, stories])).toEqual([]);
    },
  );

  it('reports a component whose stories file sits only in another folder', () => {
    const component = `${RENDERER}/primitives/Button/Button.tsx`;

    expect(
      findMissingStories([
        component,
        `${RENDERER}/components/Button/Button.stories.tsx`,
      ]),
    ).toEqual([{ subject: component, reason: 'has no Button.stories.tsx' }]);
  });

  it.each(NOT_COMPONENTS)('does not treat %s as a component', (_, path) => {
    expect(findMissingStories([path])).toEqual([]);
  });

  it('returns nothing for an empty list', () => {
    expect(findMissingStories([])).toEqual([]);
  });

  it('reports every component without its stories file in a mixed list, and only those', () => {
    const covered = `${RENDERER}/primitives/Icon/Icon.tsx`;
    const paths = [
      covered,
      `${RENDERER}/primitives/Icon/Icon.stories.tsx`,
      ...NOT_COMPONENTS.map(([, path]) => path),
      ...COMPONENTS.map(({ component }) => component),
    ];

    const found = findMissingStories(paths);

    expect(found).toHaveLength(COMPONENTS.length);
    expect(found).toEqual(
      expect.arrayContaining(
        COMPONENTS.map(({ component, reason }) => ({
          subject: component,
          reason,
        })),
      ),
    );
  });
});

describe('listCandidatePaths', { timeout: 30_000 }, () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'dashcash-candidates-'));
    initSampleRepository(repo);
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('lists the tracked paths, then the untracked ones, and leaves out an ignored one', () => {
    writeTreeFile(repo, '.gitignore', '*.log\n');
    writeTreeFile(repo, 'tracked.txt', 'tracked\n');
    git(repo, 'add', '.gitignore', 'tracked.txt');
    writeTreeFile(repo, 'a-untracked.txt', 'untracked\n');
    writeTreeFile(repo, 'ignored.log', 'ignored\n');

    expect(listCandidatePaths(repo)).toEqual([
      '.gitignore',
      'tracked.txt',
      'a-untracked.txt',
    ]);
  });
});

describe('check:stories', { timeout: 30_000 }, () => {
  let tree: string;

  beforeEach(() => {
    // A fresh repository with this repository's gate scripts beside it, so
    // the npm script's relative path resolves; the scripts stay untracked.
    tree = mkdtempSync(join(tmpdir(), 'dashcash-stories-'));
    installGateScripts(tree);
    initSampleRepository(tree);
    writeTreeFile(
      tree,
      '.gitignore',
      `node_modules\n${RENDERER}/primitives/Draft/\n`,
    );
    writeTreeFile(tree, 'README.md', '# Sample\n');
    git(tree, 'add', '.gitignore', 'README.md');
  });

  afterEach(() => {
    rmSync(tree, { recursive: true, force: true });
  });

  it('exits 0 without output when every component has its stories file', () => {
    for (const { component, stories } of COMPONENTS) {
      writeTreeFile(tree, component, 'export {};\n');
      writeTreeFile(tree, stories, 'export {};\n');
    }
    git(tree, 'add', RENDERER);

    const result = runScript('check:stories', tree);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('exits 1 with one line per missing stories file, an untracked component included and an ignored one left out', () => {
    const tracked = `${RENDERER}/primitives/Button/Button.tsx`;
    const untracked = `${RENDERER}/components/Card/Card.tsx`;
    const ignored = `${RENDERER}/primitives/Draft/Draft.tsx`;
    writeTreeFile(tree, tracked, 'export {};\n');
    writeTreeFile(tree, `${RENDERER}/primitives/Icon/Icon.tsx`, 'export {};\n');
    writeTreeFile(
      tree,
      `${RENDERER}/primitives/Icon/Icon.stories.tsx`,
      'export {};\n',
    );
    git(tree, 'add', RENDERER);
    writeTreeFile(tree, untracked, 'export {};\n');
    writeTreeFile(tree, ignored, 'export {};\n');

    const result = runScript('check:stories', tree);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(
      result.stderr
        .split(/\r?\n/)
        .filter((line) => line !== '')
        .sort(),
    ).toEqual(
      [
        `${tracked}: has no Button.stories.tsx`,
        `${untracked}: has no Card.stories.tsx`,
      ].sort(),
    );
  });
});
