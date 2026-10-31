---
status: in-progress
---
# Data-file check

## Parent PRD

`prd.md`

## What to build

The first gate script and the pattern every later one follows (plan
Phase 3; PRD Implementation Decisions, "Gate script modules" and
"Data-file check"): `scripts/checkDataFiles/` with a pure core
`findDataFiles(trackedPaths)` that returns every **Data file**, and a thin
entry that reads `git ls-files`, reports and sets the exit code.
`check:data-files` joins **Verify** at its Q23 place, after `test`.

This ticket also creates the shared output module
`scripts/reportViolations/` (design log I2): it exports
`Violation = { subject: string; reason: string }` and writes one
`<subject>: <reason>` line per violation to standard error with
`console.error`, returning exit code 1, or exit code 0 without output when
there is none (A9). Every later gate entry reports through it.

## Acceptance criteria

- [ ] `findDataFiles`'s table-driven tests cover `*.db`, `*.db-*`,
      `*.sqlite`, `*.sqlite-*` and `*.csv` outside `fixtures/`,
      upper-case extensions such as `.CSV`, journal and WAL files, CSV files
      under `fixtures/` (allowed), `.env` and `.env.*` anywhere (rejected)
      and `.env.example` (allowed).
- [ ] `reportViolations`'s tests cover the line format, exit code 1 with
      violations and exit code 0 without output.
- [ ] A forced (`git add -f`) data file fails `npm run check:data-files`
      and is named in the output; a tree without one exits 0 without
      output.
- [ ] `verify` runs `check:data-files` after `test`; the gate wiring test
      expects it there.
- [ ] CI's `verify` job is green.

## Blocked by

- Blocked by `02-formatting.md`

## User stories addressed

- User story 11
- User stories 70, 71, 72, 73
