# 05 gate-maintenance: refactor plan

## Problem Statement

The gate-maintenance feature is merged: the **App protocol** serves only the
host `dashcash`, a **Quarantine pattern** leaves out tagged tests and tests in
subfolders on either platform, Renovate builds its titles from the
**Commit-message parts** and keeps three **Hold rules**, the **Gate wiring**
is split into ten gate folders with their **Problem finders**, the **Audit**
and the **Quarantine check** share the **Entry date rules** and take today as
a parameter, `npm ci` installs the **Electron binary**, the dev **Debug port**
is movable, the **Break threshold** is 83 and the **Dangerous-git hook**
blocks chained pushes.

Most of that code is gate files: everything under `gates/`, the Playwright
and Stryker configs, the workflows, the npm scripts and the hook under
`.claude/`. No **Refactor step** may change those (`CLAUDE.md`, "Ask first"),
so what this plan can move is the feature's code outside them: the main
process's protocol, debug port and startup modules, the shared modules in
`scripts/` and `README.md`. Read against `CLAUDE.md`, `docs/conventions.md`
and `docs/ubiquitous-language.md`, that code shows:

- **Problems flagged in the tickets' Notes.** None names a refactor. Ticket
  13 notes that `startApp` calls `enableDebugPort` before `app.setPath`, "so a
  failed start leaves nothing behind, not even the `userData` path", and that
  "the RED tests leave this open": no test pins it. Ticket 14 notes the same
  chaining gap for `git commit` in the **Dangerous-git hook**, which is under
  `.claude/` (Further Notes). Tickets 01, 03, 05 and 08 record a design-log
  deviation, a manual step and test counts. The design log's Implementation
  Results (D1 to D4) are decisions already built, not findings.
- **One name spelled twice, one result without a name.** The **Debug port**
  module spells `DASHCASH_DEBUG_PORT` once in the lookup and again in its
  cause, and returns an anonymous `{ cause: string } | undefined`. Its sibling
  for the **Data folder** names its variable once (`OVERRIDE_VARIABLE`) and
  exports its failure type (`DataFolderFailure`).
- **A misleading name.** `startApp` keeps the debug port module's result in
  `debugPort`, which reads as a port but holds only a failure or nothing.
- **Two rules in one block.** `resolveRendererPath` now decides two things
  inside one `try`: whether the URL is for the host `dashcash` at all (host,
  port, user info) and which path it asks for; then, outside it, whether that
  path stays in the renderer folder. The host rule is written into the
  parsing step rather than standing as its own step.
- **Comment drift.** `serveAppProtocol`'s comment runs one line far past the
  width of every other comment (the host words were inserted without
  rewrapping), and the protocol module's header still describes the protocol
  as 04 left it, without the host rule the glossary's updated **App
  protocol** now states.
- **Docs drift.** The Getting started block of `README.md` aligns the comment
  of `npm ci` one column left of the others.

## Solution

Behaviour-preserving moves, one module at a time:

1. Pin the one behaviour a later step touches and no test pins yet: an
   invalid `DASHCASH_DEBUG_PORT` leaves the `userData` path unchanged.
2. Name the debug port's variable once and export its failure type, as the
   **Data folder** module does.
3. Rename `startApp`'s holder of that result after what it holds.
4. Separate the protocol module's host rule from its path rules with one
   private reader, and bring its comments up to date.
5. Align the README's Getting started comments.

Every module keeps its observable behaviour: every refused and served URL,
the 404 path, the **Startup error** texts, the startup order of the 05 plan
(Data folder, Debug port, Single-instance lock, sandbox and scheme, then the
rest once ready) and "Start the app". No module under `scripts/` changes, so
every gate keeps its lines, order and exit codes.

## Commits

Each **Refactor step** is one `refactor:` commit with the step's number and
description. Run `npm run verify` before committing; every step must leave it
green. Steps 02 to 06 change main-process code that "Start the app" drives,
so they also run `npm run verify:full`. No step changes `scripts/` or
`gates/`, which Stryker mutates, so no step needs a **Mutation run**; the
**Break threshold** stays 83.

