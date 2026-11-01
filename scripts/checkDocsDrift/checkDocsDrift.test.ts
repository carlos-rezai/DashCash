import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runNpmScript as runScript } from '../test-support/runNpmScript/runNpmScript.ts';
import {
  initSampleRepository,
  installGateScripts,
  ROOT,
  runSampleGit as git,
  writeTreeFile,
} from '../test-support/sampleRepository/sampleRepository.ts';
import { findDocsDrift } from './checkDocsDrift.ts';

// The top-level folders whose inline-code paths the check resolves from the
// repository root (user story 76).
const TOP_LEVEL_FOLDERS = [
  '.claude/',
  '.github/',
  'apps/',
  'packages/',
  'e2e/',
  'fixtures/',
  'gates/',
  'quality/',
  'scripts/',
  'docs/',
];

// Runs the core on one doc and returns the subjects of its violations.
function driftSubjects(
  path: string,
  text: string,
  trackedPaths: string[],
): string[] {
  const violations = findDocsDrift([{ path, text }], trackedPaths);
  for (const violation of violations) {
    expect(violation.reason).not.toBe('');
  }
  return violations.map((violation) => violation.subject);
}

describe('findDocsDrift', () => {
  it('reports nothing for no docs', () => {
    expect(findDocsDrift([], ['README.md'])).toEqual([]);
  });

  describe('relative Markdown links', () => {
    it('resolves a link from the linking file’s folder', () => {
      expect(
        driftSubjects(
          'docs/conventions.md',
          'See the [checklist](feature-checklist.md).\n',
          ['docs/conventions.md', 'docs/feature-checklist.md'],
        ),
      ).toEqual([]);
    });

    it('reports a link whose target is missing from the linking file’s folder', () => {
      expect(
        driftSubjects(
          'docs/conventions.md',
          'See the [checklist](feature-checklist.md).\n',
          ['docs/conventions.md', 'feature-checklist.md'],
        ),
      ).toEqual(['docs/conventions.md: feature-checklist.md']);
    });

    it('resolves a link from the root for a doc at the root', () => {
      expect(
        driftSubjects('README.md', 'Read [the rules](docs/conventions.md).\n', [
          'README.md',
          'docs/conventions.md',
        ]),
      ).toEqual([]);
    });

    it('resolves a parent-folder link', () => {
      expect(
        driftSubjects(
          'docs/concept.md',
          'Back to [the readme](../README.md).\n',
          ['README.md', 'docs/concept.md'],
        ),
      ).toEqual([]);
    });

    it('reports a renamed link target', () => {
      expect(
        driftSubjects(
          'CLAUDE.md',
          'Gates: [quality gates](docs/quality-gates.md).\n',
          ['CLAUDE.md', 'docs/gates.md'],
        ),
      ).toEqual(['CLAUDE.md: docs/quality-gates.md']);
    });

    it('drops an #anchor before resolving', () => {
      expect(
        driftSubjects(
          'docs/conventions.md',
          'See [naming](feature-checklist.md#naming).\n',
          ['docs/conventions.md', 'docs/feature-checklist.md'],
        ),
      ).toEqual([]);
    });

    it('drops a query before resolving', () => {
      expect(
        driftSubjects(
          'docs/conventions.md',
          'See [naming](feature-checklist.md?plain=1).\n',
          ['docs/conventions.md', 'docs/feature-checklist.md'],
        ),
      ).toEqual([]);
    });

    it('drops a query and an #anchor together before resolving', () => {
      expect(
        driftSubjects(
          'docs/conventions.md',
          'See [naming](feature-checklist.md?plain=1#naming).\n',
          ['docs/conventions.md', 'docs/feature-checklist.md'],
        ),
      ).toEqual([]);
    });

    it('skips a link to an #anchor in the same doc', () => {
      expect(
        driftSubjects('docs/conventions.md', 'See [naming](#naming).\n', [
          'docs/conventions.md',
        ]),
      ).toEqual([]);
    });
  });

  describe('inline-code paths', () => {
    it.each(TOP_LEVEL_FOLDERS)(
      'resolves a path under %s from the root',
      (folder) => {
        expect(
          driftSubjects(
            'docs/conventions.md',
            `Lives in \`${folder}kept/file.md\`.\n`,
            ['docs/conventions.md', `${folder}kept/file.md`],
          ),
        ).toEqual([]);
      },
    );

    it.each(TOP_LEVEL_FOLDERS)('reports a missing path under %s', (folder) => {
      expect(
        driftSubjects(
          'docs/conventions.md',
          `Lives in \`${folder}gone/file.md\`.\n`,
          ['docs/conventions.md', `docs/${folder}gone/file.md`],
        ),
      ).toEqual([`docs/conventions.md: ${folder}gone/file.md`]);
    });

    it('skips an inline-code path that does not start with a top-level folder', () => {
      expect(
        driftSubjects(
          'CLAUDE.md',
          'Format via `domain/src/money/` and `main/db/`.\n',
          ['CLAUDE.md'],
        ),
      ).toEqual([]);
    });

    it('names the doc and the path for a deleted path', () => {
      expect(
        driftSubjects(
          'CLAUDE.md',
          'SQLite access only in `apps/desktop/src/main/db/`.\n',
          ['CLAUDE.md', 'apps/desktop/src/main/ipc/.gitkeep'],
        ),
      ).toEqual(['CLAUDE.md: apps/desktop/src/main/db/']);
    });
  });

  describe('fenced code blocks', () => {
    it('skips links and inline-code paths inside a backtick fence', () => {
      const text = [
        'Structure:',
        '',
        '```text',
        'scripts/gone/                 removed',
        '`scripts/gone/gone.ts`',
        '[gone](gone.md)',
        '```',
        '',
      ].join('\n');

      expect(driftSubjects('docs/conventions.md', text, [])).toEqual([]);
    });

    it('skips links and inline-code paths inside a tilde fence', () => {
      const text = [
        '~~~',
        '`scripts/gone/gone.ts`',
        '[gone](gone.md)',
        '~~~',
        '',
      ].join('\n');

      expect(driftSubjects('docs/conventions.md', text, [])).toEqual([]);
    });

    it('checks the text after a fence closes again', () => {
      const text = [
        '```',
        '`scripts/inside/inside.ts`',
        '```',
        '',
        'After the fence: `scripts/after/after.ts`.',
        '',
      ].join('\n');

      expect(driftSubjects('docs/conventions.md', text, [])).toEqual([
        'docs/conventions.md: scripts/after/after.ts',
      ]);
    });

    it('keeps a tilde fence open at a backtick fence line inside it', () => {
      const text = ['~~~', '```', '`scripts/inside/inside.ts`', '~~~', ''].join(
        '\n',
      );

      expect(driftSubjects('docs/conventions.md', text, [])).toEqual([]);
    });

    it('keeps a fence open at a shorter fence line of the same character', () => {
      const text = [
        '````',
        '```',
        '`scripts/inside/inside.ts`',
        '````',
        '',
      ].join('\n');

      expect(driftSubjects('docs/conventions.md', text, [])).toEqual([]);
    });
  });

  describe('duplicate mentions', () => {
    it('reports a missing path once per doc when the doc names it twice', () => {
      const text =
        'See [the file](gone.md) and `docs/gone.md` for the details.\n';

      expect(driftSubjects('docs/conventions.md', text, [])).toEqual([
        'docs/conventions.md: gone.md',
      ]);
    });
  });

  describe('URLs', () => {
    it.each([
      'https://example.com/docs/missing.md',
      'http://example.com/missing.md',
    ])('skips a link to %s', (url) => {
      expect(
        driftSubjects('README.md', `See [elsewhere](${url}).\n`, ['README.md']),
      ).toEqual([]);
    });
  });

  describe('placeholder spans', () => {
    it.each([
      ['<', '`docs/features/<NN>-name/`'],
      ['>', '`docs/features/name>/`'],
      ['*', '`apps/*/src/`'],
      ['{', '`docs/{concept,gone}.md`'],
      ['…', '`docs/features/…/plan.md`'],
      ['a space', '`scripts/gone script.ts`'],
    ])('skips a span with %s', (_character, span) => {
      expect(
        driftSubjects('docs/conventions.md', `Example: ${span}.\n`, [
          'docs/conventions.md',
        ]),
      ).toEqual([]);
    });
  });

  describe('placeholder link targets', () => {
    it('skips a link whose target holds a placeholder', () => {
      expect(
        driftSubjects(
          'docs/conventions.md',
          'Example: [a ticket](features/<NN>-name/).\n',
          ['docs/conventions.md'],
        ),
      ).toEqual([]);
    });
  });

  describe('folders', () => {
    it('counts a folder whose .gitkeep git tracks', () => {
      expect(
        driftSubjects('CLAUDE.md', 'Flows live in `e2e/`.\n', [
          'CLAUDE.md',
          'e2e/.gitkeep',
        ]),
      ).toEqual([]);
    });

    it('counts a nested folder named without a trailing slash', () => {
      expect(
        driftSubjects(
          'CLAUDE.md',
          'SQLite access only in `apps/desktop/src/main/db`.\n',
          ['CLAUDE.md', 'apps/desktop/src/main/db/.gitkeep'],
        ),
      ).toEqual([]);
    });

    it('counts a folder linked from a doc', () => {
      expect(
        driftSubjects('docs/conventions.md', 'See [flows](../e2e/).\n', [
          'docs/conventions.md',
          'e2e/.gitkeep',
        ]),
      ).toEqual([]);
    });

    it('does not count a path that only shares a prefix with a tracked path', () => {
      expect(
        driftSubjects('CLAUDE.md', 'Pure code in `packages/dom`.\n', [
          'CLAUDE.md',
          'packages/domain/.gitkeep',
        ]),
      ).toEqual(['CLAUDE.md: packages/dom']);
    });
  });
});

