# 03 mutation-testing: refactor plan

## Problem Statement

The mutation-testing feature is merged and works: the licence check **Fails
closed** on a malformed lockfile, `npm run test:mutation` runs a **Mutation
run** over the **Shipping code** of `packages/domain`, `scripts/` and
`gates/`, the **Daily run** and the `pull-request` job of the **Required
check** run it, and a **Break threshold** of 81 is in place.

Almost everything the feature built is a gate file: the Stryker and Vitest
configurations, the workflows, the files in `quality/`, the npm scripts and,
since this feature, everything under `gates/` (`CLAUDE.md`, Ask first). A
refactor may not touch those without asking. What is left for this refactor
is the one piece of shipping code the feature changed outside them, the
licence check's core, and the feature's glossary entries:

- **Problems flagged in the tickets' Notes and the Implementation Results.**
  None names a problem for the refactor phase in code this plan may change.
  The one flagged gap, two **Surviving mutants** in the **Break threshold**
  module (ticket 06), sits under `gates/` and is a Further Note.
- **A core that checks each input twice.** The fail-closed fix (ticket 01)
  turned `findLicenseViolations` into three blocks: one that pushes the
  allowlist's violation when `isAllowlist` fails, one that pushes the
  lockfile's violation when its `packages` is not a plain object, and a
  third that asks both questions again to decide whether to return early.
  Each input is judged twice, and a change to one test of validity has to
  be made in two places.
- **A mixed function.** After that guard, the same function loops over the
  lockfile's entries, skips the root, workspace and link entries, names each
  package and asks `judgeLicence` for a reason. Validating the two inputs and
  judging the packages are two jobs in one body.
- **Term drift in the glossary.** The **Daily run**'s definition says its
  jobs run the **Mutation run**, but the relationship "The **Daily run** runs
  the **Audit** and a **Secret scan**" does not. **Mutation testing**'s
  definition says "shipping code" in plain text where the glossary defines
  **Shipping code**. The relationship on the **Break threshold** names the
  **Daily run** turning red but not the **Required check** that a low
  score also fails since D2.

Measured on 2026-11-07 with Stryker run on the licence check alone: 90.11 %
(154 killed, 10 timeout, 12 survived, 6 no coverage). No **Mutant** in
`findLicenseViolations` survives; every survivor and every uncovered
**Mutant** sits in the SPDX expression parser, `readJson` or the entry
block, which this plan does not touch.

## Solution

Behaviour-preserving moves in one module, then one glossary edit:

1. Pull the package loop out of `findLicenseViolations` into a private
   `judgePackages`.
2. Read the lockfile's `packages` object in one private `readPackages`,
   which gives it back or nothing.
3. Judge the allowlist once and let the early return test the two results
   instead of asking both questions again.
4. Align the glossary's relationships and the **Mutation testing**
   definition with what the feature built.

`check:licenses` keeps its verdict, its `<subject>: <reason>` lines, their
order (allowlist before lockfile) and its exit codes. Every existing test
keeps its assertions; no test file changes.

## Commits

Each step is one `refactor:` commit with the step's number and description.
Run `npm run verify` before committing. Every step must leave it green.

- [x] 01 extract judge packages in check licenses
- [x] 02 extract read packages in check licenses
- [ ] 03 judge the allowlist once in check licenses
- [ ] 04 align the glossary with the mutation run

### What each step does

**01 extract judge packages in check licenses.** In the licence check, move
the loop at the end of `findLicenseViolations` into a private
`judgePackages(packages, allowlist)` that takes the lockfile's `packages`
object and the valid allowlist and returns the violations. It keeps
everything the loop does today, unchanged: an entry whose key holds no
`node_modules/` or that is a link is skipped; the subject is the key after
its last `node_modules/`, an `@` and the entry's version; the reason comes
from `judgeLicence`; an entry that is not an object is read as an empty one.
`findLicenseViolations` returns `judgePackages(packages, allowlist)` after
its guard. Move the sentence "Returns every package of the lockfile whose
licence is missing or not on the allowlist" onto `judgePackages`; the
comment on `findLicenseViolations` keeps that it returns those packages and
that a malformed allowlist or lockfile is one violation naming its file,
both judged before any package. The licence tests stay green unchanged.

