# PRD: 03 mutation-testing

> Source: `design-log.md` (Grill-me, 2026-11-07, Q1–Q32; Assumptions from
> write-a-prd, A1–A6). Terms in bold are defined in
> `docs/ubiquitous-language.md`.

## Problem Statement

Features 01 and 02 built **Verify** with eleven gates, but nothing measures
how well the tests behind those gates catch a change in behaviour. The
reviews of both features kept finding untested branches by hand, round
after round. The 1,595 lines of gate scripts in `scripts/` are trusted
because their tests pass, not because anyone knows the tests would fail if
a condition flipped.

One such gap is already known: the licence check passes on a lockfile that
is not an object, or that has no `packages` object, without judging a
single package. A gate that cannot judge its input passes, which every
earlier gate was built never to do.

And from the first domain module on, money math in `packages/domain` will
carry the same risk, with higher stakes.

## Solution

**Mutation testing** with StrykerJS on the **Shipping code** of
`packages/domain`, `scripts/` and `gates/`, row 03 of `docs/feature-checklist.md`:

- The licence check **Fails closed**: a lockfile that is not an object with
  a `packages` object is one violation naming `package-lock.json`. Its
  failing test comes first.
- `npm run test:mutation` runs a **Mutation run** through the Vitest
  runner: it prints the **Mutation score** and writes a **Mutation report**
  listing every **Surviving mutant**.
- It starts as an **Informative gate**: no **Break threshold**, so it fails
  only when Stryker cannot run.
- Every night it runs as the `mutation` job of the **Daily run**, beside the
  audit job, and keeps its report as the CI artifact `mutation-report`.
- Before the feature merges, the **Break threshold** is set to the measured
  score, rounded down; from then on a lower score turns the **Daily run**
  red on `main`. The threshold is only raised, through the rules that
  already guard gate files.
- **Verify** stays as it is; the `pull-request` job of the **Required check**
  runs `npm run test:mutation` as its own step after `check:pr` (D2), so a
  score below the **Break threshold** also blocks the merge.
- The new dependencies pass the supply-chain gates: two licences join the
  **License allowlist**, and the advisories they bring get **Audit
  exceptions**.

One step stays manual for the human after the merge: start the **Daily
run** once by hand and confirm the Linux score clears the **Break
threshold**.

## User Stories

**Licence check fails closed**

1. As the repository owner, I want the licence check to fail when the
   lockfile is not a plain object (`null`, an array, a string, a number), so
   that a broken lockfile never passes without a package judged.
2. As the repository owner, I want the licence check to fail when the
   lockfile's `packages` is missing, `null`, an array or a string, so that a
   truncated lockfile never passes either.
3. As the developer, I want such a lockfile reported as exactly one
   violation, `package-lock.json: must be an object with a packages
   object`, so that the line names the broken file the way the allowlist's
   violation names its own.
4. As the developer, I want a malformed allowlist and a malformed lockfile
   reported together, the allowlist's violation first, so that one run names
   every broken input.
5. As the developer, I want a malformed allowlist with a valid lockfile
   still reported as its one violation, so that the existing behaviour is
   unchanged.
6. As the developer, I want a lockfile whose `packages` is an empty object
   to pass, so that a valid tree with nothing to judge is not an error.
7. As the developer, I want `npm run check:licenses` to exit 1 with that one
   line on such a lockfile, so that **Verify** goes red.
8. As the developer, I want the failing tests for these cases committed
   before the fix, so that the gap is proven before it is closed.
9. As the developer, I want a missing or unparsable lockfile to keep failing
   through the entry's existing error handling, so that the fix touches only
   the core.

**Mutation run**

10. As the developer, I want `npm run test:mutation` to run StrykerJS with
    the Vitest runner on the repository's one Vitest configuration, so that
    mutants are judged by the same tests **Verify** runs.
11. As the developer, I want every `.ts` file under `packages/domain/src/`
    and `scripts/` mutated, except tests and `test-support/`, so that only
    **Shipping code** is measured.
12. As the developer, I want every `.ts` file under `gates/` mutated too,
    except tests and `test-support/`, so that the code behind the
    configuration gates is measured like the rest.
13. As the developer, I want the domain pattern in place before any domain
    code exists, so that the first domain module is measured from the ticket
    that adds it without a gate-file change.
14. As the developer, I want each **Mutant** to run only the tests that cover
    it (per-test coverage, related tests), so that a run stays as short as
    the tool allows.
15. As the developer, I want the **Mutation score** and the **Surviving
    mutants** printed in the log, so that I see the result without opening a
    file.
16. As the developer, I want a **Mutation report** as one HTML file under
    the ignored `reports/` folder, so that I can browse every **Surviving
    mutant** and nothing new is tracked.
