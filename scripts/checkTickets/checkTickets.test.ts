import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  commit,
  commitFiles,
  initSampleRepository,
  installGateScripts,
  runSampleGit as git,
  setOriginMain,
  writeTreeFile,
} from '../test-support/sampleRepository/sampleRepository.ts';
import { runNpmScript as runScript } from '../test-support/runNpmScript/runNpmScript.ts';
import { checkTicketReferences } from './checkTickets.ts';

// A committed tree with two Feature folders. 01-sample holds Tickets 01 and
// 02, a file 04 that is no Ticket, and a refactor plan whose Refactor steps
// are 01 (ticked), 06 (open), 080 (open) and a step 07 ticked with an
// upper-case X, which is no Refactor step; step 05 is only mentioned in prose.
// 02-other holds Tickets 01 and 03 and no refactor plan. The folder draft has
// no number, so it is no Feature folder.
const TREE: Record<string, string> = {
  'README.md': '# Sample\n',
  'docs/features/01-sample/prd.md': '# Sample PRD\n',
  'docs/features/01-sample/01-first-slice.md':
    '---\nstatus: done\n---\n# First slice\n',
  'docs/features/01-sample/02-second-slice.md':
    '---\nstatus: open\n---\n# Second slice\n',
  'docs/features/01-sample/04-sketch.txt': 'an invented sketch\n',
  'docs/features/01-sample/refactor-plan.md':
    '# Refactor plan\n\n' +
    '- [x] 01 extract the parser\n' +
    '- [ ] 06 rename the sample\n' +
    '- [ ] 080 split the sample\n' +
    '- [X] 07 tidy the sample\n\n' +
    'Step 05 waits for the next feature.\n',
  'docs/features/02-other/prd.md': '# Other PRD\n',
  'docs/features/02-other/01-other-slice.md':
    '---\nstatus: open\n---\n# Other slice\n',
  'docs/features/02-other/03-third-slice.md':
    '---\nstatus: open\n---\n# Third slice\n',
  'docs/features/draft/01-draft-slice.md':
    '---\nstatus: open\n---\n# Draft slice\n',
};

const TRACKED_PATHS = Object.keys(TREE);

// Reads a tracked file like `git show HEAD:<path>`: a path outside the tree
// throws.
function readTreeFile(path: string): string {
  const content = TREE[path];
  if (content === undefined) {
    throw new Error(`fatal: path '${path}' does not exist in 'HEAD'`);
  }
  return content;
}

// The headers of the commits the check reports, once each, in range order.
function failingHeaders(
  messages: readonly string[],
  branch: string | undefined,
): string[] {
  const violations = checkTicketReferences(
    [...messages],
    TRACKED_PATHS,
    readTreeFile,
    branch,
  );
  for (const violation of violations) {
    expect(violation.reason, violation.subject).not.toBe('');
  }
  return [...new Set(violations.map((violation) => violation.subject))];
}

// One passing and at least one failing header per rule, checked on no
// branch, so the feature is never compared with one.
const RULE_CASES: { rule: string; passing: string[]; failing: string[] }[] = [
  {
    rule: 'the feature names a Feature folder',
    passing: ['docs: [sample] add prd', 'docs: [other] add prd'],
    failing: [
      'docs: [missing] add prd',
      'docs: [ample] add prd',
      'docs: [draft] add prd',
    ],
  },
  {
    rule: 'feat carries a Ticket number naming a Ticket in its folder',
    passing: ['feat: [sample] 01 add sample', 'feat: [other] 03 add other'],
    failing: [
      'feat: [sample] add sample',
      'feat: [sample] 03 add sample',
      'feat: [sample] 04 add sketch',
      'feat: [missing] 01 add sample',
    ],
  },
  {
    rule: 'fix carries a Ticket number naming a Ticket in its folder',
    passing: ['fix: [sample] 02 address review'],
    failing: [
      'fix: [sample] address review',
      'fix: [sample] 03 address review',
    ],
  },
  {
    rule: 'test carries a Ticket number naming a Ticket in its folder',
    passing: ['test: [sample] 01 add sample tests, RED'],
    failing: [
      'test: [sample] add sample tests, RED',
      'test: [sample] 03 add sample tests, RED',
    ],
  },
  {
    rule: 'refactor carries a number naming a Refactor step in its refactor-plan.md',
    passing: [
      'refactor: [sample] 01 extract the parser',
      'refactor: [sample] 06 rename the sample',
    ],
    failing: [
      'refactor: [sample] extract the parser',
      'refactor: [sample] 02 rename the sample',
      'refactor: [sample] 05 rename the sample',
      'refactor: [sample] 08 split the sample',
      'refactor: [sample] 07 tidy the sample',
      'refactor: [other] 01 extract the parser',
    ],
  },
  {
    rule: 'docs may omit the number, and one it carries names a Ticket',
    passing: ['docs: [sample] add plan', 'docs: [sample] 01 tick ci criterion'],
    failing: ['docs: [sample] 07 tick ci criterion'],
  },
  {
    rule: 'chore may omit the number, and one it carries names a Ticket',
    passing: [
      'chore: [sample] bump the sample tools',
      'chore: [sample] 02 format the sample settings',
    ],
    failing: ['chore: [sample] 07 format the sample settings'],
  },
  {
    rule: 'ci may omit the number, and one it carries names a Ticket',
    passing: [
      'ci: [sample] add the sample workflow',
      'ci: [other] 03 add the other workflow',
    ],
    failing: ['ci: [sample] 07 add the sample workflow'],
  },
];

