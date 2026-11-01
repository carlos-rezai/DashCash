import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The Claude folder guard: a PreToolUse hook that refuses any Edit, Write or
// Bash command that would change a file under .claude/. It is driven the way
// Claude Code drives it: hook input as JSON on standard input, the project
// root in CLAUDE_PROJECT_DIR, the verdict in the exit code (2 blocks).

const ROOT = join(import.meta.dirname, '..', '..');
const HOOK = join(ROOT, '.claude', 'hooks', 'block-claude-edits.sh');
const SETTINGS = join(ROOT, '.claude', 'settings.json');

// Invented project roots; the hook only compares paths, it never opens them.
const POSIX_ROOT = '/home/sample/dashcash';
const WINDOWS_ROOT = 'C:\\Users\\Sample\\dashcash';

interface HookResult {
  status: number | null;
  stderr: string;
}

function runHook(input: string, projectDir: string): HookResult {
  const result = spawnSync('bash', [HOOK], {
    input,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
  });
  return { status: result.status, stderr: result.stderr };
}

function fileInput(
  toolName: 'Edit' | 'Write',
  filePath: string,
  cwd: string,
): string {
  return JSON.stringify({
    hook_event_name: 'PreToolUse',
    tool_name: toolName,
    cwd,
    tool_input: { file_path: filePath, content: 'invented' },
  });
}

function bashInput(command: string, cwd = POSIX_ROOT): string {
  return JSON.stringify({
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    cwd,
    tool_input: { command },
  });
}

const GUARDED_FILES = [
  '.claude/settings.json',
  '.claude/skills/tdd/SKILL.md',
  '.claude/agents/builder.md',
  '.claude/hooks/block-dangerous-git.sh',
];

const FILE_TOOLS = ['Edit', 'Write'] as const;

describe('Edit and Write', () => {
  describe.each(FILE_TOOLS)('%s', (tool) => {
    describe('blocks a path under .claude/', () => {
      it.each(GUARDED_FILES)('%s as an absolute path with /', (file) => {
        const result = runHook(
          fileInput(tool, `${POSIX_ROOT}/${file}`, POSIX_ROOT),
          POSIX_ROOT,
        );

        expect(result.status).toBe(2);
        expect(result.stderr).toMatch(/^BLOCKED: /);
      });

      it.each(GUARDED_FILES)('%s as an absolute path with \\', (file) => {
        const windowsPath = `${WINDOWS_ROOT}\\${file.replaceAll('/', '\\')}`;

        const result = runHook(
          fileInput(tool, windowsPath, WINDOWS_ROOT),
          WINDOWS_ROOT,
        );

        expect(result.status).toBe(2);
        expect(result.stderr).toMatch(/^BLOCKED: /);
      });

      it.each(GUARDED_FILES)('%s as a relative path', (file) => {
        const result = runHook(fileInput(tool, file, POSIX_ROOT), POSIX_ROOT);

        expect(result.status).toBe(2);
        expect(result.stderr).toMatch(/^BLOCKED: /);
      });

      it('a relative path resolved against a cwd below the root', () => {
        const result = runHook(
          fileInput(tool, '../.claude/settings.json', `${POSIX_ROOT}/docs`),
          POSIX_ROOT,
        );

        expect(result.status).toBe(2);
      });
    });

    describe('allows a path outside .claude/', () => {
      it.each([
        '.claudeignore',
        'docs/.claude.md',
        'scripts/checkDocsDrift/checkDocsDrift.ts',
      ])('%s', (file) => {
        const result = runHook(
          fileInput(tool, `${POSIX_ROOT}/${file}`, POSIX_ROOT),
          POSIX_ROOT,
        );

        expect(result.status, result.stderr).toBe(0);
      });
    });
  });
});

describe('Bash', () => {
  describe('blocks a command that writes under .claude/', () => {
    it.each([
      `node -e "require('fs').writeFileSync('.claude/settings.json', '{}')"`,
      `sed -i 's/Bash/Read/' .claude/settings.json`,
      'cp notes.md .claude/agents/builder.md',
      'echo invented > .claude/hooks/block-dangerous-git.sh',
      'mv draft.md .claude/skills/tdd/SKILL.md',
      'rm .claude/agents/builder.md',
      'echo invented | tee .claude/settings.json',
      `rm ${POSIX_ROOT}/.claude/agents/builder.md`,
      `del ${WINDOWS_ROOT}\\.claude\\agents\\builder.md`,
    ])('%s', (command) => {
      const result = runHook(bashInput(command), POSIX_ROOT);

      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/^BLOCKED: /);
    });
  });

  describe('blocks a read-only git command joined to another by a shell operator', () => {
    it.each([
      'git diff .claude/settings.json | tee .claude/settings.json',
      'git status; rm .claude/settings.json',
      'git log .claude/ && rm -r .claude/hooks',
      'git show HEAD:.claude/settings.json > .claude/settings.json',
      'git diff $(rm .claude/settings.json)',
    ])('%s', (command) => {
      const result = runHook(bashInput(command), POSIX_ROOT);

      expect(result.status).toBe(2);
    });
  });

  describe('allows', () => {
    it.each([
      'git diff .claude/settings.json',
      'git status',
      'git log --oneline -- .claude/',
      'git show HEAD:.claude/settings.json',
      'git add .claude/settings.json',
      'cat .claudeignore',
      'npm run verify',
    ])('%s', (command) => {
      const result = runHook(bashInput(command), POSIX_ROOT);

      expect(result.status, result.stderr).toBe(0);
    });
  });
});

describe('unparseable input', () => {
  it('blocks', () => {
    const result = runHook('{ not json', POSIX_ROOT);

    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/^BLOCKED: /);
  });
});

describe('.claude/settings.json', () => {
  interface HookEntry {
    matcher: string;
    hooks: { type: string; command: string }[];
  }

  function preToolUseEntries(): HookEntry[] {
    const settings = JSON.parse(readFileSync(SETTINGS, 'utf8')) as {
      hooks?: { PreToolUse?: HookEntry[] };
    };
    return settings.hooks?.PreToolUse ?? [];
  }

  function entriesRunning(script: string): HookEntry[] {
    return preToolUseEntries().filter((entry) =>
      entry.hooks.some((hook) => hook.command.includes(script)),
    );
  }

  it('runs the guard for Edit, Write and Bash', () => {
    const matchers = entriesRunning('block-claude-edits.sh').flatMap((entry) =>
      entry.matcher.split('|'),
    );

    expect(matchers).toEqual(expect.arrayContaining(['Edit', 'Write', 'Bash']));
  });

  it('still runs the dangerous-git hook for Bash', () => {
    const matchers = entriesRunning('block-dangerous-git.sh').flatMap((entry) =>
      entry.matcher.split('|'),
    );

    expect(matchers).toContain('Bash');
  });
});
