---
status: done
---
# Pull-request workflow

## Parent PRD

`prd.md`

## What to build

The tracer bullet that rewires CI (plan Phase 1; PRD Implementation
Decisions, "CI workflows"; design log Q5–Q8). The `pull-request` job moves
verbatim from `.github/workflows/ci.yml` into a new
`.github/workflows/pull-request.yml`, `name: Pull request`, whose only
trigger is `pull_request` into `main`. `ci.yml` keeps `name: CI`, only the
`push` trigger for `feat/**` and `refactor/**`, and only the `verify` job.
Both jobs lose their `if:`.

The gate tests `gates/gateWiring/gateWiring.test.ts` and
`gates/ruleset/ruleset.test.ts` read the `pull-request` job from the new
workflow instead of `ci.yml`, and gain two checks: the pull-request
workflow has no trigger besides `pull_request` into `main`, and across
every file under `.github/workflows/` exactly one job reports as
`pull-request`. The **Ruleset** file is not touched.

This ticket is the approval to change exactly `.github/workflows/ci.yml`,
to create `.github/workflows/pull-request.yml`, and to change the two gate
tests named above.

## Acceptance criteria

- [x] `ci.yml` is `name: CI`, triggered only by `push` to `feat/**` and
      `refactor/**`, with one job `verify` running `npm run verify`.
- [x] `pull-request.yml` is `name: Pull request`, triggered only by
      `pull_request` into `main`; its job `pull-request` runs checkout with
      full history, setup-node from `.nvmrc` with the npm cache, `npm ci`,
      `npm run verify:full`, then `npm run check:pr` with `PR_TITLE` from
      the event, as in 01.
- [x] No job in any workflow has an `if:`.
- [x] The wiring test fails when the pull-request workflow gains another
      trigger, and when the push workflow gains a trigger other than `push`
      to the two branch patterns.
- [x] The **Ruleset** test reads the job from the pull-request workflow and
      fails when a second workflow has a job reporting as `pull-request`.
- [x] The **Ruleset** file is unchanged and still requires `pull-request`.
- [x] A push of the branch runs one workflow, `CI`, with one job `verify`,
      green; no `pull-request` job appears in the push run.
- [x] `npm run verify` is green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 1, 2, 3, 4, 5, 6, 7
- User story 8 (`CI`, `Pull request`)