describe('checkTicketReferences', () => {
  describe.each(RULE_CASES)('$rule', ({ passing, failing }) => {
    it.each(passing)('passes %s', (header) => {
      expect(failingHeaders([header], undefined)).toEqual([]);
    });

    it.each(failing)('fails %s', (header) => {
      expect(failingHeaders([header], undefined)).toEqual([header]);
    });
  });

  it('reports nothing for an empty range', () => {
    expect(failingHeaders([], undefined)).toEqual([]);
  });

  it('passes a Planning commit that names only its Feature folder', () => {
    expect(
      failingHeaders(
        ['docs: [sample] add prd', 'docs: [sample] add tickets'],
        'feat/01-sample',
      ),
    ).toEqual([]);
  });

  it.each([
    "Merge branch 'main' into feat/01-sample",
    "Merge remote-tracking branch 'origin/main' into feat/01-sample",
    "feat: [missing] 01 add sample\n\nMerge branch 'main' into feat/01-sample",
  ])('skips the merge commit %s', (message) => {
    expect(failingHeaders([message], 'feat/01-sample')).toEqual([]);
  });

  it.each([
    'feat(sample): add sample',
    'feat: [sample] 1 add sample',
    'feat: [missing] 09 Add sample',
    'Update the readme',
  ])('raises no ticket violation for the unparsable header %s', (message) => {
    expect(failingHeaders([message], 'feat/01-sample')).toEqual([]);
  });

  it('names a commit with a body by its header', () => {
    expect(
      failingHeaders(
        [
          'feat: [sample] 01 add sample\n\nexplains why the sample exists',
          'feat: [sample] 03 add sample\n\nnames a missing ticket',
        ],
        undefined,
      ),
    ).toEqual(['feat: [sample] 03 add sample']);
  });

  it('reports the failing commits of a mixed range, and only those', () => {
    const range = [
      'docs: [sample] add prd',
      'docs: [missing] add prd',
      'test: [sample] 01 add sample tests, RED',
      "Merge branch 'main' into feat/01-sample",
      'feat: [sample] 03 add sample',
      'feat: [sample] 01 add sample',
      'refactor: [sample] 05 rename the sample',
    ];

    expect(failingHeaders(range, undefined)).toEqual([
      'docs: [missing] add prd',
      'feat: [sample] 03 add sample',
      'refactor: [sample] 05 rename the sample',
    ]);
  });

  describe.each([
    {
      branch: 'feat/01-sample',
      passing: ['feat: [sample] 01 add sample', 'docs: [sample] add prd'],
      failing: ['feat: [other] 01 add other', 'docs: [other] add prd'],
    },
    {
      branch: 'refactor/01-sample',
      passing: ['refactor: [sample] 01 extract the parser'],
      failing: ['docs: [other] add prd', 'fix: [other] 01 address review'],
    },
    {
      branch: 'feat/02-other',
      passing: ['feat: [other] 01 add other'],
      failing: ['feat: [sample] 01 add sample', 'docs: [sample] add prd'],
    },
  ])('on the branch $branch', ({ branch, passing, failing }) => {
    it.each(passing)('passes %s, which names its feature', (header) => {
      expect(failingHeaders([header], branch)).toEqual([]);
    });

    it.each(failing)('fails %s, which names another feature', (header) => {
      expect(failingHeaders([header], branch)).toEqual([header]);
    });
  });

  it.each([
    { branch: 'main' },
    { branch: 'renovate/sample-tool-2.x' },
    { branch: undefined },
  ])('does not compare the feature on the branch $branch', ({ branch }) => {
    expect(
      failingHeaders(
        ['feat: [sample] 01 add sample', 'feat: [other] 01 add other'],
        branch,
      ),
    ).toEqual([]);
  });
});

