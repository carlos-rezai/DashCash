---
status: open
---
# Nightly mutation job

## Parent PRD

`prd.md`

## What to build

The **Daily run** gains the **Mutation run** (plan Phase 4; PRD "Daily
run" and "Gate tests"; design log Q25, A4, A5).

- `.github/workflows/daily.yml` keeps its `name: Daily`, its triggers
  (`schedule` `0 5 * * *` and `workflow_dispatch`) and its job `daily`
  exactly as they are, and gains the job `mutation`, with no job `if:` and
  no `needs:`, so it runs beside `daily` on `main`. Its steps, in order:
  1. checkout, no `with` (default depth);
  2. setup-node from `.nvmrc` with the npm cache;
  3. `npm ci`;
  4. `npm run test:mutation`;
  5. `actions/upload-artifact` with only `name: mutation-report` and
     `path: reports/mutation/mutation.html`, and `if: always()` on the
     step.
  Every `uses:` is a **Pinned action** with its `# v…` comment; checkout
  and setup-node at the SHAs the other jobs already use (design log,
  Assumptions from prd-to-issues, I3), the upload action
  at the SHA of its newest release at least 14 days old on the day of
  building. `if-no-files-found`, retention and `timeout-minutes` stay at
  GitHub's defaults. No gitleaks step: the `daily` job keeps the only
  full-history **Secret scan** of the night.
- `gates/gateWiring/gateWiring.test.ts`: the check that the daily
  workflow has the one job `daily` becomes exactly the jobs `daily` and
  `mutation`; every existing daily and **Secret scan** check stays. A
  problem finder for the `mutation` job, in the style of
  `findDailyWiringProblems`, names each missing piece, one line each, with
  one test per removed or added piece in the style of the daily job's
  `it.each` table.

- On pull requests, only if the wall time of the first full **Mutation
  run** in the Notes of `04-informative-mutation-run.md` is under 10
  minutes (design log, Implementation Results, D2):
  - `.github/workflows/pull-request.yml`: the `pull-request` job gains the
    step `npm run test:mutation` after `npm run check:pr`; every other
    step stays as it is. The **Required check** then runs the **Mutation
    run**: informative until `06-break-threshold.md`, from then on a
    **Mutation score** below the **Break threshold** fails the pull
    request.
  - `gates/gateWiring/gateWiring.test.ts`: the pull-request job's command
    list becomes `npm ci`, `npm run verify:full`, `npm run check:pr`,
    `npm run test:mutation`, with a test that fails when the mutation step
    is removed or moved before `npm run check:pr`.
  - `docs/ubiquitous-language.md`: the relationship that says **Mutation
    testing** is "not the **Required check**" says it runs in the
    **Required check** and in the **Daily run**.
  - `README.md`: the cadence of the gates table's Mutation testing row,
    today `nightly, ratchet`, names the pull-request run beside the
    nightly one, for example `pull request and nightly, ratchet`.
  - If the wall time is 10 minutes or longer: none of this. Record the
    time from 04 in this ticket's Notes; mutation testing stays nightly
    only.

This ticket is the approval to change exactly
`.github/workflows/daily.yml` and `gates/gateWiring/gateWiring.test.ts`,
and, only under the 10-minute condition above,
`.github/workflows/pull-request.yml`.

## Acceptance criteria

- [ ] `daily.yml` has exactly the jobs `daily` and `mutation`, its name and
      triggers unchanged, no job `if:` and no `needs:`.
- [ ] The `daily` job's steps and every existing daily wiring check are
      unchanged; the **Secret scan** jobs stay `verify`, `pull-request` and
      `daily`.
- [ ] The `mutation` job runs, in order: checkout without `with`,
      setup-node from `.nvmrc` with the npm cache, `npm ci`,
      `npm run test:mutation`, then the upload with only
      `name: mutation-report`, `path: reports/mutation/mutation.html` and
      `if: always()` on the step.
- [ ] The problem finder names one problem each when the checkout,
      setup-node, `.nvmrc`, npm cache, `npm ci`, the mutation run, the
      upload, its name, its path or its `if: always()` is removed, and when
      the job gains another npm command or a gitleaks step; each case has
      its own test.
- [ ] The upload action is pinned to the SHA of its newest release at least
      14 days old, with its `# v…` comment; the **Pinned action** gate
      passes unchanged.
- [ ] The ticket's Notes state 04's wall time and the decision it gives.
      Under 10 minutes: the `pull-request` job runs `npm ci`,
      `npm run verify:full`, `npm run check:pr`, `npm run test:mutation` in
      that order, the wiring test fails when the mutation step is removed
      or moved before `npm run check:pr`, the glossary says mutation
      testing runs in the **Required check**, and the cadence of the
      `README.md` gates table's Mutation testing row names the pull-request
      run beside the nightly one. 10 minutes or longer: `pull-request.yml`,
      its wiring checks and the README cadence are unchanged.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `04-informative-mutation-run.md` (`npm run test:mutation`)

## User stories addressed

- User stories 32, 33, 34, 35, 36, 37, 38
