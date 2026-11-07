---
status: open
---
# Quarantine check

## Parent PRD

`prd.md`

## What to build

A quarantine ends in a fix or a deletion (plan Phase 7; PRD "Quarantine",
"CI", "Workspace members and scripts" and "Gate tests"; design log Q45,
A6, A7).

- `scripts/checkQuarantine/checkQuarantine.ts`, its test beside it: the
  pure core
  `findQuarantineViolations(quarantine: unknown, today: string, trackedPaths: readonly string[]): Violation[]`
  returns one violation per cause, subject `quality/flaky-quarantine.json`,
  reasons of A6: the shape violations of `readQuarantine`
  (`15-quarantined-tests-left-out.md`); `added` later than today
  (`is later than today`); `expires` before `added` (`is before added`) or
  more than `MAX_QUARANTINE_DAYS = 30` days after it
  (`is more than 30 days after added`); an expired entry from the day after
  its **Expiry date**, UTC (`expired on <date>`); a `file` that is not a
  tracked path under `e2e/` ending in `.spec.ts`
  (`must name a tracked e2e/ spec file`); a `ticket` that is not a tracked
  `docs/features/<NN>-<feature>/<nn>-<name>.md`
  (`must name a tracked ticket`). Dates are read with `readCalendarDate`.
- The thin entry reads the file, today in UTC and the tracked paths, and
  reports through `runGate`; a missing file or invalid JSON fails closed
  with `cannot be read as JSON: …`.
- `package.json`: `check:quarantine` =
  `node scripts/checkQuarantine/checkQuarantine.ts`; `verify` runs it last,
  after `check:audit`, as its twelfth gate.
- `.github/workflows/daily.yml`: the `daily` job runs
  `npm run check:quarantine` beside `check:audit`.
- `gates/gateWiring/gateWiring.test.ts` pins both.

This ticket is the approval to add the `check:quarantine` script and change
the `verify` script in `package.json`, and to change
`.github/workflows/daily.yml` and `gates/gateWiring/gateWiring.test.ts`.

## Acceptance criteria

- [ ] A RED commit adds the core, entry and wiring tests, and fails on
      them.
- [ ] `findQuarantineViolations` has a table per rule of A6, the 30-day
      limit on both sides, expiry valid on its date and failing the day
      after with `expired on <date>`, and several causes reported in one
      run.
- [ ] The entry, in a temporary sample repository, exits 0 on `[]` and on
      a valid entry, and 1 with one `quality/flaky-quarantine.json:
      <reason>` line per cause on a missing file, invalid JSON and each
      rule.
- [ ] `verify` runs its twelve gates with `check:quarantine` last; the
      `daily` job runs it beside `check:audit`; the wiring test fails when
      either is missing.
- [ ] The **Mutation score** stays at or above the **Break threshold** of
      81 (`npm run test:mutation`, run by the builder, score in the Notes).
- [ ] `npm run verify:full` is green.

## Blocked by

- Blocked by `15-quarantined-tests-left-out.md`

## User stories addressed

- User stories 94, 95, 96, 97, 98, 99, 100
- User story 102 (`check:quarantine`)
