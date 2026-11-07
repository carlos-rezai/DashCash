---
status: open
---
# Stale sandbox ignored by npm test

## Parent PRD

`prd.md`

## What to build

The repository's one Vitest configuration ignores a stale Stryker sandbox
(plan Phase 2; PRD "Vitest configuration" and "Gate tests"; design log
Q20, A2, P1). This lands before Stryker itself, as the git, Prettier and
ESLint ignores of `.stryker-tmp/` did.

- `vitest.config.ts`: `test.exclude` becomes Vitest's own
  `configDefaults.exclude` plus one `.stryker-tmp/**` pattern anchored at
  the repository root, so the test copies a cancelled **Mutation run**
  leaves in `.stryker-tmp/sandbox-*` never run under `npm test`, while a
  Vitest run started inside a sandbox (where the same tests sit at their
  usual paths) still collects them. `include` is unchanged. No second
  Vitest config.
- A new gate test `gates/mutationTesting/mutationTesting.test.ts` imports
  the Vitest configuration and checks its exclude: every entry of Vitest's
  default excludes is kept (asserted against Vitest's own list, not a
  copy), and, matched with Node's `path.matchesGlob`, the sandbox path
  `.stryker-tmp/sandbox-1a2b3c/scripts/runGit/runGit.test.ts` matches an
  exclude pattern while `scripts/runGit/runGit.test.ts` matches none.
  Nothing is written into the repository and no second Vitest starts. The
  Stryker configuration's checks join this file in
  `03-stryker-configuration.md`.

This ticket is the approval to change exactly `vitest.config.ts` and to
create `gates/mutationTesting/mutationTesting.test.ts`.

## Acceptance criteria

- [ ] The exclude holds every entry of Vitest's default excludes and one
      root-anchored `.stryker-tmp/**` pattern; `include` is unchanged.
- [ ] The gate test shows that
      `.stryker-tmp/sandbox-1a2b3c/scripts/runGit/runGit.test.ts` matches an
      exclude pattern and `scripts/runGit/runGit.test.ts` matches none,
      using Node's `path.matchesGlob`.
- [ ] The gate test asserts every default exclude by Vitest's own list,
      not a copy, so dropping one, removing the sandbox pattern or widening
      it to match the sandbox's own test paths fails it.
- [ ] The builder's check, no test: with an invented failing test copied
      under `.stryker-tmp/` by hand, `npm test` stays green; the copy is
      removed afterwards and the check is recorded in the ticket's Notes.
- [ ] `npm run verify` is green.

## Blocked by

None — can start immediately.

## User stories addressed

- User story 21
- User story 22 (the root-anchored pattern; confirmed by the first real
  **Mutation run** in `04-informative-mutation-run.md`)
