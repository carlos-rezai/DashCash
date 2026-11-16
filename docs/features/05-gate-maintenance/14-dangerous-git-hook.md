---
status: in-progress
---
# The dangerous-git hook blocks chained pushes

## Parent PRD

`prd.md`

## What to build

The **Dangerous-git hook** blocks any `git push` chained with another
command, matching `CLAUDE.md`'s rule "Run `git push` as its own command"
(plan Phase 15; PRD "Dangerous-git hook"; design log Q32, Q33, D3).

- `.claude/hooks/block-dangerous-git.sh`: a command that runs `git push`
  and holds a shell operator (`&&`, `||`, `;`, `|`, `&`) or a line break is
  blocked as `git push chained with another command`, before the branch
  and `main` rules. So `git push && gh pr create --base main`,
  `git switch main && git push`, `git add . ; git push` and
  `git push | cat` are blocked from any branch. A lone `git push` keeps the
  branch rule (push only from `feat/*` or `refactor/*`) and the `main` rule
  (`git push origin main` and `git push origin HEAD:main` stay blocked).
  `gh pr create --base main` on its own is not a push and passes. Every
  other pattern stays.
- `gates/dangerousGitGuard/dangerousGitGuard.test.ts`: runs the hook as
  Claude Code does (the tool call as JSON on standard input, the exit code
  and message read back), with invented commands, in temporary git
  repositories on `main`, a `feat/*` and a `refactor/*` branch. It pins the
  cases above and one case per existing pattern of the hook. Prior art:
  `gates/claudeFolderGuard/` and `scripts/test-support/sampleRepository/`.

## Who builds it

The human, or an agent with the human's go in an interactive session. A
ticket never counts as approval for `.claude/` (`CLAUDE.md`, "Ask first";
design log Q33), so the issue-loop stops at this ticket. It must be
`status: done` before the feature pull request.

## Acceptance criteria

- [ ] A RED commit adds the hook's gate test, and the chained cases fail
      at their assertion.
- [ ] A `git push` chained with another command is blocked as
      `git push chained with another command`:
      `git push && gh pr create --base main`, `git switch main && git push`,
      `git add . ; git push`, `git push | cat`.
- [ ] A lone `git push` from `feat/*` or `refactor/*` is allowed, as are
      `git push origin feat/x` and `git push -u origin HEAD`; a lone
      `git push origin main` or `git push origin HEAD:main` is blocked.
- [ ] `gh pr create --base main` on its own is allowed.
- [ ] One case per existing pattern of the hook blocks as before.
- [ ] `npm run verify` is green.

## Handover

Not a criterion. After the feature is merged, the human (design log Q36):

1. checks the titles of the first **Renovate PRs** of each kind against the
   five titles of `03-renovate-commit-message-parts.md`;
2. runs `npm ci` once in a fresh clone and sees the **Electron binary**
   download there, and no test download it afterwards.

## Blocked by

None — can start immediately. Numbered last so that the issue-loop builds
every other ticket, the ratchet included, before it stops here (design log
A6).

## User stories addressed

- User stories 56, 57, 58, 59, 60
