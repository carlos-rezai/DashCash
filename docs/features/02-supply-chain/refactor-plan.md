# 02 supply-chain: refactor plan

## Problem Statement

The supply-chain feature is merged and every new gate works: the licence
check, the **Audit**, the Renovate rule, the pinned-actions rule, the
workflow wiring of the **Secret scan** and the **Daily run**, and the
commit-message entry behind the **Commit-msg hook**. Its code grew one ticket
at a time and shows it:

- **Problems flagged in the tickets' Notes.**
  - The audit tests' `malformed(index, field)` helper only checks that the
    field's word appears in the reason. Every reason starts with "entry
    <index>", so `malformed(1, 'entry')` matches any malformed message for
    entry 1 (ticket 05).
  - In the gate wiring test, the comment "A workflow file that does not exist
    reads as an empty workflow" sits above the text reader, not the YAML
    reader it was written for (ticket 08).
  - The per-job test "pins the gitleaks action of the %s job as a Pinned
    action" partly repeats the pinned-actions gate. All it adds is that each
    file has exactly one gitleaks `uses:` line (ticket 08).
  - The comment at the top of the branch-protection tests still describes
    only the merge-commit settings, not secret scanning (ticket 09).
  - The Pull-request check's Renovate title rule has two defensive branches,
    "the title does not follow the format" and `|| header.red`. The real
    commitlint config never reaches them, and no test covers them
    (ticket 10).
  - Three input checks of the Renovate rule have no test: a config that is
    not an object, a message or title that is not a string, and an explicit
    `automerge: false` being allowed (ticket 10).
  - In the commit-message tests, a comment says "Descriptions at and just
    over the limit" but only the 51-character sample exists, and its length
    assertion runs inside every row of a table test instead of once
    (ticket 12).
- **Duplication.**
  - The guard "a value is a plain object" (not null, not an array) is
    written out three times, in the **Audit**, the licence check and the
    Renovate rule (there as `isSettings`).
  - The feature name `supply-chain` that every **Renovate PR** names is a
    constant in both the Pull-request check and the Renovate rule.
  - The gate wiring test has a `withDailySteps` that repeats its own
    `withJobSteps` for the job `daily`. It also has two copies of the same
    "checks out full history, then sets up Node … before npm ci" test, one
    per job.
- **A long function.** The **Audit** core is one 60-line function. It
  validates that the exceptions file is an array, splits valid exceptions
  from malformed ones, finds expired and stale exceptions, finds duplicates
  and finds unexcepted advisories, all inline. Each rule has to be read out
  of the whole.
- **A mixed loop.** The licence core's loop over the lockfile names the
  package, judges its licence and words the reason in one block.
- **Naming drift.** Some private functions are nouns where
  `docs/conventions.md` asks for verb first: `malformedEntry` in the
  **Audit**, `sameList` and `holds` in the Renovate rule.

## Solution

Behaviour-preserving moves, one module at a time:

1. Pin what is untested first: the Renovate rule's three input checks, and
   the Renovate title rule's two defensive branches, through a stubbed
   linter.
2. Settle the test-only Notes: tighten the audit helper, fix the two stale
   comments, run the 51-character length check once, and narrow the
   duplicated gitleaks pin test to the one thing it adds.
3. Remove the duplication in the gate wiring test.
4. Add one shared `isRecord` module and route the three gates through it.
   Let the Renovate rule take the feature name from the Pull-request check.
5. Rename the noun-named helpers verb first.
6. Split the **Audit** core into one private function per rule, and pull the
   licence verdict out of the licence core's loop.

Every gate keeps its verdict, its `<subject>: <reason>` lines, their order
and its exit codes. Every existing test keeps its assertions, except the one
duplicated pin assertion that step 06 drops (Decision Document).

## Commits

Each step is one `refactor:` commit with the step's number and description.
Run `npm run verify` before committing. Every step must leave it green.

- [x] 01 test renovate rule input checks
- [x] 02 test renovate title fallbacks with a stub
- [x] 03 tighten the audit malformed entry helper
- [x] 04 tidy the 51-character description sample
- [x] 05 move the missing workflow comment back
- [x] 06 narrow the gitleaks pin test to one step
- [x] 07 use with job steps for the daily job
- [x] 08 share the checkout test of two jobs
- [x] 09 describe secret scanning in protection tests
- [ ] 10 add the is record module
- [ ] 11 use is record in check audit
- [ ] 12 use is record in check licenses
- [ ] 13 use is record in the renovate rule
- [ ] 14 share the renovate feature name
- [ ] 15 rename malformed entry to verb first
- [ ] 16 rename renovate list helpers to verb first
- [ ] 17 move the array check into read exceptions
- [ ] 18 extract lapsed exceptions in check audit
- [ ] 19 return violations from find duplicates
- [ ] 20 extract unexcepted advisories in check audit
- [ ] 21 extract the licence verdict in check licenses

