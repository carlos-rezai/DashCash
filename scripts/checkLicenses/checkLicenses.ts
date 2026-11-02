import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  runGate,
  type Violation,
} from '../reportViolations/reportViolations.ts';

const ALLOWLIST_FILE = 'quality/license-allowlist.json';
const LOCKFILE = 'package-lock.json';
const NODE_MODULES = 'node_modules/';

type LockEntry = { version?: unknown; license?: unknown; link?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAllowlist(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((id) => typeof id === 'string' && id !== '')
  );
}

// Returns every package of the lockfile whose licence is missing or not on
// the allowlist. A malformed allowlist is one violation naming its file.
export function findLicenseViolations(
  lockfile: unknown,
  allowlist: unknown,
): Violation[] {
  if (!isAllowlist(allowlist)) {
    return [
      {
        subject: ALLOWLIST_FILE,
        reason: 'must be a non-empty array of licence ids',
      },
    ];
  }
  const packages = isRecord(lockfile) ? lockfile['packages'] : undefined;
  if (!isRecord(packages)) {
    return [];
  }
  const violations: Violation[] = [];
  for (const [key, value] of Object.entries(packages)) {
    const folder = key.lastIndexOf(NODE_MODULES);
    const entry = (isRecord(value) ? value : {}) as LockEntry;
    if (folder === -1 || entry.link === true) {
      continue;
    }
    const subject = `${key.slice(folder + NODE_MODULES.length)}@${String(entry.version)}`;
    const { license } = entry;
    if (typeof license !== 'string' || license === '') {
      violations.push({ subject, reason: 'has no licence' });
    } else if (!allowlist.includes(license)) {
      violations.push({
        subject,
        reason: `licence "${license}" is not on the licence allowlist`,
      });
    }
  }
  return violations;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(join(process.cwd(), path), 'utf8'));
}

if (import.meta.main) {
  await runGate(() =>
    findLicenseViolations(readJson(LOCKFILE), readJson(ALLOWLIST_FILE)),
  );
}
