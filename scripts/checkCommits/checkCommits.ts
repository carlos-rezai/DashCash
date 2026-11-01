import {
  lintCommitMessages,
  loadCommitConfig,
} from '../lintCommitMessages/lintCommitMessages.ts';
import { runGate } from '../reportViolations/reportViolations.ts';
import { readBranchRange } from '../readBranchRange/readBranchRange.ts';

if (import.meta.main) {
  await runGate(async () => {
    const cwd = process.cwd();
    const config = await loadCommitConfig(cwd);
    const { commits } = readBranchRange(cwd);
    return lintCommitMessages(
      commits.map((commit) => commit.message),
      config,
    );
  });
}
