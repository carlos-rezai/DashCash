---
status: open
---
# The Quarantine check takes today

## Parent PRD

`prd.md`

## What to build

The **Quarantine check** gets the shape the **Audit** has, so its tests run
on a fixed clock (plan Phase 9; PRD "Entry date rules and the Quarantine
check"; design log Q23, P4).

- `scripts/checkQuarantine/checkQuarantine.ts` exports
  `checkQuarantine({ root, today, listTrackedPaths }): Violation[]`: it
  loads the **Quarantine** under `root` and returns the load violation, or
  `findQuarantineViolations(quarantine, today, listTrackedPaths(root))`.
  `today` is `YYYY-MM-DD`; `listTrackedPaths(root)` returns git's tracked
  paths. Prior art: `checkAudit({ today, … })` and its
  `CheckAuditDependencies`.
- The `import.meta.main` entry only passes `process.cwd()`, today's UTC
  date (`new Date().toISOString().slice(0, 10)`) and the git reader to
  `checkQuarantine` through `runGate`; it holds no rule.
- `scripts/checkQuarantine/checkQuarantine.test.ts`: every case of the
  spawned `check:quarantine` tests that depends on the date (the valid
  entry and the date rows of the per-cause table, built with `utcDate`
  around `Date.now()`) moves to tests of `checkQuarantine` on an invented
  tree with fixed `today` values: added later than today, expiry before
  added, expiry past 30 days, expired from the day after its **Expiry
  date**, a valid entry. The spawned tests keep only date-free cases: an
  empty passing **Quarantine**, an unreadable file (missing, not JSON), and
  the exit code and `<subject>: <reason>` line format shown with a
  malformed entry, such as a missing field (P4). `utcDate` and every read
  of the real clock leave the test file.
- `findQuarantineViolations`' tests, messages and output stay unchanged.

No gate file is changed.

## Acceptance criteria

- [ ] A RED commit adds the tests of `checkQuarantine`, which fail because
      it does not exist yet.
- [ ] Every date case runs with a fixed `today`: added later than today,
      expiry before added, expiry past 30 days, expired from the day after
      its **Expiry date**, a valid entry.
- [ ] The spawned entry tests hold an empty passing **Quarantine**, an
      unreadable file, and the exit code and line format shown with a
      malformed entry; no test reads the real clock.
- [ ] The entry holds no rule; messages and output are unchanged.
- [ ] `npm run verify` is green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 36, 37, 38
