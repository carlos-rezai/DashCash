import lint from '@commitlint/lint';
import load from '@commitlint/load';
import type { Violation } from '../reportViolations/reportViolations.ts';
import { readCommitHeader } from '../parseCommitHeader/parseCommitHeader.ts';

type Config = Awaited<ReturnType<typeof load>>;
type LintOptions = NonNullable<Parameters<typeof lint>[2]>;

// Loads the root commitlint config, which the commit gate and the Pull-request
// check both lint against.
export function loadCommitConfig(cwd: string): Promise<Config> {
  return load({}, { cwd, file: 'commitlint.config.js' });
}

// Lints every commit message against the loaded commitlint config and returns
// one violation per failed rule, named by the commit's header.
export async function lintCommitMessages(
  messages: readonly string[],
  config: Config,
): Promise<Violation[]> {
  const violations: Violation[] = [];
  for (const message of messages) {
    const result = await lint(message, config.rules, {
      parserOpts: config.parserPreset?.parserOpts as LintOptions['parserOpts'],
      plugins: config.plugins,
      ignores: config.ignores,
      defaultIgnores: config.defaultIgnores,
    });
    const subject = readCommitHeader(message);
    for (const error of result.errors) {
      violations.push({ subject, reason: error.message });
    }
  }
  return violations;
}
