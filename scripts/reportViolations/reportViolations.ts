export type Violation = { subject: string; reason: string };

// Writes one `<subject>: <reason>` line per violation to standard error and
// returns the exit code a gate entry ends with: 1 with violations, 0 without.
export function reportViolations(violations: readonly Violation[]): number {
  for (const { subject, reason } of violations) {
    console.error(`${subject}: ${reason}`);
  }
  return violations.length > 0 ? 1 : 0;
}

// Runs a gate's check and ends the entry the way every gate does: the
// violations go through `reportViolations` and set the exit code; an error
// thrown by the check prints its message as one line and sets exit code 1.
// It sets `process.exitCode` and never calls `process.exit`.
export async function runGate(
  check: () => readonly Violation[] | Promise<readonly Violation[]>,
): Promise<void> {
  try {
    process.exitCode = reportViolations(await check());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
