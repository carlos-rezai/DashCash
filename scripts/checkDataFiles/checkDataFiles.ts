import { execFileSync } from 'node:child_process';
import {
  reportViolations,
  type Violation,
} from '../reportViolations/reportViolations.ts';

const DATABASE_FILE = /\.(db|sqlite)(-[^/]*)?$/i;
const CSV_FILE = /\.csv$/i;
const ENV_FILE = /^\.env(\..*)?$/i;
const ENV_EXAMPLE = '.env.example';
const FIXTURES_FOLDER = 'fixtures/';

function isDataFile(path: string): boolean {
  const name = path.slice(path.lastIndexOf('/') + 1);
  if (ENV_FILE.test(name)) {
    return name.toLowerCase() !== ENV_EXAMPLE;
  }
  if (DATABASE_FILE.test(name)) {
    return true;
  }
  return CSV_FILE.test(name) && !path.startsWith(FIXTURES_FOLDER);
}

// Returns every tracked path that is a Data file.
export function findDataFiles(trackedPaths: readonly string[]): string[] {
  return trackedPaths.filter(isDataFile);
}

function listTrackedPaths(): string[] {
  const output = execFileSync('git', ['ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return output.split('\0').filter((path) => path !== '');
}

if (import.meta.main) {
  const violations: Violation[] = findDataFiles(listTrackedPaths()).map(
    (subject) => ({ subject, reason: 'data file is tracked' }),
  );
  process.exitCode = reportViolations(violations);
}
