---
status: in-progress
---
# End-to-end tests in CI

## Parent PRD

`prd.md`

## What to build

Every pull request proves the app starts, on Linux with the sandbox intact
(plan Phase 1; PRD "CI" and "Gate tests"; design log Q42).

- `.github/workflows/pull-request.yml`, `pull-request` job: a step before
  `verify:full` runs
  `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`;
  `verify:full` runs as `xvfb-run --auto-servernum npm run verify:full`;
  the order `npm ci`, `verify:full`, `check:pr`, `test:mutation` is kept.
  Nothing passes `--no-sandbox`.
- The push workflow keeps running **Verify** only, unchanged.
- `gates/gateWiring/gateWiring.test.ts` pins the sysctl step before
  `verify:full`, the `xvfb-run --auto-servernum` wrapping, the job's step
  order and the absence of `--no-sandbox`, and names each missing piece.

The first `pull-request` run confirms the sysctl step on the runner; if it
fails there, the fix is that step, never `--no-sandbox` (PRD, Further
Notes).

This ticket is the approval to change `.github/workflows/pull-request.yml`
and `gates/gateWiring/gateWiring.test.ts`.

## Acceptance criteria

- [ ] A RED commit holds the gate wiring test changes and fails on them.
- [ ] The `pull-request` job runs the sysctl step before `verify:full`,
      runs `verify:full` under `xvfb-run --auto-servernum`, keeps the order
      `npm ci`, `verify:full`, `check:pr`, `test:mutation`, and never
      passes `--no-sandbox`.
- [ ] The wiring test names each missing piece: the sysctl step, its
      place, the `xvfb-run` wrapping, a `--no-sandbox` anywhere in the job.
- [ ] The push workflow is unchanged.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `02-start-app-flow.md`

## User stories addressed

- User stories 87, 88
- User story 102 (the `pull-request` job)