- [x] 01 pin user data on an invalid debug port
- [x] 02 name the debug port variable once
- [x] 03 name the debug port failure type
- [x] 04 rename the debug port result in start app
- [x] 05 split the app host rule from the path rules
- [x] 06 update the app protocol comments
- [ ] 07 align the getting started comments

### What each step does

**01 pin user data on an invalid debug port.** In the `startApp` tests, in
the "Debug port" block, extend the `it.each` "ends an invalid
DASHCASH_DEBUG_PORT in dev in the Startup error with the resolved Data
folder, …" (both rows: `DASHCASH_DATA_FOLDER` unset and an absolute path).
Before and after `await fake.ready()`, add
`expect(fake.pathChanges).toEqual([])` and
`expect(fake.app.getPath('userData')).toBe(userData)`, so the overridden
row proves that the override never reaches `app.setPath`. Add "no userData
change," to the title's list after the colon. Only assertions are added; the
test passes against the current code, where `startApp` returns before
`app.setPath`. No production code changes.

**02 name the debug port variable once.** In the **Debug port** module, add
the constant `PORT_VARIABLE = 'DASHCASH_DEBUG_PORT'`, read the variable as
`env[PORT_VARIABLE]` and build the cause from it and `MAX_PORT`:
`` `${PORT_VARIABLE} must be a whole number from 1 to ${String(MAX_PORT)}.` ``,
the same text to the character. The module's tests and the `startApp` tests
keep their literal cause and stay green unchanged.

**03 name the debug port failure type.** In the same module, export
`DebugPortFailure = { cause: string }`, as `resolveDataFolder` exports
`DataFolderFailure`, and declare `enableDebugPort`'s return type as
`DebugPortFailure | undefined`. Nothing else changes; the tests stay green
unchanged.

**04 rename the debug port result in start app.** In `startApp`, rename the
local `debugPort` to `debugPortFailure`, in its declaration, its
`!== undefined` check and its `.cause`. The call order and the
**Startup error** call stay as they are; the `startApp` tests stay green
unchanged.

**05 split the app host rule from the path rules.** In the protocol module, add the
private function `readRequestedPath(url)`: it parses the URL, returns
`undefined` when the host is not exactly `dashcash` or the URL holds user
info, and otherwise returns the decoded path without its leading `/`; a URL
that does not parse and a path that does not decode (`decodeURIComponent`
throws) also give `undefined`, through the same `try`/`catch` that holds them
today. Give it a one-line comment. `resolveRendererPath` calls it first and
returns `undefined` when it does, then applies its path rules (backslash,
leading `/`, drive prefix, outside the folder) exactly as today. Its export,
signature and comment stay. The `REFUSED_URLS` table, the user-info test, the
served cases and the handler's 404 tests stay green unchanged.

**06 update the app protocol comments.** Comments only, in the protocol
module. Rewrap `serveAppProtocol`'s comment to the width of the module's
other comments, keeping its words: it registers the handler that serves the
renderer folder to the host `dashcash` and answers 404 for another host and
for any path outside the folder; Electron requires the app to be ready
first, and the caller decides when. In the module's header comment, say that
the protocol serves the built renderer folder to the host `dashcash` only and
nothing else, as the glossary's **App protocol** now reads, and cite both
sources: 04 design log Q16 and 05 design log Q5 to Q7 (the test file's header
already cites the latter).

**07 align the getting started comments.** In `README.md`, Getting started,
add one space before the `#` of the `npm ci` line so its comment starts in
the same column as the other four. No wording changes. Run
`npm run verify`, whose formatting gate checks `README.md`.

## Decision Document

- **Scope.** The feature's own code outside the gate files: the main
  process's protocol, debug port and startup modules with their tests, and
  `README.md`. No gate file changes (`CLAUDE.md`, "Ask first"): nothing under
  `gates/` (the ten wiring folders, their **Problem finders**, the Renovate,
  end-to-end and dangerous-git tests, `gates/test-support/`), not the
  Playwright or Stryker config, not the workflows, not the npm scripts, not
  `quality/`. Nothing under `.claude/` changes, the **Dangerous-git hook**
  included.
