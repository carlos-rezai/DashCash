# Plan: 03 mutation-testing

> Source PRD: `prd.md`. Decisions: `design-log.md` (Q1–Q32, A1–A6, P1).
> Terms in bold are defined in `docs/ubiquitous-language.md`.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: none. This feature has no React code.
- **IPC channels**: none. This feature has no main or renderer code.
- **Schema**: none. No database yet.
- **Public interface: npm scripts.** New: `test:mutation` =
  `stryker run stryker.config.js`. `verify` keeps exactly its eleven gates
  in their order; `verify:full` and `check:licenses` are unchanged. Neither
  `verify` nor `verify:full` runs `test:mutation`; the `pull-request` job of
  the **Required check** runs it after `check:pr` (D2).
- **Licence check core** (Q5–Q10): `findLicenseViolations(lockfile:
  unknown, allowlist: unknown): Violation[]`, signature unchanged. A
  malformed allowlist and a lockfile that is not a plain object with a
  plain-object `packages` are one violation each, allowlist first;
  packages are judged only when both are valid. New line:
  `package-lock.json: must be an object with a packages object`. The entry
  is unchanged.
- **Stryker configuration** (Q11–Q21, A1): `stryker.config.js` at the
  root, an ES module with a JSDoc type from `@stryker-mutator/api/core`,
  type-checked and linted through the existing root configs. Exactly six
  keys: `testRunner: 'vitest'`, `coverageAnalysis: 'perTest'`, `vitest`
  (`configFile: 'vitest.stryker.config.ts'`, D4), `mutate`
  (`packages/domain/src/**/*.ts`, `scripts/**/*.ts`, `gates/**/*.ts`,
  `!**/*.test.ts`, `!**/test-support/**`), `reporters` (`clear-text`, `progress`, `html`,
  report at `reports/mutation/mutation.html`), `thresholds`
  (`high: 80`, `low: 60`, `break` `null` until the threshold phase, then a
  whole number from 1 to 100). Everything else at Stryker's defaults: no
  checker, no incremental mode, no dashboard, temp folder `.stryker-tmp`.
  No `// Stryker disable` comments.
- **Vitest configuration** (Q20, A2): the root config's `exclude` is
  Vitest's default excludes plus `.stryker-tmp/**`, anchored at the
  repository root; `include` unchanged. A second config,
  `vitest.stryker.config.ts` (D4), is the root config plus an exclude of
  exactly three test files by name; only Stryker uses it.
- **Dependencies** (Q11): `@stryker-mutator/core` and
  `@stryker-mutator/vitest-runner` as exact root dev dependencies, the same
  release, the newest one at least 14 days old on the day of building
  (10.1.1 on 2026-11-07).
- **Gate files under `quality/`** (Q22–Q24): the **License allowlist**
  gains `0BSD` and `CC-BY-4.0`; the audit exceptions file gains one
  `{ advisory, reason, added, expires }` entry per open `qs` **Advisory**,
  `expires` 90 days after `added`; the minimatch entry's reason names
  Stryker, its dates unchanged.
- **Daily run** (Q25, A4): `daily.yml` keeps its name, triggers and job
  `daily`, and gains the job `mutation` (no job `if:`, no `needs:`):
  checkout (default depth), setup-node from `.nvmrc` with the npm cache,
  `npm ci`, `npm run test:mutation`, `actions/upload-artifact` pinned by
  SHA with its version comment, `name: mutation-report`,
  `path: reports/mutation/mutation.html`, `if: always()` on the step. No
  gitleaks in `mutation`; the **Secret scan** jobs stay `verify`,
  `pull-request` and `daily`.
- **Gate tests**: under `gates/<gate>/`, Vitest, offline, invented data.
  New: `mutationTesting` (the Stryker and Vitest configurations, read by
  import). Extended: `gateWiring`. `pinnedActions` unchanged. No test runs
  Stryker (A6); the builder runs `npm run test:mutation` by hand and
  records the result in the ticket's Notes.
- **Gate files the phases name** (Q31): `vitest.config.ts` (phase 2);
  `package.json`, `package-lock.json`, `stryker.config.js`,
  `quality/license-allowlist.json`, `quality/audit-exceptions.json`,
  `vitest.stryker.config.ts` (phase 3, D4); `.github/workflows/daily.yml` (phase 4); `stryker.config.js`
  (phase 5); the tests under `gates/` in phases 2 to 5. So
  `/feature-pipeline` pauses for the human's `go` after planning.

---

## Phase 1: Licence check fails closed

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 44

### What to build

