---
status: open
---
# Coverage reports from both test runs

## Parent PRD

`prd.md`

## What to build

The unit tests and the **Story tests** report which lines they run (plan
Phase 4, the reports; PRD "Coverage on changed lines"; design log Q32, A5,
I1).

- `@vitest/coverage-v8` at the root, at the installed Vitest's version
  (Q39).
- `vitest.config.ts` and `vitest.storybook.config.ts`: coverage always on,
  provider V8, reporter LCOV, reports in `coverage/unit/` and
  `coverage/stories/`, over the **Shipping code** of `apps/`, `packages/`,
  `scripts/` and `gates/` (no tests, stories, `test-support/`, `e2e/` or
  declaration files).
- `vitest.stryker.config.ts` turns coverage off, so a **Mutation run** runs
  as before.
- `gates/coverage/` pins the coverage settings of the three configs (A5).

This ticket is the approval to change exactly: the root `package.json`
(the package), `package-lock.json`, `vitest.config.ts`,
`vitest.stryker.config.ts`, `vitest.storybook.config.ts`, to create
`gates/coverage/`, and `quality/audit-exceptions.json` only for an
**Advisory** with no fix.

## Acceptance criteria

- [ ] A RED commit adds the `gates/coverage/` tests, which fail at their
      assertions.
- [ ] `@vitest/coverage-v8` is an exact root dev dependency at the installed
      Vitest's version; every licence the lockfile gains is listed in the
      ticket's Notes; a licence the **License allowlist** lacks stops the
      builder; an open **Advisory** gets an **Audit exception** with its
      reason, or the builder stops when a fix exists; `check:licenses` and
      `check:audit` pass.
- [ ] `npm test` writes `coverage/unit/lcov.info` and `npm run
      test:stories` writes `coverage/stories/lcov.info`, each listing
      **Shipping code** only.
- [ ] `gates/coverage/` fails when either config turns coverage off,
      changes the provider, the reporter, the report folder or the measured
      and excluded paths, or when the Stryker config turns it on.
- [ ] A **Mutation run** runs without coverage; the **Mutation score**
      stays at or above the **Break threshold** of 83
      (`npm run test:mutation`).
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`

## User stories addressed

- User stories 114, 117, 118, 122
