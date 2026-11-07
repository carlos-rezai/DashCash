---
status: open
---
# Stryker configuration

## Parent PRD

`prd.md`

## What to build

The first half of the informative **Mutation testing** (plan Phase 3; PRD
"Stryker configuration", "Dependencies and supply-chain files" and "Gate
tests"; design log Q11–Q13, Q16–Q24, Q26, A1). StrykerJS is installed with
its supply-chain fallout and configured with no **Break threshold**; the
npm script that runs it and the first **Mutation run** follow in
`04-informative-mutation-run.md` (design log, Assumptions from
prd-to-issues, I1).

- Dependencies: `@stryker-mutator/core` and
  `@stryker-mutator/vitest-runner` as exact root dev dependencies at the
  same release, the newest one at least 14 days old on the day of building
  (10.1.1 on 2026-11-07; check the publish date with `npm view`).
- `stryker.config.js` at the repository root: an ES module whose default
  export carries the JSDoc type
  `import('@stryker-mutator/api/core').PartialStrykerOptions` (the API
  package comes with core), type-checked and linted through the existing
  root configs. Exactly five keys:
  - `testRunner: 'vitest'`, `coverageAnalysis: 'perTest'` (the Vitest
    runner's own defaults otherwise: the root Vitest config, related mode);
  - `mutate`: `packages/domain/src/**/*.ts`, `scripts/**/*.ts`,
    `!**/*.test.ts`, `!**/test-support/**`;
  - `reporters`: `clear-text`, `progress`, `html` (Stryker's default report
    file `reports/mutation/mutation.html`);
  - `thresholds`: `high: 80`, `low: 60`, `break: null`.
  Everything else at Stryker's defaults: no checker, no incremental mode,
  no dashboard, temp folder `.stryker-tmp`. No `// Stryker disable`
  comments anywhere (Q19).
- `gates/mutationTesting/mutationTesting.test.ts` (from
  `02-stale-sandbox-exclude.md`) gains the Stryker checks: it imports
  `stryker.config.js` and asserts its exact key set, the runner, the
  coverage mode, the `mutate` patterns, the reporters, `high`, `low` and
  `break: null`.
- **License allowlist** (`quality/license-allowlist.json`): adds `0BSD`
  (`tslib`) and `CC-BY-4.0` (`caniuse-lite`) (Q22). If the install brings
  any further licence, review it the same way: more permissive than MIT,
  or data in a dev-only tool the app never ships. A package without a
  licence, or a licence that needs more than that review, stops the
  builder to ask: there are no per-package licence exceptions.
- **Audit exceptions** (`quality/audit-exceptions.json`): one entry per
  open `qs` **Advisory** (`GHSA-q8mj-m7cp-5q26`, `GHSA-x5fp-wj9c-mxmx`,
  `GHSA-4mjr-xmp4-gh2g`, `GHSA-6pq8-jhm2-2vcw` on 2026-11-07), `added` on
  the day of building and `expires` 90 days later, with the reason that
  `qs` is reached only through Stryker's `typed-rest-client`, which serves
  the dashboard reporter DashCash does not use and pins `qs` exactly, so no
  fix exists inside its range (Q23). Re-run `npm run check:audit` and give
  any further advisory open that day an exception of the same kind. The
  minimatch entry's `reason` names Stryker beside the lint tooling
  (Stryker matches the repository's own `mutate` patterns with it); its
  `added` and `expires` stay (Q24).

This ticket is the approval to change exactly the `devDependencies` of
`package.json` and `package-lock.json` (by `npm install`), to create
`stryker.config.js`, to change `quality/license-allowlist.json` and
`quality/audit-exceptions.json`, and to change
`gates/mutationTesting/mutationTesting.test.ts`. The `scripts` of
`package.json` stay as they are.

## Acceptance criteria

- [ ] Both packages are exact root dev dependencies at the same release,
      at least 14 days old on the day of building.
- [ ] The gate test imports the configuration and asserts its exact key
      set, the runner, the coverage mode, the `mutate` patterns, the
      reporters, `high`, `low` and `break: null`, so a key gained or lost or
      any of these values changed fails it.
- [ ] The **License allowlist** gains `0BSD` and `CC-BY-4.0`, and any
      further licence only after the same review (a package without a
      licence, or one needing more, stops the builder to ask);
      `npm run check:licenses` passes.
- [ ] Each open `qs` **Advisory** has one **Audit exception**, added on the
      day of building and expiring 90 days later, with the reason above;
      any further advisory open that day gets an exception of the same
      kind; the minimatch reason names Stryker, its dates unchanged;
      `npm run check:audit` passes.
- [ ] The builder's check, no test: `git grep -n "Stryker disable"` finds
      nothing outside `docs/`.
- [ ] `stryker.config.js` passes the type check and lint of **Verify**,
      and `npm run verify` is green.

## Blocked by

- Blocked by `02-stale-sandbox-exclude.md` (the exclude lands before
  Stryker, P1; the gate test file)

## User stories addressed

- User stories 11, 12, 13, 14, 17, 18, 19, 20, 25, 31
- User stories 40, 41, 42, 43
