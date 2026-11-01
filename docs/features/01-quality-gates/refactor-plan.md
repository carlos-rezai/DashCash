# 01 quality-gates: refactor plan

## Problem Statement

The quality-gates feature is merged and every gate works, but its code grew
one ticket at a time and shows it:

- **Copied test scaffolding.** Every gate-entry test (commit gate, Ticket
  check, Pull-request check, data-file check, docs-drift check) and the
  branch-range test carry their own copy of the same helpers: an environment
  without the `GIT_*` variables, a `git` runner, a file writer, `commit`,
  `commitFiles`, a fake `origin/main`, the set-up of a temporary repository
  with the gate scripts beside it, and a runner for npm scripts. Three gate
  config tests (formatting, lint, layer rules) carry a fourth variant of the
  npm script runner. The copies already differ in small ways (which GitHub
  variables are blanked, whether `PR_TITLE` is removed, what is returned),
  so a fix to one does not reach the others.
- **Copied entry-point boilerplate.** Three gate entries repeat the same
  `try`/`catch` that prints the error's message and sets exit code 1 around
  `reportViolations`; the data-file and docs-drift entries have no `catch`
  at all, so a failing `git` call ends them with a stack trace instead of
  one line.
- **The Commit header is parsed in three places.** The Ticket check
  destructures the header pattern's match by position, the Pull-request
  check reads the ticket number as match index 3, and the commit gate and
  the Ticket check each cut the first line of a message by hand. Assumption
  A7 keeps one grammar in the commitlint config, but the meaning of each
  capture group is re-derived wherever it is used.
- **Gate entries reach into each other.** The Pull-request check imports
  `lintCommitMessages` from the commit gate's entry module, and both load
  the commitlint config with the same call; the Pull-request check also
  repeats the branch-name lookup (`resolveBranchName` plus the current git
  branch) that the branch-range module already does internally.
- **Ticket status lives in the wrong module.** Reading a Ticket's
  `status:` from its front matter sits inside the Pull-request check,
  although the Ticket-reading module exists for exactly that kind of rule.
- **Naming drift.** Inside the Pull-request check a private function is
  called `checkTickets`, the name of the **Ticket check** gate, although it
  checks that Tickets are `done`. Several functions are nouns where
  `docs/conventions.md` asks for verb first (`featureFolderPath`,
  `refactorPlanPath`, `ticketReason`, `namedPaths`, `linesOutsideFences`,
  `gitEnv`, `gh`).
- **Untested corners.** The branch-protection script resolves the
  `{owner}`/`{repo}` placeholders inline in its entry, untested; the Ticket
  check's refusal to run without `origin/main` (A1) is tested only for the
  commit gate; the Pull-request check's fallback to the current git branch
  is not tested at the entry.

## Solution

Behaviour-preserving moves, one module at a time:

1. Pin the untested behaviour first: the Ticket check without `origin/main`,
   and the Pull-request check reading its branch from git.
2. Pull the test scaffolding into two test-support modules beside the
   scripts — one that builds and drives a sample git repository, one that
   runs a root npm script the way `npm run` does — and switch each test file
   to them, one file per step.
3. Give `reportViolations` a `runGate` companion that owns the exit code and
   the one-line error output, and route each gate entry through it, one
   entry per step.