### What each step does

**01 test renovate rule input checks.** In the Renovate rule's test file,
add tests to the "invented configs" block, using its `check` helper and the
loaded commitlint config. They cover the three input checks ticket 10 left
untested:

- A config that is not an object (an array, `null`, a string) is exactly one
  violation, `renovate.json: the config must be an object`.
- A group whose `commitMessage` and `prTitle` are both the number `42`
  reports the violation `{ subject: '42', reason: 'must be a string' }`,
  through both the message and the title check. Use `toContainEqual`.
- The sample config with `automerge: false` passes, at the root and inside
  a group in `packageRules`.

All of them pass against the current code. Only new tests.

**02 test renovate title fallbacks with a stub.** In the Pull-request
check's test file, add tests on a `renovate/*` branch that call
`checkPullRequest` directly with a `lintTitle` stub, like the existing
"reports what lintTitle reports" test:

- The stub returns `[]` and the title is off the header pattern (for example
  `update sample`). The result is exactly one violation, "the title does not
  follow the format".
- The stub returns one sample violation and the title is off the pattern.
  The result is exactly that violation.
- The stub returns `[]` and the title is `chore: [supply-chain] update
  sample, RED`. The result is exactly one violation, "a renovate title is
  chore:".

They pin the two defensive branches ticket 10 named (Decision Document).
Only new tests.

**03 tighten the audit malformed entry helper.** In the **Audit** tests,
change the `malformed(index, field)` helper so that the reason must name the
index as before and the words `field <field>`, not just the field's word
anywhere. Then `malformed(1, 'entry')` no longer matches every reason of
entry 1. Every current use still passes: each reason reads
`entry <index>, field <field>: …`. Update the helper's comment. No other
test changes.

**04 tidy the 51-character description sample.** In the commit-message
tests, correct the comment above the 51-character sample: it describes one
description just over the 50-character limit. Move the length assertion out
of the table test's body into one `it` of its own beside the table, run once.
The table rows and their assertions stay as they are.

**05 move the missing workflow comment back.** In the gate wiring test, move
the comment "A workflow file that does not exist reads as an empty workflow,
so every check on it fails at its assertion" from the text reader to the
YAML reader `readWorkflow`, which it describes. Comment only.

**06 narrow the gitleaks pin test to one step.** In the gate wiring test,
replace the per-job test "pins the gitleaks action of the %s job as a Pinned
action" with "runs exactly one gitleaks step in the %s job". The new test
counts the gitleaks steps of each **Secret scan** job in its parsed workflow
and expects 1. The pin check it also ran stays proven by the pinned-actions
gate test, which reads every workflow file. Then remove what is no longer
used: the text reader `readWorkflowText`, `LINE_BREAK`, `NEWLINE` and the
import of the pinned-actions core.

**07 use with job steps for the daily job.** In the gate wiring test,
delete `withDailySteps`. Have `withoutFullHistory` and `withoutAuditStep`
call `withJobSteps(workflow, 'daily', …)` instead. Both helpers build the
same workflow. The "fails the daily wiring when the %s is removed" tests
stay green unchanged.

**08 share the checkout test of two jobs.** In the gate wiring test, merge
the two tests "checks out full history, then sets up Node from .nvmrc with
the npm cache, before npm ci in the pull-request job" and "… in the daily
job" into one `it.each` over the pairs (job, workflow). The test name
template gives both names exactly as before. Every assertion stays.

**09 describe secret scanning in protection tests.** In the
branch-protection tests, extend the comment at the top so that it also says
the repository patch switches on secret scanning with push protection, as
the comment on `planRulesetRequests` already does. Comment only.

**10 add the is record module.** Create the module `isRecord` in the scripts
folder, with its own test file. It exports one type guard, `isRecord(value):
value is Record<string, unknown>`: true for a plain object, including one
without a prototype, and false for `null`, `undefined`, an array, a string, a
number and a function. Nothing uses it yet.

**11 use is record in check audit.** Delete the **Audit**'s private
`isRecord` and import the shared one. The audit tests stay green unchanged.

**12 use is record in check licenses.** Delete the licence check's private
`isRecord` and import the shared one. The licence tests stay green
unchanged.

**13 use is record in the renovate rule.** In the Renovate rule, replace the
private `isSettings` with the shared `isRecord`. The `Settings` type alias
stays. The Renovate tests stay green unchanged.

**14 share the renovate feature name.** Export `RENOVATE_FEATURE` from the
Pull-request check. In the Renovate rule, delete the constant `FEATURE` and
import `RENOVATE_FEATURE`. The Renovate rule already imports
`checkPullRequest` from there. The tests keep their own literal
`supply-chain`.

**15 rename malformed entry to verb first.** In the **Audit**, rename the
private `malformedEntry` to `buildEntryViolation`, together with its
callers.

