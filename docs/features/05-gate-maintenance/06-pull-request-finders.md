---
status: open
---
# Pull-request problem finders, mutated

## Parent PRD

`prd.md`

## What to build

The two **Problem finders** of the pull-request job become modules that
**Mutation testing** mutates (plan Phase 6; PRD "Workflow readers and
Problem finders"; design log Q20–Q22, A8).

- `gates/pullRequestSandbox/pullRequestSandbox.ts` exports
  `findPullRequestSandboxProblems(workflow)`, and
  `gates/pullRequestMutation/pullRequestMutation.ts` exports
  `findPullRequestMutationProblems(workflow)`, each with its signature and
  its lines unchanged, one line per problem. They import only the shared
  readers of `scripts/readWorkflow/`, never `test-support/`; a helper only
  one finder uses (such as `runsVerifyFull`) stays in its module (I2).
- The RED commit moves these tests of `gates/gateWiring/gateWiring.test.ts`,
  unchanged apart from imports, with the sample edits they use, and
  removes them from the wiring test:
  - `gates/pullRequestSandbox/pullRequestSandbox.test.ts`: "finds nothing
    missing from the sandbox and display wiring of the pull-request job";
    the `it.each` "fails the sandbox wiring of the pull-request job when
    %s"; "runs the sysctl step and xvfb-run only in the pull-request job,
    and --no-sandbox in no job"; "runs npm run verify:full under xvfb-run
    --auto-servernum in the pull-request job".
  - `gates/pullRequestMutation/pullRequestMutation.test.ts`: "finds nothing
    missing from the mutation run of the pull-request job" and its `it.each`
    of failing edits.
- Sample edits (workflow edits only tests use) stay beside the one test
  that uses them; an edit that two test files use, such as the job-steps
  edit, goes to `gates/test-support/`, which later tickets reuse (Q21).
- The GREEN step moves each finder out of the wiring test into its module.

This ticket is the approval to create `gates/pullRequestSandbox/`,
`gates/pullRequestMutation/` and `gates/test-support/`, and to change
`gates/gateWiring/gateWiring.test.ts`.

## Acceptance criteria

- [ ] A RED commit adds the two folders' tests, which fail because the
      finder modules do not exist yet.
- [ ] Each finder names the same lines for each sample edit as before and
      none for the committed `pull-request.yml`.
- [ ] Every moved test is unchanged apart from imports; the wiring test no
      longer holds them or the two finders.
- [ ] The finders import only the shared readers, never `test-support/`.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `05-workflow-readers.md`

## User stories addressed

- User stories 29, 30, 31, 33
