---
status: in-progress
---
# Electron binary before tests

## Parent PRD

`prd.md`

## What to build

No test downloads Electron (PR 8 review round 1, finding 1;
`01-electron-window.md` Notes; CLAUDE.md, Tests: "no network").

Electron 45 no longer downloads its binary during `npm ci`: the first
`require('electron')` does (`node_modules/electron/index.js`). The probe in
`11-migration-runner.md` (`nodeSqliteProbe.test.ts`) and every end-to-end
run call it, so today `npm run test` downloads about 100 MB in CI, in the
Stryker runs and on a fresh checkout.

- Every workflow job that runs tests installs the binary in its own step
  right after `npm ci`, before any test: `node_modules/.bin/install-electron`.
  That is `verify` in `.github/workflows/ci.yml`, `pull-request` in
  `.github/workflows/pull-request.yml` and `mutation` in
  `.github/workflows/daily.yml`. The `daily` job runs no tests and stays as
  it is.
- `gates/gateWiring/gateWiring.test.ts` pins, for each of the three jobs,
  the install step directly after `npm ci` and before the first test
  command, and names each missing or misplaced step; the `daily` job's
  pinned commands stay as they are.
- `README.md`, Getting started: the same step after `npm ci`, with one line
  on why.
- `design-log.md` Implementation Results: a deviation that `npm ci` no
  longer downloads Electron (Trade-offs, line 646; `prd.md` line 677), and
  that a separate install step does.

This ticket is the approval to change `.github/workflows/ci.yml`,
`.github/workflows/pull-request.yml`, `.github/workflows/daily.yml` and
`gates/gateWiring/gateWiring.test.ts`.

## Acceptance criteria

- [ ] A RED commit holds the gate wiring test changes and fails on them.
- [ ] `verify`, `pull-request` and `mutation` each run
      `node_modules/.bin/install-electron` directly after `npm ci` and
      before their first test command; the `daily` job is unchanged.
- [ ] The wiring test names each missing or misplaced install step, per
      job.
- [ ] README's Getting started shows the step after `npm ci`.
- [ ] The deviation is in `design-log.md` Implementation Results.
- [ ] The first CI run after the change shows no `Downloading Electron
      binary...` line in the test steps (recorded in the Notes).
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `11-migration-runner.md`

## User stories addressed

- User story 102 (the CI jobs)
