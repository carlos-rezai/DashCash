import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import load from '@commitlint/load';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { lintCommitMessages } from '../checkCommits/checkCommits.ts';
import type { Violation } from '../reportViolations/reportViolations.ts';
import { runNpmScript as runScript } from '../test-support/runNpmScript/runNpmScript.ts';
import {
  commitFiles,
  initSampleRepository,
  installGateScripts,
  ROOT,
  runSampleGit as git,
  setOriginMain,
} from '../test-support/sampleRepository/sampleRepository.ts';
import { checkPullRequest } from './checkPullRequest.ts';

type Files = Record<string, string>;

// The front matter as the conventions' ticket template writes it.
const TEMPLATE_COMMENT = '   # open | in-progress | done';

function ticket(status: string, title: string): string {
  return `---\nstatus: ${status}\n---\n# ${title}\n`;
}

const FEATURE_TITLE = 'feat: [sample] add sample';
const REFACTOR_TITLE = 'refactor: [sample] tidy the sample';
const RENOVATE_TITLE = 'chore: update dependency sample-tool to v2';

// A Feature folder whose Tickets are all done, with planning files beside
// them, and a refactor plan whose Refactor steps are all ticked. The folder
// 02-other is another feature, still in progress.
const DONE_FEATURE: Files = {
  'README.md': '# Sample\n',
  'docs/features/01-sample/design-log.md': '# Design log\n',
  'docs/features/01-sample/prd.md': '# Sample PRD\n',
  'docs/features/01-sample/plan.md': '# Sample plan\n',
  'docs/features/01-sample/01-first-slice.md': ticket('done', 'First slice'),
  'docs/features/01-sample/02-second-slice.md': ticket('done', 'Second slice'),
  'docs/features/01-sample/refactor-plan.md':
    '# Refactor plan\n\n' +
    '- [x] 01 extract the parser\n' +
    '- [x] 02 rename the sample\n',
  'docs/features/02-other/prd.md': '# Other PRD\n',
  'docs/features/02-other/01-other-slice.md': ticket('open', 'Other slice'),
};

// The DONE_FEATURE tree with some files replaced, added or (as undefined)
// removed.
function withFiles(changes: Record<string, string | undefined>): Files {
  const files: Files = { ...DONE_FEATURE };
  for (const [path, content] of Object.entries(changes)) {
    if (content === undefined) {
      Reflect.deleteProperty(files, path);
    } else {
      files[path] = content;
    }
  }
  return files;
}

// Reads a tracked file like `git show HEAD:<path>`: a path outside the tree
// throws.
function fileReader(files: Files): (path: string) => string {
  return (path) => {
    const content = files[path];
    if (content === undefined) {
      throw new Error(`fatal: path '${path}' does not exist in 'HEAD'`);
    }
    return content;
  };
}

