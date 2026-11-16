import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Violation } from '../reportViolations/reportViolations.ts';
import { runNpmScript as runScript } from '../test-support/runNpmScript/runNpmScript.ts';
import {
  initSampleRepository,
  installGateScripts,
  writeTreeFile,
} from '../test-support/sampleRepository/sampleRepository.ts';
import {
  checkQuarantine,
  findQuarantineViolations,
} from './checkQuarantine.ts';

const QUARANTINE_FILE = 'quality/flaky-quarantine.json';
const TODAY = '2026-11-15';
const SPEC = 'e2e/sample-flow.spec.ts';
const NESTED_SPEC = 'e2e/flows/other-flow.spec.ts';
const TICKET = 'docs/features/07-sample-feature/03-sample-ticket.md';
const OTHER_TICKET = 'docs/features/12-other-feature/01-first-ticket.md';

const SHAPE_REASON = 'must be an array of quarantine entries';
const FILE_REASON = 'must name a tracked e2e/ spec file';
const TICKET_REASON = 'must name a tracked ticket';
const LATER_REASON = 'is later than today';
const BEFORE_ADDED_REASON = 'is before added';
const LIMIT_REASON = 'is more than 30 days after added';

// The invented tracked tree every core test judges against: the specs and
// tickets entries may name, and look-alikes they may not.
const TRACKED_PATHS = [
  'package.json',
  SPEC,
  NESTED_SPEC,
  'e2e/test-support/sampleFixture.ts',
  'e2e/sample-flow.test.ts',
  'e2e/sample-flow.spec.ts.bak',
  'apps/desktop/src/sample.spec.ts',
  'other/e2e/sample-flow.spec.ts',
  TICKET,
  OTHER_TICKET,
  'docs/features/07-sample-feature/prd.md',
  'docs/features/07-sample-feature/plan.md',
  'docs/features/07-sample-feature/design-log.md',
  'docs/features/07-sample-feature/refactor-plan.md',
  'docs/features/07-sample-feature/3-short-number.md',
  'docs/features/07-sample-feature/notes/03-sample-ticket.md',
  'docs/features/07-sample-feature/03-sample-ticket.txt',
  'docs/features/sample-feature/03-sample-ticket.md',
  'docs/conventions.md',
];

type EntrySpec = Record<string, unknown>;

// A valid entry for TODAY: added two weeks before, expiring two weeks after.
function entry(spec: EntrySpec = {}): EntrySpec {
  return {
    file: SPEC,
    title: 'Sample flow',
    ticket: TICKET,
    owner: 'sample-owner',
    added: '2026-11-01',
    expires: '2026-11-29',
    ...spec,
  };
}

function onEntry(index: number, field: string, why: string): Violation {
  return {
    subject: QUARANTINE_FILE,
    reason: `entry ${String(index)}, field ${field}: ${why}`,
  };
}

function expired(index: number, date: string): Violation {
  return onEntry(index, 'expires', `expired on ${date}`);
}

// The same violations, in any order.
function expectViolations(
  actual: readonly Violation[],
  expected: readonly Violation[],
): void {
  expect(actual).toHaveLength(expected.length);
  expect(actual).toEqual(expect.arrayContaining([...expected]));
}