- **`scripts/` stays as it is.** Its modules of this feature
  (`readWorkflow`, `readQuarantine`, `reportViolations`,
  `findEntryDateProblems`, `checkQuarantine`, `checkAudit`) are imported by the
  gate files above; the ones that drift (Further Notes) can only change
  together with their importers. The rest hold no finding worth a step.
- **`renovate.json` stays as it is.** It is configuration the Renovate gate
  pins word for word through its assembled titles and hold checks; there is
  nothing to move without changing what Renovate does.
- **Behaviour.** Every URL `resolveRendererPath` refuses or serves today, the
  handler's single 404 path, the cause `DASHCASH_DEBUG_PORT must be a whole
  number from 1 to 65535.`, the **Startup error** box with the resolved
  **Data folder**, and the startup order of the 05 plan's header hold after
  every step. "Start the app" stays green unchanged.
- **The Debug port module mirrors the Data folder module.** One constant
  names the environment variable and builds the cause; the failure is an
  exported, named type. The port rule stays inside `enableDebugPort`: a
  separate reader for one pattern and one bound would be a shallower module
  than the one it leaves, and the rule is tested through `enableDebugPort`'s
  tables.
- **The protocol's host rule is its own step, not its own module.**
  `readRequestedPath` stays private in the protocol module, which owns
  `HOST` and the scheme; `resolveRendererPath` stays the one exported
  function that decides every refusal (design log Q6), and the module still
  imports nothing from `matchAppOrigin/` (its guard test stays).
- **Renames.** `debugPort` becomes `debugPortFailure`, after the type of
  step 03. Domain terms keep the glossary's words: **Debug port**,
  **Startup error**, **Data folder**, **App protocol**.
- **Commit type.** Every step, the test-only step 01 and the README step 07
  included, is a `refactor:` commit with its step number, so the **Ticket
  check** finds it in this plan.

## Testing Decisions

- A good test checks external behaviour: what a main-process module does
  with the fake Electron objects it is given (switches appended, error
  boxes, path changes, startup calls), the path or `undefined` a URL
  resolves to, the status the handler answers, and what "Start the app" sees
  in the **App build**. It never asserts on private helpers such as
  `readRequestedPath`.
- Coverage is enough to refactor. `resolveRendererPath` and the handler are
  driven by one refused-URL table (host, port, empty and upper-case host,
  `..`, encoded `..`, absolute paths, other drives) plus the user-info test
  and the served cases. `enableDebugPort` has tables for every valid and
  invalid value in dev and every non-dev case. `startApp` pins the startup
  order with a valid port and the **Startup error** with an invalid one. The
  one gap is that an invalid port leaves `userData` unchanged (ticket 13,
  Notes); step 01 closes it against the current behaviour before steps 02
  to 04 touch the debug port and its caller.
- Existing tests keep every assertion and their own literals (the cause text,
  `app://dashcash/index.html`), so they stay independent of the code, as the
  04 refactor decided. Step 01 only adds assertions.
- No new module is created, so no new test file. Private helpers get no
  tests of their own; their module's tests cover them.
- Prior art: the `startApp` tests on `createFakeElectron` (`pathChanges`,
  `startupCalls`, `errorBoxes`), the "Data folder" block's relative-path test
  that already asserts `pathChanges` stays empty, and the protocol module's
  `REFUSED_URLS` table.
- Tests stay deterministic, offline and use invented data only: invented
  folders, URLs and port values.

## Out of Scope

- **Design.** This feature has no prototype part (design log, Background):
  it is gate and shell maintenance, and no screen, component or story
  changed. There is no design bug to list.
