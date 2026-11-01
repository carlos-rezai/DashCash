---
status: done
---
# Boundary layer rules

## Parent PRD

`prd.md`

## What to build

dependency-cruiser as a **Gate** of **Verify**, with the **Layer rules**
across packages and processes (first half of plan Phase 9; PRD
Implementation Decisions, "Layer rules"; design log Q40–Q43):
`.dependency-cruiser.js` with

- `packages/domain` importing nothing outside itself: no other workspace,
  npm package or Node built-in;
- `packages/contract` importing only `packages/domain`;
- the renderer barred from Node built-ins, `electron`, `main/` and
  `preload/`, and allowed to import `packages/domain` (Q41);
- the preload importing only `electron` and the contract;
- `test-support/` imported only by tests, stories, other `test-support/`
  files and `e2e/`; everything else is **Shipping code**.

`lint:deps` runs dependency-cruiser with this config over `apps`,
`packages`, `scripts` and `e2e`, and joins **Verify** after `typecheck`.
The config is tested in `dependency-cruiser.test.ts` by cruising small
trees written to a temporary folder with the real config (Q44). Ticket 11
adds the renderer **Layer** ladder to the same config and test.

## Acceptance criteria

- [x] One allowed and one forbidden import per rule above, each in a
      temporary tree cruised with the real config; the forbidden ones
      include a domain import of another workspace, of an npm package and
      of a Node built-in.
- [x] A renderer import of `packages/domain` is allowed.
- [x] A test, a story, a `test-support/` file and an `e2e/` file may import
      `test-support/`; a **Shipping code** file may not.
- [x] `npm run lint:deps` passes on the tree.
- [x] `verify` runs `lint:deps` after `typecheck`; the gate wiring test
      expects it there.
- [x] CI's `verify` job is green.

## Blocked by

- Blocked by `09-pull-request-check.md`

## User stories addressed

- User story 11
- User stories 36, 37, 38, 39
- User stories 42, 43, 45