The licence check stops passing on a lockfile it cannot judge. The failing
tests come first and are committed RED: a table of malformed lockfiles with
a valid allowlist, each giving exactly the one lockfile violation; a
malformed allowlist with a malformed lockfile giving both, allowlist first;
an empty `packages` object giving none; and one entry test that writes a
lockfile without `packages` and expects exit 1 with the lockfile line. Then
the core is fixed: a lockfile that is not a plain object, or whose
`packages` is not one, is one violation naming `package-lock.json`. The
entry and its error handling for a missing or unparsable file stay as
they are. Row 03 of the feature checklist already names the fix.

### Acceptance criteria

- [ ] A RED commit holds the new core and entry tests and fails on them,
      before the fix.
- [ ] A lockfile that is `null`, an array, a string or a number, and one
      whose `packages` is missing, `null`, an array or a string, each give
      exactly `package-lock.json: must be an object with a packages object`
      with a valid allowlist.
- [ ] A malformed allowlist with a malformed lockfile gives both
      violations, the allowlist's first; a malformed allowlist with a valid
      lockfile still gives its one violation.
- [ ] A lockfile whose `packages` is an empty object gives no violation.
- [ ] `npm run check:licenses` exits 1 with that one line on a lockfile
      without `packages`, shown by the entry test in a temporary folder.
- [ ] A missing or unparsable lockfile still fails through the entry's
      existing error handling; the entry's code is unchanged.
- [ ] Row 03 of `docs/feature-checklist.md` names the licence fix.
- [ ] `npm run check:licenses` passes on the repository's lockfile, and
      `npm run verify` is green.

---

## Phase 2: Stale sandbox ignored by npm test

**User stories**: 21, 22

### What to build

The repository's one Vitest configuration keeps every Vitest default
exclude and adds Stryker's sandbox folder, anchored at the repository
root, so the test copies a cancelled **Mutation run** leaves in
`.stryker-tmp/` never run under `npm test`, while a Vitest run started
inside a sandbox (where the same tests sit at their usual paths) still
collects them. The new `mutationTesting` gate test imports the Vitest
configuration and proves both by matching paths against the exclude
patterns; nothing is written into the repository and no second Vitest
starts. Like the existing ESLint, Prettier and git ignores of the folder,
the exclude lands before Stryker itself (P1).

### Acceptance criteria

- [ ] The exclude holds every entry of Vitest's default excludes and one
      root-anchored `.stryker-tmp/**` pattern; `include` is unchanged.
- [ ] The gate test shows that
      `.stryker-tmp/sandbox-1a2b3c/scripts/runGit/runGit.test.ts` matches an
      exclude pattern and `scripts/runGit/runGit.test.ts` matches none,
      using Node's `path.matchesGlob`.
- [ ] The gate test asserts every default exclude by Vitest's own list,
      not a copy, so dropping one, removing the sandbox pattern or widening
      it to match the sandbox's own test paths fails it.
- [ ] With an invented failing test copied under `.stryker-tmp/` by hand,
      `npm test` stays green; the copy is removed afterwards and recorded in
      the ticket's Notes.
- [ ] `npm run verify` is green.

---

## Phase 3: Informative mutation run

**User stories**: 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24, 25,
26, 31, 40, 41, 42, 43

### What to build

The tracer bullet of **Mutation testing**: the two Stryker packages are
installed as exact dev dependencies, the supply-chain gates are brought
along (the two new licences on the **License allowlist** after review, one
**Audit exception** per open `qs` **Advisory** with its reason, the
minimatch reason naming Stryker), the Stryker configuration with
`break: null` lands at the root, and `npm run test:mutation` runs it.
A **Mutation run** mutates the **Shipping code** of `scripts/` and
`gates/` (and of `packages/domain`, from its first module), runs only the related tests per
**Mutant** through the Vitest runner, prints the **Mutation score** and the
**Surviving mutants**, writes the **Mutation report** under `reports/`,
and fails only when Stryker cannot run. The `mutationTesting` gate test
pins the configuration; the gate wiring test pins the new script and that
**Verify** and **Verify full** still run exactly what they ran before.

### Acceptance criteria

- [ ] Both packages are exact root dev dependencies at the same release,
      at least 14 days old on the day of building.
