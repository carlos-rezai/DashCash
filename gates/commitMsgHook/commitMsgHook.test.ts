import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  lintCommitMessages,
  loadCommitConfig,
} from '../../scripts/lintCommitMessages/lintCommitMessages.ts';
import {
  buildCleanEnv,
  ROOT,
  runSampleGit,
} from '../../scripts/test-support/sampleRepository/sampleRepository.ts';

// The Commit-msg hook: a committed git hook that lints the message being
// committed through the checkCommitMessage entry, switched on by the
// `prepare` script, which points git at the committed hooks folder.

const HOOK_PATH = '.githooks/commit-msg';
const HOOK_COMMAND =
  'node scripts/checkCommitMessage/checkCommitMessage.ts "$1"';
const PREPARE_COMMAND = 'git config core.hooksPath .githooks';

const VALID_HEADER = 'feat: [sample-feature] 01 add sample';
const INVALID_HEADER = 'add sample without a type';

type HookResult = { status: number | null; stderrLines: string[] };

// Drives the hook the way git does: with sh, from the repository root, the
// message file as its one argument.
function runHook(messageFile: string): HookResult {
  const result = spawnSync('sh', [HOOK_PATH, messageFile], {
    cwd: ROOT,
    encoding: 'utf8',
    env: buildCleanEnv(),
  });
  return {
    status: result.status,
    stderrLines: result.stderr.split(/\r?\n/).filter((line) => line !== ''),
  };
}

// The lines the gate reports for a message: one `<subject>: <reason>` line
// per violation of the commitlint config.
async function expectedLines(message: string): Promise<string[]> {
  const config = await loadCommitConfig(ROOT);
  const violations = await lintCommitMessages([message], config);
  return violations.map(({ subject, reason }) => `${subject}: ${reason}`);
}

function readHookLines(): string[] {
  let text = '';
  try {
    text = readFileSync(join(ROOT, HOOK_PATH), 'utf8');
  } catch {
    // A missing hook reads as empty, so the assertions report it.
  }
  return text.split(/\r?\n/);
}

function readPackageScripts(): Record<string, string | undefined> {
  const packageJson = JSON.parse(
    readFileSync(join(ROOT, 'package.json'), 'utf8'),
  ) as { scripts: Record<string, string | undefined> };
  return packageJson.scripts;
}

describe('the hook file', () => {
  it('starts with #!/bin/sh', () => {
    expect(readHookLines()[0]).toBe('#!/bin/sh');
  });

  it('runs the checkCommitMessage entry with "$1"', () => {
    const commands = readHookLines()
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#'));

    expect(commands).toEqual([HOOK_COMMAND]);
  });
});

describe('the prepare script', () => {
  let folder: string;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'dashcash-commit-msg-hook-'));
  });

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it('is the hooks-path command', () => {
    expect(readPackageScripts().prepare).toBe(PREPARE_COMMAND);
  });

  it('points git at the committed hooks folder when it runs', () => {
    runSampleGit(folder, 'init', '--quiet');
    const prepare = readPackageScripts().prepare ?? 'true';

    const result = spawnSync('sh', ['-c', prepare], {
      cwd: folder,
      encoding: 'utf8',
      env: buildCleanEnv(),
    });

    const hooksPath = spawnSync('git', ['config', 'core.hooksPath'], {
      cwd: folder,
      encoding: 'utf8',
      env: buildCleanEnv(),
    });

    expect(result.status).toBe(0);
    expect(hooksPath.stdout.trim()).toBe('.githooks');
  });
});

describe('driving the hook with sh', { timeout: 60_000 }, () => {
  let folder: string;

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'dashcash-commit-msg-hook-'));
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

  it('exits 0 for a valid header', () => {
    const result = runHook(writeMessage(`${VALID_HEADER}\n`));

    expect(result.stderrLines).toEqual([]);
    expect(result.status).toBe(0);
  });

  it('exits 0 for an empty message', () => {
    const result = runHook(writeMessage(''));

    expect(result.stderrLines).toEqual([]);
    expect(result.status).toBe(0);
  });

  it('exits 1 with the violation line for an invalid header', async () => {
    const expected = await expectedLines(INVALID_HEADER);
    expect(expected).toHaveLength(1);

    const result = runHook(writeMessage(`${INVALID_HEADER}\n`));

    expect(result.stderrLines).toEqual(expected);
    expect(result.status).toBe(1);
  });
});

describe('docs/conventions.md', () => {
  it('lists the hooks folder under Folder structure', () => {
    const conventions = readFileSync(
      join(ROOT, 'docs', 'conventions.md'),
      'utf8',
    );
    const section = conventions
      .split(/^## /m)
      .find((part) => part.startsWith('Folder structure'));

    expect(section).toMatch(/^\.githooks\/ +local git hooks$/m);
  });
});
