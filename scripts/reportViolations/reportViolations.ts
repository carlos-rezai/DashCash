export type Violation = { subject: string; reason: string };

// Writes one `<subject>: <reason>` line per violation to standard error and
// returns the exit code a gate entry ends with: 1 with violations, 0 without.
export function reportViolations(violations: readonly Violation[]): number {
  for (const { subject, reason } of violations) {
    console.error(`${subject}: ${reason}`);
  }
  return violations.length > 0 ? 1 : 0;
}