describe('findQuarantineViolations', () => {
  it('finds nothing in an empty quarantine', () => {
    expect(findQuarantineViolations([], TODAY, TRACKED_PATHS)).toEqual([]);
  });

  it('finds nothing for valid entries', () => {
    expect(
      findQuarantineViolations(
        [entry(), entry({ file: NESTED_SPEC, ticket: OTHER_TICKET })],
        TODAY,
        TRACKED_PATHS,
      ),
    ).toEqual([]);
  });

  describe('the shape of the quarantine', () => {
    it.each([
      ['an object', { file: SPEC }],
      ['null', null],
      ['a string', SPEC],
      ['a number', 30],
    ])('reports a quarantine that is %s, not an array', (_, quarantine) => {
      expect(
        findQuarantineViolations(quarantine, TODAY, TRACKED_PATHS),
      ).toEqual([{ subject: QUARANTINE_FILE, reason: SHAPE_REASON }]);
    });

    it.each<[string, EntrySpec, string, string]>([
      ['a missing file', { file: undefined }, 'file', 'must not be empty'],
      ['an empty file', { file: '' }, 'file', 'must not be empty'],
      ['an empty title', { title: '' }, 'title', 'must not be empty'],
      [
        'a missing ticket',
        { ticket: undefined },
        'ticket',
        'must not be empty',
      ],
      ['an empty owner', { owner: '' }, 'owner', 'must not be empty'],
      [
        'a missing added date',
        { added: undefined },
        'added',
        'must not be empty',
      ],
      [
        'an added date that is not YYYY-MM-DD',
        { added: '2026/11/01' },
        'added',
        'must be a real YYYY-MM-DD date',
      ],
      ['an empty expiry date', { expires: '' }, 'expires', 'must not be empty'],
      [
        'an expiry date that is no real date',
        { expires: '2026-11-31' },
        'expires',
        'must be a real YYYY-MM-DD date',
      ],
    ])(
      'reports %s as one violation naming the entry and the field',
      (_, spec, field, why) => {
        expect(
          findQuarantineViolations(
            [entry(), entry(spec)],
            TODAY,
            TRACKED_PATHS,
          ),
        ).toEqual([onEntry(1, field, why)]);
      },
    );

    it('reports an entry that is not an object by each of its fields', () => {
      expectViolations(
        findQuarantineViolations([entry(), null], TODAY, TRACKED_PATHS),
        ['file', 'title', 'ticket', 'owner', 'added', 'expires'].map((field) =>
          onEntry(1, field, 'must not be empty'),
        ),
      );
    });
  });

  describe('the added date', () => {
    it.each<[string, EntrySpec, string, Violation[]]>([
      ['added today', { added: TODAY, expires: '2026-11-20' }, TODAY, []],
      [
        'added yesterday',
        { added: '2026-11-14', expires: '2026-11-20' },
        TODAY,
        [],
      ],
      [
        'added tomorrow',
        { added: '2026-11-16', expires: '2026-11-20' },
        TODAY,
        [onEntry(0, 'added', LATER_REASON)],
      ],
      [
        'added in the next year',
        { added: '2027-01-01', expires: '2027-01-10' },
        '2026-12-31',
        [onEntry(0, 'added', LATER_REASON)],
      ],
    ])('judges an entry %s', (_, spec, today, expected) => {
      expect(
        findQuarantineViolations([entry(spec)], today, TRACKED_PATHS),
      ).toEqual(expected);
    });
  });

  describe('an expiry date before the added date', () => {
    it.each<[string, EntrySpec, Violation[]]>([
      [
        'expiring on the day it was added',
        { added: TODAY, expires: TODAY },
        [],
      ],
      [
        'expiring the day after it was added',
        { added: TODAY, expires: '2026-11-16' },
        [],
      ],
      [
        'expiring the day before it was added',
        { added: '2026-11-21', expires: '2026-11-20' },
        [
          onEntry(0, 'added', LATER_REASON),
          onEntry(0, 'expires', BEFORE_ADDED_REASON),
        ],
      ],
      [
        'expiring a year before it was added',
        { added: '2027-11-20', expires: '2026-11-20' },
        [
          onEntry(0, 'added', LATER_REASON),
          onEntry(0, 'expires', BEFORE_ADDED_REASON),
        ],
      ],
    ])('judges an entry %s', (_, spec, expected) => {
      expectViolations(
        findQuarantineViolations([entry(spec)], TODAY, TRACKED_PATHS),
        expected,
      );
    });
  });

  describe('the 30-day limit', () => {
    it.each<[string, EntrySpec, string, Violation[]]>([
      [
        'expiring 29 days after it was added',
        { added: '2026-11-01', expires: '2026-11-30' },
        TODAY,
        [],
      ],
      [
        'expiring exactly 30 days after it was added',
        { added: '2026-11-01', expires: '2026-12-01' },
        TODAY,
        [],
      ],
      [
        'expiring 31 days after it was added',
        { added: '2026-11-01', expires: '2026-12-02' },
        TODAY,
        [onEntry(0, 'expires', LIMIT_REASON)],
      ],
      [
        'expiring 30 days after it was added, across a year end',
        { added: '2026-12-20', expires: '2027-01-19' },
        '2026-12-25',
        [],
      ],
      [
        'expiring 31 days after it was added, across a year end',
        { added: '2026-12-20', expires: '2027-01-20' },
        '2026-12-25',
        [onEntry(0, 'expires', LIMIT_REASON)],
      ],
      [
        'expiring 30 days after it was added, across a leap day',
        { added: '2028-02-10', expires: '2028-03-11' },
        '2028-02-15',
        [],
      ],
      [
        'expiring 31 days after it was added, across a leap day',
        { added: '2028-02-10', expires: '2028-03-12' },
        '2028-02-15',
        [onEntry(0, 'expires', LIMIT_REASON)],
      ],
      [
        'expiring a year after it was added',
        { added: '2026-11-01', expires: '2027-11-01' },
        TODAY,
        [onEntry(0, 'expires', LIMIT_REASON)],
      ],
    ])('judges an entry %s', (_, spec, today, expected) => {
      expect(
        findQuarantineViolations([entry(spec)], today, TRACKED_PATHS),
      ).toEqual(expected);
    });
  });

  describe('the expiry date', () => {
    it.each<[string, EntrySpec, string, Violation[]]>([
      [
        'the day before its expiry date',
        { added: '2026-11-01', expires: '2026-11-29' },
        '2026-11-28',
        [],
      ],
      [
        'on its expiry date',
        { added: '2026-11-01', expires: '2026-11-29' },
        '2026-11-29',
        [],
      ],
      [
        'the day after its expiry date',
        { added: '2026-11-01', expires: '2026-11-29' },
        '2026-11-30',
        [expired(0, '2026-11-29')],
      ],
      [
        'a week after its expiry date',
        { added: '2026-11-01', expires: '2026-11-29' },
        '2026-12-06',
        [expired(0, '2026-11-29')],
      ],
      [
        'the day after its expiry date, across a year end',
        { added: '2026-12-15', expires: '2026-12-31' },
        '2027-01-01',
        [expired(0, '2026-12-31')],
      ],
    ])('judges an entry %s', (_, spec, today, expected) => {
      expect(
        findQuarantineViolations([entry(spec)], today, TRACKED_PATHS),
      ).toEqual(expected);
    });
  });

  describe('the file', () => {
    it.each([
      ['a tracked spec file under e2e/', SPEC],
      ['a tracked spec file in a folder under e2e/', NESTED_SPEC],
    ])('accepts %s', (_, file) => {
      expect(
        findQuarantineViolations([entry({ file })], TODAY, TRACKED_PATHS),
      ).toEqual([]);
    });

    it.each([
      ['a spec file that is not tracked', 'e2e/missing-flow.spec.ts'],
      [
        'a tracked file under e2e/ that is no spec',
        'e2e/test-support/sampleFixture.ts',
      ],
      ['a tracked .test.ts file under e2e/', 'e2e/sample-flow.test.ts'],
      [
        'a tracked file that only starts like a spec',
        'e2e/sample-flow.spec.ts.bak',
      ],
      ['a tracked spec file outside e2e/', 'apps/desktop/src/sample.spec.ts'],
      [
        'a tracked spec file in another e2e folder',
        'other/e2e/sample-flow.spec.ts',
      ],
      ['a spec file written with ./', `./${SPEC}`],
      ['a spec file written with backslashes', 'e2e\\sample-flow.spec.ts'],
      ['the e2e folder itself', 'e2e/'],
      ['a tracked file that is no spec', 'package.json'],
    ])('reports %s', (_, file) => {
      expect(
        findQuarantineViolations(
          [entry(), entry({ file })],
          TODAY,
          TRACKED_PATHS,
        ),
      ).toEqual([onEntry(1, 'file', FILE_REASON)]);
    });
  });

  describe('the ticket', () => {
    it.each([
      ['a tracked ticket', TICKET],
      ['a tracked ticket of another feature', OTHER_TICKET],
    ])('accepts %s', (_, ticket) => {
      expect(
        findQuarantineViolations([entry({ ticket })], TODAY, TRACKED_PATHS),
      ).toEqual([]);
    });

    it.each([
      [
        'a ticket that is not tracked',
        'docs/features/07-sample-feature/04-missing-ticket.md',
      ],
      ['a tracked PRD', 'docs/features/07-sample-feature/prd.md'],
      ['a tracked plan', 'docs/features/07-sample-feature/plan.md'],
      ['a tracked design log', 'docs/features/07-sample-feature/design-log.md'],
      [
        'a tracked refactor plan',
        'docs/features/07-sample-feature/refactor-plan.md',
      ],
      [
        'a tracked file with a one-digit number',
        'docs/features/07-sample-feature/3-short-number.md',
      ],
      [
        'a tracked file in a folder below the feature',
        'docs/features/07-sample-feature/notes/03-sample-ticket.md',
      ],
      [
        'a tracked file that is no Markdown',
        'docs/features/07-sample-feature/03-sample-ticket.txt',
      ],
      [
        'a tracked file in an unnumbered folder',
        'docs/features/sample-feature/03-sample-ticket.md',
      ],
      ['a tracked document outside docs/features/', 'docs/conventions.md'],
      ['a tracked spec file', SPEC],
    ])('reports %s', (_, ticket) => {
      expect(
        findQuarantineViolations(
          [entry(), entry({ ticket })],
          TODAY,
          TRACKED_PATHS,
        ),
      ).toEqual([onEntry(1, 'ticket', TICKET_REASON)]);
    });
  });

  describe('several causes', () => {
    it('reports every cause of one entry, one violation each', () => {
      expectViolations(
        findQuarantineViolations(
          [
            entry({
              file: 'e2e/missing-flow.spec.ts',
              ticket: 'docs/conventions.md',
              added: '2026-10-01',
              expires: '2026-10-31',
            }),
          ],
          TODAY,
          TRACKED_PATHS,
        ),
        [
          expired(0, '2026-10-31'),
          onEntry(0, 'file', FILE_REASON),
          onEntry(0, 'ticket', TICKET_REASON),
        ],
      );
    });

    it('reports the causes of every entry in one run, each by its own index', () => {
      expectViolations(
        findQuarantineViolations(
          [
            entry(),
            entry({ title: '' }),
            entry({ added: '2026-10-01', expires: '2026-10-31' }),
            entry({ file: 'e2e/test-support/sampleFixture.ts' }),
            entry({ added: '2026-11-20', expires: '2027-01-01' }),
            entry({ ticket: 'docs/features/07-sample-feature/prd.md' }),
          ],
          TODAY,
          TRACKED_PATHS,
        ),
        [
          onEntry(1, 'title', 'must not be empty'),
          expired(2, '2026-10-31'),
          onEntry(3, 'file', FILE_REASON),
          onEntry(4, 'added', LATER_REASON),
          onEntry(4, 'expires', LIMIT_REASON),
          onEntry(5, 'ticket', TICKET_REASON),
        ],
      );
    });

    it('lists the shape violations of every entry first, then the date and path violations of each well-formed entry', () => {
      expect(
        findQuarantineViolations(
          [
            entry({ title: '', added: '' }),
            entry({
              file: 'e2e/missing-flow.spec.ts',
              added: '2026-10-01',
              expires: '2026-10-31',
            }),
            entry({ owner: '' }),
            entry({
              added: '2026-11-20',
              expires: '2027-01-01',
              ticket: 'docs/conventions.md',
            }),
          ],
          TODAY,
          TRACKED_PATHS,
        ),
      ).toEqual([
        onEntry(0, 'title', 'must not be empty'),
        onEntry(0, 'added', 'must not be empty'),
        onEntry(2, 'owner', 'must not be empty'),
        expired(1, '2026-10-31'),
        onEntry(1, 'file', FILE_REASON),
        onEntry(3, 'added', LATER_REASON),
        onEntry(3, 'expires', LIMIT_REASON),
        onEntry(3, 'ticket', TICKET_REASON),
      ]);
    });
  });
});