4. Give the Commit header one parser (a new module reading the field order
   from the commitlint config's `headerCorrespondence`) and one place for
   commit linting and config loading, so no gate entry imports another.
5. Share the branch-name lookup, move Ticket status into the Ticket-reading
   module, and fix the names that drift from the conventions and the
   ubiquitous language.
6. Extract the endpoint resolution of the branch-protection script so it
   can be tested, and drop the obsolete `.gitkeep` in the scripts folder.

Every gate keeps its verdict, its violation lines and its exit codes; every
existing test keeps its assertions.

## Commits

Each step is one `refactor:` commit with the step's number and description.
Run `npm run verify` before committing; every step must leave it green.

- [x] 01 test check tickets without origin main
- [x] 02 test check pr reading the branch from git
- [x] 03 add sample repository test support
- [x] 04 add run npm script test support
- [x] 05 use test support in read branch range tests
- [x] 06 use test support in check commits tests
- [x] 07 use test support in check tickets tests
- [x] 08 use test support in check pull request tests
- [x] 09 use test support in check data files tests
- [x] 10 use test support in check docs drift tests
- [x] 11 use run npm script in formatting gate tests
- [x] 12 use run npm script in lint gate tests
- [x] 13 use run npm script in layer rule tests
- [x] 14 add run gate to report violations
- [x] 15 run check commits through run gate
- [x] 16 run check tickets through run gate
- [x] 17 run check pull request through run gate
- [x] 18 run check data files through run gate
- [x] 19 run check docs drift through run gate
- [x] 20 extract commit header parsing from check tickets
- [x] 21 parse the pull request title header
- [x] 22 read the commit header in check commits
- [x] 23 move commit linting into its own module
- [x] 24 share commitlint config loading
- [x] 25 add read branch name to read branch range
- [x] 26 use read branch name in check pull request
- [x] 27 move ticket status reading into read tickets
- [x] 28 rename pull request ticket and step checks
- [x] 29 classify the pull request branch once
- [x] 30 rename feature folder path to verb first
- [x] 31 rename refactor plan path to verb first
- [x] 32 rename check tickets helpers to verb first
- [ ] 33 extract tracked folders in docs drift
- [ ] 34 rename docs drift helpers to verb first
- [ ] 35 extract endpoint resolution in branch protection
- [ ] 36 rename git env helper to verb first
- [ ] 37 rename gh helper to verb first
- [ ] 38 remove the obsolete scripts gitkeep

### What each step does

**01 test check tickets without origin main.** In the Ticket check's test
file, add one entry-point test beside the existing `check:tickets` tests: on
a feature branch, delete the `refs/remotes/origin/main` ref, run the script,
expect exit 1, empty standard output and a standard-error message that
tells the caller to fetch `origin/main`. It mirrors the commit gate's
existing "exits 1 telling to fetch origin/main" test and passes against the
current code (A1). Only a new test; no shipping code changes.

**02 test check pr reading the branch from git.** In the Pull-request
check's test file, add one entry-point test: with `GITHUB_HEAD_REF` and
`GITHUB_REF_NAME` empty, switch the sample repository to `feat/01-sample`
and run `check:pr` with a valid title; expect exit 0 and no output. Add a
second one on a branch no pull request may come from (for example
`topic/sample`) that expects exit 1 and the branch named in standard error.
Both pass against the current code; they pin the current-branch fallback
that step 26 touches. Only new tests.

**03 add sample repository test support.** Create the test-support module
`sampleRepository` (Decision Document) with its own test file. Nothing uses
it yet. Its tests prove: the clean environment drops every `GIT_*`
variable and `PR_TITLE`, blanks `GITHUB_HEAD_REF` and `GITHUB_REF_NAME`, and
applies the extras last; the git runner throws with git's standard error on
failure and returns trimmed standard output on success; a new sample
repository is on `main` with the sample author and no hooks; `commitFiles`
commits exactly the given files; `setOriginMain` points
`refs/remotes/origin/main` at `HEAD`; the gate-script set-up places
`package.json`, the scripts folder, the commitlint config and a
`node_modules` link in the folder, untracked.

**04 add run npm script test support.** Create the test-support module
`runNpmScript` with its own test file. Nothing uses it yet. Its tests
prove: an unknown script name throws naming the script; a known script runs
through the shell in the given folder with the clean environment and the
given extras, returning status, standard output, standard error and their
concatenation; the option to put the root `node_modules/.bin` first on the
PATH finds the variable whatever its case.

**05–10 use test support in the script tests.** One test file per step:
read branch range (05), check commits (06), check tickets (07), check pull
request (08), check data files (09), check docs drift (10). In each, delete
the file's local `cleanEnv`, `git`, `commit`, `commitFiles`,
`writeTreeFile`, `setOriginMain`, `runScript`, `ROOT` and `packageJson`
where present, and import the shared ones; replace the repeated
repository set-up in `beforeEach` with the shared set-up calls. Test names,
sample data and every `expect` stay as they are. Where a file's own variant
differs (the branch-range test's `commit` that takes paragraphs and returns
the hash; the docs-drift test's commit with inline `-c` identity), keep
behaviour identical by using the shared module's matching option, or keep
that one helper local and say why in a comment.

**11–13 use run npm script in the gate config tests.** One test file per
step: formatting (11), lint (12), layer rules (13). Replace the local
`runScript` (which puts the root `node_modules/.bin` on the PATH and returns
combined output) with the shared runner and its root-bin option, reading the
combined output field. Keep each file's own tree writers if they differ
from the shared one. No assertion changes.

**14 add run gate to report violations.** Add `runGate` to the
`reportViolations` module with tests: it awaits the given check, reports
its violations through `reportViolations` and sets `process.exitCode` to the
returned code; when the check throws, it writes the error's message (or the
thrown value as a string) as one line to standard error and sets exit
code 1. Nothing calls it yet.

**15–19 run each gate entry through run gate.** One entry per step: commit
gate (15), Ticket check (16), Pull-request check (17), data-file check (18),
docs-drift check (19). The `import.meta.main` block becomes one `runGate`
call whose check does exactly what the block did before. For 15–17 this
removes the hand-written `try`/`catch`; for 18 and 19 it adds the one-line
error output the other gates already have (Decision Document). The entry
tests stay green unchanged.

**20 extract commit header parsing from check tickets.** Create the module
`parseCommitHeader` with tests and move the Ticket check's `parseHeader`
and first-line cut into it. It exports `readCommitHeader` (the first line
of a message, trimmed as today) and `parseCommitHeader` (one header line to
`type`, `feature`, `ticket`, `description` and `red`, or undefined),
reading the header pattern and the field order from the commitlint
config's parser preset. The Ticket check calls
`parseCommitHeader(readCommitHeader(message))` and uses
`readCommitHeader` for the violation subject; it no longer imports the
commitlint config itself. Tests cover a Planning commit header, a Ticket
commit header, a `, RED` header, a header off the pattern, and a message
with a body.

**21 parse the pull request title header.** In the Pull-request check,
replace `HEADER_PATTERN.exec(title)?.[3]` with
`parseCommitHeader(title)?.ticket`, passing the title as it is (no trim, as
today), and drop its own import of the commitlint config.

**22 read the commit header in check commits.** In `lintCommitMessages`,
take the violation subject from `readCommitHeader` instead of the inline
first-line cut.

**23 move commit linting into its own module.** Move `lintCommitMessages`
and its unit tests from the commit gate's entry module into a new module
`lintCommitMessages`. The commit gate's entry, the Pull-request check and
the Pull-request check's tests import it from there. The commit gate's
entry-point tests stay in its test file.

**24 share commitlint config loading.** Add `loadCommitConfig(cwd)` to the
`lintCommitMessages` module (the `@commitlint/load` call with the root
`commitlint.config.js`), with a test that the loaded rules include
`header-format`. The commit gate's and the Pull-request check's entries call
it instead of `load` directly.

**25 add read branch name to read branch range.** Add `readBranchName(cwd,
env)` to the `readBranchRange` module: `resolveBranchName` over the given
environment and the current git branch. `readBranchRange` uses it. Tests:
the current branch of a sample repository when the GitHub variables are
empty, and `GITHUB_HEAD_REF` when it is set.

**26 use read branch name in check pull request.** The Pull-request check's
entry calls `readBranchName(cwd, process.env)` instead of composing
`resolveBranchName` with `runGit`. Steps 02's tests pin the result.

**27 move ticket status reading into read tickets.** Move the front-matter
and `status:` parsing (`FRONT_MATTER`, `STATUS_LINE`, `ticketStatus`) from
the Pull-request check into the `readTickets` module as
`readTicketStatus(content)`, with tests: `done`, `open`, `in-progress`, a
status line with the template comment, a file without front matter, and a
`status:` line outside the front matter. The Pull-request check imports it.

**28 rename pull request ticket and step checks.** In the Pull-request
check, rename the private `checkTickets` to `findUnfinishedTickets` and
`checkRefactorSteps` to `findUntickedRefactorSteps`, so that "Ticket check"
means only the gate. Comments follow.

**29 classify the pull request branch once.** In `checkPullRequest`, test
the branch against the Renovate pattern once and reuse the result for both
the branch rule and the title rule, instead of two `RENOVATE_BRANCH.test`
calls.

**30 rename feature folder path to verb first.** Rename
`featureFolderPath` to `buildFeatureFolderPath` in the `readFeatureFolders`
module, its test and its two callers.

**31 rename refactor plan path to verb first.** Rename `refactorPlanPath`
to `buildRefactorPlanPath` in the `readRefactorSteps` module, its test and
its two callers.

**32 rename check tickets helpers to verb first.** In the Ticket check,
rename the private `ticketReason` to `findReferenceProblem` (or another
verb-first name that says it returns the reason a reference fails).

**33 extract tracked folders in docs drift.** In the docs-drift check, move
the loop that collects every folder holding a tracked file out of
`findDocsDrift` into a private `collectTrackedFolders(trackedPaths)`.

**34 rename docs drift helpers to verb first.** In the docs-drift check,
rename `linesOutsideFences` to `readLinesOutsideFences` and `namedPaths` to
`collectNamedPaths`.

**35 extract endpoint resolution in branch protection.** Move the inline
`resolve` closure of the branch-protection entry into an exported pure
`resolveEndpoint(endpoint, nameWithOwner)` beside `planRulesetRequests`,
with tests: both placeholders replaced, and an endpoint without
placeholders unchanged. The entry calls it.

**36 rename git env helper to verb first.** In the `runGit` module, rename
the private `gitEnv` to `buildGitEnv`.

**37 rename gh helper to verb first.** In the branch-protection script,
rename the private `gh` to `runGh`.

**38 remove the obsolete scripts gitkeep.** Delete the `.gitkeep` in the
scripts folder, which now holds tracked modules. Verify that no doc names
it (the docs-drift check would fail).

## Decision Document

- **Scope.** The feature's own code: the gate scripts and their shared
  modules under the scripts folder, the commitlint config's consumers, and
  the tests in the gates folder. No gate file (CLAUDE.md "Ask first") and
  nothing under `.claude/` changes. The npm scripts in `package.json`, the
  commitlint config itself, the ESLint, Prettier, TypeScript, Vitest and
  dependency-cruiser configs, the workflow and the Ruleset stay as they are.
- **Behaviour.** Every gate keeps its verdict, its `<subject>: <reason>`
  lines and its exit codes (A9). The only visible difference: when the
  data-file or docs-drift entry crashes on an unexpected error (for
  example `git` missing), it now prints the error's message as one line
  and exits 1, as the other three gate entries already do, instead of
  Node's stack trace and exit 1. This is a deliberate alignment; the exit
  code is unchanged.
- **Test-support location.** The two shared test-support modules live in a
  `test-support` folder inside the scripts folder, one camelCase folder per
  module with its own test, as `docs/conventions.md` files every module.
  The gate config tests in the gates folder import from there. The layer
  rule `test-support-only-for-tests` already keeps them out of Shipping
  code, and the root TypeScript project already includes the scripts
  folder. No other location fits: there is no root `test-support/` in the
  folder structure, and the gates folder holds only gate tests.
- **`sampleRepository` module interface.** A clean environment builder
  (drops `GIT_*` and `PR_TITLE`, blanks `GITHUB_HEAD_REF` and
  `GITHUB_REF_NAME`, then applies extras); a git runner that throws on
  failure and returns trimmed output; a file writer that creates parent
  folders; `commit` (empty commit, optional extra paragraphs, returns the
  hash); `commitFiles` (writes, adds exactly those files, commits);
  `setOriginMain`; `initSampleRepository` (git init on `main`, the sample
  author `Sample Author <author@example.invalid>`, no signing, no hooks);
  and a set-up that places the gate scripts beside a sample repository
  (a `package.json` with `"type": "module"`, a copy of the scripts folder
  and the commitlint config, and a junction to the root `node_modules`).
  Blanking the GitHub variables everywhere is safe: the tests that did not
  blank them never read a branch.
- **`runNpmScript` module interface.** Runs the command of a root
  `package.json` script through the shell in a folder, with the clean
  environment plus extras, and optionally the root `node_modules/.bin`
  first on the PATH; returns status, stdout, stderr and their
  concatenation as `output`; throws for an unknown script.
- **`runGate`.** Lives in the `reportViolations` module, the one place
  that owns gate output (I2). It takes a function returning violations or
  a promise of them, and sets `process.exitCode`. It does not call
  `process.exit`. The branch-protection script is not a gate and keeps its
  own error handling.
- **`parseCommitHeader` module.** A new module, the only reader of the
  header pattern outside the commitlint config (A7 stays: the pattern and
  the field order still live only in the config). It maps capture groups
  to names through the config's `headerCorrespondence`, so no caller uses a
  group index. The config's `scope` field is exposed as `feature` and
  `subject` as `description`, the words of the ubiquitous language.
  `readCommitHeader(message)` cuts and trims the first line, as the
  callers do today; `parseCommitHeader(header)` does not trim, so the
  Pull-request check's title is parsed exactly as before.
- **`lintCommitMessages` module.** Holds `lintCommitMessages(messages,
  config)` (unchanged signature) and `loadCommitConfig(cwd)`. Gate entry
  modules then import only shared modules, never each other.
- **`readBranchRange` module.** Gains `readBranchName(cwd, env)`;
  `resolveBranchName` stays exported and unchanged. `BranchCommit` keeps
  its `hash`, which its tests use.
- **`readTickets` module.** Gains `readTicketStatus(content)`, returning
  the raw status word or undefined, exactly as the Pull-request check's
  private function does today.
- **Renames.** Verb first, per `docs/conventions.md` (Naming):
  `featureFolderPath` → `buildFeatureFolderPath`, `refactorPlanPath` →
  `buildRefactorPlanPath`, `ticketReason` → a verb-first name,
  `linesOutsideFences` → `readLinesOutsideFences`, `namedPaths` →
  `collectNamedPaths`, `gitEnv` → `buildGitEnv`, `gh` → `runGh`; inside
  the Pull-request check, `checkTickets` → `findUnfinishedTickets` and
  `checkRefactorSteps` → `findUntickedRefactorSteps`. Module folders keep
  their names.
- **Commit type.** Every step, the test-only steps 01–13 included, is a
  `refactor:` commit carrying its step number, so the Ticket check finds it
  in this plan.

## Testing Decisions

- A good test checks external behaviour: a gate's verdict, its violation
  lines and its exit code; a module's return value for given inputs. It
  never asserts on private helpers, call order or how a module is wired.
- Existing tests keep every assertion. A step changes a test file only to
  follow a move or a rename of what it imports, to switch to the shared
  test support (05–13), or, in 01 and 02, to add the missing entry-point
  tests against the current behaviour.
- New modules get their own test file beside them: `sampleRepository`,
  `runNpmScript`, `parseCommitHeader`, `lintCommitMessages` (its tests
  moved from the commit gate). New functions in existing modules get tests
  in that module's file: `runGate`, `readBranchName`, `readTicketStatus`,
  `resolveEndpoint`, `loadCommitConfig`.
- Prior art: the pure-core tests with in-memory tracked paths and a
  `readFile` stub in the Ticket check and Pull-request check tests; the
  entry-point tests that run the npm script in a temporary git repository
  in the commit gate, Ticket check and data-file check tests; the
  console-spy tests of `reportViolations`; the temporary-repository tests
  of `runGit` and `readBranchRange`.
- Tests stay deterministic and use invented data only: the sample author,
  `example.invalid` addresses, sample feature names.

## Out of Scope

- **Docs-drift link to the repository root (bug, not refactor).** Ticket
  13's Notes: a link that normalises to the repository root, such as
  `[x](../)` from `docs/`, is reported as missing, because the root
  normalises to `.` and the folder set never holds `.`. Fixing it changes
  the gate's verdict, so it needs its own ticket with a RED test, not a
  refactor step.
- **Design.** This feature has no prototype part (design log, Background);
  nothing in `docs/design/` applies, so there is no design bug to list.
- **Money.** The feature holds no money math.
- The commitlint config's grammar and rules, the gate wiring in
  `package.json`, the CI workflow, the Ruleset and CODEOWNERS: gate files,
  unchanged.
- Gates assigned to later features by `docs/quality-gates.md` (Rollout).
- The gate config tests' own assertions and samples (formatting, lint,
  layer rules, commit messages, ruleset, CODEOWNERS, PR template, Claude
  folder guard): only the npm-script runner is shared (11–13).