describe('checkPullRequest', () => {
  let config: Awaited<ReturnType<typeof load>>;

  beforeAll(async () => {
    config = await load({}, { cwd: ROOT, file: 'commitlint.config.js' });
  });

  // The violations of the check, run with the real commitlint config. Every
  // violation carries a reason.
  async function check(
    branch: string | undefined,
    title: string | undefined,
    files: Files = DONE_FEATURE,
  ): Promise<Violation[]> {
    const violations = await checkPullRequest({
      branch,
      title,
      trackedPaths: Object.keys(files),
      readFile: fileReader(files),
      lintTitle: (header) => lintCommitMessages([header], config),
    });
    for (const violation of violations) {
      expect(violation.reason, violation.subject).not.toBe('');
    }
    return violations;
  }

  describe('on a feat branch', () => {
    const BRANCH = 'feat/01-sample';

    it('passes a folder whose Tickets all read status: done', async () => {
      expect(await check(BRANCH, FEATURE_TITLE)).toEqual([]);
    });

    it('ignores the Tickets of other Feature folders', async () => {
      expect(
        await check('feat/02-other', 'feat: [other] add other'),
      ).not.toEqual([]);
      expect(await check(BRANCH, FEATURE_TITLE)).toEqual([]);
    });

    it.each(['open', 'in-progress'])(
      'fails a folder with a Ticket at status: %s',
      async (status) => {
        const files = withFiles({
          'docs/features/01-sample/02-second-slice.md': ticket(
            status,
            'Second slice',
          ),
        });

        expect(await check(BRANCH, FEATURE_TITLE, files)).not.toEqual([]);
      },
    );

    it('passes a done status line carrying the template comment', async () => {
      const files = withFiles({
        'docs/features/01-sample/02-second-slice.md': ticket(
          `done${TEMPLATE_COMMENT}`,
          'Second slice',
        ),
      });

      expect(await check(BRANCH, FEATURE_TITLE, files)).toEqual([]);
    });

    it.each(['open', 'in-progress'])(
      'fails a %s status line carrying the template comment',
      async (status) => {
        const files = withFiles({
          'docs/features/01-sample/02-second-slice.md': ticket(
            `${status}${TEMPLATE_COMMENT}`,
            'Second slice',
          ),
        });

        expect(await check(BRANCH, FEATURE_TITLE, files)).not.toEqual([]);
      },
    );

    it('fails a folder without a Ticket', async () => {
      const files = withFiles({
        'docs/features/01-sample/01-first-slice.md': undefined,
        'docs/features/01-sample/02-second-slice.md': undefined,
      });

      expect(await check(BRANCH, FEATURE_TITLE, files)).not.toEqual([]);
    });

    it('fails when the Feature folder of the branch does not exist', async () => {
      expect(await check('feat/03-sample', FEATURE_TITLE)).not.toEqual([]);
      expect(
        await check('feat/01-missing', 'feat: [missing] add missing'),
      ).not.toEqual([]);
    });
  });

  describe('on a refactor branch', () => {
    const BRANCH = 'refactor/01-sample';

    it('passes a refactor plan whose Refactor steps are all ticked', async () => {
      expect(await check(BRANCH, REFACTOR_TITLE)).toEqual([]);
    });

    it('fails a refactor plan with an unticked Refactor step', async () => {
      const files = withFiles({
        'docs/features/01-sample/refactor-plan.md':
          '# Refactor plan\n\n' +
          '- [x] 01 extract the parser\n' +
          '- [ ] 02 rename the sample\n',
      });

      expect(await check(BRANCH, REFACTOR_TITLE, files)).not.toEqual([]);
    });

    it('fails a folder without refactor-plan.md', async () => {
      const files = withFiles({
        'docs/features/01-sample/refactor-plan.md': undefined,
      });

      expect(await check(BRANCH, REFACTOR_TITLE, files)).not.toEqual([]);
    });
  });

  describe('on a renovate branch', () => {
    const BRANCH = 'renovate/sample-tool-2.x';

    it.each([
      RENOVATE_TITLE,
      'chore: pin dependencies',
      `chore: update dependency ${'a'.repeat(32)}`,
    ])('passes the title %s', async (title) => {
      expect(await check(BRANCH, title)).toEqual([]);
    });

    it('checks no Feature folder and no refactor plan', async () => {
      expect(await check(BRANCH, RENOVATE_TITLE, {})).toEqual([]);
    });

    it.each([
      'fix: update dependency sample-tool to v2',
      'feat: update dependency sample-tool to v2',
      'ci: update dependency sample-tool to v2',
      'chore(deps): update dependency sample-tool to v2',
      'update dependency sample-tool to v2',
    ])('fails the title %s, which is no chore: title', async (title) => {
      expect(await check(BRANCH, title)).not.toEqual([]);
    });

    it.each([
      'chore: [sample] update dependency sample-tool to v2',
      'chore: [sample] 01 update dependency sample-tool to v2',
      'chore: 01 update dependency sample-tool to v2',
    ])(
      'fails the title %s, which carries a feature or a number',
      async (title) => {
        expect(await check(BRANCH, title)).not.toEqual([]);
      },
    );

    it.each([
      'chore: Update dependency sample-tool to v2',
      'chore: update dependency sample-tool to v2.',
      `chore: update dependency ${'a'.repeat(33)}`,
      'chore: update dependency @types/node to v24',
      'chore: update dependency sample-tool, closes #12',
    ])(
      'fails the title %s, whose description breaks a description rule',
      async (title) => {
        expect(await check(BRANCH, title)).not.toEqual([]);
      },
    );
  });

  describe.each([
    'main',
    'fix/01-sample',
    'feat/sample',
    'feature/01-sample',
    'dependabot/npm_and_yarn/sample-tool-2',
    undefined,
  ])('on the branch %s', (branch) => {
    it('fails, as no pull request may come from it', async () => {
      expect(await check(branch, FEATURE_TITLE)).not.toEqual([]);
    });
  });

  describe.each([
    { branch: 'feat/01-sample', valid: FEATURE_TITLE },
    { branch: 'refactor/01-sample', valid: REFACTOR_TITLE },
  ])('the title on $branch', ({ branch, valid }) => {
    it.each([valid, 'docs: [sample] add prd', 'fix: [sample] address review'])(
      'passes %s, which follows the Commit header grammar',
      async (title) => {
        expect(await check(branch, title)).toEqual([]);
      },
    );

    it.each([
      'feat: [sample] 01 add sample',
      'refactor: [sample] 02 tidy the sample',
    ])('fails %s, which carries a number', async (title) => {
      expect(await check(branch, title)).not.toEqual([]);
    });

    it.each([
      'feat: [sample] add sample for @sample-author',
      'feat: [sample] add sample, closes #12',
    ])('fails %s, which carries an @ or a #', async (title) => {
      expect(await check(branch, title)).not.toEqual([]);
    });

    it.each([
      'Add sample',
      'feat(sample): add sample',
      'feat: [sample] Add sample',
    ])('fails %s, which breaks the Commit header grammar', async (title) => {
      expect(await check(branch, title)).not.toEqual([]);
    });

    it('reports what lintTitle reports', async () => {
      const violations = await checkPullRequest({
        branch,
        title: valid,
        trackedPaths: Object.keys(DONE_FEATURE),
        readFile: fileReader(DONE_FEATURE),
        lintTitle: (header) =>
          Promise.resolve([{ subject: header, reason: 'a sample rule' }]),
      });

      expect(violations.map((violation) => violation.reason)).toContain(
        'a sample rule',
      );
    });
  });

  describe.each([
    { branch: 'feat/01-sample' },
    { branch: 'refactor/01-sample' },
    { branch: 'renovate/sample-tool-2.x' },
    { branch: 'main' },
    { branch: undefined },
  ])('without a title on $branch', ({ branch }) => {
    it.each([undefined, ''])('fails the title %j', async (title) => {
      expect(await check(branch, title)).not.toEqual([]);
    });
  });
});

