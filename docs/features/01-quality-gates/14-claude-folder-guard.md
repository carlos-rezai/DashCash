---
status: in-progress
---
# Claude folder guard

## Parent PRD

`prd.md`

## What to build

A PreToolUse hook that blocks every `Edit` and `Write` of a path under
`.claude/`, so that an agent cannot change its own skills, agents, hooks or
settings (`CLAUDE.md`, "Ask first"). Added by the human on 2026-10-31.

- `.claude/hooks/block-claude-edits.sh`, in the style of
  `block-dangerous-git.sh`: reads the hook input from standard input,
  parses it with `node` (no `jq`), fails closed when parsing fails, and
  exits 2 with a `BLOCKED: …` message on standard error. It takes
  `tool_input.file_path`, accepts `\` and `/` separators, resolves a
  relative path against `cwd`, and blocks when the path, relative to the
  project root (`CLAUDE_PROJECT_DIR`), starts with `.claude/`. Anything
  else exits 0.
- `.claude/settings.json`: a second `PreToolUse` entry with the matcher
  `Edit|Write|Bash` running the hook, next to the existing `Bash` entry;
  the existing `Bash` entry for `block-dangerous-git.sh` stays.
- The same hook for `Bash`: it takes `tool_input.command` and blocks any
  command that names a path under `.claude/` (relative, or absolute with
  `\` or `/`), unless the whole command is a single `git status`,
  `git diff`, `git log`, `git show` or `git add` with no shell operators
  (`|`, `;`, `&&`, `||`, `>`, `<`, `$(`, backticks). Reading `.claude/`
  goes through `Read`, `Grep` and `Glob`. This closes `node -e`, `sed -i`,
  `cp`, `mv`, `rm`, `tee` and redirection; it does not try to catch
  deliberately obfuscated paths.

## Who builds it

The human, or an agent with the human's go in an interactive session. A
ticket never counts as approval for `.claude/` (`CLAUDE.md`, "Ask first"),
so the issue-loop stops at this ticket. It must be `status: done` before
the feature pull request. After this ticket, changes to `.claude/` are made
by the human by hand.

## Acceptance criteria

- [ ] A test feeds the hook sample inputs and checks the exit code:
      `Edit` and `Write` of `.claude/settings.json`, a skill, an agent and
      a hook, given as absolute paths with `\` and with `/` and as a
      relative path, exit 2; `.claudeignore`, `docs/.claude.md` and a
      path in `scripts/` exit 0; unparseable input exits 2. `Bash`
      commands that write under `.claude/` (`node -e` with
      `writeFileSync`, `sed -i`, `cp`, `echo > …`) exit 2;
      `git diff .claude/settings.json` and `git status` exit 0; a command
      naming `.claudeignore` exits 0.
- [ ] `.claude/settings.json` runs the hook for `Edit|Write`, and the
      `Bash` hook still runs.
- [ ] In a Claude Code session, an `Edit` of a file under `.claude/` is
      refused with the hook's message.
- [ ] `npm run verify` and CI's `verify` job are green.

## Blocked by

- Blocked by `01-workspace-and-verify.md` (the test runner)

## User stories addressed

- None in the PRD; added by the human.
