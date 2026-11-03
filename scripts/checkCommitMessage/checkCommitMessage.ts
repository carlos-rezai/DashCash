import { readFileSync } from 'node:fs';
import {
  lintCommitMessages,
  loadCommitConfig,
} from '../lintCommitMessages/lintCommitMessages.ts';
import { runGate } from '../reportViolations/reportViolations.ts';

const SCISSORS = '# ------------------------ >8 ------------------------';

// Returns the text git stores for a message file with its default cleanup:
// CRLF to LF, the scissors line and everything after it dropped, comment
// lines dropped, trailing whitespace stripped, consecutive blank lines
// collapsed, leading and trailing blank lines removed.
export function cleanCommitMessage(raw: string): string {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const scissors = lines.findIndex((line) => line.trimEnd() === SCISSORS);
  const kept = (scissors === -1 ? lines : lines.slice(0, scissors))
    .filter((line) => !line.startsWith('#'))
    .map((line) => line.trimEnd());

  const collapsed = kept.filter(
    (line, index) => line !== '' || kept[index - 1] !== '',
  );
  return collapsed.join('\n').replace(/^\n+|\n+$/g, '');
}

function readMessageFile(file: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    throw new Error(`cannot read the commit message file: ${file}`);
  }
}

if (import.meta.main) {
  await runGate(async () => {
    const file = process.argv[2];
    if (file === undefined) {
      throw new Error(
        'usage: node scripts/checkCommitMessage/checkCommitMessage.ts <message-file>',
      );
    }
    const message = cleanCommitMessage(readMessageFile(file));
    if (message === '') {
      return [];
    }
    const config = await loadCommitConfig(process.cwd());
    return lintCommitMessages([message], config);
  });
}
