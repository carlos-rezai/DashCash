---
status: done
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
    `gates/**/*.ts`, `!**/*.test.ts`, `!**/test-support/**`: the non-test
    `.ts` files of all three folders, never a `*.test.ts` file or anything
    in `test-support/` (design log, Implementation Results, D1);
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
- **License allowlist** (`quality/license-allowlist.json`): first list in
  the ticket's Notes every licence the install adds to the lockfile, each
  with the packages that carry it (`0BSD` from `tslib` and `CC-BY-4.0`
  from `caniuse-lite` on 2026-11-07). Then (design log, Implementation
  Results, D3, which supersedes Q22's review):
  - a permissive licence, such as `0BSD` or `CC-BY-4.0`, is added to the
    allowlist;
  - any GPL, LGPL or AGPL licence, in any version, alone or inside an
    expression, stops the builder for the human's decision, before
    anything is added;
  - so does any other licence that is not permissive, and a package
    without a licence: there are no per-package licence exceptions.
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

- [x] Both packages are exact root dev dependencies at the same release,
      at least 14 days old on the day of building.
- [x] The gate test imports the configuration and asserts its exact key
      set, the runner, the coverage mode, the `mutate` patterns (domain,
      `scripts/` and `gates/`, without `*.test.ts` and `test-support/`), the
      reporters, `high`, `low` and `break: null`, so a key gained or lost or
      any of these values changed fails it.
- [x] The ticket's Notes list every licence the install adds, each with
      its packages.
- [x] Only permissive licences are added to the **License allowlist**
      (`0BSD` and `CC-BY-4.0` on 2026-11-07). A GPL, LGPL or AGPL licence,
      any other licence that is not permissive, or a package without a
      licence stops the builder for the human's decision;
      `npm run check:licenses` passes.
- [x] Each open `qs` **Advisory** has one **Audit exception**, added on the
      day of building and expiring 90 days later, with the reason above;
      any further advisory open that day gets an exception of the same
      kind; the minimatch reason names Stryker, its dates unchanged;
      `npm run check:audit` passes.
- [x] The builder's check, no test: `git grep -n "Stryker disable"` finds
      nothing outside `docs/`.
- [x] `stryker.config.js` passes the type check and lint of **Verify**,
      and `npm run verify` is green.

## Notes

Licences the install of `@stryker-mutator/core@10.1.1` and
`@stryker-mutator/vitest-runner@10.1.1` adds to the lockfile on 2026-11-07
(all permissive; none is GPL, LGPL, AGPL or missing):

- `MIT`: 138 packages, among them `@babel/core`, `@babel/generator`, `js-tokens`
- `Apache-2.0`: `@stryker-mutator/api`, `@stryker-mutator/core`,
  `@stryker-mutator/instrumenter`, `@stryker-mutator/util`,
  `@stryker-mutator/vitest-runner`, `baseline-browser-mapping`,
  `diff-match-patch`, `human-signals`, `mutation-server-protocol`,
  `mutation-testing-elements`, `mutation-testing-metrics`,
  `mutation-testing-report-schema`, `rxjs`, `typed-inject`, `weapon-regex`
- `ISC`: `cli-width`, `electron-to-chromium`, `inherits`,
  `minimalistic-assert`, `mute-stream`, `signal-exit`
- `BSD-3-Clause`: `qs`, `source-map`
- `0BSD`: `tslib` (added to the allowlist)
- `CC-BY-4.0`: `caniuse-lite` (added to the allowlist)

`@stryker-mutator/core@10.1.1` was published on 2026-10-23, 15 days before
the day of building.

## Blocked by

- Blocked by `02-stale-sandbox-exclude.md` (the exclude lands before
  Stryker, P1; the gate test file)

## User stories addressed

- User stories 11, 12, 13, 14, 17, 18, 19, 20, 25, 31
- User stories 40, 41, 42, 43