**16 rename renovate list helpers to verb first.** In the Renovate rule,
rename `sameList` to `hasSameItems` and `holds` to `listIncludes`, together
with their callers.

**17 move the array check into read exceptions.** In the **Audit**,
`readExceptions` takes `unknown`. When the value is not an array, it returns
no valid exceptions and the one violation "must be an array of audit
exceptions" on the exceptions file. `findAuditViolations` calls it directly,
without its inline ternary.

**18 extract lapsed exceptions in check audit.** In the **Audit**, move the
loop that sorts valid exceptions into expired and stale out of
`findAuditViolations`, into a private `findLapsedExceptions(valid, reported,
today)` that returns `{ expired, stale }`. The rule "an exception both
expired and stale is reported once, as expired" moves with it, unchanged.

**19 return violations from find duplicates.** In the **Audit**, rename
`findDuplicates` to `findDuplicateExceptions`. It returns the violations on
the exceptions file ("more than one audit exception names <id>") instead of
the bare ids, so the mapping leaves `findAuditViolations`.

**20 extract unexcepted advisories in check audit.** In the **Audit**, move
the filter and map that report advisories without a valid exception into a
private `findUnexceptedAdvisories(advisories, valid)`.
`findAuditViolations` is then the report check and one line per rule. The
violations keep their order: unexcepted, without GHSA id, expired, stale,
duplicates, malformed.

**21 extract the licence verdict in check licenses.** In the licence check,
move the judgement of one `license` value into a private
`judgeLicence(license, allowlist)`. It returns the violation's reason ("has
no licence", "is an unreadable SPDX expression", "is not on the licence
allowlist", worded as today) or undefined for an allowed licence. The loop
in `findLicenseViolations` keeps the entry filtering and the subject.

## Decision Document

- **Scope.** The feature's own code: the **Audit**, the licence check, the
  commit-message entry and their tests; the Renovate rule and the
  pinned-actions rule and their gate tests; the gate wiring, ruleset and
  commit-msg hook gate tests; and the parts of the Pull-request check and the
  branch-protection script that this feature changed. No gate file
  (CLAUDE.md, "Ask first") changes: not the workflows, not the files in
  `quality/`, not the npm scripts. Nothing under `.claude/` changes, and
  neither do `renovate.json`, the hooks folder or the Ruleset.
- **Behaviour.** Every gate keeps its verdict, its `<subject>: <reason>`
  lines, their order and its exit codes. No step changes a violation's
  wording.
- **The defensive branches of the Renovate title rule stay.** Ticket 10
  notes that "the title does not follow the format" and `|| header.red`
  cannot be reached with the real commitlint config. The core takes its
  linter as a parameter, and with these branches it fails closed whatever
  linter it gets. That is 01's rule that a check must not pass what it
  cannot judge (01, A1). Removing them would loosen the core. Step 02 pins
  them with a stubbed linter instead.
- **The gitleaks pin test is narrowed, not kept or dropped** (ticket 08).
  The pinned-actions gate test already proves that every `uses:` in every
  workflow file is pinned, the gitleaks lines included. The one thing only
  the per-job test checks is that each **Secret scan** job has exactly one
  gitleaks step. Step 06 keeps that and drops the repeated pin check. The
  gate wiring test then no longer imports the pinned-actions core. No
  property of the repository loses its test.
- **`isRecord` module.** It is a new module in the scripts folder, named
  after its one function, with a test file beside it, as
  `docs/conventions.md` files every module. Gate tests and the Renovate rule
  already import from the scripts folder. The dependency layer rules already
  cover the scripts folder.
- **`RENOVATE_FEATURE`.** It is exported from the Pull-request check, which
  owns the rule for **Renovate PR** titles. The Renovate rule imports it, so
  the feature name lives in one module. The tests keep their own literals so
  that they stay independent of the code.
- **Audit core shape.** `findAuditViolations(report, exceptions, today)` keeps
  its signature. Its private helpers end up as `readDate`, `readAdvisories`,
  `buildEntryViolation`, `findEntryProblems`, `readExceptions` (now taking
  `unknown`), `findLapsedExceptions`, `findDuplicateExceptions` and
  `findUnexceptedAdvisories`. The entry `checkAudit` does not change.
- **Licence core shape.** `findLicenseViolations(lockfile, allowlist)` keeps
  its signature and its handling of entries. Only the licence verdict moves
  out, into `judgeLicence`.
- **Renames.** Verb first, per `docs/conventions.md` (Naming):
  `malformedEntry` becomes `buildEntryViolation`, `sameList` becomes
  `hasSameItems` and `holds` becomes `listIncludes`. Test fixture builders
  (`group`, `nodeRule`, `sampleConfig`, `advisory`, `report`) and the gate
  wiring test's helpers keep their names, as the 01 refactor left test
  helpers.