- **Money.** The feature holds no money math.
- **Behaviour changes.** The `git commit` chaining gap of ticket 14's Notes,
  describe titles in the **Quarantine** (design log Q9), a pin that the
  **Break threshold** only rises, Stryker's `high` and `low` (Q31), the
  reviewer's DevTools configuration (Q29) and the `node:sqlite` probe's
  place: each changes behaviour or a gate and needs a ticket.
- **The manual steps after the merge** (design log Q36, ticket 14's
  Handover): checking the first **Renovate PRs**' titles and a fresh clone's
  `npm ci`. They are checks, not code.
- Every gate file named in the Decision Document, and every module of 01 to
  04 the feature did not write.

## Further Notes

For the human. None of these is a step, because each touches a gate file,
`.claude/` or code of another feature.

- **The shared workflow readers are named as nouns.** `scripts/readWorkflow/`
  exports `workflowFiles`, `triggers`, `jobSteps`, `stepIndex`,
  `jobCommands`, `chainedCommands` and `jobsRunning`, against
  `docs/conventions.md`'s "Functions, modules: camelCase, verb first" (they
  kept the names they had inside the old wiring test). Verb-first names
  would be, for example, `listWorkflowFiles`, `readTriggers`,
  `readJobSteps`, `findStepIndex`, `readJobCommands`,
  `splitChainedCommands` and `listJobsRunning`. Every **Problem finder** and
  wiring test under `gates/` imports them, so the rename is a gate change;
  a ticket naming those files could do it in one move. `chainedCommands`
  splits npm scripts, not workflows, and only `gates/verifyScripts/` uses
  it; the same ticket could move it beside that test.
- **The gitleaks step is known in two finders.** `GITLEAKS_ACTION` is
  defined in both `gates/dailyMutation/` and `gates/secretScan/`, and
  `isGitleaksStep`, the **Secret scan**'s concept, lives in the daily
  mutation finder and repeats what `stepIndex(steps, GITLEAKS_ACTION) !== -1`
  says. Moving it into the secret scan module and importing it from there
  would leave one owner. Gate files.
- **The Renovate gate reads its package rules three times.**
  `gates/renovate/renovate.ts` filters `packageRules` with `isRecord` in
  `findGroupViolations`, `listOpeningScopes` and `findPartViolations`, and
  builds the same `fail` closure in four functions. One reader for the rules
  would shorten all three. Gate file.
- **The Electron install finder walks jobs by hand.** It loops over every
  workflow's jobs and steps itself, where the shared readers already list a
  job's steps. Small; gate file.
- **A cycle rule would replace a source-reading guard.** The protocol
  module's test reads its own source with a regular expression to prove it
  imports nothing from `matchAppOrigin/` (ticket 01). dependency-cruiser has
  no `no-circular` rule; one would prove this for every module and let the
  guard go. The guard stays until then. The dependency-cruiser config is a
  gate file.
- **The Dangerous-git hook and `git commit`.** Ticket 14's Notes:
  `git switch main && git commit` passes the commit check, because the hook
  reads the branch before the switch; a rule "a commit as its own command",
  like the one for `git push`, would close it. It is under `.claude/`, which
  only the human changes.
- **Considered and left as they are.** The **Audit** and the **Quarantine
  check** entries both pass `new Date().toISOString().slice(0, 10)` as today;
  design log Q23 names that expression, and a shared module for one line
  would add a folder for nothing. `loadQuarantine` and `checkAudit` both write
  `cannot be read as JSON: …`, and each has its own `buildEntryViolation`
  with its own file as subject; both predate this feature (02 and 04), and
  the **Quarantine** reader's shape is pinned by the `endToEnd` gate test.
  `findQuarantineViolations` still reads each entry twice, kept by the 04
  refactor (step 11) for the pinned order of its lines. `checkQuarantine`'s
  date reader falls back to `NaN` for dates the reader already checked; the
  fallback keeps the types honest without a non-null assertion.
  `renovate.json` repeats `commitMessageExtra: ""` and
  `commitMessageSuffix: ""` in every scope on purpose: design log Q13 and the
  gate require each PR-opening scope to set them itself.
