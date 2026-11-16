---
status: in-progress
---
# Shared workflow readers and the wiring checks without a finder

## Parent PRD

`prd.md`

## What to build

The workflow readers leave the gate wiring test for a shared module, and
the four parts of the **Gate wiring** that hold no **Problem finder** move
into their own gate folders with them (plan Phase 5; PRD "Workflow readers
and Problem finders"; design log Q20–Q22, A2, A8, P1; Assumptions from
prd-to-issues, I2 and I3).

- `scripts/readWorkflow/readWorkflow.ts`, its test beside it: exports the
  `Workflow` and `WorkflowStep` types and the readers now defined in
  `gates/gateWiring/gateWiring.test.ts`: read one workflow file (a missing
  file reads as an empty workflow), list the workflow files, triggers, a
  job's steps, the index of the step that uses an action (`stepIndex`,
  I2), a job's commands, split an `&&` chain, and list the jobs whose
  commands run a given text (as `<file>: <job>`). The two that touch the
  file system, and the jobs lister that uses them, take the repository
  root as a parameter (A2); the rest take a parsed `Workflow`. Its tests
  run on invented workflow text, and the file readers on an invented tree
  in a temporary folder.
- The RED commit moves these tests of `gates/gateWiring/gateWiring.test.ts`,
  unchanged apart from imports and the constants and helpers they need,
  into new test files that import the readers from the shared module, and
  removes them from the wiring test:
  - `gates/verifyScripts/verifyScripts.test.ts`: "runs the gates of verify
    in order, failing fast"; "runs the quarantine check as the last of the
    twelve gates of verify"; "runs each gate once with its tool"; "runs
    exactly verify, the App build, then the end-to-end tests from
    verify:full, failing fast"; "runs the end-to-end tests with Playwright
    from test:e2e"; "keeps every npm script free of command substitution,
    pipes and globs"; "runs check:pr from neither verify, verify:full nor
    the verify job"; "runs a Mutation run with Stryker from test:mutation,
    and from neither verify nor verify:full"; "pins the same Node version in
    .nvmrc and engines.node".
  - `gates/pushWorkflow/pushWorkflow.test.ts`: "triggers the push workflow,
    CI, only by push to feat/** and refactor/**"; "gives the push workflow
    the one job verify"; "runs npm run verify in the verify job"; "runs
    exactly npm ci, node_modules/.bin/install-electron, then npm run verify
    in the verify job".
  - `gates/pullRequestWorkflow/pullRequestWorkflow.test.ts`: "triggers the
    pull-request workflow, Pull request, only by pull_request into main";
    "gives the pull-request workflow the one job pull-request"; "runs npm
    ci, node_modules/.bin/install-electron, npm run verify:full under
    xvfb-run, npm run check:pr, then npm run test:mutation in the
    pull-request job, beside the sysctl step"; "runs npm run check:pr after
    npm run verify:full in the pull-request job"; "hands the pull-request
    title to check:pr only through PR_TITLE".
  - `gates/workflows/workflows.test.ts`: "keeps every job of every workflow
    free of if:"; "runs only the CI workflow on push, with its one job
    verify"; and the `it.each` "checks out full history, then sets up Node
    from .nvmrc with the npm cache, before npm ci in the %s job" over the
    pull-request and daily jobs (I3).
- The GREEN step builds the shared module; what stays in the wiring test
  imports the readers from it and defines no reader of its own. The wiring
  test's finders and sample edits stay where they are for tickets 06 to 08.
- The new test files read the committed workflows, as the wiring test
  does; none reads the state of git, so the Stryker exclude list does not
  change (Q22).

This ticket is the approval to create the four test files above and to
change `gates/gateWiring/gateWiring.test.ts`.

## Acceptance criteria

- [ ] A RED commit adds the readers' tests and the four moved test files,
      which fail because the shared module does not exist yet.
- [ ] Each reader has tests on invented workflow text, and the two that
      read files on an invented tree.
- [ ] The four folders hold exactly the tests listed above, word for word
      apart from imports; the wiring test no longer holds them, and
      `npm test` runs as many tests as before the move apart from the new
      reader tests (counts in the ticket's Notes).
- [ ] The remaining wiring test defines no reader of its own.
- [ ] No shipping module imports `test-support/`.
- [ ] `npm run verify` is green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 29, 31, 32, 33

## Notes

Test counts, from the RED step:

- Before the move: `npm test` runs 1689 tests; `gates/gateWiring/` holds 89.
- Moved: 22 (`verifyScripts/` 9, `pushWorkflow/` 4,
  `pullRequestWorkflow/` 5, `workflows/` 4); `gates/gateWiring/` keeps 67.
- New reader tests in `scripts/readWorkflow/`: 30.
- After GREEN: `npm test` runs 1719 tests (1689 + 30).
