import { describe, expect, it } from 'vitest';
import {
  findChangedLines,
  findCoverageViolations,
  readLcov,
} from './checkCoverage.ts';

// The lines of a unified diff, joined as `git diff -U0` prints them.
function diff(...lines: string[]): string {
  return `${lines.join('\n')}\n`;
}

// The header `git diff` prints before the hunks of a changed file.
function changedFileHeader(path: string): string[] {
  return [
    `diff --git a/${path} b/${path}`,
    'index 1a2b3c4..5d6e7f8 100644',
    `--- a/${path}`,
    `+++ b/${path}`,
  ];
}

// The changed lines the core reads, per file.
function changed(
  files: Record<string, number[]>,
): ReadonlyMap<string, readonly number[]> {
  return new Map(Object.entries(files));
}

// One coverage report: per file, the coverable lines and their hits.
function report(
  files: Record<string, Record<number, number>>,
): ReadonlyMap<string, ReadonlyMap<number, number>> {
  return new Map(
    Object.entries(files).map(([path, lines]) => [
      path,
      new Map(
        Object.entries(lines).map(([line, hits]) => [Number(line), hits]),
      ),
    ]),
  );
}

// Lines `from` to `to`, each with the same number of hits.
function linesWithHits(
  from: number,
  to: number,
  hits: number,
): Record<number, number> {
  const lines: Record<number, number> = {};
  for (let line = from; line <= to; line += 1) {
    lines[line] = hits;
  }
  return lines;
}

