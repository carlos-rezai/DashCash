---
status: done
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

On `renovate/*` the title is `chore: <description>`, without `[<feature>]`
and without a number, because Renovate titles carry no feature. Every other
description rule of the commitlint config still applies to it: lower case,
no trailing full stop, at most 50 characters, and no `@` or `#` anywhere.
The `@` rule stays: feature 02 configures Renovate to use
`depNameSanitized`, so a scoped package such as `@types/node` never puts an
`@` in the title.

`check:pr` runs only in CI's `pull-request` job, after
`npm run verify:full`, with `PR_TITLE` set from the event's title in the
step's `env`, never inside the shell command (Q32). Neither **Verify** nor
**Verify full** runs it (Q26).

## Acceptance criteria

- [x] On `feat/<NN>-<feature>`: a folder whose **Tickets** all read
      `status: done` passes; an `open` or `in-progress` **Ticket** fails; a
      status line carrying the template's trailing `# …` comment is read
      correctly; a folder without a **Ticket** fails.
- [x] On `refactor/<NN>-<feature>`: all **Refactor steps** ticked passes; an
      unticked step fails; a missing `refactor-plan.md` fails.
- [x] On `renovate/*`: a title `chore: <description>` passes, with no
      folder or plan check; a title of any other type, a title with
      `[<feature>]` or a number, and a title whose description breaks a
      description rule (upper case, trailing full stop, more than 50
      characters, `@` or `#`) fail.
- [x] Any other branch, or no branch, fails.
- [x] On `feat/*` and `refactor/*`: a title following the **Commit
      header** grammar without a number passes; a title with a number or
      with `@` or `#` fails. On any branch, no title fails.
- [x] The gate wiring test fails when `verify` or `verify:full` runs
      `check:pr`, when the `pull-request` job stops running `npm run
      check:pr` after `npm run verify:full`, and when the title reaches the
      command other than through `PR_TITLE`.
- [ ] CI's `verify` job is green.

## Blocked by

- Blocked by `08-ticket-check.md`

## User stories addressed

- User stories 63, 64, 65, 66, 67, 68, 69
- User story 81
