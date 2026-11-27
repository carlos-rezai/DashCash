import { readFileSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import { isRecord } from '../isRecord/isRecord.ts';
import {
  runGate,
  type Violation,
} from '../reportViolations/reportViolations.ts';
import { runGit } from '../runGit/runGit.ts';

export type ChangedLines = ReadonlyMap<string, readonly number[]>;
export type CoverageReport = ReadonlyMap<string, ReadonlyMap<number, number>>;

const DIFF_START = 'diff --git ';
const NEW_FILE_HEADER = '+++ ';
const NEW_FILE_PREFIX = 'b/';
const HUNK_HEADER = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/;
const NOT_MEASURED = 'not measured; run `npm test` and `npm run test:stories`';

// Reads a zero-context unified diff (`git diff -U0`) into the added line
// numbers per file. A changed line counts as added; a deleted line and a
// deleted file add nothing, and a file without added lines is left out.
export function findChangedLines(diff: string): ChangedLines {
  const files = new Map<string, number[]>();
  let file: string | undefined;
  let inHeader = false;
  for (const line of diff.split('\n')) {
    if (line.startsWith(DIFF_START)) {
      inHeader = true;
      file = undefined;
    } else if (inHeader && line.startsWith(NEW_FILE_HEADER)) {
      const path = line.slice(NEW_FILE_HEADER.length);
      file = path.startsWith(NEW_FILE_PREFIX)
        ? path.slice(NEW_FILE_PREFIX.length)
        : undefined;
    } else {
      const hunk = HUNK_HEADER.exec(line);
      if (hunk !== null) {
        inHeader = false;
        const first = Number(hunk[1]);
        const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
        if (file !== undefined && count > 0) {
          const added = files.get(file) ?? [];
          for (let offset = 0; offset < count; offset += 1) {
            added.push(first + offset);
          }
          files.set(file, added);
        }
      }
    }
  }
  return files;
}

// Reads an LCOV report into the coverable lines of each file and their hits.
export function readLcov(text: string): CoverageReport {
  const files = new Map<string, Map<number, number>>();
  let lines: Map<number, number> | undefined;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) {
      lines = new Map();
      files.set(line.slice('SF:'.length).replaceAll('\\', '/'), lines);
    } else if (line.startsWith('DA:') && lines !== undefined) {
      const [number, hits] = line.slice('DA:'.length).split(',');
      lines.set(Number(number), Number(hits));
    }
  }
  return files;
}

// The lines as ranges joined: `3, 5–7`.
function formatLines(lines: readonly number[]): string {
  const ranges: { first: number; last: number }[] = [];
  for (const line of lines) {
    const previous = ranges.at(-1);
    if (previous !== undefined && previous.last + 1 === line) {
      previous.last = line;
    } else {
      ranges.push({ first: line, last: line });
    }
  }
  return ranges
    .map(({ first, last }) =>
      first === last ? String(first) : `${String(first)}–${String(last)}`,
    )
    .join(', ');
}

// Returns a violation for every changed file no report lists and, when the
// share of covered changed lines is below the threshold (in percent), a
// summary and the uncovered lines of each file. A line is covered when any
// report counts a hit on it; a changed line no report lists does not count.
export function findCoverageViolations(
  changed: ChangedLines,
  reports: readonly CoverageReport[],
  threshold: number,
): Violation[] {
  const notMeasured: Violation[] = [];
  const uncovered: Violation[] = [];
  let coverable = 0;
  let covered = 0;
  for (const [path, lines] of changed) {
    const listing = reports.filter((report) => report.has(path));
    if (listing.length === 0) {
      notMeasured.push({ subject: path, reason: NOT_MEASURED });
      continue;
    }
    const missed: number[] = [];
    for (const line of lines) {
      const counts = listing.flatMap(
        (report) => report.get(path)?.get(line) ?? [],
      );
      if (counts.length === 0) {
        continue;
      }
      coverable += 1;
      if (counts.some((hits) => hits > 0)) {
        covered += 1;
      } else {
        missed.push(line);
      }
    }
    if (missed.length > 0) {
      uncovered.push({
        subject: path,
        reason: `lines ${formatLines(missed)} not covered`,
      });
    }
  }
  if (coverable === 0 || covered * 100 >= threshold * coverable) {
    return notMeasured;
  }
  const percent = Math.floor((covered * 100) / coverable);
  return [
    ...notMeasured,
    {
      subject: 'changed lines',
      reason: `${String(covered)} of ${String(coverable)} covered (${String(percent)} %), below the threshold of ${String(threshold)} %`,
    },
    ...uncovered,
  ];
}

