import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  runGate,
  type Violation,
} from '../reportViolations/reportViolations.ts';
import { isRecord } from '../isRecord/isRecord.ts';

const EXCEPTIONS_FILE = 'quality/audit-exceptions.json';
const NPM_AUDIT = 'npm audit';
const RUN_AGAIN = 'run `npm run check:audit` to check the audit';
const GHSA_ID = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/;
const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_EXCEPTION_DAYS = 90;
const MS_PER_DAY = 86_400_000;

type AuditException = { advisory: string; expires: string };

type Advisory = {
  id: string;
  severity: string;
  title: string;
  packages: string[];
};

// The time of a `YYYY-MM-DD` string in UTC milliseconds, or undefined when it
// is not a real calendar date.
function readDate(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const match = CALENDAR_DATE.exec(value);
  if (match === null) {
    return undefined;
  }
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const time = Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0);
  return new Date(time).toISOString().startsWith(value) ? time : undefined;
}

type ReadAdvisories = { advisories: Advisory[]; withoutId: Violation[] };

// Every Advisory of the report once, with each package it reaches, and a
// violation for every advisory object whose `url` does not end in a GHSA id.
function readAdvisories(
  vulnerabilities: Record<string, unknown>,
): ReadAdvisories {
  const advisories = new Map<string, Advisory>();
  const withoutId: Violation[] = [];
  for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
    const via = isRecord(vulnerability) ? vulnerability['via'] : undefined;
    for (const entry of Array.isArray(via) ? (via as unknown[]) : []) {
      if (!isRecord(entry)) {
        continue;
      }
      const url = entry['url'];
      const id =
        typeof url === 'string' ? url.slice(url.lastIndexOf('/') + 1) : '';
      if (!GHSA_ID.test(id)) {
        withoutId.push({
          subject: name,
          reason: `${String(entry['severity'])} advisory "${String(entry['title'])}" has no GHSA id at the end of its url`,
        });
        continue;
      }
      const known = advisories.get(id);
      if (known === undefined) {
        advisories.set(id, {
          id,
          severity: String(entry['severity']),
          title: String(entry['title']),
          packages: [name],
        });
      } else if (!known.packages.includes(name)) {
        known.packages.push(name);
      }
    }
  }
  return { advisories: [...advisories.values()], withoutId };
}

function buildEntryViolation(
  index: number,
  field: string,
  why: string,
): Violation {
  return {
    subject: EXCEPTIONS_FILE,
    reason: `entry ${String(index)}, field ${field}: ${why}`,
  };
}

// The problems of one exception entry, one violation per field.
function findEntryProblems(
  entry: Record<string, unknown>,
  index: number,
  today: number,
): Violation[] {
  const problems: Violation[] = [];
  const { advisory, reason } = entry;
  if (typeof advisory !== 'string' || !GHSA_ID.test(advisory)) {
    problems.push(
      buildEntryViolation(
        index,
        'advisory',
        'must be a GHSA-xxxx-xxxx-xxxx id',
      ),
    );
  }
  if (typeof reason !== 'string' || reason === '') {
    problems.push(buildEntryViolation(index, 'reason', 'must not be empty'));
  }
  const added = readDate(entry['added']);
  const expires = readDate(entry['expires']);
  if (added === undefined) {
    problems.push(
      buildEntryViolation(index, 'added', 'must be a real YYYY-MM-DD date'),
    );
  }
  if (expires === undefined) {
    problems.push(
      buildEntryViolation(index, 'expires', 'must be a real YYYY-MM-DD date'),
    );
  }
  if (added !== undefined && expires !== undefined) {
    if (added > today) {
      problems.push(buildEntryViolation(index, 'added', 'is later than today'));
    }
    if (expires < added) {
      problems.push(buildEntryViolation(index, 'expires', 'is before added'));
    } else if (expires - added > MAX_EXCEPTION_DAYS * MS_PER_DAY) {
      problems.push(
        buildEntryViolation(
          index,
          'expires',
          `is more than ${String(MAX_EXCEPTION_DAYS)} days after added`,
        ),
      );
    }
  }
  return problems;
}

// Splits the exceptions into the well-formed ones and the violations of the
// rest. A value that is not an array has no valid exceptions and one violation.
function readExceptions(
  exceptions: unknown,
  today: number,
): { valid: AuditException[]; violations: Violation[] } {
  if (!Array.isArray(exceptions)) {
    return {
      valid: [],
      violations: [
        {
          subject: EXCEPTIONS_FILE,
          reason: 'must be an array of audit exceptions',
        },
      ],
    };
  }
  const valid: AuditException[] = [];
  const violations: Violation[] = [];
  (exceptions as unknown[]).forEach((entry, index) => {
    if (!isRecord(entry)) {
      violations.push(buildEntryViolation(index, 'entry', 'must be an object'));
      return;
    }
    const problems = findEntryProblems(entry, index, today);
    if (problems.length === 0) {
      valid.push({
        advisory: entry['advisory'] as string,
        expires: entry['expires'] as string,
      });
    } else {
      violations.push(...problems);
    }
  });
  return { valid, violations };
}