const SAMPLE_TICKETS = {
  'docs/features/01-sample/prd.md': '# Sample PRD\n',
  'docs/features/01-sample/01-first-slice.md':
    '---\nstatus: open\n---\n# First slice\n',
};

describe('check:tickets', { timeout: 60_000 }, () => {
  let repo: string;

  beforeEach(() => {
    repo = mkdtempSync(join(tmpdir(), 'dashcash-tickets-'));
    installGateScripts(repo);
    initSampleRepository(repo);
    // main's own history is outside every Branch range, so it may name
    // nothing without failing the check.
    commitFiles(repo, 'Initial commit', { 'README.md': '# Sample\n' });
    commit(repo, 'chore: [setup] set up sample repository');
    setOriginMain(repo);
  });

  afterEach(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('passes on a branch whose commits name committed tickets', () => {
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    commitFiles(repo, 'docs: [sample] add tickets', SAMPLE_TICKETS);
    commit(repo, 'test: [sample] 01 add sample tests, RED');
    commit(repo, 'feat: [sample] 01 add sample');

    const result = runScript('check:tickets', repo);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('fails on a commit naming another feature than the branch and names its header', () => {
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    commitFiles(repo, 'docs: [sample] add tickets', SAMPLE_TICKETS);
    commitFiles(repo, 'docs: [sample] add other prd', {
      'docs/features/02-other/prd.md': '# Other PRD\n',
    });
    commit(repo, 'docs: [other] add plan');

    const result = runScript('check:tickets', repo);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('docs: [other] add plan:');
    expect(result.stderr).not.toContain('docs: [sample] add tickets:');
  });

  it('does not count a ticket file that is staged but not committed', () => {
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    commitFiles(repo, 'docs: [sample] add tickets', SAMPLE_TICKETS);
    commit(repo, 'feat: [sample] 01 add sample');
    commit(repo, 'feat: [sample] 02 add second slice');
    writeTreeFile(
      repo,
      'docs/features/01-sample/02-second-slice.md',
      '---\nstatus: open\n---\n# Second slice\n',
    );
    git(repo, 'add', '--', 'docs/features/01-sample/02-second-slice.md');

    const result = runScript('check:tickets', repo);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('feat: [sample] 02 add second slice:');
    expect(result.stderr).not.toContain('feat: [sample] 01 add sample:');
  });

  it('reads the refactor plan as committed, not as changed in the working tree', () => {
    git(repo, 'switch', '--quiet', '-c', 'refactor/01-sample');
    commitFiles(repo, 'docs: [sample] add refactor plan', {
      ...SAMPLE_TICKETS,
      'docs/features/01-sample/refactor-plan.md':
        '# Refactor plan\n\n- [ ] 01 extract the parser\n',
    });
    commit(repo, 'refactor: [sample] 01 extract the parser');
    commit(repo, 'refactor: [sample] 02 rename the sample');
    writeTreeFile(
      repo,
      'docs/features/01-sample/refactor-plan.md',
      '# Refactor plan\n\n- [ ] 01 extract the parser\n- [ ] 02 rename the sample\n',
    );
    git(repo, 'add', '--', 'docs/features/01-sample/refactor-plan.md');

    const result = runScript('check:tickets', repo);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('refactor: [sample] 02 rename the sample:');
    expect(result.stderr).not.toContain(
      'refactor: [sample] 01 extract the parser:',
    );
  });

  it('exits 1 telling to fetch origin/main when the ref is missing', () => {
    git(repo, 'switch', '--quiet', '-c', 'feat/01-sample');
    commit(repo, 'feat: [sample] 01 add sample');
    git(repo, 'update-ref', '-d', 'refs/remotes/origin/main');

    const result = runScript('check:tickets', repo);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/fetch.*origin\/main/i);
  });
});
