---
status: open
---
# The dangerous-git hook judges the push part only

## Parent PRD

`prd.md`

## What to build

The **Dangerous-git hook** stops blocking a push from a feature branch
chained with a command that names `main` (plan Phase 15; PRD
"Dangerous-git hook"; design log Q32, Q33).

- `.claude/hooks/block-dangerous-git.sh`: the `main` rule splits the
  command at `&&`, `||`, `;`, `|` and line breaks, and matches
  `(:| )main( |$)` only against a part that runs `git push`. So
  `git push -u origin feat/<x> && gh pr create --base main` passes from a
  `feat/*` branch, while `git push origin main`, `git push origin HEAD:main`
  and either of them inside a chain stay blocked. The branch rule (push only
  from `feat/*` or `refactor/*`) and every other pattern stay.
- `gates/dangerousGitGuard/dangerousGitGuard.test.ts`: runs the hook as
  Claude Code does (the tool call as JSON on standard input, the exit code
  and message read back), with invented commands, in a temporary git
  repository on a `feat/*` branch and on `main`. It pins the cases above
  and one case per existing pattern of the hook. Prior art:
  `gates/claudeFolderGuard/` and `scripts/test-support/sampleRepository/`.

## Who builds it

The human, or an agent with the human's go in an interactive session. A
ticket never counts as approval for `.claude/` (`CLAUDE.md`, "Ask first";
design log Q33), so the issue-loop stops at this ticket. It must be
`status: done` before the feature pull request.

## Acceptance criteria

- [ ] A RED commit adds the hook's gate test, and the chained
      `git push -u origin feat/<x> && gh pr create --base main` case fails.
- [ ] From a `feat/*` branch that chain is allowed; `git push origin main`,
      `git push origin HEAD:main` and either inside a chain stay blocked.
- [ ] One case per existing pattern of the hook passes as before.
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