- **Commit type.** Every step, the test-only steps 01–09 included, is a
  `refactor:` commit with its step number, so the **Ticket check** finds it
  in this plan.

## Testing Decisions

- A good test checks external behaviour: a gate's verdict, its violation
  lines and its exit code, or a module's return value for given inputs. It
  never asserts on private helpers, call order or how a module is wired.
- Coverage is enough to refactor: the **Audit** and licence cores have table
  tests for every rule and entry tests, and the Renovate rule and gate
  wiring have tests on invented configs and on the repository's files. The
  gaps are the ones the Notes name: the Renovate rule's three input checks
  and the Renovate title rule's two defensive branches. Steps 01 and 02 close
  them against the current behaviour before any code moves.
- Existing tests keep every assertion. A test file changes only to add the
  missing tests (01, 02), to settle a Note about the test itself (03, 04, 05,
  06, 09) or to remove duplication within the file (07, 08).
- New module: `isRecord` gets its own test file. The private functions that
  steps 15–21 extract or rename get no tests of their own. Their module's
  tests cover them.
- Prior art: the table tests of `findAuditViolations` and
  `findLicenseViolations` on invented reports and lockfiles; the Renovate
  rule's `check` helper on `sampleConfig`; the Pull-request check's "reports
  what lintTitle reports" test with a stubbed linter; the gate wiring test's
  `with…` workflow changers.
- Tests stay deterministic, offline and use invented data only: invented
  GHSA ids, sample package names, fixed dates.

## Out of Scope

- **The licence check passes a lockfile it cannot read (bug, not
  refactor).** A lockfile that is not an object, or that has no `packages`
  object, gives no violations, so `check:licenses` passes without having
  judged a single package. That contradicts 01's rule that a gate which
  cannot run must not pass (01, A1, as cited in design-log Q17) and A6's
  "an unknown licence must never pass". Fixing it changes the gate's verdict,
  so it needs its own ticket with a RED test.
- **Design.** This feature has no prototype part (design log, Background).
  Nothing in `docs/design/` applies, so there is no design bug to list.
- **Money.** The feature holds no money math.
- The workflows, the files in `quality/`, the `verify` and `check:*` npm
  scripts, the `prepare` script, the hooks folder, `renovate.json` and the
  Ruleset: unchanged.
- The **Claude folder guard** and its gate test: built by the human under
  ticket 14, untouched.
- The commitlint config and every 01 module the feature did not change.
- Gates that `docs/quality-gates.md` (Rollout) gives to later features.

## Further Notes

For the human. None of these is a step, because each one touches a gate
file, `.claude/` or a decision the design log leaves to the human.

- **Are the tests under `gates/` gate files?** The "Ask first" list in
  CLAUDE.md does not name `gates/` or the gate scripts, and the 01 refactor
  changed gate tests unasked (its steps 11–13). Design-log Q49 counts "the
  tests under `gates/`" among the gate files the tickets name, though. This
  plan follows CLAUDE.md and the 01 precedent: steps 01, 05–08, 13, 14 and 16
  change files under `gates/`. If those files should count as gate files,
  add `gates/` (and the gate scripts) to "Ask first" before the refactor loop
  runs, and give a go for those steps.
- **The Renovate rule models Renovate's semantics.** Ticket 11's lesson is
  that a gate for a third-party tool's config should check our own decisions
  (titles, messages, release age, groups), not model the tool's
  `packageRules` semantics. The rule order, the npm and lockfile-maintenance
  reach and the empty matcher list are modelled, partly. Dropping those
  checks would change the gate's verdict, so it is not a refactor. If you
  want it, it is a new ticket. Check the first lockfile maintenance and Node
  update **Renovate PRs** either way (ticket 11 Notes).
- **The three workflows repeat their set-up.** Checkout, Node from `.nvmrc`
  with the npm cache, and `npm ci` appear in each job. A local composite
  action would remove the repetition, but it is a change under `.github/`,
  a gate file, and the wiring tests read these steps job by job.
- **Considered and left as they are.** The gate wiring and ruleset tests
  each list the workflow files with a four-line helper. The pinned-actions
  test reads the folder recursively on purpose, so that a new workflow file
  is covered. Sharing the two identical helpers would need a new test-support
  module for four lines. The commit-msg hook test and the commit-message
  entry test both have an `expectedLines` helper, which is likewise too
  small to share. The test "runs npm run verify:full in the pull-request
  job" is covered by the exact command list of the job's next test, but
  removing a test is not a refactor step.
- **The Audit core and an invalid today.** `findAuditViolations` with a
  `today` that is not a real date compares against `NaN`, so no exception
  expires and none is "added later than today". The entry always passes
  today's UTC date, so this cannot happen today. Making the core reject it
  would be a ticket.