17. As the developer, I want the configuration to hold only the runner, the
    Vitest runner's config file, the coverage mode, the mutated files, the
    reporters and the thresholds, so that no checker, incremental mode,
    dashboard or mutator exclusion slips in unnoticed.
18. As the repository owner, I want no dashboard reporter, so that no result
    leaves the machine.
19. As the developer, I want no TypeScript checker plugin, so that the run
    needs no further dependency and no type check per batch.
20. As the developer, I want mutants that only the entry tests' child
    processes reach counted as they come out, with no disable comments, so
    that the report shows where the entry tests leave gaps.
21. As the developer, I want a stale Stryker sandbox left by an interrupted
    run ignored by `npm test`, so that **Verify** stays green and fast after
    a cancelled **Mutation run**.
22. As the developer, I want Stryker's own Vitest run inside its sandbox to
    still collect the sandbox's tests, so that the exclusion never empties a
    **Mutation run**.
23. As the developer, I want the mutation run kept out of **Verify** and
    **Verify full** and run as its own step of the `pull-request` job, so
    that pushes stay as fast as today and the **Required check** still runs
    it.
24. As an AI agent or the human, I want to run `npm run test:mutation` by
    hand, so that I can see a score before a merge.

**Informative first, then a Break threshold**

25. As the developer, I want the first Stryker ticket to set no **Break
    threshold**, so that the new gate cannot block existing work.
26. As the developer, I want the **Mutation run** to fail even then when
    Stryker cannot run (a failing dry run, a broken configuration), so that
    an informative gate still fails closed.
27. As the repository owner, I want the **Break threshold** set before the
    feature merges, to the builder's measured score rounded down to a whole
    percent, so that it blocks a drop without blocking today's code.
28. As the developer, I want the measured score and the chosen threshold
    recorded in the ticket's Notes, so that the next raise starts from a
    known value.
29. As the repository owner, I want a gate test that requires the **Break
    threshold** to be a whole number from 1 to 100 once it is set, so that it
    cannot be removed or turned off silently.
30. As the repository owner, I want the threshold raised only through a
    ticket that names the configuration or by asking me, and lowered only
    with a written decision, so that it only goes up.
31. As the developer, I want the report's `high` and `low` colour thresholds
    at Stryker's defaults, so that they are not confused with the **Break
    threshold**.

**Nightly run**

32. As the repository owner, I want a `mutation` job in the **Daily run**,
    on its schedule and its manual trigger, so that the score is measured on
    `main` every night without a push.
33. As the repository owner, I want the `mutation` job to run beside the
    audit job, not after it, so that a red score never hides the audit's
    result and the two run in parallel.
34. As the developer, I want the `mutation` job to check out, set up Node
    from `.nvmrc` with the npm cache, install with `npm ci` and run
    `npm run test:mutation`, and nothing else, so that it measures exactly
    what a local run measures.
35. As the developer, I want the **Mutation report** uploaded as the
    artifact `mutation-report` on every outcome, so that a red run comes
    with the list of **Surviving mutants**.
36. As the repository owner, I want the upload action pinned by SHA with its
    version comment, so that the **Pinned action** gate covers it.
37. As the developer, I want the `daily` job unchanged, still the only job
    with the full-history **Secret scan**, so that the nightly secret scan
    does not run twice.
38. As the developer, I want the gate wiring test to fail when the `mutation`
    job loses a step, runs another gate or loses its upload, so that the
    nightly run cannot stop measuring silently.
39. As the human who merges, I want a score below the **Break threshold** to
    turn the **Daily run** red and fail the **Required check**, so that no
    merge lowers the score and the fix is a ticket that adds the missing
    tests.

**Supply-chain fallout**

40. As the developer, I want `@stryker-mutator/core` and
    `@stryker-mutator/vitest-runner` installed as exact dev dependencies at a
    release at least 14 days old, so that the install follows 01 and 02's
    rules.
41. As the repository owner, I want `0BSD` and `CC-BY-4.0` added to the
    **License allowlist**; any further licence the install brings on the day
    of building is added only if it is permissive, and any GPL, LGPL or AGPL
    licence, any other licence that is not permissive, and a package without
    a licence stop the builder for the human's decision, so that the licence
    check stays green and every new licence is a deliberate change.
42. As the repository owner, I want one **Audit exception** per open `qs`
    **Advisory**, each with the reason that `qs` is reached only through
    Stryker's `typed-rest-client`, which serves the unused dashboard
    reporter and pins `qs` exactly, so that the **Audit** stays green with
    the risk explained.
43. As the repository owner, I want the existing minimatch exception's
    reason to name Stryker beside the lint tooling, with its dates
    unchanged, so that the monthly review reads a true reason.

**Docs**

44. As the developer, I want row 03 of `docs/feature-checklist.md` to name
    the licence fix, so that the feature's scope is written where every
    feature's is.