**02 extract read packages in check licenses.** In the licence check, add a
private `readPackages(lockfile)` that returns the lockfile's `packages`
object when the lockfile is a plain object and its `packages` is a plain
object (both by the shared `isRecord`), and undefined otherwise. Comment it
in one line. In `findLicenseViolations`, replace the inline lookup with one
call to it; the lockfile's violation is pushed when the result is undefined,
and the early return asks for undefined instead of calling `isRecord` again.
An empty `packages` object stays valid. The licence tests stay green
unchanged.

**03 judge the allowlist once in check licenses.** In
`findLicenseViolations`, call `isAllowlist` once and keep the narrowed
allowlist in a local (the allowlist when it is valid, undefined when not).
Push the allowlist's violation when it is undefined, then the lockfile's
when `readPackages` gave undefined, in that order. The early return tests
the two locals and returns the collected violations; after it,
`judgePackages` gets the two narrowed values. No type assertion is added.
`isAllowlist` keeps its name and its type guard. The two violations keep
their subjects and reasons word for word: `quality/license-allowlist.json:
must be a non-empty array of licence ids` and `package-lock.json: must be
an object with a packages object`. The licence tests stay green unchanged.

**04 align the glossary with the mutation run.** In
`docs/ubiquitous-language.md`, three edits, no new term:

- The definition of **Mutation testing** reads "**Shipping code**" in bold
  where it says "shipping code".
- The relationship "The **Daily run** runs the **Audit** and a **Secret
  scan**; …" reads "The **Daily run** runs the **Audit**, a **Secret scan**
  and the **Mutation run**; …"; its second half stays as it is.
- The relationship that starts "**Mutation testing** is an **Informative
  gate**" reads that, once the **Break threshold** is set, a **Mutation
  score** below it fails the **Mutation run**, turns the **Daily run** red
  and fails the **Required check**; the rest of the line stays.

Nothing else in the glossary changes. `npm run verify` covers the docs-drift
and formatting gates for the file.

## Decision Document