describe('check:pr', { timeout: 60_000 }, () => {
  let repo: string;

  beforeEach(() => {
    // A fresh repository on GitHub's merge ref stand-in (main), with this
    // repository's gate scripts, commitlint config and installed packages
    // beside it, all untracked.
    repo = mkdtempSync(join(tmpdir(), 'dashcash-pr-'));
    installGateScripts(repo);
    initSampleRepository(repo);
    commitFiles(repo, 'docs: [sample] add tickets', DONE_FEATURE);
    setOriginMain(repo);
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('passes the title from PR_TITLE on the branch from GITHUB_HEAD_REF', () => {
    const result = runScript('check:pr', repo, {
      env: {
        PR_TITLE: FEATURE_TITLE,
        GITHUB_HEAD_REF: 'feat/01-sample',
      },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('fails without PR_TITLE and names the reason', () => {
    const result = runScript('check:pr', repo, {
      env: {
        GITHUB_HEAD_REF: 'feat/01-sample',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).not.toBe('');
  });

  it('fails a title from PR_TITLE that carries a number', () => {
    const title = 'feat: [sample] 01 add sample';
    const result = runScript('check:pr', repo, {
      env: {
        PR_TITLE: title,
        GITHUB_HEAD_REF: 'feat/01-sample',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(title);
  });

  it('fails on a branch from which no pull request may come', () => {
    const result = runScript('check:pr', repo, {
      env: {
        PR_TITLE: FEATURE_TITLE,
        GITHUB_HEAD_REF: 'main',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).not.toBe('');
  });

  it('reads the branch from git when the GitHub variables are empty', () => {
    git(repo, 'switch', '--quiet', '--create', 'feat/01-sample');

    const result = runScript('check:pr', repo, {
      env: { PR_TITLE: FEATURE_TITLE },
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('names the branch read from git when no pull request may come from it', () => {
    git(repo, 'switch', '--quiet', '--create', 'topic/sample');

    const result = runScript('check:pr', repo, {
      env: { PR_TITLE: FEATURE_TITLE },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('topic/sample');
  });
});
