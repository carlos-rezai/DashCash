import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  lintCommitMessages,
  loadCommitConfig,
} from '../lintCommitMessages/lintCommitMessages.ts';
import {
  buildCleanEnv,
  ROOT,
} from '../test-support/sampleRepository/sampleRepository.ts';

// The script the Commit-msg hook runs: a pure core that cleans a message the
// way git stores it, and a thin entry that lints the cleaned message.

const ENTRY = join(
  ROOT,
  'scripts',
  'checkCommitMessage',
  'checkCommitMessage.ts',
);

const SCISSORS = '# ------------------------ >8 ------------------------';

const VALID_HEADER = 'feat: [sample-feature] 01 add sample';

// The comment block git appends to the message file of a plain `git commit`.
const GIT_COMMENT_BLOCK = [
  '',
  '# Please enter the commit message for your changes. Lines starting',
  "# with '#' will be ignored, and an empty message aborts the commit.",
  '#',
  '# On branch feat/sample-feature',
  '# Changes to be committed:',
  '#\tmodified:   sample.txt',
  '#',
  '',
].join('\n');

// The scissors section git appends under `git commit -v`: everything from
// the scissors line on is dropped, the diff included.
const GIT_VERBOSE_BLOCK = [
  '',
  SCISSORS,
  '# Do not modify or remove the line above.',
  '# Everything below it will be ignored.',
  'diff --git a/sample.txt b/sample.txt',
  '--- a/sample.txt',
  '+++ b/sample.txt',
  '@@ -1 +1 @@',
  '-old sample line',
  '+new sample line',
  '',
].join('\n');

// One description just over the limit of 50 characters.
const DESCRIPTION_OF_51 = 'add a description that is fifty-one characters long';

// Loads the core per test, so each test reports its own result.
async function clean(raw: string): Promise<string> {
  const { cleanCommitMessage } = await import('./checkCommitMessage.ts');
  return cleanCommitMessage(raw);
}

describe('cleanCommitMessage', () => {
  it('returns a clean message unchanged', async () => {
    const message = `${VALID_HEADER}\n\nexplain the sample change`;

    expect(await clean(message)).toBe(message);
  });

  it('drops lines starting with #', async () => {
    const raw = `${VALID_HEADER}\n# a sample comment\nsample body line\n#`;

    expect(await clean(raw)).toBe(`${VALID_HEADER}\nsample body line`);
  });

  it("drops git's comment block", async () => {
    expect(await clean(`${VALID_HEADER}\n${GIT_COMMENT_BLOCK}`)).toBe(
      VALID_HEADER,
    );
  });

  it('drops the scissors line and every line after it', async () => {
    const raw = `${VALID_HEADER}\n\nsample body line\n${GIT_VERBOSE_BLOCK}`;

    expect(await clean(raw)).toBe(`${VALID_HEADER}\n\nsample body line`);
  });

  it('turns CRLF into LF', async () => {
    const raw = `${VALID_HEADER}\r\n\r\nsample body line\r\n`;

    expect(await clean(raw)).toBe(`${VALID_HEADER}\n\nsample body line`);
  });

  it('strips trailing whitespace from every line', async () => {
    const raw = `${VALID_HEADER}   \n\t\nsample body line \t\n`;

    expect(await clean(raw)).toBe(`${VALID_HEADER}\n\nsample body line`);
  });

  it('collapses consecutive blank lines into one', async () => {
    const raw = `${VALID_HEADER}\n\n\n\nfirst body line\n\n# a comment\n\nsecond body line`;

    expect(await clean(raw)).toBe(
      `${VALID_HEADER}\n\nfirst body line\n\nsecond body line`,
    );
  });

  it('removes leading and trailing blank lines', async () => {
    const raw = `\n\n  \n${VALID_HEADER}\n\n \n\n`;

    expect(await clean(raw)).toBe(VALID_HEADER);
  });

  it('returns an empty text for an all-comment message', async () => {
    expect(await clean(GIT_COMMENT_BLOCK)).toBe('');
  });

  it('returns an empty text for an all-comment message with a scissors section', async () => {
    expect(await clean(`${GIT_COMMENT_BLOCK}${GIT_VERBOSE_BLOCK}`)).toBe('');
  });
});

type EntryResult = { status: number | null; stderrLines: string[] };

// Runs the entry with node from the repository root, as the hook does.
function runEntry(...args: string[]): EntryResult {
  const result = spawnSync(process.execPath, [ENTRY, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: buildCleanEnv(),
  });
  return {
    status: result.status,
    stderrLines: result.stderr.split(/\r?\n/).filter((line) => line !== ''),
  };
}