- Checking that the live Ruleset matches the committed file (design log,
  Trade-offs).

## Further Notes

For the human; none of these is a step, because each touches a gate file,
`.claude/` or a decision the design log leaves to the human.

- **Gate scripts are not on the "Ask first" list.** The design log (Trade-
  offs, out of scope by decision) leaves adding `commitlint.config.*` and
  `scripts/check*` to CLAUDE.md's "Ask first" to the human. Until then this
  plan may change the gate scripts' internals unasked, as it does in steps
  14–29. If they should be protected, add them before the refactor loop
  runs; the plan would then need the human's go.
- **The Claude-folder guard blocks read-only commands.** While planning,
  the hook refused a Bash `cat` of a skill file under `.claude/` ("Bash
  command naming .claude/"); the Read tool worked. Agents that read skills
  through Bash will hit the same refusal. Whether reads should pass is a
  change to the hook under `.claude/` and its gate test.
- **Design-log Files table.** It still lists the root config tests
  (`eslint.config.test.ts` and others); the Implementation Results record
  their move to the gates folder. The design log is immutable, so nothing
  changes there; the note is only so the drift does not surprise a reader.
- **The docs-drift check reads only top-level docs.** Paths named in
  feature folders (PRDs, plans, tickets, refactor plans) are never checked.
  That is the gate as specified (ubiquitous language, **Docs drift**); a
  wider scope would be a new ticket.
