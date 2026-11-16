import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildEntryViolation,
  buildQuarantinePatterns,
  E2E_FOLDER,
  loadQuarantine,
  QUARANTINE_FILE,
  readQuarantine,
  readQuarantineEntry,
  type QuarantineEntry,
} from './readQuarantine.ts';

const FIELDS = ['file', 'title', 'ticket', 'owner', 'added', 'expires'];

const DATE_FIELDS = ['added', 'expires'];

const NOT_REAL_DATES: readonly (readonly [string, string])[] = [
  ['an impossible date', '2026-11-31'],
  ['a date without its leading zeros', '2026-11-1'],
  ['a date with slashes', '2026/11/10'],
  ['a date and a time', '2026-11-10T08:00:00Z'],
  ['a word', 'tomorrow'],
];

// Invented entries: the tests, tickets and owners exist nowhere.
const START_ENTRY: QuarantineEntry = {
  file: 'e2e/start-app.spec.ts',
  title: 'Start the app',
  ticket: 'docs/features/04-desktop-shell/17-flaky-start.md',
  owner: 'sample-owner',
  added: '2026-11-10',
  expires: '2026-12-01',
};

const IMPORT_ENTRY: QuarantineEntry = {
  file: 'e2e/import-csv.spec.ts',
  title: 'Import a statement',
  ticket: 'docs/features/05-csv-import/09-flaky-import.md',
  owner: 'other-owner',
  added: '2026-11-12',
  expires: '2026-11-30',
};

// An invented entry for a spec in a subfolder of e2e/.
const SUB_ENTRY: QuarantineEntry = {
  ...START_ENTRY,
  file: 'e2e/sub/start.spec.ts',
  title: 'Start',
};

const TAGS = ['@slow', '@smoke'];

// The text a quarantine pattern is matched against, as input for the unit
// tests: the project's name (empty in this repository), the file relative to
// testDir, the test's title and its tags, joined by spaces. Playwright's own
// text is checked by the --list test in gates/endToEnd/.
function grepTitle(
  file: string,
  title: string,
  tags: readonly string[] = [],
): string {
  return ['', file, title, ...tags].join(' ');
}

function isLeftOut(patterns: readonly RegExp[], title: string): boolean {
  return patterns.some((pattern) => pattern.test(title));
}

function entryViolation(index: number, field: string, why: string): unknown {
  return {
    subject: QUARANTINE_FILE,
    reason: `entry ${String(index)}, field ${field}: ${why}`,
  };
}

describe('the shared names', () => {
  it('names the committed Quarantine file and the end-to-end folder', () => {
    expect(QUARANTINE_FILE).toBe('quality/flaky-quarantine.json');
    expect(E2E_FOLDER).toBe('e2e/');
  });

  it('builds an entry violation with the Quarantine file as its subject', () => {
    expect(buildEntryViolation(2, 'owner', 'must not be empty')).toEqual({
      subject: 'quality/flaky-quarantine.json',
      reason: 'entry 2, field owner: must not be empty',
    });
  });
});

