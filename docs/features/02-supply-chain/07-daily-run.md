---
status: in-progress
---
# Daily run

## Parent PRD

`prd.md`

## What to build

The **Daily run** (plan Phase 5; PRD "CI workflows"; design log Q31, Q32,
A8): a new `.github/workflows/daily.yml`, `name: Daily`, triggered by
`schedule` `cron: '0 5 * * *'` and `workflow_dispatch`, with one job
`daily`: checkout with full history, setup-node from `.nvmrc` with the npm
cache, `npm ci`, `npm run check:audit`. No `if:`; every `uses:` a
**Pinned action** with its `# v…` comment from the start. GitHub runs a
scheduled workflow on the default branch, so on `main`. The **Secret scan**
step joins in `08-secret-scan.md`.

`gates/gateWiring/gateWiring.test.ts` gains the daily workflow's checks:
the triggers are exactly the schedule and `workflow_dispatch`, the job
checks out full history and runs `npm run check:audit` and nothing of
**Verify** besides. The pinned-actions and **Ruleset** tests cover the new
file without change.

This ticket is the approval to create exactly `.github/workflows/daily.yml`
and to change the gate wiring test.

Then, by hand, after the feature is merged (not a criterion): the human
starts the **Daily run** once with `workflow_dispatch`.

## Acceptance criteria

- [ ] The daily workflow is `name: Daily`; its triggers are exactly the
      schedule `0 5 * * *` and `workflow_dispatch`; its one job `daily`
      runs `npm run check:audit` and no other gate of **Verify**.
- [ ] The wiring test fails when the schedule, the manual trigger, the
      full-history checkout or the audit step is removed.
- [ ] The pinned-actions test and the single-`pull-request`-job check pass
      with the new workflow.
- [ ] `npm run verify` and CI's `verify` job are green.

## Blocked by

- Blocked by `02-pinned-actions.md` (the pinned-actions test)
- Blocked by `05-audit.md` (`check:audit`)

## User stories addressed

- User story 8 (`Daily`)
- User stories 41, 42, 43
- User story 44 (schedule, manual trigger, **Audit**)
