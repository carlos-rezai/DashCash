import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isRecord } from '../isRecord/isRecord.ts';
import { readCalendarDate } from '../readCalendarDate/readCalendarDate.ts';
import type { Violation } from '../reportViolations/reportViolations.ts';

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
    const entry = isRecord(value) ? value : {};
    const problems = findEntryProblems(entry, index);
    if (problems.length === 0) {
      entries.push(entry as QuarantineEntry);
    } else {
      violations.push(...problems);
    }
  });
  return { entries, violations };
}

function escapeRegExp(text: string): string {
  return text.replace(REGEX_CHARACTERS, '\\$&');
}

// One regular expression per entry, for Playwright's grepInvert. Playwright
// matches it against the project name, the file relative to e2e/ and the
// title, joined by spaces; the pattern holds the file and the title literally,
// so a title is left out only in its own file.
export function buildQuarantinePatterns(
  entries: readonly QuarantineEntry[],
): RegExp[] {
  return entries.map(({ file, title }) => {
    const relative = file.startsWith(E2E_FOLDER)
      ? file.slice(E2E_FOLDER.length)
      : file;
    return new RegExp(
      `(?:^| )${escapeRegExp(relative)} ${escapeRegExp(title)}$`,
    );
  });
}
