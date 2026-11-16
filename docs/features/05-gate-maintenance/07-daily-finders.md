---
status: done
---
# Daily problem finders, mutated

## Parent PRD

`prd.md`

## What to build

The two **Problem finders** of `daily.yml` become modules that **Mutation
testing** mutates (plan Phase 7; PRD "Workflow readers and Problem
finders"; design log Q20–Q22, A8).

- `gates/dailyRun/dailyRun.ts` exports `findDailyWiringProblems(workflow)`,
  and `gates/dailyMutation/dailyMutation.ts` exports
  `findMutationWiringProblems(workflow)`, each with its signature, its
  constants and its lines unchanged. They import only the shared readers of
  `scripts/readWorkflow/`, never `test-support/`; a helper only one finder
  uses (such as `isGitleaksStep`) stays in its module, and a test may
  import it from there (I2).
- The RED commit moves these tests of `gates/gateWiring/gateWiring.test.ts`,
  unchanged apart from imports, with the sample edits they use, and
  removes them from the wiring test:
  - `gates/dailyRun/dailyRun.test.ts`: "triggers the daily workflow, Daily,
    only by the schedule 0 5 * * * and workflow_dispatch"; "gives the daily
    workflow exactly the jobs daily and mutation"; "runs npm ci, then npm
    run check:audit and npm run check:quarantine and no other gate of verify
    in the daily job"; "finds nothing missing from the daily wiring"; the
    `it.each` "fails the daily wiring when the %s is removed".
  - `gates/dailyMutation/dailyMutation.test.ts`: "runs the mutation job
    beside the daily job: no if: and no needs:"; "runs checkout,
    setup-node, npm ci, node_modules/.bin/install-electron, npm run
    test:mutation, then the upload of the mutation report in the mutation
    job"; "runs exactly npm ci, node_modules/.bin/install-electron, then npm
    run test:mutation in the mutation job"; "finds nothing missing from the
    mutation wiring" and its `it.each` of failing edits.
- An edit two test files use lives in `gates/test-support/`
  (`06-pull-request-finders.md`); one used by one test stays beside it.
- The GREEN step moves each finder out of the wiring test into its module.

This ticket is the approval to create `gates/dailyRun/` and
`gates/dailyMutation/`, to change `gates/test-support/`, and to change
`gates/gateWiring/gateWiring.test.ts`.

## Acceptance criteria

- [x] A RED commit adds the two folders' tests, which fail because the
      finder modules do not exist yet.
- [x] Each finder names the same lines for each sample edit as before and
      none for the committed `daily.yml`.
- [x] Every moved test is unchanged apart from imports; the wiring test no
      longer holds them or the two finders.
- [x] The finders import only the shared readers, never `test-support/`.
- [x] `npm run verify` is green.

## Blocked by

- Blocked by `06-pull-request-finders.md`

## User stories addressed

- User stories 29, 30, 31, 33
