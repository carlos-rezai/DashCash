import load from '@commitlint/load';
import { lintCommitMessages } from '../lintCommitMessages/lintCommitMessages.ts';
import { runGate } from '../reportViolations/reportViolations.ts';
import { readBranchRange } from '../readBranchRange/readBranchRange.ts';

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