45. As the human, I want the manual step (run the **Daily run** once by hand
    after the merge) named in the last ticket's handover note, so that it is
    not forgotten.

## Implementation Decisions

Locations of every file are in the design log's **Files** table; this
section names modules and their interfaces.

**Licence check core** (Q5–Q10)

- `findLicenseViolations(lockfile: unknown, allowlist: unknown):
  Violation[]`, signature unchanged.
- A malformed allowlist is one violation (unchanged). A lockfile that is not
  a plain object, or whose `packages` is not a plain object, is one
  violation with subject `package-lock.json` and reason `must be an object
  with a packages object`. Both malformed: both violations, allowlist
  first. Only when both are valid are the packages judged.
- "Plain object" is the existing `isRecord` (an array is not one). An empty
  `packages` object passes.
- The entry is unchanged.

| Module | Subject | Reason |
| --- | --- | --- |
| `checkLicenses` | `quality/license-allowlist.json` | `must be a non-empty array of licence ids` (unchanged) |
| `checkLicenses` | `package-lock.json` | `must be an object with a packages object` (new) |

**npm scripts** (Q14–Q15)

| Script | Runs |
| --- | --- |
| `test:mutation` | `stryker run stryker.config.js` |

`verify` and `verify:full` are unchanged: Stryker is in neither.

**Stryker configuration** (Q11–Q13, Q16–Q21, Q26–Q28, A1)

- A root ES-module config with a JSDoc type from Stryker's API package
  (installed with core), type-checked and linted like the other root
  configs. Exactly these six keys:
  - `testRunner: 'vitest'`, `coverageAnalysis: 'perTest'`.
  - `vitest`: `configFile: 'vitest.stryker.config.ts'`; the runner's other
    options at their defaults (design log D4).
  - `mutate`: `packages/domain/src/**/*.ts`, `scripts/**/*.ts`,
    `gates/**/*.ts`, `!**/*.test.ts`, `!**/test-support/**`.
  - `reporters`: `clear-text`, `progress`, `html` (default file
    `reports/mutation/mutation.html`).
  - `thresholds`: `high: 80`, `low: 60`, `break: null`; the threshold
    ticket replaces `null` with the measured whole percent.
- Everything else at Stryker's defaults: concurrency, timeouts, temp folder
  `.stryker-tmp`, no incremental mode, no dashboard, no checker.
- No `// Stryker disable` comments (Q19).

**Vitest configuration** (Q20, A2)

- The root Vitest config's `exclude` becomes Vitest's default excludes plus
  `.stryker-tmp/**`, anchored at the repository root. `include` unchanged.
- `vitest.stryker.config.ts` (D4) is the root config plus an exclude of
  exactly three test files, listed by name, never by pattern:
  `gates/commitMsgHook/commitMsgHookTracking.test.ts`,
  `gates/formatting/formattingTree.test.ts` and
  `gates/lint/lintTree.test.ts`. They check the state of the repository,
  which fails inside Stryker's sandbox, and still run in **Verify**.

**Dependencies and supply-chain files** (Q11, Q22–Q24)

- Root dev dependencies `@stryker-mutator/core` and
  `@stryker-mutator/vitest-runner`, exact, same version (10.1.1 on
  2026-11-07, or the newest release at least 14 days old on the day of
  building).
- **License allowlist**: adds `0BSD` and `CC-BY-4.0`.
- **Audit exceptions**: one per open `qs` advisory (four on 2026-11-07),
  `added` the day of building, `expires` 90 days later; the minimatch
  entry's reason names Stryker too, dates unchanged.

**Daily run** (Q25, A4)

- `daily.yml` keeps its name, triggers and `daily` job, and gains the job
  `mutation`, with no job `if:` and no `needs:`:
  1. checkout (default depth),
  2. setup-node from `.nvmrc` with the npm cache,
  3. `npm ci`,
  4. `npm run test:mutation`,
  5. `actions/upload-artifact`, pinned, `name: mutation-report`,
     `path: reports/mutation/mutation.html`, `if: always()` on the step.
- No gitleaks in `mutation`: the `daily` job scans the full history.

**Gate tests** (Q30, A1, A2, A5, A6)

- Mutation testing, a new gate folder:
  - imports the Stryker config: its keys are exactly the six above; the
    runner, coverage mode, `mutate` patterns and reporters are those above;
    `thresholds.break` is `null` until the threshold ticket, then a whole
    number from 1 to 100;
  - imports the Vitest config: the exclude keeps every Vitest default and,
    matched with Node's `path.matchesGlob`, a sandbox test path such as
    `.stryker-tmp/sandbox-1a2b3c/scripts/runGit/runGit.test.ts` matches an
    exclude pattern while `scripts/runGit/runGit.test.ts` matches none.
