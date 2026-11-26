---
status: done
---
# Changed-lines coverage in Verify

## Parent PRD

`prd.md`

## What to build

New code comes with tests: **Verify** fails when less than the **Coverage
threshold** of the coverable **Changed lines** is run by any test (plan
Phase 4, the gate; PRD "Coverage on changed lines", "Gate tests"; design
log Q33–Q35, A2, A3, A4, I1).

- `quality/coverage-threshold.json` = `{ "changedLines": 80 }` (A2).
- The entry `scripts/checkCoverage/checkCoverage.ts` takes the merge base
  with `origin/main`, the zero-context diff from it to the working tree and
  the untracked, not ignored files (every line added), keeps the files the
  coverage measures, reads `coverage/unit/lcov.info`,
  `coverage/stories/lcov.info` and the threshold file, passes them to the
  core of `07-changed-lines-core.md`, and reports through `runGate`. It
  fails closed (A2, A3) on a missing or malformed threshold file (not JSON,
  not an object, `changedLines` not a number from 0 to 100), on a missing
  `origin/main` or merge base, and on a missing or unreadable report. The
  entry holds its own copy of the include and exclude patterns of
  `vitest.config.ts` and `vitest.storybook.config.ts`; its suite pins that
  copy against both configs.
- `check:coverage` = `node scripts/checkCoverage/checkCoverage.ts`;
  **Verify** runs it right after `test:stories`, and now has its final
  fifteen gates in Q35's order: `format:check`, `lint`, `typecheck`,
  `lint:deps`, `check:stories`, `test`, `test:stories`, `check:coverage`,
  then `check:commits` to `check:quarantine`.
- Every changed line of tickets 01 to 07 counts, and passes.

Prior art: the other gate entries' suites with
`scripts/test-support/sampleRepository/` (its fake `origin/main`); the
audit check's fail-closed reading of a `quality/` file.

This ticket is the approval to change exactly: the root `package.json`
(`check:coverage` and **Verify**), to create
`quality/coverage-threshold.json`, and to change
`gates/verifyScripts/verifyScripts.test.ts` and
`gates/test-support/verifyGates/verifyGates.ts`.

## Acceptance criteria

- [x] A RED commit adds the entry and **Gate wiring** tests, which fail.
- [x] `quality/coverage-threshold.json` is exactly `{ "changedLines": 80 }`.
- [x] The entry, in a temporary sample repository, exits 0 at or above the
      threshold and with no coverable changed lines, and 1 with A4's
      summary and per-file lines below it; an untracked file's lines count.
- [x] It exits 1 for a missing or malformed threshold file, a missing
      report, no `origin/main`, and a changed measured file in neither
      report.
- [x] **Verify** runs the fifteen gates in Q35's order, pinned by the
      **Gate wiring** test; `check:coverage` passes on the repository.
- [x] The **Mutation score** stays at or above the **Break threshold** of
      83 (`npm run test:mutation`).
- [x] `npm run verify` is green.

## Blocked by

- Blocked by `05-story-check.md`
- Blocked by `06-coverage-reports.md`
- Blocked by `07-changed-lines-core.md`

## User stories addressed

- User stories 115, 116, 117, 121 (`check:coverage`, the final order)