const BASE_REF = 'origin/main';
const THRESHOLD_FILE = 'quality/coverage-threshold.json';
const REPORT_FILES = ['coverage/unit/lcov.info', 'coverage/stories/lcov.info'];
// The files the coverage measures: the include and exclude patterns of
// vitest.config.ts and vitest.storybook.config.ts. gates/coverage/ pins the
// configs, and checkCoverage.test.ts pins these copies against the configs.
export const MEASURED = [
  'apps/**/*.{ts,tsx}',
  'packages/**/*.{ts,tsx}',
  'scripts/**/*.{ts,tsx}',
  'gates/**/*.{ts,tsx}',
];
export const NOT_MEASURED_FILES = [
  '**/*.test.{ts,tsx}',
  '**/*.stories.{ts,tsx}',
  '**/test-support/**',
  'e2e/**',
  '**/*.d.ts',
];

function isMeasured(path: string): boolean {
  return (
    MEASURED.some((pattern) => matchesGlob(path, pattern)) &&
    !NOT_MEASURED_FILES.some((pattern) => matchesGlob(path, pattern))
  );
}

// The merge base of origin/main and HEAD; throws when either is missing.
function readMergeBase(cwd: string): string {
  try {
    return runGit(cwd, ['merge-base', BASE_REF, 'HEAD']).trim();
  } catch {
    throw new Error(
      `${BASE_REF} is missing or shares no history with HEAD: fetch ${BASE_REF} first (git fetch origin main)`,
    );
  }
}

// The measured files changed since the merge base, in the working tree, and
// the untracked, not ignored ones, every line of which counts as added.
function readChangedLines(cwd: string): ChangedLines {
  const base = readMergeBase(cwd);
  const diff = runGit(cwd, [
    'diff',
    '-U0',
    '--no-color',
    '--src-prefix=a/',
    '--dst-prefix=b/',
    base,
  ]);
  const changed = new Map<string, readonly number[]>();
  for (const [path, lines] of findChangedLines(diff)) {
    if (isMeasured(path)) {
      changed.set(path, lines);
    }
  }
  const untracked = runGit(cwd, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
  ])
    .split('\0')
    .filter((path) => path !== '' && isMeasured(path));
  for (const path of untracked) {
    const text = readFileSync(join(cwd, path), 'utf8');
    const count = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    changed.set(
      path,
      Array.from({ length: count }, (_, index) => index + 1),
    );
  }
  return changed;
}

// The changed-lines threshold, in percent; throws on a file that is missing,
// not JSON or without `changedLines` as a number from 0 to 100.
function readThreshold(cwd: string): number {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(join(cwd, THRESHOLD_FILE), 'utf8'));
  } catch {
    throw new Error(`${THRESHOLD_FILE}: cannot be read as JSON`);
  }
  const threshold = isRecord(value) ? value['changedLines'] : undefined;
  if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
    throw new Error(
      `${THRESHOLD_FILE}: changedLines must be a number from 0 to 100`,
    );
  }
  return threshold;
}

function readReport(cwd: string, path: string): CoverageReport {
  try {
    return readLcov(readFileSync(join(cwd, path), 'utf8'));
  } catch {
    throw new Error(
      `${path}: cannot be read; run \`npm test\` and \`npm run test:stories\``,
    );
  }
}

// Judges the changed lines of the working tree against both coverage reports
// and the threshold file. Throws when any of the inputs cannot be read.
export function checkCoverage(cwd: string): Violation[] {
  const threshold = readThreshold(cwd);
  const reports = REPORT_FILES.map((path) => readReport(cwd, path));
  return findCoverageViolations(readChangedLines(cwd), reports, threshold);
}

if (import.meta.main) {
  await runGate(() => checkCoverage(process.cwd()));
}