- Gate wiring (extended):
  - `test:mutation` runs `stryker run stryker.config.js`; **Verify** still
    runs exactly its eleven gates and neither it nor `verify:full` runs
    `test:mutation`;
  - `daily.yml` has exactly the jobs `daily` and `mutation`; `daily` keeps
    every existing check; `mutation` has the five steps above in order, runs
    exactly `npm ci` then `npm run test:mutation`, no gitleaks, and uploads
    `mutation-report` on every outcome. A helper in the style of the daily
    job's problem finder names each missing piece, with one test per
    removed piece.
- Pinned actions: unchanged, it covers the upload action.
- No test runs Stryker (A6).

**Ticket order** (design log, Implementation Plan)

1. Licence check fails closed (RED first).
2. Stryker, informative: dependencies, config with `break: null`,
   `test:mutation`, the Vitest exclude, allowlist and audit exceptions, the
   configuration gate test.
3. Nightly run: the `mutation` job and its wiring tests.
4. Break threshold: the measured score, rounded down; the gate test requires
   a whole number.

**Gate files the tickets name** (Q31)

`package.json`, `package-lock.json`, `stryker.config.js`,
`vitest.config.ts`, `.github/workflows/daily.yml`,
`quality/license-allowlist.json`, `quality/audit-exceptions.json` and the
tests under `gates/`. So `/feature-pipeline` pauses after planning for the
human's `go`.

## Testing Decisions

- A good test drives a gate through its public interface and asserts what
  it reports: the violations of a pure core, the exit code and output of an
  entry, the parsed content of a configuration. It never asserts on
  internals.
- All tests are Vitest tests. No React code, so no stories; no app user
  flow, so no Playwright test (Q3); no domain code yet, so no domain test
  (Q4). The feature's flows (a local **Mutation run**, the nightly run) are
  checked by the builder's runs, recorded in the tickets' Notes, and by the
  human's manual step.
- Modules and their tests:
  - `findLicenseViolations`: a table of malformed lockfiles (`null`, an
    array, a string, a number; `packages` missing, `null`, an array, a
    string), each giving exactly the one lockfile violation with a valid
    allowlist; a malformed allowlist with a malformed lockfile giving both,
    allowlist first; an empty `packages` object giving none. The existing
    malformed-allowlist table keeps its single violation.
  - `check:licenses` entry: one test in the existing entry suite on a
    lockfile without `packages`: exit 1 and the `package-lock.json` line
    (A3). Committed RED with the core tests.
  - The mutation-testing gate test and the extended gate wiring test above.
- The tests stay deterministic: invented lockfiles, no network, a fresh
  temporary folder per entry test, as the existing suite does.
- `npm run test:mutation` is run by the builder by hand: in the informative
  ticket to show it prints a score and exits 0, in the threshold ticket to
  measure the score. **Verify** stays green throughout.
- Prior art: the malformed-allowlist table and the entry suite in the
  licence check's tests; the YAML-reading helpers, the daily job's problem
  finder and its one-test-per-removed-piece table in the gate wiring test;
  the Renovate gate test, which imports a root config and checks its
  settings.

## Out of Scope

- Stryker in **Verify** or in the issue-loop's review (the latter under
  `.claude/`, the human's); on pull requests it runs only as the
  `pull-request` job's own step (D2).
- An automatic ratchet that raises the threshold, or a check against the
  value on `origin/main` (Q28).
- The Stryker dashboard, incremental mode, the TypeScript checker.
- Everything `docs/quality-gates.md` gives to 04 and later (Playwright,
  flaky quarantine, stories, coverage on changed lines, `Cents`, releases).
- Changes to `CLAUDE.md` or `README.md` (Q32), except the cadence of the
  gates table's Mutation testing row (D2).

## Further Notes

- The licence fix comes first, so the first **Mutation run** measures the
  fixed check.
- Stryker copies the repository into `.stryker-tmp/sandbox-*` and runs the
  dry run there. A test that fails only in the sandbox is a finding for the
  ticket's Notes and is fixed at its cause, never by weakening a check
  (`CLAUDE.md`, Definition of done). The one exception is D4: a test that
  checks the state of the repository rather than code is excluded by file
  name in `vitest.stryker.config.ts`.
- Should the install bring a package without a licence, or a licence that
  needs more than the review of Q22, the builder stops and asks: there are
  no per-package licence exceptions (02, Q24), and `CLAUDE.md` (Ask first)
  covers an unclear spec.
- A full **Mutation run** prints every **Surviving mutant**; the builder
  reads the score from the summary table at the end of the log.
- The threshold is measured on Windows and enforced on Linux; rounding down
  absorbs small differences, and the human's manual run confirms it.
- Assumptions taken while writing this PRD are in the design log under
  "Assumptions from write-a-prd" (A1–A6).