// The numbers `from` to `to`.
function lineRange(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

const EMPTY_REPORT = report({});

const NOT_MEASURED = 'not measured; run `npm test` and `npm run test:stories`';

describe('findChangedLines', () => {
  it('returns no files for an empty diff', () => {
    expect(findChangedLines('')).toEqual(new Map());
  });

  it('reads added lines as added', () => {
    const text = diff(
      ...changedFileHeader('scripts/a.ts'),
      '@@ -5,0 +6,2 @@ export function a() {',
      '+  const b = 1;',
      '+  const c = 2;',
    );

    expect(findChangedLines(text)).toEqual(new Map([['scripts/a.ts', [6, 7]]]));
  });

  it('reads one changed line as added', () => {
    const text = diff(
      ...changedFileHeader('scripts/a.ts'),
      '@@ -3 +3 @@',
      '-const a = 1;',
      '+const a = 2;',
    );

    expect(findChangedLines(text)).toEqual(new Map([['scripts/a.ts', [3]]]));
  });

  it('reads several changed lines as added, by their new line numbers', () => {
    const text = diff(
      ...changedFileHeader('scripts/a.ts'),
      '@@ -3,2 +4,3 @@',
      '-const a = 1;',
      '-const b = 1;',
      '+const a = 2;',
      '+const b = 2;',
      '+const c = 2;',
    );

    expect(findChangedLines(text)).toEqual(
      new Map([['scripts/a.ts', [4, 5, 6]]]),
    );
  });

  it('adds nothing for deleted lines', () => {
    const text = diff(
      ...changedFileHeader('scripts/a.ts'),
      '@@ -8,2 +7,0 @@ export function a() {',
      '-  const b = 1;',
      '-  const c = 2;',
    );

    expect(findChangedLines(text)).toEqual(new Map());
  });

  it('reads the added lines of several hunks in one file, deleted hunks left out', () => {
    const text = diff(
      ...changedFileHeader('scripts/a.ts'),
      '@@ -2,0 +3,2 @@',
      '+const b = 1;',
      '+const c = 1;',
      '@@ -10,3 +11,0 @@',
      '-const d = 1;',
      '-const e = 1;',
      '-const f = 1;',
      '@@ -20 +18 @@ export function g() {',
      '-  return 1;',
      '+  return 2;',
      '@@ -30,0 +29,3 @@ export function h() {',
      '+  const i = 1;',
      '+  const j = 1;',
      '+  const k = 1;',
    );

    expect(findChangedLines(text)).toEqual(
      new Map([['scripts/a.ts', [3, 4, 18, 29, 30, 31]]]),
    );
  });

  it('reads the added lines of several files, each under its own path', () => {
    const text = diff(
      ...changedFileHeader('apps/desktop/src/main/db/open.ts'),
      '@@ -1 +1 @@',
      '-const a = 1;',
      '+const a = 2;',
      ...changedFileHeader('packages/domain/src/money/cents.ts'),
      '@@ -4,0 +5,2 @@',
      '+const b = 1;',
      '+const c = 1;',
      ...changedFileHeader('scripts/a.ts'),
      '@@ -7,2 +6,0 @@',
      '-const d = 1;',
      '-const e = 1;',
      ...changedFileHeader('scripts/b.ts'),
      '@@ -12,0 +13 @@',
      '+const f = 1;',
    );

    expect(findChangedLines(text)).toEqual(
      new Map([
        ['apps/desktop/src/main/db/open.ts', [1]],
        ['packages/domain/src/money/cents.ts', [5, 6]],
        ['scripts/b.ts', [13]],
      ]),
    );
  });

  it('does not read an added line that looks like a file header as a header', () => {
    const text = diff(
      ...changedFileHeader('scripts/a.ts'),
      '@@ -2,0 +3,2 @@',
      '+const a = 1;',
      '+++ b/scripts/x.ts',
      '@@ -9,0 +12 @@',
      '+const b = 1;',
    );

    expect(findChangedLines(text)).toEqual(
      new Map([['scripts/a.ts', [3, 4, 12]]]),
    );
  });

  it('reads every line of a new file as added', () => {
    const text = diff(
      'diff --git a/scripts/new.ts b/scripts/new.ts',
      'new file mode 100644',
      'index 0000000..5d6e7f8',
      '--- /dev/null',
      '+++ b/scripts/new.ts',
      '@@ -0,0 +1,3 @@',
      '+const a = 1;',
      '+const b = 1;',
      '+export { a, b };',
      '\\ No newline at end of file',
    );

    expect(findChangedLines(text)).toEqual(
      new Map([['scripts/new.ts', [1, 2, 3]]]),
    );
  });

  it('adds nothing for a deleted file', () => {
    const text = diff(
      'diff --git a/scripts/old.ts b/scripts/old.ts',
      'deleted file mode 100644',
      'index 1a2b3c4..0000000',
      '--- a/scripts/old.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-const a = 1;',
      '-const b = 1;',
    );

    expect(findChangedLines(text)).toEqual(new Map());
  });
});

describe('readLcov', () => {
  it('returns no files for an empty report', () => {
    expect(readLcov('')).toEqual(new Map());
  });

  it('reads the coverable lines of a file, with and without hits', () => {
    const text = [
      'TN:',
      'SF:scripts/a.ts',
      'FN:1,a',
      'FNF:1',
      'FNH:1',
      'FNDA:2,a',
      'DA:1,2',
      'DA:2,0',
      'DA:4,17',
      'DA:5,0',
      'LF:4',
      'LH:2',
      'BRDA:4,0,0,17',
      'BRF:1',
      'BRH:1',
      'end_of_record',
      '',
    ].join('\n');

    expect(readLcov(text)).toEqual(
      new Map([
        [
          'scripts/a.ts',
          new Map([
            [1, 2],
            [2, 0],
            [4, 17],
            [5, 0],
          ]),
        ],
      ]),
    );
  });

  it('reads several files, each with its own lines', () => {
    const text = [
      'TN:',
      'SF:apps/desktop/src/main/db/open.ts',
      'DA:1,1',
      'DA:2,0',
      'LF:2',
      'LH:1',
      'end_of_record',
      'TN:',
      'SF:scripts/a.ts',
      'DA:1,0',
      'DA:3,5',
      'LF:2',
      'LH:1',
      'end_of_record',
      'TN:',
      'SF:scripts/b.ts',
      'DA:7,3',
      'LF:1',
      'LH:1',
      'end_of_record',
      '',
    ].join('\n');

    expect(readLcov(text)).toEqual(
      new Map([
        [
          'apps/desktop/src/main/db/open.ts',
          new Map([
            [1, 1],
            [2, 0],
          ]),
        ],
        [
          'scripts/a.ts',
          new Map([
            [1, 0],
            [3, 5],
          ]),
        ],
        ['scripts/b.ts', new Map([[7, 3]])],
      ]),
    );
  });
});

describe('findCoverageViolations', () => {
  it('counts a line as covered when only the unit report counts a hit on it', () => {
    const unit = report({ 'scripts/a.ts': { 1: 1, 2: 4, 3: 0, 4: 0 } });
    const stories = report({ 'scripts/a.ts': { 1: 0, 2: 0, 3: 2, 4: 1 } });

    expect(
      findCoverageViolations(
        changed({ 'scripts/a.ts': [1, 2, 3, 4] }),
        [unit, stories],
        100,
      ),
    ).toEqual([]);
  });

  it('counts a line as covered when the only report that lists the file counts a hit on it', () => {
    const stories = report({
      'apps/desktop/src/renderer/primitives/Icon/Icon.tsx': { 1: 1, 2: 3 },
    });

    expect(
      findCoverageViolations(
        changed({
          'apps/desktop/src/renderer/primitives/Icon/Icon.tsx': [1, 2],
        }),
        [EMPTY_REPORT, stories],
        100,
      ),
    ).toEqual([]);
  });

  it('leaves out changed lines no report lists, both from the count and from the uncovered lines', () => {
    // Lines 1 and 8 are listed by no report; line 9 is listed but unchanged.
    const unit = report({
      'scripts/a.ts': { 2: 1, 3: 0, 4: 0, 6: 1, 7: 1, 9: 0 },
    });
    const stories = report({ 'scripts/a.ts': { 3: 0, 5: 0 } });

    expect(
      findCoverageViolations(
        changed({ 'scripts/a.ts': lineRange(1, 8) }),
        [unit, stories],
        80,
      ),
    ).toEqual([
      {
        subject: 'changed lines',
        reason: '3 of 6 covered (50 %), below the threshold of 80 %',
      },
      { subject: 'scripts/a.ts', reason: 'lines 3–5 not covered' },
    ]);
  });

  it('reports a changed file that neither report lists as not measured, without counting its lines', () => {
    const unit = report({ 'scripts/a.ts': { 1: 1, 2: 1 } });
    const stories = report({
      'apps/desktop/src/renderer/primitives/Icon/Icon.tsx': { 1: 1 },
    });

    expect(
      findCoverageViolations(
        changed({ 'scripts/a.ts': [1, 2], 'scripts/new.ts': [1, 2, 3] }),
        [unit, stories],
        80,
      ),
    ).toEqual([{ subject: 'scripts/new.ts', reason: NOT_MEASURED }]);
  });

  it('returns nothing when no changed line is coverable', () => {
    const unit = report({ 'scripts/a.ts': { 5: 0 } });

    expect(
      findCoverageViolations(
        changed({ 'scripts/a.ts': [1, 2, 3] }),
        [unit, EMPTY_REPORT],
        100,
      ),
    ).toEqual([]);
  });

  it('returns nothing when there are no changed lines', () => {
    const unit = report({ 'scripts/a.ts': { 1: 0 } });

    expect(
      findCoverageViolations(changed({}), [unit, EMPTY_REPORT], 80),
    ).toEqual([]);
  });

  it('returns nothing when the threshold is exactly met', () => {
    const unit = report({ 'scripts/a.ts': { 1: 1, 2: 1, 3: 1, 4: 1, 5: 0 } });

    expect(
      findCoverageViolations(
        changed({ 'scripts/a.ts': [1, 2, 3, 4, 5] }),
        [unit, EMPTY_REPORT],
        80,
      ),
    ).toEqual([]);
  });

  it('returns nothing above the threshold', () => {
    const unit = report({
      'scripts/a.ts': {
        ...linesWithHits(1, 9, 1),
        ...linesWithHits(10, 10, 0),
      },
    });

    expect(
      findCoverageViolations(
        changed({ 'scripts/a.ts': lineRange(1, 10) }),
        [unit, EMPTY_REPORT],
        80,
      ),
    ).toEqual([]);
  });

  it('reports a threshold just missed, its share rounded down so it never reads as met', () => {
    const unit = report({
      'scripts/a.ts': {
        ...linesWithHits(1, 399, 1),
        ...linesWithHits(400, 500, 0),
      },
    });

    expect(
      findCoverageViolations(
        changed({ 'scripts/a.ts': lineRange(1, 500) }),
        [unit, EMPTY_REPORT],
        80,
      ),
    ).toEqual([
      {
        subject: 'changed lines',
        reason: '399 of 500 covered (79 %), below the threshold of 80 %',
      },
      { subject: 'scripts/a.ts', reason: 'lines 400–500 not covered' },
    ]);
  });

  it('below the threshold, names the uncovered lines of each file with ranges joined, and leaves out covered files', () => {
    const unit = report({
      'scripts/a.ts': {
        1: 1,
        2: 1,
        3: 0,
        4: 1,
        5: 0,
        6: 0,
        7: 0,
      },
      'scripts/c.ts': linesWithHits(1, 10, 2),
    });
    const stories = report({ 'scripts/b.ts': { 10: 0, 11: 0, 20: 0 } });

    expect(
      findCoverageViolations(
        changed({
          'scripts/a.ts': lineRange(1, 7),
          'scripts/b.ts': [10, 11, 20],
          'scripts/c.ts': lineRange(1, 10),
        }),
        [unit, stories],
        80,
      ),
    ).toEqual([
      {
        subject: 'changed lines',
        reason: '13 of 20 covered (65 %), below the threshold of 80 %',
      },
      { subject: 'scripts/a.ts', reason: 'lines 3, 5–7 not covered' },
      { subject: 'scripts/b.ts', reason: 'lines 10–11, 20 not covered' },
    ]);
  });
});