- [ ] The **License allowlist** gains `0BSD` and `CC-BY-4.0`; any
      further licence only if it is permissive (any GPL, LGPL or AGPL
      licence, any other licence that is not permissive, and a package
      without a licence stop the builder for the human's decision);
      `npm run check:licenses` passes.
- [ ] Each open `qs` **Advisory** has one **Audit exception**, added on the
      day of building and expiring 90 days later, with the reason that
      `qs` is reached only through Stryker's `typed-rest-client`, which
      serves the unused dashboard reporter and pins `qs` exactly; any
      further advisory open that day gets an exception of the same kind;
      the minimatch reason names Stryker, its dates unchanged;
      `npm run check:audit` passes.
- [ ] The gate test imports the configuration and asserts its exact key
      set, the runner, the coverage mode, the `mutate` patterns, the
      reporters, `high`, `low` and `break: null`, so a key gained or lost or
      any of these values changed fails it.
- [ ] The domain pattern is in `mutate` although no domain file exists; if
      Stryker refuses it, the form it accepts is used and the finding is in
      the ticket's Notes.
- [ ] The wiring test fails when `test:mutation` runs anything but
      `stryker run stryker.config.js`, and when `verify` or `verify:full`
      runs it; `verify` still runs exactly its eleven gates in order.
- [ ] No `// Stryker disable` comment exists in the repository.
- [ ] The builder's `npm run test:mutation` (with the phase 2 exclude in
      place) collects the sandbox's tests, prints a **Mutation score** and
      the **Surviving mutants**, writes `reports/mutation/mutation.html`
      and exits 0; the score and duration are in the ticket's Notes, and
      `git status` shows nothing new afterwards.
- [ ] `npm run verify` is green.

---

## Phase 4: Nightly mutation job

**User stories**: 32, 33, 34, 35, 36, 37, 38

### What to build

The **Daily run** gains the `mutation` job beside `daily`, on the same
schedule and manual trigger: checkout, Node from `.nvmrc` with the npm
cache, `npm ci`, `npm run test:mutation`, and the **Mutation report**
uploaded as the artifact `mutation-report` on every outcome with the
upload action pinned by SHA. The `daily` job stays exactly as it is and
keeps the only full-history **Secret scan** of the night. The gate wiring
test checks that the workflow has exactly these two jobs, and a problem
finder in the style of the daily job's names each piece of the `mutation`
job, with one test per removed piece.

### Acceptance criteria

- [ ] `daily.yml` has exactly the jobs `daily` and `mutation`, its name and
      triggers unchanged, no job `if:` and no `needs:`.
- [ ] The `daily` job's steps and every existing daily wiring check are
      unchanged; the **Secret scan** jobs stay `verify`, `pull-request` and
      `daily`.
- [ ] The `mutation` job runs, in order: checkout without `with`,
      setup-node from `.nvmrc` with the npm cache, `npm ci`,
      `npm run test:mutation`, then the upload with only
      `name: mutation-report`, `path: reports/mutation/mutation.html` and
      `if: always()` on the step.
- [ ] The problem finder names one problem each when the checkout,
      setup-node, `.nvmrc`, npm cache, `npm ci`, the mutation run, the
      upload, its name, its path or its `if: always()` is removed, and when
      the job gains another npm command or a gitleaks step; each case has
      its own test.
- [ ] The upload action is pinned to the SHA of its newest release at least
      14 days old, with its `# v…` comment; the **Pinned action** gate
      passes unchanged.
- [ ] `npm run verify` is green.

---

## Phase 5: Break threshold

**User stories**: 27, 28, 29, 30, 39, 45

### What to build

**Mutation testing** stops being an **Informative gate**. The builder runs
`npm run test:mutation` on the day of building, rounds the **Mutation
score** down to a whole percent and sets it as the **Break threshold**;
both numbers go into the ticket's Notes. The `mutationTesting` gate test
now requires the **Break threshold** to be a whole number from 1 to 100,
so it cannot be removed or turned off silently. From the merge on, a score
below it fails the `mutation` job, the **Daily run** and the **Required
check**'s `pull-request` job, which blocks the merge. Raising and lowering stay with the rules that
already guard gate files; no ratchet check is added.

### Acceptance criteria

- [ ] `thresholds.break` is the measured score rounded down; the measured
      score and the threshold are in the ticket's Notes.
- [ ] `high` and `low` stay 80 and 60.
- [ ] The gate test asserts that `break` is an integer from 1 to 100, so
      `null`, a missing `break`, `0`, `101`, a fraction or a string fails
      it; it passes for the configured value.
- [ ] The builder's `npm run test:mutation` exits 0 with the threshold in
      place.
- [ ] No check compares the threshold with `origin/main`; **Verify** still
      does not run Stryker, and the **Required check** runs it as the
      `pull-request` job's own step.
- [ ] `npm run verify` is green.
- [ ] Handover note, not a criterion: after the merge the human starts the
      **Daily run** once with `workflow_dispatch` and confirms the Linux
      **Mutation score** clears the **Break threshold** (story 45).
