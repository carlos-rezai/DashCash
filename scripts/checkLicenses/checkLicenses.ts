import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isRecord } from '../isRecord/isRecord.ts';
import {
  runGate,
  type Violation,
} from '../reportViolations/reportViolations.ts';

const ALLOWLIST_FILE = 'quality/license-allowlist.json';
const LOCKFILE = 'package-lock.json';
const NODE_MODULES = 'node_modules/';

type LockEntry = { version?: unknown; license?: unknown; link?: unknown };

function isAllowlist(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((id) => typeof id === 'string' && id !== '')
  );
}

// An SPDX expression is read with AND binding tighter than OR; OR and AND
// count only in upper case. Any other run of words, a WITH term included, is
// one term compared as a whole. Returns undefined when the expression is
// unreadable (unbalanced parentheses, a dangling operator, empty parentheses).
function evaluateExpression(
  expression: string,
  allowlist: readonly string[],
): boolean | undefined {
  const tokens = expression.match(/[()]|[^\s()]+/g) ?? [];
  let position = 0;

  function parseOr(): boolean | undefined {
    let result = parseAnd();
    while (result !== undefined && tokens[position] === 'OR') {
      position += 1;
      const right = parseAnd();
      result = right === undefined ? undefined : result || right;
    }
    return result;
  }

  function parseAnd(): boolean | undefined {
    let result = parseAtom();
    while (result !== undefined && tokens[position] === 'AND') {
      position += 1;
      const right = parseAtom();
      result = right === undefined ? undefined : result && right;
    }
    return result;
  }

  function parseAtom(): boolean | undefined {
    if (tokens[position] === '(') {
      position += 1;
      const inner = parseOr();
      if (inner === undefined || tokens[position] !== ')') {
        return undefined;
      }
      position += 1;
      return inner;
    }
    const words: string[] = [];
    while (position < tokens.length && !isBoundary(tokens[position])) {
      words.push(tokens[position] ?? '');
      position += 1;
    }
    return words.length === 0 ? undefined : allowlist.includes(words.join(' '));
  }

  const result = parseOr();
  return position === tokens.length ? result : undefined;
}

function isBoundary(token: string | undefined): boolean {
  return token === '(' || token === ')' || token === 'OR' || token === 'AND';
}

// Returns why a package's licence is refused, or undefined when it is allowed.
function judgeLicence(
  license: unknown,
  allowlist: readonly string[],
): string | undefined {
  if (typeof license !== 'string' || license === '') {
    return 'has no licence';
  }
  const allowed = evaluateExpression(license, allowlist);
  if (allowed === undefined) {
    return `licence "${license}" is an unreadable SPDX expression`;
  }
  return allowed
    ? undefined
    : `licence "${license}" is not on the licence allowlist`;
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
    const reason = judgeLicence(entry.license, allowlist);
    if (reason !== undefined) {
      violations.push({ subject, reason });
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
