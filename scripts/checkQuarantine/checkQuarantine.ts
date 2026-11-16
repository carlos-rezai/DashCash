import { readCalendarDate } from '../readCalendarDate/readCalendarDate.ts';
import {
  buildEntryViolation,
  E2E_FOLDER,
  loadQuarantine,
  readQuarantine,
  readQuarantineEntry,
  type QuarantineEntry,
} from '../readQuarantine/readQuarantine.ts';
import {
  runGate,
  type Violation,
} from '../reportViolations/reportViolations.ts';
import { listTrackedPaths } from '../runGit/runGit.ts';

const MAX_QUARANTINE_DAYS = 30;
const MS_PER_DAY = 86_400_000;
const SPEC_SUFFIX = '.spec.ts';
const TICKET_PATH = /^docs\/features\/\d{2}-[^/]+\/\d{2}-[^/]+\.md$/;

// The date violations of one well-formed entry, judged against today.
function findDateViolations(
  entry: QuarantineEntry,
  index: number,
  today: number,
): Violation[] {
  const violations: Violation[] = [];
  const added = readCalendarDate(entry.added) ?? Number.NaN;
  const expires = readCalendarDate(entry.expires) ?? Number.NaN;
  if (added > today) {
    violations.push(buildEntryViolation(index, 'added', 'is later than today'));
  }
  if (expires < added) {
    violations.push(buildEntryViolation(index, 'expires', 'is before added'));
  } else if (expires - added > MAX_QUARANTINE_DAYS * MS_PER_DAY) {
    violations.push(
      buildEntryViolation(
        index,
        'expires',
        `is more than ${String(MAX_QUARANTINE_DAYS)} days after added`,
      ),
    );
  }
  if (expires < today) {
    violations.push(
      buildEntryViolation(index, 'expires', `expired on ${entry.expires}`),
    );
  }
  return violations;
}

// The file and ticket violations of one well-formed entry.
function findPathViolations(
  entry: QuarantineEntry,
  index: number,
  tracked: ReadonlySet<string>,
): Violation[] {
  const violations: Violation[] = [];
  if (
    !tracked.has(entry.file) ||
    !entry.file.startsWith(E2E_FOLDER) ||
    !entry.file.endsWith(SPEC_SUFFIX)
  ) {
    violations.push(
      buildEntryViolation(index, 'file', 'must name a tracked e2e/ spec file'),
    );
  }
  if (!tracked.has(entry.ticket) || !TICKET_PATH.test(entry.ticket)) {
    violations.push(
      buildEntryViolation(index, 'ticket', 'must name a tracked ticket'),
    );
  }
  return violations;
}

// Returns a violation for every cause in the Quarantine: a shape problem, an
// entry added later than today, one expiring before it was added or more than
// 30 days after, one past its Expiry date, a file that is no tracked e2e/ spec
// file and a ticket that is no tracked ticket. An entry with a shape problem
// is judged by that alone.
export function findQuarantineViolations(
  quarantine: unknown,
  today: string,
  trackedPaths: readonly string[],
): Violation[] {
  const violations = [...readQuarantine(quarantine).violations];
  if (!Array.isArray(quarantine)) {
    return violations;
  }
  const todayTime = readCalendarDate(today) ?? Number.NaN;
  const tracked = new Set(trackedPaths);
  (quarantine as unknown[]).forEach((value, index) => {
    const read = readQuarantineEntry(value, index);
    if ('entry' in read) {
      violations.push(
        ...findDateViolations(read.entry, index, todayTime),
        ...findPathViolations(read.entry, index, tracked),
      );
    }
  });
  return violations;
}

export type CheckQuarantineDependencies = {
  root: string;
  today: string;
  listTrackedPaths: (root: string) => readonly string[];
};

// Loads the Quarantine under the root and judges it against today and the
// paths git tracks there. A Quarantine that cannot be loaded is one violation.
export function checkQuarantine({
  root,
  today,
  listTrackedPaths: listPaths,
}: CheckQuarantineDependencies): Violation[] {
  const loaded = loadQuarantine(root);
  if ('violation' in loaded) {
    return [loaded.violation];
  }
  return findQuarantineViolations(loaded.quarantine, today, listPaths(root));
}

if (import.meta.main) {
  await runGate(() =>
    checkQuarantine({
      root: process.cwd(),
      today: new Date().toISOString().slice(0, 10),
      listTrackedPaths,
    }),
  );
}