describe('check:docs-drift', { timeout: 30_000 }, () => {
  let tree: string;

  beforeEach(() => {
    // A fresh repository with this repository's gate scripts beside it, so
    // the npm script's relative path resolves; the scripts stay untracked.
    tree = mkdtempSync(join(tmpdir(), 'dashcash-docs-drift-'));
    installGateScripts(tree);
    initSampleRepository(tree);
    writeTreeFile(
      tree,
      'README.md',
      'Start with [the concept](docs/concept.md).\n',
    );
    writeTreeFile(
      tree,
      'CLAUDE.md',
      'Notes live in `apps/desktop/notes.md`.\n',
    );
    writeTreeFile(
      tree,
      'docs/concept.md',
      'See [the readme](../README.md) and `e2e/`.\n',
    );
    writeTreeFile(tree, 'apps/desktop/notes.md', 'Invented notes.\n');
    writeTreeFile(tree, 'e2e/.gitkeep', '');
    git(
      tree,
      'add',
      'README.md',
      'CLAUDE.md',
      'docs/concept.md',
      'apps/desktop/notes.md',
      'e2e/.gitkeep',
    );
    // Committed, so a test can delete a file with a plain `git rm`.
    git(tree, 'commit', '--quiet', '--message', 'add sample docs');
  });

  afterEach(() => {
    rmSync(tree, { recursive: true, force: true });
  });

  it('exits 0 without output when every named path exists', () => {
    const result = runScript('check:docs-drift', tree);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('fails on a renamed path and names the doc and the path', () => {
    git(tree, 'mv', 'docs/concept.md', 'docs/idea.md');

    const result = runScript('check:docs-drift', tree);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('README.md: docs/concept.md');
  });

  it('fails on a deleted path and names the doc and the path', () => {
    git(tree, 'rm', '--quiet', 'apps/desktop/notes.md');

    const result = runScript('check:docs-drift', tree);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('CLAUDE.md: apps/desktop/notes.md');
  });

  it('reads the top-level docs/*.md and names a removed path', () => {
    // Only docs/concept.md names e2e/, so this pins that source.
    git(tree, 'rm', '--quiet', 'e2e/.gitkeep');

    const result = runScript('check:docs-drift', tree);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('docs/concept.md: e2e/');
  });

  it('ignores Markdown below the top level of docs/', () => {
    writeTreeFile(
      tree,
      'docs/features/01-sample/plan.md',
      'Will add `scripts/future/future.ts`.\n',
    );
    git(tree, 'add', 'docs/features/01-sample/plan.md');

    const result = runScript('check:docs-drift', tree);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe('');
  });

  it('passes on today’s docs', () => {
    const result = runScript('check:docs-drift', ROOT);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe('');
  });
});
