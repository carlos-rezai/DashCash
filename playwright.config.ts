import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from '@playwright/test';
import {
  buildQuarantinePatterns,
  readQuarantine,
} from './scripts/readQuarantine/readQuarantine.ts';

const QUARANTINE_FILE = 'quality/flaky-quarantine.json';

// The patterns of the Quarantine, which grepInvert leaves out of the run. A
// Quarantine that cannot be read or is malformed throws, so a run never
// skips tests silently.
function readQuarantinePatterns(): RegExp[] {
  let quarantine: unknown;
  try {
    quarantine = JSON.parse(
      readFileSync(join(process.cwd(), QUARANTINE_FILE), 'utf8'),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${QUARANTINE_FILE}: cannot be read as JSON: ${message.split('\n')[0] ?? ''}`,
      { cause: error },
    );
  }
  const { entries, violations } = readQuarantine(quarantine);
  if (violations.length > 0) {
    throw new Error(
      violations
        .map(({ subject, reason }) => `${subject}: ${reason}`)
        .join('\n'),
    );
  }
  return buildQuarantinePatterns(entries);
}

export default defineConfig({
  testDir: 'e2e',
  retries: 0,
  forbidOnly: true,
  reporter: 'list',
  use: { trace: 'retain-on-failure' },
  grepInvert: readQuarantinePatterns(),
});