- **Scope.** Of the feature's code, only the licence check's core and the
  feature's glossary entries change. Every other file the feature built is
  a gate file under `CLAUDE.md`'s "Ask first": `stryker.config.js`, both
  Vitest configs, the workflows, `quality/`, the npm scripts and everything
  under `gates/` (added to the list on this feature's branch). No step
  changes one of them or anything under `.claude/`. Where the evidence
  points at them, the Further Notes say so for the human.
- **Behaviour.** `findLicenseViolations(lockfile, allowlist)` keeps its
  signature and its results for every input: the same violations, in the
  same order, worded the same. The entry and its `readJson` do not change.
- **Licence core shape.** After step 03 the module's private functions are
  `isAllowlist`, `evaluateExpression` (with its inner parsers),
  `isBoundary`, `judgeLicence`, `readPackages`, `judgePackages` and
  `readJson`. `findLicenseViolations` reads both inputs once, returns the
  malformed-input violations when either is malformed, and otherwise
  returns `judgePackages`.
- **Naming.** The new private functions are verb first, per
  `docs/conventions.md` (Naming): `readPackages` reads a value out of input
  the way the audit's `readExceptions` and `readAdvisories` do;
  `judgePackages` sits beside `judgeLicence`, which it calls.
- **No shared "malformed input" helper.** The **Audit** reports a malformed
  exceptions file in its own words and shape; the two gates share
  `isRecord` and nothing more is common to them. Sharing would reach into
  feature 02's module for one line.
- **The glossary step is a refactor step.** It changes no term, only
  relationships and one definition, so that they say what the feature's
  code already does. As every step, it is a `refactor:` commit with its
  step number, so the **Ticket check** finds it in this plan.

## Testing Decisions

- A good test checks external behaviour: the violations `findLicenseViolations`
  returns for a given lockfile and allowlist, and the exit code and lines of
  `check:licenses`. It never asserts on private helpers.
- Coverage is enough to refactor without new tests. The licence check's
  table tests cover every malformed allowlist and lockfile, both together
  (allowlist first), an empty `packages`, every kind of entry (root,
  workspace, link, nested, scoped, inside a workspace member folder), every
  licence verdict, and the entry on a valid, a disallowed and a malformed
  lockfile. A **Mutation run** limited to the module, on 2026-11-07, left no
  **Surviving mutant** in `findLicenseViolations`; the code the plan moves is
  fully killed.
- No test file changes. The private functions the steps extract get no
  tests of their own; the module's tests cover them.
- Optional check after step 03: `npm run test:mutation -- --mutate
  scripts/checkLicenses/checkLicenses.ts` should again show no survivor in
  `findLicenseViolations`, `readPackages` or `judgePackages` (its log goes
  outside the repository; read only the survivor lines and the summary
  table). The refactor pull request's **Required check** runs the full
  **Mutation run** against the **Break threshold** in any case.
- Prior art: the 02 refactor's step 21 extracted `judgeLicence` from the same
  loop, and its steps 17–20 split the **Audit** core into `read…` and
  `find…` helpers, each under unchanged table tests.
- Tests stay deterministic, offline and on invented lockfiles.

## Out of Scope

- **Untested branches of the SPDX expression parser (feature 02's code).**
  The scoped **Mutation run** left 10 **Surviving mutants** in
  `evaluateExpression` and `isBoundary`, for example: a leading `OR` (only a
  leading `AND` is tested), the check for a missing `)` after a valid inner
  expression, and the `(` boundary. They are gaps in 02's tests, not in this
  feature's code, and this plan does not move the parser. Closing them is a
  ticket that adds tests in the licence check's test file (not a gate file).
- **The entry block's mutants.** The `if (import.meta.main)` block and
  `readJson` run only in the entry tests' child processes, which Stryker's
  in-process coverage does not see (design log Q19). As decided there, no
  disable comment and no exclusion.
- **Design.** This feature has no prototype part (design log, Background).
  Nothing in `docs/design/` applies, so there is no design bug to list.
- **Money.** The feature holds no money math.
- Every gate file: `stryker.config.js`, `vitest.config.ts`,
  `vitest.stryker.config.ts`, `daily.yml`, `pull-request.yml`, `CODEOWNERS`,
  `quality/license-allowlist.json`, `quality/audit-exceptions.json`, the
  `test:mutation` script and everything under `gates/`: unchanged.
- `CLAUDE.md`, `README.md`, `docs/quality-gates.md`,
  `docs/feature-checklist.md` and the feature's planning documents (the
  design log is an immutable snapshot).

## Further Notes

For the human. None of these is a step, because each one touches a gate
file.

- **Two survivors in the Break threshold module** (ticket 06's Notes: 19
  killed, 2 survived, 1 no coverage; reproduced on 2026-11-07). No test
  calls `hasBreakThreshold` with `thresholds` that is not an object (`null`,
  an array, a string), so both the "not a record" branch and its `false`
  survive or go uncovered. The other survivor, `typeof value === 'number'`
  replaced by `true`, is an equivalent mutant, since `Number.isInteger`
  already refuses a non-number; dropping that clause would make the module
  shorter, not weaker. Both changes are under `gates/`.
- **The gate wiring test's problem finders are not mutated.**
  `findDailyWiringProblems`, `findSecretScanProblems`,
  `findMutationWiringProblems` and `findPullRequestMutationProblems` live in
  the 985-line test file, and Stryker leaves every `*.test.ts` out (D1). Moving
  them into a `gates/gateWiring/` module, as ticket 06 did for
  `hasBreakThreshold`, would put them under **Mutation testing**. A change
  under `gates/`; a ticket that names the files is the approval.
- **The daily and mutation finders repeat their checkout and setup-node
  checks** in different words ("does not set up Node from .nvmrc with the
  npm cache after the checkout" against three separate lines). Sharing them
  would change problem lines, so it is not a pure refactor, and it is under
  `gates/`.
- **`findMutationWiringProblems` has no comment**, unlike its three sibling
  finders ("What … lacks …, one line each"). Comment only, but under
  `gates/`.
- **Handover from ticket 06.** If not done yet: start the **Daily run** once
  with `workflow_dispatch` and confirm the Linux **Mutation score** clears
  the **Break threshold** of 81.
