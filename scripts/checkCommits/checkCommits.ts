import lint from '@commitlint/lint';
import load from '@commitlint/load';
import {
  runGate,
  type Violation,
} from '../reportViolations/reportViolations.ts';
import { readBranchRange } from '../readBranchRange/readBranchRange.ts';

type Config = Awaited<ReturnType<typeof load>>;
type LintOptions = NonNullable<Parameters<typeof lint>[2]>;

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
    const subject = message.trim().split('\n')[0] ?? '';
    for (const error of result.errors) {
      violations.push({ subject, reason: error.message });
    }
  }
  return violations;
}

if (import.meta.main) {
  await runGate(async () => {
    const cwd = process.cwd();
    const config = await load({}, { cwd, file: 'commitlint.config.js' });
    const { commits } = readBranchRange(cwd);
    return lintCommitMessages(
      commits.map((commit) => commit.message),
      config,
    );
  });
}
