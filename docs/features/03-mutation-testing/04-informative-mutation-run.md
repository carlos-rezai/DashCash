---
status: open
---
# Informative mutation run

## Parent PRD

`prd.md`

## What to build

The tracer bullet of **Mutation testing**, end to end (plan Phase 3; PRD
"npm scripts", "Gate tests" and "Testing Decisions"; design log Q14, Q15,
Q17, Q26, A6). `npm run test:mutation` runs the configuration from
`03-stryker-configuration.md`: a **Mutation run** mutates the **Shipping
code** of `scripts/`, the non-test `.ts` files of `gates/` (design log,
Implementation Results, D1) and, from its first module, `packages/domain`,
runs only the related tests per **Mutant** through the Vitest runner,
prints the **Mutation score** and the **Surviving mutants**, writes the
**Mutation report** to `reports/mutation/mutation.html`, and fails only
when Stryker cannot run, since there is no **Break threshold** yet.

- `package.json`: the script `test:mutation` = `stryker run
  stryker.config.js`. `verify`, `verify:full` and `check:licenses` are
  unchanged; neither **Verify** nor **Verify full** runs `test:mutation`,
  so the **Required check** is unchanged.
- `gates/gateWiring/gateWiring.test.ts` pins the new script's command and
  that **Verify** still runs exactly its eleven gates in their order and
  neither `verify` nor `verify:full` runs `test:mutation`.
- The builder runs `npm run test:mutation` by hand, after `npm run verify`
  is green. No test runs Stryker (A6). A full run takes long and its log
  lists every **Surviving mutant**: start it in the background with its
  output in a log file outside the repository, wait for it to end, and
  read only the summary table at the end of the log and the exit code
  (design log, Assumptions from prd-to-issues, I2). Record the run's wall
  time in minutes and seconds, measured from start to exit: whether it is
  under 10 minutes decides whether `05-nightly-mutation-job.md` also adds
  the run to the pull-request workflow (design log, Implementation
  Results, D2).
- The domain pattern `packages/domain/src/**/*.ts` stays in `mutate`
  although no domain file exists (Q17). If Stryker refuses it, use the form
  of that pattern Stryker accepts, in `stryker.config.js` and in the
  `mutate` assertion of `gates/mutationTesting/mutationTesting.test.ts`,
  and record the finding in the ticket's Notes.
- A test that fails only inside Stryker's sandbox is a finding for the
  Notes and is fixed at its cause, never by excluding the test or
  weakening a check (PRD, Further Notes).

This ticket is the approval to add exactly the `test:mutation` script to
`package.json` and to change `gates/gateWiring/gateWiring.test.ts`; and,
only if Stryker refuses the domain pattern, to change that one `mutate`
entry in `stryker.config.js` and its assertion in
`gates/mutationTesting/mutationTesting.test.ts`.

## Acceptance criteria

- [ ] The wiring test fails when `test:mutation` runs anything but
      `stryker run stryker.config.js`, and when `verify` or `verify:full`
      runs it; `verify` still runs exactly its eleven gates in order.
- [ ] The domain pattern is in `mutate` although no domain file exists; if
      Stryker refuses it, the form it accepts is used and the finding is in
      the ticket's Notes.
- [ ] The builder's run, no test: `npm run test:mutation` (with the
      `.stryker-tmp/**` exclude in place) mutates files of `scripts/` and
      `gates/` but no `*.test.ts` file, collects the sandbox's tests,
      prints a **Mutation score** and the **Surviving mutants**, writes
      `reports/mutation/mutation.html` and exits 0; the score and the
      wall time (minutes and seconds) are in the ticket's Notes, and
      `git status` shows nothing new afterwards.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-licence-check-fails-closed.md` (the first **Mutation
  run** measures the fixed check)
- Blocked by `03-stryker-configuration.md` (the packages and the
  configuration)

## User stories addressed

- User stories 10, 13, 15, 16, 22, 23, 24, 26
