---
status: done
---
# Secret scan

## Parent PRD

`prd.md`

## What to build

The **Secret scan** in CI (plan Phase 6; PRD "CI workflows", gitleaks;
design log Q27–Q29, A8): `gitleaks/gitleaks-action`, as a **Pinned
action** with its `# v…` comment (SHA looked up on GitHub when building),
is the step right after checkout and before setup-node in the `verify` job
of `.github/workflows/ci.yml`, the `pull-request` job of
`.github/workflows/pull-request.yml` and the `daily` job of
`.github/workflows/daily.yml`. Each step has env `GITHUB_TOKEN` from the
workflow's secret (`secrets.GITHUB_TOKEN`) and
`GITLEAKS_ENABLE_COMMENTS: false`; default rules, no gitleaks config file,
no `.gitleaksignore`. On push the action scans the pushed commits, on a
pull request the PR's commits, in the **Daily run** the whole history.

`gates/gateWiring/gateWiring.test.ts` fails for each of the three jobs
when its gitleaks step is removed, placed before checkout, or has comments
enabled.

This ticket is the approval to change exactly the three workflow files
above and the gate wiring test.

## Acceptance criteria

- [x] Each of the three jobs runs gitleaks after checkout and before
      setup-node, with `GITLEAKS_ENABLE_COMMENTS` `false` and the
      workflow's `GITHUB_TOKEN`.
- [x] No gitleaks config file and no `.gitleaksignore` exist.
- [x] The wiring test fails for each job when its gitleaks step is
      removed, moved before checkout or has comments enabled.
- [x] The pinned-actions test passes with the gitleaks action.
- [ ] A push of the branch runs gitleaks green over the branch in CI's
      `verify` job; `npm run verify` is green.

## Blocked by

- Blocked by `02-pinned-actions.md`
- Blocked by `07-daily-run.md` (the `daily` job)

## User stories addressed

- User stories 35, 36, 37, 38, 40
- User story 44 (gitleaks in the **Daily run**)
