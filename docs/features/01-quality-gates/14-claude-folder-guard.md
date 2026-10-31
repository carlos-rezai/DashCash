---
status: open
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
  `Edit|Write` running the hook, next to the existing `Bash` entry.

Edits through `Bash` (`sed`, redirection) are out of scope; the existing
`Bash` hook and the human's review cover them.

## Who builds it

The human, or an agent with the human's go in an interactive session. A
ticket never counts as approval for `.claude/` (`CLAUDE.md`, "Ask first"),
so the issue-loop stops at this ticket. It must be `status: done` before
the feature pull request.

## Acceptance criteria

- [ ] A test feeds the hook sample inputs and checks the exit code:
      `Edit` and `Write` of `.claude/settings.json`, a skill, an agent and
      a hook, given as absolute paths with `\` and with `/` and as a
      relative path, exit 2; `.claudeignore`, `docs/.claude.md` and a
      path in `scripts/` exit 0; unparseable input exits 2.
- [ ] `.claude/settings.json` runs the hook for `Edit|Write`, and the
      `Bash` hook still runs.
- [ ] In a Claude Code session, an `Edit` of a file under `.claude/` is
      refused with the hook's message.
- [ ] `npm run verify` and CI's `verify` job are green.

## Blocked by

- Blocked by `01-workspace-and-verify.md` (the test runner)

## User stories addressed

- None in the PRD; added by the human.
