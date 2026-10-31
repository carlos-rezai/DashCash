---
status: open
---
# Pull-request check

## Parent PRD

`prd.md`

## What to build

The **Pull-request check** for pull requests into `main` (plan Phase 8;
PRD Implementation Decisions, "Pull-request check"):
`scripts/checkPullRequest/` with the pure core `checkPullRequest(input)`
and an entry that reads the title from `PR_TITLE`, the branch through
`resolveBranchName`, lints the title with the commitlint config and reports
through `reportViolations`.

`check:pr` runs only in CI's `pull-request` job, after
`npm run verify:full`, with `PR_TITLE` set from the event's title in the
step's `env`, never inside the shell command (Q32). Neither **Verify** nor
**Verify full** runs it (Q26).

## Acceptance criteria

- [ ] On `feat/<NN>-<feature>`: a folder whose **Tickets** all read
      `status: done` passes; an `open` or `in-progress` **Ticket** fails; a
      status line carrying the template's trailing `# …` comment is read
      correctly; a folder without a **Ticket** fails.
- [ ] On `refactor/<NN>-<feature>`: all **Refactor steps** ticked passes; an
      unticked step fails; a missing `refactor-plan.md` fails.
- [ ] On `renovate/*`: a title of type `chore` without a number passes,
      with no folder or plan check; a title of any other type fails.
- [ ] Any other branch, or no branch, fails.
- [ ] A title following the **Commit header** grammar without a number
      passes; a title with a number, with `@` or `#`, or no title fails.
- [ ] The gate wiring test fails when `verify` or `verify:full` runs
      `check:pr`, when the `pull-request` job stops running `npm run
      check:pr` after `npm run verify:full`, and when the title reaches the
      command other than through `PR_TITLE`.
- [ ] CI's `verify` job is green.

## Blocked by

- Blocked by `08-ticket-check.md`

## User stories addressed

- User stories 63, 64, 65, 66, 67, 68, 69
- User story 81
