import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runNpmScript as runScript } from '../test-support/runNpmScript/runNpmScript.ts';
import {
  commitFiles,
  initSampleRepository,
  installGateScripts,
  ROOT,
  runSampleGit as git,
  setOriginMain,
  writeTreeFile,
} from '../test-support/sampleRepository/sampleRepository.ts';
import {
  checkCoverage,
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

const THRESHOLD_FILE = 'quality/coverage-threshold.json';
const UNIT_REPORT = 'coverage/unit/lcov.info';
const STORIES_REPORT = 'coverage/stories/lcov.info';

// The measured sample file every scenario changes: two lines at the merge
// base, then lines 3 to 6 committed and line 7 in the working tree only.
const SUM = 'packages/sample/src/sum/sum.ts';

// Per file, the coverable lines and their hits, as an LCOV report lists them.
type LcovFiles = Record<string, Record<number, number>>;

// Numbered lines of code, `from` to `to`, one per line.
function code(from: number, to: number): string {
  return lineRange(from, to)
    .map((line) => `export const line${String(line)} = ${String(line)};\n`)
    .join('');
}

// An LCOV report as the V8 provider writes it, its SF: paths joined with the
// separator the platform uses.
function lcov(files: LcovFiles, separator: '/' | '\\'): string {
  return Object.entries(files)
    .map(([path, lines]) => {
      const hits = Object.entries(lines);
      return [
        'TN:',
        `SF:${path.replaceAll('/', separator)}`,
        ...hits.map(([line, count]) => `DA:${line},${String(count)}`),
        `LF:${String(hits.length)}`,
        `LH:${String(hits.filter(([, count]) => count > 0).length)}`,
        'end_of_record\n',
      ].join('\n');
    })
    .join('');
}

// The sample file's report: its two unchanged lines run, and the first
// `covered` of its five changed lines run too.
function sumReport(covered: number): LcovFiles {
  return {
    [SUM]: {
      ...linesWithHits(1, 2, 1),
      ...linesWithHits(3, 2 + covered, 1),
      ...linesWithHits(3 + covered, 7, 0),
    },
  };
}

describe('quality/coverage-threshold.json', () => {
  it('holds exactly the changed-lines threshold of 80', () => {
    const path = join(ROOT, THRESHOLD_FILE);

    expect(existsSync(path)).toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      changedLines: 80,
    });
  });
});

