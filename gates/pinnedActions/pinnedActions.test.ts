import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findUnpinnedUses } from './pinnedActions.ts';

// Every `uses:` in every workflow is a Pinned action: a remote action named
// by its full 40-character commit SHA, with its release as a trailing
// `# v…` comment, or a local `./…` action. The rule reads the workflow as
// text, so a new workflow file is covered without changing this test.

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const WORKFLOWS = join(ROOT, '.github', 'workflows');

const SHA = '0123456789abcdef0123456789abcdef01234567';

function workflowWith(...uses: string[]): string {
  return [
    'name: Sample',
    '',
    'on: push',
    '',
    'jobs:',
    '  sample:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    ...uses.map((line) => `      - uses: ${line}`),
    '      - run: npm test',
    '',
  ].join('\n');
}

function listWorkflowFiles(): string[] {
  return readdirSync(WORKFLOWS, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

describe('the pinned-actions rule on invented workflow text', () => {
  it.each([
    ['a tag reference', 'sample-owner/sample-action@v3'],
    ['a release tag reference', 'sample-owner/sample-action@v3.2.1'],
    ['a short SHA', 'sample-owner/sample-action@0123456'],
    ['a branch name', 'sample-owner/sample-action@main'],
    ['a pin without its comment', `sample-owner/sample-action@${SHA}`],
  ])('reports %s', (_case, reference) => {
    expect(findUnpinnedUses(workflowWith(reference))).toEqual([reference]);
  });

  it('reports a pin whose comment names no release', () => {
    expect(
      findUnpinnedUses(
        workflowWith(`sample-owner/sample-action@${SHA} # latest`),
      ),
    ).toEqual([`sample-owner/sample-action@${SHA}`]);
  });

  it.each([
    ['an action', `sample-owner/sample-action@${SHA} # v3.2.1`],
    [
      'an action in a path',
      `sample-owner/sample-repo/sub/action@${SHA} # v1.0.0`,
    ],
  ])('passes %s pinned by SHA with its release', (_case, reference) => {
    expect(findUnpinnedUses(workflowWith(reference))).toEqual([]);
  });

  it('passes a local action', () => {
    expect(
      findUnpinnedUses(workflowWith('./.github/actions/sample-setup')),
    ).toEqual([]);
  });

  it('reports every unpinned use of a workflow and passes its local action', () => {
    expect(
      findUnpinnedUses(
        workflowWith(
          'sample-owner/first-action@v2',
          './.github/actions/sample-setup',
          `sample-owner/second-action@${SHA} # v4.0.1`,
          'sample-owner/third-action@main',
        ),
      ),
    ).toEqual([
      'sample-owner/first-action@v2',
      'sample-owner/third-action@main',
    ]);
  });

  it('reports a reusable workflow called by tag at job level', () => {
    const workflow = [
      'name: Sample',
      'on: push',
      'jobs:',
      '  sample:',
      '    uses: sample-owner/sample-repo/.github/workflows/sample.yml@v1',
      '',
    ].join('\n');

    expect(findUnpinnedUses(workflow)).toEqual([
      'sample-owner/sample-repo/.github/workflows/sample.yml@v1',
    ]);
  });
});

describe("the repository's workflows", () => {
  const files = listWorkflowFiles();

  it.each(files.map((file) => [file.slice(ROOT.length), file]))(
    '%s uses only pinned or local actions',
    (_name, file) => {
      expect(findUnpinnedUses(readFileSync(file, 'utf8'))).toEqual([]);
    },
  );
});
