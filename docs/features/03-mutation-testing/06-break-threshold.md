---
status: in-progress
---
# Break threshold

## Parent PRD

`prd.md`

## What to build

**Mutation testing** stops being an **Informative gate** (plan Phase 5;
PRD "Stryker configuration" and "Gate tests"; design log Q26–Q29).

- The builder runs `npm run test:mutation` on the day of building, the
  same way as in `04-informative-mutation-run.md` (in the background, log
  outside the repository, only the summary table read; I2), rounds the
  **Mutation score** (over `packages/domain`, `scripts/` and the non-test
  files of `gates/`; design log, Implementation Results, D1) down to a
  whole percent and sets it as
  `thresholds.break` in `stryker.config.js`. `high` and `low` stay 80 and
  60. Both numbers go into the ticket's Notes.
- `gates/mutationTesting/mutationTesting.test.ts`: the `break: null`
  assertion becomes "the **Break threshold** is a whole number from 1 to
  100", so it cannot be removed or turned off silently. The test shows that
  `null`, a missing `break`, `0`, `101`, a fraction and a string each fail
  that check, and that the configured value passes it.
- From the merge on, a **Mutation score** below the **Break threshold**
  makes Stryker exit non-zero, so the `mutation` job and the **Daily run**
  go red on `main`. If `05-nightly-mutation-job.md` added the mutation step
  to the `pull-request` job (design log, Implementation Results, D2), the
  same score also fails the **Required check** and blocks the merge;
  otherwise no merge is blocked. **Verify** never runs Stryker. Raising and lowering stay with the rules
  that already guard gate files (`CLAUDE.md`, Ask first; `CODEOWNERS`);
  no ratchet check against `origin/main` is added (Q28).

- The whole-number check lives in a module of its own,
  `gates/mutationTesting/mutationTesting.ts`, exporting only
  `hasBreakThreshold(thresholds: unknown): boolean` (true only when
  `thresholds.break` is a whole number from 1 to 100), so its tests can
  fail first; the same pattern as `gates/renovate/renovate.ts` and
  `gates/pinnedActions/pinnedActions.ts`. Stryker mutates it (D1).
  Approved by the human on 2026-11-07, after the RED step.

This ticket is the approval to change exactly `thresholds.break` in
`stryker.config.js` and `gates/mutationTesting/mutationTesting.test.ts`,
and to create `gates/mutationTesting/mutationTesting.ts` holding only
`hasBreakThreshold`.

Then, by hand, after the feature is merged (not a criterion): the human
starts the **Daily run** once with `workflow_dispatch` and confirms the
Linux **Mutation score** clears the **Break threshold** (story 45).

## Acceptance criteria

- [x] `thresholds.break` is the measured score rounded down; the measured
      score and the threshold are in the ticket's Notes.
- [x] `high` and `low` stay 80 and 60.
- [x] The gate test asserts that `break` is an integer from 1 to 100, so
      `null`, a missing `break`, `0`, `101`, a fraction or a string fails
      it; it passes for the configured value.
- [x] The builder's run, no test: `npm run test:mutation` exits 0 with the
      threshold in place.
- [x] No check compares the threshold with `origin/main`; **Verify** still
      does not run Stryker, and the **Required check** runs it only if 05
      added the pull-request step.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `04-informative-mutation-run.md` (the run that measures the
  score)
- Blocked by `05-nightly-mutation-job.md` (the `mutation` job the
  threshold turns red)

## User stories addressed

- User stories 27, 28, 29, 30
- User story 39
- User story 45 (the handover note)

## Notes

- Measured **Mutation score**: 80.82 (first run, exit 0 with `break: null`).
- **Break threshold** set: 80 (rounded down); `high` 80 and `low` 60 unchanged.
- Confirming run with the threshold in place: exit code 0 (score 80.82, "greater than or equal to break threshold 80").
- The new module `gates/mutationTesting/mutationTesting.ts` shows 0.00 with all 22 mutants no-coverage in both runs: the gate test loads it by dynamic import of an absolute file URL, which Stryker's per-test coverage does not attribute. Left as the RED test has it; a static import in the test would count the module.
