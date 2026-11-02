---
status: open
---
# Home settings guard

## Parent PRD

`prd.md`

## What to build

The **Claude folder guard** also refuses an agent's `Edit` and `Write` of
the **Home settings** (plan Phase 10; PRD "Claude folder guard"; design
log Q45–Q48):

- `.claude/hooks/block-claude-edits.sh`: the node judge also receives the
  home folder (`HOME`, else `USERPROFILE`) on standard input, like the
  project root, normalises it the same way (`\` and `/`, Git Bash
  `/c/…`, case), resolves a `file_path` starting with `~/` or `~\` against
  it, and blocks `Edit` and `Write` whose path equals
  `<home>/.claude/settings.json`. With neither variable set, the home rule
  is skipped and the project rule still applies. The Bash rule is
  unchanged.
- `gates/claudeFolderGuard/claudeFolderGuard.test.ts` gains Q48's cases,
  with invented home folders (`/home/sample`, `C:\Users\Sample`).

## Who builds it

The human, or an agent with the human's go in an interactive session. A
ticket never counts as approval for `.claude/` (`CLAUDE.md`, "Ask first"),
so the issue-loop stops at this ticket (design log Q47). It must be
`status: done` before the feature pull request.

## Acceptance criteria

- [ ] `Edit` and `Write` of the **Home settings** as a POSIX, Windows, Git
      Bash and `~/` path exit 2.
- [ ] A memory file under the home `.claude/projects/`, a
      `settings.json.bak` beside the **Home settings** and a
      `.claude/settings.json` under another home subfolder exit 0.
- [ ] Bash commands naming `~/.claude/settings.json` and
      `$HOME/.claude/settings.json` exit 2.
- [ ] With neither `HOME` nor `USERPROFILE` set, the home rule is skipped
      and the project rule still blocks.
- [ ] Every existing guard case keeps its exit code.
- [ ] `npm run verify` and CI's `verify` job are green.

## Handover

Not a criterion. After the feature is merged, the human:

1. runs the apply script in `scripts/applyBranchProtection/` again, so
   that **Push protection** is switched on (`09-push-protection.md`);
2. installs the Renovate GitHub App on the repository
   (`10-renovate-config.md`);
3. starts the **Daily run** once with `workflow_dispatch`
   (`07-daily-run.md`).

## Blocked by

None — can start immediately. Numbered last so that the issue-loop builds
every other ticket before it stops here (design log A14).

## User stories addressed

- User stories 64, 65, 66, 67, 68, 69, 70
