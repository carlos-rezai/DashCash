import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runNpmScript } from '../../scripts/test-support/runNpmScript/runNpmScript.ts';

// Whole-repository test of the lint gate: it lints the repository itself,
// not code, so the Stryker Vitest config leaves this file out of a Mutation
// run (design log D4). Verify still runs it.

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function runScript(
  name: string,
  cwd: string,
): { status: number | null; output: string } {
  const { status, output } = runNpmScript(name, cwd, { rootBin: true });
  return { status, output };
}

describe('repository tree', { timeout: 120_000 }, () => {
  it('passes lint', () => {
    const result = runScript('lint', ROOT);

    expect(result.status, result.output).toBe(0);
  });
});