// The lines the gate reports for a clean message: one `<subject>: <reason>`
// line per violation of the commitlint config.
async function expectedLines(message: string): Promise<string[]> {
  const config = await loadCommitConfig(ROOT);
  const violations = await lintCommitMessages([message], config);
  return violations.map(({ subject, reason }) => `${subject}: ${reason}`);
}

describe('checkCommitMessage entry', { timeout: 60_000 }, () => {
  let folder: string;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'dashcash-commit-message-'));
  });

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  // Writes the message into a fresh file in the temporary folder.
  function writeMessage(text: string): string {
    const file = join(folder, 'COMMIT_EDITMSG');
    writeFileSync(file, text);
    return file;
  }

  describe('exits 0', () => {
    it.each([
      ['a valid header', `${VALID_HEADER}\n`],
      [
        'a valid RED header',
        'test: [sample-feature] 01 add sample tests, RED\n',
      ],
      [
        "a valid header followed by git's comment block",
        `${VALID_HEADER}\n${GIT_COMMENT_BLOCK}`,
      ],
      [
        'a valid header followed by the scissors section of git commit -v',
        `${VALID_HEADER}\n${GIT_COMMENT_BLOCK}${GIT_VERBOSE_BLOCK}`,
      ],
      ['a valid header with CRLF line endings', `${VALID_HEADER}\r\n`],
      ['a merge', "Merge branch 'main' into feat/sample-feature\n"],
      [
        'a merge with its comment block',
        `Merge branch 'main' into feat/sample-feature\n${GIT_COMMENT_BLOCK}`,
      ],
      [
        'a revert',
        'Revert "feat: [sample-feature] 01 add sample"\n\nThis reverts commit 1a2b3c4d.\n',
      ],
      ['a fixup! message', `fixup! ${VALID_HEADER}\n`],
      ['an empty message', ''],
      ['a message of blank lines', '\n\n  \n'],
      ['an all-comment message', GIT_COMMENT_BLOCK],
    ])('for %s', (_name, text) => {
      const result = runEntry(writeMessage(text));

      expect(result.stderrLines).toEqual([]);
      expect(result.status).toBe(0);
    });

    it('for a valid header naming a feature folder and ticket that do not exist', () => {
      const result = runEntry(
        writeMessage('feat: [sample-feature] 99 add sample\n'),
      );

      expect(result.stderrLines).toEqual([]);
      expect(result.status).toBe(0);
    });
  });

  describe('exits 1 with one line per violation', () => {
    it('uses a description of 51 characters, just over the limit', () => {
      expect(DESCRIPTION_OF_51).toHaveLength(51);
    });

    it.each([
      [
        'an invalid header',
        'Add sample feature',
        'header must follow the format',
      ],
      [
        'a header with @',
        'feat: [sample-feature] 01 add sample for the @ sign',
        'must not contain "@" or "#"',
      ],
      [
        'a header with #',
        'feat: [sample-feature] 01 add sample for issue 12 #',
        'must not contain "@" or "#"',
      ],
      [
        'a 51-character description',
        `feat: [sample-feature] 01 ${DESCRIPTION_OF_51}`,
        'subject must not be longer than 50 characters',
      ],
      [
        'a message with a body',
        `${VALID_HEADER}\n\nexplain the sample change`,
        'body must be empty',
      ],
    ])('for %s', async (_name, message, reason) => {
      const expected = await expectedLines(message);
      expect(expected.some((line) => line.includes(reason))).toBe(true);

      const result = runEntry(writeMessage(`${message}\n${GIT_COMMENT_BLOCK}`));

      expect(result.stderrLines).toEqual(expected);
      expect(result.status).toBe(1);
    });

    it('for a header with several violations, one line each', async () => {
      const message = `feat: [sample-feature] 01 ${DESCRIPTION_OF_51} @`;
      const expected = await expectedLines(message);
      expect(expected.length).toBeGreaterThan(1);

      const result = runEntry(writeMessage(message));

      expect(result.stderrLines).toEqual(expected);
      expect(result.status).toBe(1);
    });
  });

  describe('exits 1 with one line', () => {
    it('for a missing argument', () => {
      const result = runEntry();

      expect(result.stderrLines).toHaveLength(1);
      expect(result.status).toBe(1);
    });

    it('for a file that does not exist', () => {
      const result = runEntry(join(folder, 'MISSING_COMMIT_EDITMSG'));

      expect(result.stderrLines).toHaveLength(1);
      expect(result.status).toBe(1);
    });
  });
});
