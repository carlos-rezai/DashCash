import { defineConfig } from '@playwright/test';
import {
  buildQuarantinePatterns,
  loadQuarantine,
  readQuarantine,
} from './scripts/readQuarantine/readQuarantine.ts';
import type { Violation } from './scripts/reportViolations/reportViolations.ts';

function throwViolations(violations: readonly Violation[]): never {
  throw new Error(
    violations.map(({ subject, reason }) => `${subject}: ${reason}`).join('\n'),
  );
}

// The patterns of the Quarantine, which grepInvert leaves out of the run. A
// Quarantine that cannot be read or is malformed throws, so a run never
// skips tests silently.
function readQuarantinePatterns(): RegExp[] {
  const loaded = loadQuarantine(process.cwd());
  if ('violation' in loaded) {
    return throwViolations([loaded.violation]);
  }
  const { entries, violations } = readQuarantine(loaded.quarantine);
  if (violations.length > 0) {
    return throwViolations(violations);
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
