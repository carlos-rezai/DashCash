import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isRecord } from '../isRecord/isRecord.ts';
import { readCalendarDate } from '../readCalendarDate/readCalendarDate.ts';
import {
  formatViolation,
  type Violation,
} from '../reportViolations/reportViolations.ts';

export const QUARANTINE_FILE = 'quality/flaky-quarantine.json';
export const E2E_FOLDER = 'e2e/';
const TEXT_FIELDS = ['file', 'title', 'ticket', 'owner'] as const;
const DATE_FIELDS = ['added', 'expires'] as const;
const REGEX_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

export type QuarantineEntry = {
  file: string;
  title: string;
  ticket: string;
  owner: string;
  added: string;
  expires: string;
};

export type ReadQuarantine = {
  entries: QuarantineEntry[];
  violations: Violation[];
};

export type ReadQuarantineEntry =
  { entry: QuarantineEntry } | { problems: Violation[] };

export type LoadedQuarantine =
  { quarantine: unknown } | { violation: Violation };

// Reads and parses the Quarantine file under `root`. A file that cannot be
// read or parsed gives one violation instead of a value.
export function loadQuarantine(root: string): LoadedQuarantine {
  try {
    return {
      quarantine: JSON.parse(
        readFileSync(join(root, QUARANTINE_FILE), 'utf8'),
      ) as unknown,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      violation: {
        subject: QUARANTINE_FILE,
        reason: `cannot be read as JSON: ${message.split('\n')[0] ?? ''}`,
      },
    };
  }
}

export function buildEntryViolation(
  index: number,
  field: string,
  why: string,
): Violation {
  return {
    subject: QUARANTINE_FILE,
    reason: `entry ${String(index)}, field ${field}: ${why}`,
  };
}

function isFilled(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

// The shape problems of one entry, one violation per field, in the order of
// the entry format.
function findEntryProblems(
  entry: Record<string, unknown>,
  index: number,
): Violation[] {
  const problems: Violation[] = [];
  for (const field of TEXT_FIELDS) {
    if (!isFilled(entry[field])) {
      problems.push(buildEntryViolation(index, field, 'must not be empty'));
    }
  }
  for (const field of DATE_FIELDS) {
    const value = entry[field];
    if (value === undefined || value === '') {
      problems.push(buildEntryViolation(index, field, 'must not be empty'));
    } else if (readCalendarDate(value) === undefined) {
      problems.push(
        buildEntryViolation(index, field, 'must be a real YYYY-MM-DD date'),
      );
    }
  }
  return problems;
}

// Reads one value of the Quarantine: the entry when it is well-formed, its
// shape violations, numbered by `index`, otherwise. A value that is not an
// object reads as an empty entry.
export function readQuarantineEntry(
  value: unknown,
  index: number,
): ReadQuarantineEntry {
  const entry = isRecord(value) ? value : {};
  const problems = findEntryProblems(entry, index);
  return problems.length === 0
    ? { entry: entry as QuarantineEntry }
    : { problems };
}

// Splits the Quarantine into its well-formed entries and the shape violations
// of the rest. A value that is not an array has no entries and one violation.
// The date and file rules belong to the Quarantine check.
export function readQuarantine(quarantine: unknown): ReadQuarantine {
  if (!Array.isArray(quarantine)) {
    return {
      entries: [],
      violations: [
        {
          subject: QUARANTINE_FILE,
          reason: 'must be an array of quarantine entries',
        },
      ],
    };
  }
  const entries: QuarantineEntry[] = [];
  const violations: Violation[] = [];
  (quarantine as unknown[]).forEach((value, index) => {
    const read = readQuarantineEntry(value, index);
    if ('entry' in read) {
      entries.push(read.entry);
    } else {
      violations.push(...read.problems);
    }
  });
  return { entries, violations };
}

function escapeRegExp(text: string): string {
  return text.replace(REGEX_CHARACTERS, '\\$&');
}

// One regular expression per entry, for Playwright's grepInvert. Playwright
// matches it against the project name, the file relative to e2e/, the title
// and the tags, joined by spaces; the pattern holds the file and the title
// literally, so a title is left out only in its own file, whatever tags it
// carries. A `/` in the file matches `/` and `\`, for either platform.
export function buildQuarantinePatterns(
  entries: readonly QuarantineEntry[],
): RegExp[] {
  return entries.map(({ file, title }) => {
    const relative = file.startsWith(E2E_FOLDER)
      ? file.slice(E2E_FOLDER.length)
      : file;
    const path = escapeRegExp(relative).replaceAll('/', '[\\\\/]');
    return new RegExp(`(?:^| )${path} ${escapeRegExp(title)}(?: @\\S+)*$`);
  });
}

function throwViolations(violations: readonly Violation[]): never {
  throw new Error(violations.map(formatViolation).join('\n'));
}

// Loads and reads the Quarantine under `root` and returns its patterns. A
// Quarantine that cannot be loaded or is malformed throws one error with one
// `<subject>: <reason>` line per violation, so a run never skips tests
// silently.
export function loadQuarantinePatterns(root: string): RegExp[] {
  const loaded = loadQuarantine(root);
  if ('violation' in loaded) {
    return throwViolations([loaded.violation]);
  }
  const { entries, violations } = readQuarantine(loaded.quarantine);
  if (violations.length > 0) {
    return throwViolations(violations);
  }
  return buildQuarantinePatterns(entries);
}