describe('check:coverage', { timeout: 30_000 }, () => {
  let tree: string;

  // Writes both reports, the stories report empty unless given.
  function writeReports(
    unit: LcovFiles,
    stories: LcovFiles = {},
    separator: '/' | '\\' = '/',
  ): void {
    writeTreeFile(tree, UNIT_REPORT, lcov(unit, separator));
    writeTreeFile(tree, STORIES_REPORT, lcov(stories, separator));
  }

  function writeThreshold(text: string): void {
    writeTreeFile(tree, THRESHOLD_FILE, text);
  }

  // Lines 3 to 6 of the sample file committed since the merge base, line 7
  // only in the working tree.
  function changeSum(): void {
    commitFiles(tree, 'change sum', { [SUM]: code(1, 6) });
    writeTreeFile(tree, SUM, code(1, 7));
  }

  function run(): { status: number | null; stdout: string; lines: string[] } {
    const result = runScript('check:coverage', tree);
    return {
      status: result.status,
      stdout: result.stdout,
      lines: result.stderr.split(/\r?\n/).filter((line) => line !== ''),
    };
  }

  beforeEach(() => {
    // A fresh repository with this repository's gate scripts committed at the
    // merge base, so only what a test changes counts; origin/main is HEAD.
    tree = mkdtempSync(join(tmpdir(), 'dashcash-coverage-'));
    installGateScripts(tree);
    initSampleRepository(tree);
    writeTreeFile(
      tree,
      '.gitignore',
      'node_modules\ncoverage/\npackages/sample/src/draft/\n',
    );
    writeTreeFile(tree, 'README.md', '# Sample\n');
    writeTreeFile(tree, SUM, code(1, 2));
    git(tree, 'add', '--all');
    git(tree, 'commit', '--quiet', '-m', 'base');
    setOriginMain(tree);
    writeThreshold('{ "changedLines": 80 }\n');
  });

  afterEach(() => {
    rmSync(tree, { recursive: true, force: true });
  });

  it.each([
    ['at', 4],
    ['above', 5],
  ])(
    'exits 0 without output %s the threshold, committed and working-tree lines counted',
    (_, covered) => {
      changeSum();
      writeReports(sumReport(covered));

      const result = run();

      expect(result.status, result.lines.join('\n')).toBe(0);
      expect(result.stdout).toBe('');
      expect(result.lines).toEqual([]);
    },
  );

  it('exits 1 below the threshold with the summary, then the uncovered lines of each file from both reports', () => {
    const product = 'packages/sample/src/product/product.ts';
    changeSum();
    commitFiles(tree, 'add product', { [product]: code(1, 3) });
    writeReports(sumReport(3), { [product]: { 1: 1, 2: 0, 3: 1 } });

    const result = run();

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.lines[0]).toBe(
      'changed lines: 5 of 8 covered (62 %), below the threshold of 80 %',
    );
    expect(result.lines.slice(1).sort()).toEqual(
      [
        `${SUM}: lines 6–7 not covered`,
        `${product}: lines 2 not covered`,
      ].sort(),
    );
  });

  it('counts every line of an untracked file, and leaves out an ignored one', () => {
    const fresh = 'packages/sample/src/fresh/fresh.ts';
    writeTreeFile(tree, fresh, code(1, 3));
    writeTreeFile(tree, 'packages/sample/src/draft/draft.ts', code(1, 2));
    writeReports({ [fresh]: linesWithHits(1, 3, 0) });

    const result = run();

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.lines).toEqual([
      'changed lines: 0 of 3 covered (0 %), below the threshold of 80 %',
      `${fresh}: lines 1–3 not covered`,
    ]);
  });

  it('exits 0 without output when no changed line is coverable', () => {
    changeSum();
    writeReports({ [SUM]: linesWithHits(1, 2, 0) });

    const result = run();

    expect(result.status, result.lines.join('\n')).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.lines).toEqual([]);
  });

  it.each([
    'apps/desktop/src/main/db/open.ts',
    'apps/desktop/src/renderer/primitives/Icon/Icon.tsx',
    'packages/domain/src/money/cents.ts',
    'scripts/sample/sample.ts',
    'gates/sample/sample.ts',
  ])('exits 1 for a changed measured file in neither report: %s', (path) => {
    commitFiles(tree, 'add a measured file', { [path]: code(1, 2) });
    writeReports({});

    const result = run();

    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.lines).toEqual([`${path}: ${NOT_MEASURED}`]);
  });

  it('exits 0 without output for changed files the coverage does not measure, in neither report', () => {
    commitFiles(tree, 'add files the coverage does not measure', {
      'README.md': '# Sample\n\nChanged.\n',
      'docs/notes.md': '# Notes\n',
      'packages/sample/src/sum/sum.test.ts': code(1, 2),
      'apps/desktop/src/renderer/primitives/Icon/Icon.stories.tsx': code(1, 2),
      'apps/desktop/src/main/test-support/fakeDb/fakeDb.ts': code(1, 2),
      'packages/sample/src/types/env.d.ts': code(1, 2),
      'e2e/import-csv.spec.ts': code(1, 2),
      'packages/sample/src/sum/sum.js': code(1, 2),
      'tools/sample/sample.ts': code(1, 2),
    });
    writeTreeFile(tree, 'gates/sample/sample.test.ts', code(1, 2));
    writeReports({});

    const result = run();

    expect(result.status, result.lines.join('\n')).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.lines).toEqual([]);
  });

  it.each([
    [0, 0],
    [60, 3],
    [100, 5],
  ])(
    'exits 0 at a threshold of %i with %i of 5 changed lines covered',
    (threshold, covered) => {
      writeThreshold(`{ "changedLines": ${String(threshold)} }\n`);
      changeSum();
      writeReports(sumReport(covered));

      const result = run();

      expect(result.status, result.lines.join('\n')).toBe(0);
      expect(result.lines).toEqual([]);
    },
  );

  it('exits 1 below the threshold the threshold file names', () => {
    writeThreshold('{ "changedLines": 100 }\n');
    changeSum();
    writeReports(sumReport(4));

    const result = run();

    expect(result.status).toBe(1);
    expect(result.lines).toEqual([
      'changed lines: 4 of 5 covered (80 %), below the threshold of 100 %',
      `${SUM}: lines 7 not covered`,
    ]);
  });

  it.each([
    ['is missing', undefined],
    ['is not JSON', '{ "changedLines": 80\n'],
    ['holds a number, not an object', '80\n'],
    ['holds null', 'null\n'],
    ['holds an array', '[80]\n'],
    ['has no changedLines', '{}\n'],
    ['has changedLines as a string', '{ "changedLines": "80" }\n'],
    ['has changedLines below 0', '{ "changedLines": -1 }\n'],
    ['has changedLines above 100', '{ "changedLines": 101 }\n'],
  ])('exits 1, naming the file, when the threshold file %s', (_, text) => {
    if (text === undefined) {
      rmSync(join(tree, THRESHOLD_FILE));
    } else {
      writeThreshold(text);
    }
    changeSum();
    writeReports(sumReport(5));

    const result = run();

    expect(result.status).toBe(1);
    expect(result.lines.join('\n')).toContain(THRESHOLD_FILE);
  });

  it.each([
    [UNIT_REPORT, 'missing'],
    [STORIES_REPORT, 'missing'],
    [UNIT_REPORT, 'a folder, not a file'],
    [STORIES_REPORT, 'a folder, not a file'],
  ])('exits 1, naming the report, when %s is %s', (report, state) => {
    changeSum();
    writeReports(sumReport(5));
    rmSync(join(tree, report));
    if (state !== 'missing') {
      mkdirSync(join(tree, report));
    }

    const result = run();

    expect(result.status).toBe(1);
    expect(result.lines.join('\n')).toContain(report);
  });

  it('exits 1, naming origin/main, when there is no origin/main', () => {
    changeSum();
    writeReports(sumReport(5));
    git(tree, 'update-ref', '-d', 'refs/remotes/origin/main');

    const result = run();

    expect(result.status).toBe(1);
    expect(result.lines.join('\n')).toContain('origin/main');
  });

  it('exits 1, naming origin/main, when origin/main shares no merge base with HEAD', () => {
    changeSum();
    writeReports(sumReport(5));
    const unrelated = git(
      tree,
      'commit-tree',
      'HEAD^{tree}',
      '-m',
      'unrelated',
    );
    git(tree, 'update-ref', 'refs/remotes/origin/main', unrelated);

    const result = run();

    expect(result.status).toBe(1);
    expect(result.lines.join('\n')).toContain('origin/main');
  });

  it('reads reports whose SF: paths use backslashes, as on Windows, and names files as git does', () => {
    changeSum();
    writeReports(sumReport(3), {}, '\\');

    const result = run();

    expect(result.status).toBe(1);
    expect(result.lines).toEqual([
      'changed lines: 3 of 5 covered (60 %), below the threshold of 80 %',
      `${SUM}: lines 6–7 not covered`,
    ]);
  });

  // The same checks run in this process, so the coverage reports see the entry.
  describe('checkCoverage in this process', () => {
    it('returns the violations below the threshold, with an untracked file counted whole', () => {
      const fresh = 'packages/sample/src/fresh/fresh.ts';
      changeSum();
      writeTreeFile(tree, fresh, code(1, 3));
      writeReports({ ...sumReport(5), [fresh]: linesWithHits(1, 3, 0) });

      expect(checkCoverage(tree)).toEqual([
        {
          subject: 'changed lines',
          reason: '5 of 8 covered (62 %), below the threshold of 80 %',
        },
        { subject: fresh, reason: 'lines 1–3 not covered' },
      ]);
    });

    it('returns nothing at the threshold', () => {
      changeSum();
      writeReports(sumReport(4));

      expect(checkCoverage(tree)).toEqual([]);
    });

    it('throws for a threshold file that is not valid', () => {
      writeThreshold('{ "changedLines": 101 }\n');
      writeReports({});

      expect(() => checkCoverage(tree)).toThrow(THRESHOLD_FILE);
    });

    it('throws for a threshold file that is not JSON', () => {
      writeThreshold('{');
      writeReports({});

      expect(() => checkCoverage(tree)).toThrow(THRESHOLD_FILE);
    });

    it('throws for a missing report', () => {
      writeReports({});
      rmSync(join(tree, STORIES_REPORT));

      expect(() => checkCoverage(tree)).toThrow(STORIES_REPORT);
    });

    it('throws without origin/main', () => {
      writeReports({});
      git(tree, 'update-ref', '-d', 'refs/remotes/origin/main');

      expect(() => checkCoverage(tree)).toThrow('origin/main');
    });
  });

  it.each(['diff.noprefix', 'diff.mnemonicPrefix'])(
    'reads the diff with %s set in the git config',
    (setting) => {
      git(tree, 'config', setting, 'true');
      changeSum();
      writeReports(sumReport(3));

      const result = run();

      expect(result.status).toBe(1);
      expect(result.lines).toEqual([
        'changed lines: 3 of 5 covered (60 %), below the threshold of 80 %',
        `${SUM}: lines 6–7 not covered`,
      ]);
    },
  );
});