const UNREADABLE_REASON = /^cannot be read as JSON: \S/;

describe('checkQuarantine', () => {
  let root: string;

  // The invented tracked tree for the root under test, and nothing for any
  // other folder.
  function listTrackedPaths(path: string): string[] {
    return path === root ? TRACKED_PATHS : [];
  }

  function writeQuarantine(quarantine: unknown): void {
    writeTreeFile(
      root,
      QUARANTINE_FILE,
      `${JSON.stringify(quarantine, null, 2)}\n`,
    );
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dashcash-quarantine-check-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it.each<[string, EntrySpec, string, Violation[]]>([
    ['a valid entry', {}, TODAY, []],
    [
      'an entry added later than today',
      { added: '2026-11-16', expires: '2026-11-20' },
      TODAY,
      [onEntry(0, 'added', LATER_REASON)],
    ],
    [
      'an entry expiring before it was added',
      { added: '2026-11-21', expires: '2026-11-20' },
      TODAY,
      [
        onEntry(0, 'added', LATER_REASON),
        onEntry(0, 'expires', BEFORE_ADDED_REASON),
      ],
    ],
    [
      'an entry expiring more than 30 days after it was added',
      { added: '2026-11-01', expires: '2026-12-02' },
      TODAY,
      [onEntry(0, 'expires', LIMIT_REASON)],
    ],
    [
      'an entry on its expiry date',
      { added: '2026-11-01', expires: '2026-11-29' },
      '2026-11-29',
      [],
    ],
    [
      'an entry the day after its expiry date',
      { added: '2026-11-01', expires: '2026-11-29' },
      '2026-11-30',
      [expired(0, '2026-11-29')],
    ],
  ])(
    'judges %s in the quarantine under the root against the given today',
    (_, spec, today, expected) => {
      writeQuarantine([entry(spec)]);

      expect(checkQuarantine({ root, today, listTrackedPaths })).toEqual(
        expected,
      );
    },
  );

  it('judges the file and the ticket against the paths listed for the root', () => {
    writeQuarantine([entry()]);

    expect(
      checkQuarantine({
        root,
        today: TODAY,
        listTrackedPaths: (path) => (path === root ? [SPEC] : TRACKED_PATHS),
      }),
    ).toEqual([onEntry(0, 'ticket', TICKET_REASON)]);
  });

  it('returns the load violation for a missing quarantine file', () => {
    expect(checkQuarantine({ root, today: TODAY, listTrackedPaths })).toEqual([
      {
        subject: QUARANTINE_FILE,
        reason: expect.stringMatching(UNREADABLE_REASON) as string,
      },
    ]);
  });

  it('returns the load violation for a quarantine file that is no JSON', () => {
    writeTreeFile(root, QUARANTINE_FILE, '[{ "file": ');

    expect(checkQuarantine({ root, today: TODAY, listTrackedPaths })).toEqual([
      {
        subject: QUARANTINE_FILE,
        reason: expect.stringMatching(UNREADABLE_REASON) as string,
      },
    ]);
  });
});

function lines(stderr: string): string[] {
  return stderr.split(/\r?\n/).filter((line) => line !== '');
}

describe('check:quarantine', { timeout: 30_000 }, () => {
  let tree: string;

  function writeQuarantine(content: string): void {
    writeTreeFile(tree, QUARANTINE_FILE, content);
  }

  beforeEach(() => {
    // A fresh repository with this repository's gate scripts beside it, so
    // the npm script's relative path resolves; the scripts stay untracked.
    tree = mkdtempSync(join(tmpdir(), 'dashcash-quarantine-'));
    installGateScripts(tree);
    initSampleRepository(tree);
  });

  afterEach(() => {
    rmSync(tree, { recursive: true, force: true });
  });

  it('exits 0 without output on an empty quarantine', () => {
    writeQuarantine('[]\n');

    const result = runScript('check:quarantine', tree);

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('fails closed on a missing quarantine file with one line', () => {
    const result = runScript('check:quarantine', tree);

    expect(result.status).toBe(1);
    expect(lines(result.stderr)).toEqual([
      expect.stringMatching(
        /^quality\/flaky-quarantine\.json: cannot be read as JSON: \S/,
      ) as string,
    ]);
  });

  it('fails closed on a quarantine file that is no JSON with one line', () => {
    writeQuarantine('[{ "file": ');

    const result = runScript('check:quarantine', tree);

    expect(result.status).toBe(1);
    expect(lines(result.stderr)).toEqual([
      expect.stringMatching(
        /^quality\/flaky-quarantine\.json: cannot be read as JSON: \S/,
      ) as string,
    ]);
  });

  it('fails on a malformed entry with exit code 1 and one subject: reason line per cause', () => {
    writeQuarantine(
      `${JSON.stringify([entry({ title: undefined, owner: undefined })], null, 2)}\n`,
    );

    const result = runScript('check:quarantine', tree);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(lines(result.stderr).sort()).toEqual(
      [
        `${QUARANTINE_FILE}: entry 0, field title: must not be empty`,
        `${QUARANTINE_FILE}: entry 0, field owner: must not be empty`,
      ].sort(),
    );
  });
});