describe('loadQuarantine', () => {
  let root: string;

  function writeQuarantine(content: string): void {
    const path = join(root, QUARANTINE_FILE);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dashcash-load-quarantine-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('parses the Quarantine file under the given root', () => {
    writeQuarantine(`${JSON.stringify([START_ENTRY], null, 2)}\n`);

    expect(loadQuarantine(root)).toEqual({ quarantine: [START_ENTRY] });
  });

  it('returns a value that is no array as it is, for the reader to judge', () => {
    writeQuarantine('{ "entries": [] }');

    expect(loadQuarantine(root)).toEqual({ quarantine: { entries: [] } });
  });

  it('reports a missing file as one violation on one line', () => {
    const loaded = loadQuarantine(root);

    expect(loaded).toEqual({
      violation: {
        subject: QUARANTINE_FILE,
        reason: expect.stringMatching(
          /^cannot be read as JSON: [^\n]+$/,
        ) as string,
      },
    });
  });

  it('reports a file that is no JSON as one violation on one line', () => {
    writeQuarantine('[{ "file": ');

    const loaded = loadQuarantine(root);

    expect(loaded).toEqual({
      violation: {
        subject: QUARANTINE_FILE,
        reason: expect.stringMatching(
          /^cannot be read as JSON: [^\n]+$/,
        ) as string,
      },
    });
  });
});

describe('readQuarantine', () => {
  it('reads an empty Quarantine as no entries and no violations', () => {
    expect(readQuarantine([])).toEqual({ entries: [], violations: [] });
  });

  it('returns the well-formed entries in their order', () => {
    expect(readQuarantine([START_ENTRY, IMPORT_ENTRY])).toEqual({
      entries: [START_ENTRY, IMPORT_ENTRY],
      violations: [],
    });
  });

  it.each([
    ['an object', { entries: [START_ENTRY] }],
    ['a string', '[]'],
    ['a number', 0],
    ['null', null],
    ['undefined', undefined],
  ])('reports %s as not an array, with no entries', (_name, quarantine) => {
    expect(readQuarantine(quarantine)).toEqual({
      entries: [],
      violations: [
        {
          subject: QUARANTINE_FILE,
          reason: 'must be an array of quarantine entries',
        },
      ],
    });
  });

  it.each(FIELDS)('reports a missing %s as empty', (field) => {
    const entry = Object.fromEntries(
      Object.entries(START_ENTRY).filter(([key]) => key !== field),
    );

    expect(readQuarantine([entry])).toEqual({
      entries: [],
      violations: [entryViolation(0, field, 'must not be empty')],
    });
  });

  it.each(FIELDS)('reports an empty %s', (field) => {
    expect(readQuarantine([{ ...START_ENTRY, [field]: '' }])).toEqual({
      entries: [],
      violations: [entryViolation(0, field, 'must not be empty')],
    });
  });

  it.each(
    DATE_FIELDS.flatMap((field) =>
      NOT_REAL_DATES.map(([kind, value]): [string, string, string] => [
        field,
        kind,
        value,
      ]),
    ),
  )('reports a %s that is %s', (field, _kind, value) => {
    expect(readQuarantine([{ ...START_ENTRY, [field]: value }])).toEqual({
      entries: [],
      violations: [entryViolation(0, field, 'must be a real YYYY-MM-DD date')],
    });
  });

  it('reports every bad field of one entry, in the order of the entry format', () => {
    expect(
      readQuarantine([
        {
          file: '',
          title: 'Start the app',
          ticket: '',
          added: '2026-02-30',
          expires: 'soon',
        },
      ]),
    ).toEqual({
      entries: [],
      violations: [
        entryViolation(0, 'file', 'must not be empty'),
        entryViolation(0, 'ticket', 'must not be empty'),
        entryViolation(0, 'owner', 'must not be empty'),
        entryViolation(0, 'added', 'must be a real YYYY-MM-DD date'),
        entryViolation(0, 'expires', 'must be a real YYYY-MM-DD date'),
      ],
    });
  });

  it('numbers each entry by its index and keeps the well-formed ones', () => {
    expect(
      readQuarantine([
        START_ENTRY,
        { ...IMPORT_ENTRY, owner: '' },
        IMPORT_ENTRY,
        { ...START_ENTRY, expires: '2026-13-01' },
      ]),
    ).toEqual({
      entries: [START_ENTRY, IMPORT_ENTRY],
      violations: [
        entryViolation(1, 'owner', 'must not be empty'),
        entryViolation(3, 'expires', 'must be a real YYYY-MM-DD date'),
      ],
    });
  });

  it('leaves the date and file rules to the Quarantine check', () => {
    const outOfRules = {
      ...START_ENTRY,
      file: 'apps/desktop/src/main/startApp/startApp.test.ts',
      ticket: 'docs/features/99-missing/01-missing.md',
      added: '2026-12-01',
      expires: '2025-01-01',
    };

    expect(readQuarantine([outOfRules])).toEqual({
      entries: [outOfRules],
      violations: [],
    });
  });
});

describe('readQuarantineEntry', () => {
  it('gives the entry of a well-formed value', () => {
    expect(readQuarantineEntry(START_ENTRY, 4)).toEqual({
      entry: START_ENTRY,
    });
  });

  it('gives the violation of an empty field under the index it was given', () => {
    expect(readQuarantineEntry({ ...START_ENTRY, owner: '' }, 4)).toEqual({
      problems: [entryViolation(4, 'owner', 'must not be empty')],
    });
  });
});

describe('buildQuarantinePatterns', () => {
  it('builds no pattern for an empty Quarantine', () => {
    expect(buildQuarantinePatterns([])).toEqual([]);
  });

  it('builds one regular expression per entry', () => {
    const patterns = buildQuarantinePatterns([START_ENTRY, IMPORT_ENTRY]);

    expect(patterns).toHaveLength(2);
    for (const pattern of patterns) {
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });

  it('matches the quarantined title in its file, relative to e2e/', () => {
    const [pattern] = buildQuarantinePatterns([START_ENTRY]);

    expect(pattern?.test(grepTitle('start-app.spec.ts', 'Start the app'))).toBe(
      true,
    );
  });

  it('matches each entry with its own pattern', () => {
    const [start, csv] = buildQuarantinePatterns([START_ENTRY, IMPORT_ENTRY]);

    expect(start?.test(grepTitle('start-app.spec.ts', 'Start the app'))).toBe(
      true,
    );
    expect(
      csv?.test(grepTitle('import-csv.spec.ts', 'Import a statement')),
    ).toBe(true);
    expect(
      start?.test(grepTitle('import-csv.spec.ts', 'Import a statement')),
    ).toBe(false);
  });

  it.each([
    ['the same title in another file', 'import-csv.spec.ts', 'Start the app'],
    [
      'the same title in a file whose name ends in its file name',
      'restart-app.spec.ts',
      'Start the app',
    ],
    ['another title in its file', 'start-app.spec.ts', 'Close the app'],
    [
      'a longer title that starts with it',
      'start-app.spec.ts',
      'Start the app twice',
    ],
    ['its title in another case', 'start-app.spec.ts', 'start the app'],
    [
      'its file with any character for a dot',
      'start-appXspecXts',
      'Start the app',
    ],
  ])('does not match %s', (_name, file, title) => {
    expect(
      isLeftOut(buildQuarantinePatterns([START_ENTRY]), grepTitle(file, title)),
    ).toBe(false);
  });

  it.each([
    ['dots, brackets and a question mark', 'saves report.csv [draft]?'],
    ['parentheses and a plus', 'adds (1+1) accounts'],
    ['a star and a caret', 'finds ^start* rows'],
    ['a dollar, a pipe and braces', 'shows $ total | {all}'],
    ['a backslash', 'reads C:\\sample\\file'],
  ])('matches a title with %s literally', (_name, title) => {
    const patterns = buildQuarantinePatterns([{ ...START_ENTRY, title }]);

    expect(isLeftOut(patterns, grepTitle('start-app.spec.ts', title))).toBe(
      true,
    );
  });

  it.each([
    ['saves report.csv [draft]?', 'saves reportXcsv d'],
    ['saves report.csv [draft]?', 'saves report.csv draft'],
    ['adds (1+1) accounts', 'adds 11 accounts'],
    ['adds (1+1) accounts', 'adds 1111 accounts'],
    ['finds start* rows', 'finds star rows'],
    ['finds start* rows', 'finds starttt rows'],
    ['shows $ total | {all}', '{all}'],
    ['reads C:\\sample\\file', 'reads C: ample\file'],
  ])('does not match %s loosely, as %s', (title, loose) => {
    const patterns = buildQuarantinePatterns([{ ...START_ENTRY, title }]);

    expect(isLeftOut(patterns, grepTitle('start-app.spec.ts', loose))).toBe(
      false,
    );
  });

  it('builds the pattern of the design log for an entry in a subfolder', () => {
    expect(buildQuarantinePatterns([SUB_ENTRY]).map(String)).toEqual([
      String.raw`/(?:^| )sub[\\/]start\.spec\.ts Start(?: @\S+)*$/`,
    ]);
  });

  it('matches an entry in a subfolder with either path separator', () => {
    const patterns = buildQuarantinePatterns([SUB_ENTRY]);

    expect(
      ['sub/start.spec.ts', 'sub\\start.spec.ts'].map((file) =>
        isLeftOut(patterns, grepTitle(file, 'Start')),
      ),
    ).toEqual([true, true]);
  });

  it.each([
    ['one tag', ['@slow']],
    ['several tags', ['@slow', '@smoke', '@issue-17']],
  ])('matches the quarantined test with %s after its title', (_name, tags) => {
    const patterns = buildQuarantinePatterns([START_ENTRY]);

    expect(
      isLeftOut(
        patterns,
        grepTitle('start-app.spec.ts', 'Start the app', tags),
      ),
    ).toBe(true);
  });

  it('matches a title that holds a tag, which Playwright repeats as a tag', () => {
    const patterns = buildQuarantinePatterns([
      { ...START_ENTRY, title: 'Start the app @slow' },
    ]);

    expect(
      isLeftOut(
        patterns,
        grepTitle('start-app.spec.ts', 'Start the app @slow', ['@slow']),
      ),
    ).toBe(true);
  });

  // Each look-alike carries the same tags as the quarantined test, which the
  // pattern leaves out, so its own result shows the tags loosen nothing.
  it.each([
    ['the same title in another file', 'import-csv.spec.ts', 'Start'],
    ['the same title in another folder', 'other/start.spec.ts', 'Start'],
    [
      'the same title in a top-level file of that name',
      'start.spec.ts',
      'Start',
    ],
    [
      'its file with any character for the separator',
      'subXstart.spec.ts',
      'Start',
    ],
    ['a longer title that starts with it', 'sub/start.spec.ts', 'Start twice'],
    [
      'a longer title with a tag inside',
      'sub/start.spec.ts',
      'Start @slow twice',
    ],
  ])('does not match %s, tagged alike', (_name, file, title) => {
    const patterns = buildQuarantinePatterns([SUB_ENTRY]);

    expect(isLeftOut(patterns, grepTitle(file, title, TAGS))).toBe(false);
    expect(
      isLeftOut(patterns, grepTitle('sub/start.spec.ts', 'Start', TAGS)),
    ).toBe(true);
  });
});