type LapsedExceptions = { expired: Violation[]; stale: Violation[] };

// The exceptions that have lapsed: expired ones, and stale ones whose advisory
// the report no longer names. An exception that is both is reported once, as
// expired.
function findLapsedExceptions(
  valid: readonly AuditException[],
  reported: ReadonlySet<string>,
  today: number,
): LapsedExceptions {
  const expired: Violation[] = [];
  const stale: Violation[] = [];
  for (const { advisory, expires } of valid) {
    if ((readDate(expires) ?? 0) < today) {
      expired.push({
        subject: advisory,
        reason: `audit exception expired on ${expires}`,
      });
    } else if (!reported.has(advisory)) {
      stale.push({
        subject: advisory,
        reason: 'audit exception names an advisory npm audit no longer reports',
      });
    }
  }
  return { expired, stale };
}

// A violation for every advisory id that more than one exception names, each
// once.
function findDuplicateExceptions(
  exceptions: readonly AuditException[],
): Violation[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const { advisory } of exceptions) {
    if (seen.has(advisory)) {
      duplicates.add(advisory);
    }
    seen.add(advisory);
  }
  return [...duplicates].map((id) => ({
    subject: EXCEPTIONS_FILE,
    reason: `more than one audit exception names ${id}`,
  }));
}

// Returns a violation for every Advisory of the report that has no Audit
// exception, for every expired exception, for every stale one, for every
// advisory without a GHSA id, for every advisory two exceptions name and for
// every malformed exception. An exception that is expired and stale is
// reported by the expiry alone. A report that cannot be read is one violation
// naming `npm audit`.
export function findAuditViolations(
  report: unknown,
  exceptions: unknown,
  today: string,
): Violation[] {
  const todayTime = readDate(today) ?? Number.NaN;
  const { valid, violations: problems } = readExceptions(exceptions, todayTime);

  const vulnerabilities = isRecord(report) ? report['vulnerabilities'] : null;
  if (!isRecord(vulnerabilities) || (isRecord(report) && 'error' in report)) {
    return [
      { subject: NPM_AUDIT, reason: 'the audit report could not be read' },
      ...problems,
    ];
  }

  const { advisories, withoutId } = readAdvisories(vulnerabilities);
  const covered = new Set(valid.map(({ advisory }) => advisory));
  const reported = new Set(advisories.map(({ id }) => id));
  const { expired, stale } = findLapsedExceptions(valid, reported, todayTime);
  const duplicates = findDuplicateExceptions(valid);
  const unexcepted: Violation[] = advisories
    .filter(({ id }) => !covered.has(id))
    .map(({ id, severity, title, packages }) => ({
      subject: id,
      reason: `${severity} advisory "${title}" in ${packages.join(', ')} has no audit exception`,
    }));
  return [
    ...unexcepted,
    ...withoutId,
    ...expired,
    ...stale,
    ...duplicates,
    ...problems,
  ];
}

export type CheckAuditDependencies = {
  env: Readonly<Record<string, string | undefined>>;
  today: string;
  runNode: (args: readonly string[]) => {
    status: number | null;
    stdout: string;
  };
  readFile: (path: string) => string;
};

// Runs `npm audit --json` through the npm that started the gate and judges its
// report against the exceptions file. Throws when the audit cannot be run or
// does not produce a JSON report.
export function checkAudit({
  env,
  today,
  runNode,
  readFile,
}: CheckAuditDependencies): Violation[] {
  const npm = env['npm_execpath'];
  if (npm === undefined || npm === '') {
    throw new Error(`npm did not start the gate: ${RUN_AGAIN}`);
  }
  const { status, stdout } = runNode([npm, 'audit', '--json']);
  let report: unknown;
  try {
    if (status !== 0 && status !== 1) {
      throw new Error(`npm audit ended with exit code ${String(status)}`);
    }
    report = JSON.parse(stdout);
  } catch {
    throw new Error(`npm audit produced no JSON report: ${RUN_AGAIN}`);
  }
  let exceptions: unknown;
  try {
    exceptions = JSON.parse(readFile(EXCEPTIONS_FILE));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        subject: EXCEPTIONS_FILE,
        reason: `cannot be read as JSON: ${message.split('\n')[0] ?? ''}`,
      },
    ];
  }
  return findAuditViolations(report, exceptions, today);
}

if (import.meta.main) {
  await runGate(() =>
    checkAudit({
      env: process.env,
      today: new Date().toISOString().slice(0, 10),
      runNode: (args) => {
        const { status, stdout } = spawnSync(process.execPath, [...args], {
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
        });
        return { status, stdout };
      },
      readFile: (path) => readFileSync(join(process.cwd(), path), 'utf8'),
    }),
  );
}
