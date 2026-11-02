---
status: in-progress
---
# Pinned actions

## Parent PRD

`prd.md`

## What to build

**Pinned actions** (plan Phase 2; PRD "Gate tests", pinned actions; design
log Q9–Q11). Every `uses:` in `.github/workflows/ci.yml` and
`.github/workflows/pull-request.yml` is pinned to the full 40-character
commit SHA of the release its tag points to on the day of building, with
that exact release as a trailing comment:
`uses: actions/checkout@<sha> # v7.x.y`. Look the SHAs up on GitHub when
building (`gh api`).

A new gate test `gates/pinnedActions/pinnedActions.test.ts` reads every
file under `.github/workflows/` as text and fails on any `uses:` that is
neither `<owner>/<repo>[/<path>]@<40 hex> # v…` nor a local `./…` action,
so a new workflow is covered without changing the test. Its rule is shown
on invented workflow text as well as run against the repository's
workflows.

This ticket is the approval to change exactly the two workflow files above
and to create the gate test above.

## Acceptance criteria

- [ ] Every remote `uses:` names a 40-character hex SHA followed by
      `# v<release>`, the release the SHA belongs to.
- [ ] The gate test fails, on invented workflow text, for a tag reference,
      a short SHA, a branch name and a pin without its comment, and passes
      a local `./…` action.
- [ ] The gate test passes on the repository's workflows.
- [ ] `npm run verify` and CI's `verify` job are green with the pinned
      actions.

## Blocked by

- Blocked by `01-pull-request-workflow.md` (both workflow files exist)

## User stories addressed

- User stories 9, 10, 11, 12
