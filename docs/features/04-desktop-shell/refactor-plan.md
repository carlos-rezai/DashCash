# 04 desktop-shell: refactor plan

## Problem Statement

The desktop-shell feature is merged and the shell works: one secure window
served through the **App protocol**, the **Bridge** with its **Sender
check**, the **Data folder** with its migrated **Database**, the
**Single-instance lock**, the **Debug port**, the **App fixture** with "Start
the app", and the **Quarantine** with its **Quarantine check**. Its code grew
one ticket at a time and shows it:

- **Problems flagged in the tickets' Notes.** The Notes name nothing to
  refactor in the feature's code. Ticket 01's Electron binary download was
  settled by ticket 17 (design log D3). Ticket 14 asks for a configurable or
  less common **Debug port**, which is a change of behaviour, not a refactor
  (Out of Scope). The other Notes record hand checks, licences and mutation
  scores.
- **One fact spelled in three modules.** The **App protocol**'s identity is
  written out three times: the scheme `app` in the protocol module, the
  origin `app://dashcash` in the origin matcher, and the page URL
  `app://dashcash/index.html` in the window module. A change to one would
  leave the others serving, trusting or loading a different origin.
- **A disguised dependency.** `startApp` hands the protocol module an
  invented `app` whose `whenReady` is really "the **Database** is open". The
  module reads as if it waited for Electron, while it waits for the
  **Database**. The timing rule lives in two places, half in the protocol
  module and half in `startApp`.
- **A long orchestration.** `startApp` creates the **Data folder**, joins the
  **Database** file name, picks the **Migration** list and opens the
  **Database** inline, between the **Single-instance lock** and the window.
  It is the only module of main that knows the file name `dashcash.db` and
  imports the file system for it.
- **A weaker seam than it needs.** The **Bridge**'s factory takes the
  channel guard as a parameter, although the guard is the **Contract**'s and
  imports no Electron (design log A1 injects only Electron objects). Any
  caller could hand it a looser guard. The IPC registration, its twin in
  main, reads the **Contract**'s list itself.
- **A round trip.** The **Quarantine check** recovers each well-formed entry
  by wrapping it in a one-element array and reading the whole **Quarantine**
  again, because the **Quarantine** reader offers no way to read one entry.
- **Naming drift.** Three private functions are nouns where
  `docs/conventions.md` asks for verb first: `storedVersion` in the
  migration runner (which also avoids the term **Schema version**),
  `originKey` in the origin matcher and `appEnvironment` in the **App
  fixture**. The fixture's comment cites design log Q38 (the Playwright
  settings) where it means Q39 (the harness).

## Solution

Behaviour-preserving moves, one module at a time:

1. Pin the one behaviour a later step relies on and no test pins yet: the
   order of the **Quarantine check**'s violations.
2. Let the **Bridge** read the **Contract**'s channel guard itself.
3. Give the **App protocol**'s identity one owner, the protocol module, and
   have the origin matcher and the window module take it from there.
4. Split the protocol module into the scheme registration (before ready) and
   the handler (once the **Database** is open), and call both from
   `startApp`, which already owns the startup order.
5. Move opening the **Database** in the **Data folder** into one function in
   `main/db/`, then have `startApp` call it.
6. Rename the noun-named helpers verb first.
7. Let the **Quarantine** reader read one entry, and use that in the
   **Quarantine check**.

Every module keeps its observable behaviour: the startup order of the design
log, every error text of A5 and A6, the **Quarantine check**'s lines and their
order, and its exit codes. "Start the app" stays green unchanged.

## Commits

Each **Refactor step** is one `refactor:` commit with the step's number and
description. Run `npm run verify` before committing; every step must leave it
green. Steps 02 to 07 and 12 change code that "Start the app" drives, so they
also run `npm run verify:full`. After step 11, run `npm run test:mutation`:
the **Mutation score** must stay at or above the **Break threshold** of 81.

- [x] 01 pin the quarantine check violation order
- [x] 02 use the contract channel guard in the bridge
- [x] 03 take the app origin from the app protocol
- [x] 04 build the window page url from the app origin
- [x] 05 split the app protocol handler from its scheme
- [ ] 06 add the data folder database module
- [ ] 07 use the data folder database in start app
- [ ] 08 rename stored version to read schema version
- [ ] 09 rename origin key to read origin key
- [ ] 10 export the one-entry quarantine reader
- [ ] 11 use the one-entry reader in check quarantine
- [ ] 12 rename the app fixture environment builder

### What each step does

**01 pin the quarantine check violation order.** In the **Quarantine
check**'s tests, add one test to the "several causes" block that calls
`findQuarantineViolations` with a mix of entries, for example one with an
empty `title`, one expired entry whose `file` is not tracked, and one with an
empty `owner`, and expects the result with `toEqual`, in order. Today's
order is: first the shape violations of every entry, in entry order (the text
fields `file`, `title`, `ticket`, `owner`, then the dates `added`, `expires`);
then, for each well-formed entry in entry order, its date violations (`added`
later than today; `expires` before `added` or more than 30 days after it;
expired) followed by its path violations (`file`, then `ticket`). The
existing `expectViolations` helper ignores order, so it is not used here.
Only a new test; it passes against the current code.

**02 use the contract channel guard in the bridge.** `createBridge` takes
only `invoke` and imports `isChannel` from the **Contract** itself, as
`registerIpcHandlers` imports `CHANNELS`. The **Preload** entry passes only
the `invoke` that wraps `ipcRenderer.invoke`. In the Bridge's tests, drop
the second argument from every call. Replace the test "refuses whatever the
isChannel it is given refuses, even a listed Channel", whose parameter no
longer exists, with "forwards every Channel of the Contract": an `it.each`
over `CHANNELS` that each reaches `invoke`. Every other assertion stays.

**03 take the app origin from the app protocol.** The protocol module
exports `APP_ORIGIN`, built from its scheme constant and the host
`dashcash`, so it reads `app://dashcash` as today. The origin matcher deletes
its own constant and imports it. The matcher's tests keep their literals and
stay green unchanged.

**04 build the window page url from the app origin.** The window module
builds its page URL from the imported `APP_ORIGIN` and `/index.html`
instead of its own literal. The window's tests and "Start the app" keep the
literal `app://dashcash/index.html` and stay green unchanged.

**05 split the app protocol handler from its scheme.** In the protocol
module, `registerAppProtocol(protocol)` only registers the privileged,
standard, secure scheme, to be called before ready. A new
`serveAppProtocol({ protocol, net }, rendererFolder)` registers the handler
with the path check and the 404, to be called once the **Database** is open.
The module's Electron type loses its `app`. In `startApp`, call
`registerAppProtocol` where it is called today, and call `serveAppProtocol`
as the first line of the callback that runs once the **Database** is open,
before the session is hardened. The invented `{ whenReady: () =>
dataFolderReady }` goes. The order is unchanged: the handler was already
registered first when that promise settled. Update the comment above
`startApp` to the new wording. In the protocol module's tests, the scheme
tests call `registerAppProtocol` and the serving and 404 tests call
`serveAppProtocol`; the "registers no handler before the app is ready" test
becomes "registers no handler" for `registerAppProtocol`. The `startApp`
tests stay green unchanged: the startup order, the handler once ready, and no
handler after a failed **Data folder** or **Database**.

**06 add the data folder database module.** Create the module
`openDataFolderDatabase` in `main/db/`, with its own test file. It exports
`openDataFolderDatabase(folder)`: it creates the **Data folder** with its
parents when missing, opens `dashcash.db` in it with the committed
**Migrations** through `openDatabase`, and returns the connection; a failure
throws with its cause, as `openDatabase` does. It owns the file name as a
constant. Its tests, against real SQLite in a temporary folder: a missing
folder and its parents are created and hold `dashcash.db`; an existing folder
keeps what it holds; the **Schema version** is the number of committed
**Migrations**; a `dashcash.db` that is not SQLite throws SQLite's message,
leaves the file as it was and the connection closed (prior art: the
connection watch in `main/db/`'s test support). Nothing uses it yet.

**07 use the data folder database in start app.** In `startApp`, replace the
inline folder creation, path join and `openDatabase` call with
`openDataFolderDatabase(dataFolder.folder)`. Its imports of the file system's
`mkdirSync`, of `openDatabase` and of the **Migration** list go. The
`try`/`catch` around it, the **Startup error** and the close on `will-quit`
stay. The `startApp` tests stay green unchanged.

**08 rename stored version to read schema version.** In the migration
runner, rename the private `storedVersion` to `readSchemaVersion`, together
with its caller.

**09 rename origin key to read origin key.** In the origin matcher, rename
the private `originKey` to `readOriginKey`, together with its callers.

**10 export the one-entry quarantine reader.** In the **Quarantine** reader,
add the exported `readQuarantineEntry(value, index)`. It returns
`{ entry }` for a well-formed entry and `{ problems }` with that entry's shape
violations otherwise; a value that is not an object reads as an empty entry,
as today. `readQuarantine` calls it in its loop instead of reading each
entry inline. Add two tests beside `readQuarantine`'s: a well-formed value
gives its entry, and a value with an empty field gives its violation under
the index it was given. The reader's existing tests stay green unchanged.

**11 use the one-entry reader in check quarantine.** In
`findQuarantineViolations`, replace `readQuarantine([value]).entries` with
`readQuarantineEntry(value, index)` and judge the dates and paths only when it
gives an entry. The first pass through `readQuarantine` for the shape
violations stays, so step 01's order holds. The **Quarantine check**'s tests
stay green unchanged. Then run `npm run test:mutation`.

**12 rename the app fixture environment builder.** In the **App fixture**,
rename `appEnvironment` to `buildAppEnvironment`, together with its caller,
and correct the comment's citation from design log Q38 to Q39. Run
`npm run verify:full`.

## Decision Document

- **Scope.** The feature's own code: main's modules and their tests, the
  **Preload**, the **Contract**'s use by the **Bridge**, the **App fixture**,
  and the **Quarantine** reader and **Quarantine check** with their tests. No
  gate file (CLAUDE.md, "Ask first") changes: not the Playwright config, not
  the dependency-cruiser config, not the workflows, not `quality/`, not the
  npm scripts, not the tests under `gates/`. Nothing under `.claude/`
  changes.
- **Behaviour.** The startup order of the design log (Design, startup order)
  holds after every step, and the `startApp` tests that pin it do not change.
  Every error text of A5 and every **Quarantine check** line of A6 keeps its
  wording; the **Quarantine check** keeps its line order (step 01) and exit
  codes.
- **The App protocol owns the App origin.** The protocol module defines the
  scheme and so the origin; the origin matcher and the window module import
  `APP_ORIGIN` from it. The dev server's origin stays where it is, derived
  from `readDevServerUrl`. Tests and test support keep their own literals, so
  they stay independent of the code (as the 02 refactor kept
  `supply-chain`).
- **The startup order lives in `startApp` alone.** After step 05 the
  protocol module states what Electron requires (scheme before ready,
  handler after it) and takes no readiness promise; `startApp` decides when
  each part runs, as it already does for the session, the IPC handlers and
  the window. The module's name stays `registerAppProtocol`, the export
  that registers the scheme, and the module also exports `serveAppProtocol`
  and `resolveRendererPath`.
- **`openDataFolderDatabase` lives in `main/db/`.** It opens SQLite through
  `openDatabase`, and it owns the **Database**'s file name and the choice of
  the committed **Migration** list, which `startApp` no longer needs to know.
  `startApp` keeps no type from `node:sqlite`, so the SQLite **Layer rule**
  holds. The **Startup error** stays in `startApp`, which owns the dialog
  and the quit.
- **The migration runner's error text keeps its literal `dashcash.db`.** It
  is user-facing copy fixed by A5 and pinned by its tests; importing the
  file name there would make the runner depend on the module that calls it.
- **The Bridge reads the Contract's guard.** `createBridge(invoke)` keeps
  `invoke` as a parameter, because it is Electron's (A1), and imports
  `isChannel`, which is not. The refusal text `Unknown channel: <channel>`
  and the rejected promise stay.
- **`readQuarantineEntry`.** It is exported from the **Quarantine** reader,
  which owns the entry's shape. `readQuarantine` keeps its signature and its
  result, so the Playwright config and the `endToEnd` gate test, both gate
  files, see no change.
- **Renames.** Verb first, per `docs/conventions.md` (Naming):
  `storedVersion` becomes `readSchemaVersion`, `originKey` becomes
  `readOriginKey`, `appEnvironment` becomes `buildAppEnvironment`. The fake
  Electron's private helpers keep their names, as the 01 and 02 refactors
  left test helpers.
- **Commit type.** Every step, the test-only step 01 included, is a
  `refactor:` commit with its step number, so the **Ticket check** finds it
  in this plan.

## Testing Decisions

- A good test checks external behaviour: what a module does with the fake
  Electron objects it is given, a gate's violations and exit code, the
  **Database** a real SQLite connection sees, or what "Start the app" sees in
  the **App build**. It never asserts on private helpers or how a module is
  wired inside.
- Coverage is enough to refactor. The `startApp` tests pin the startup order,
  the protocol handler once ready, the **Database** and **Data folder**
  failures with no handler, protocol or window, and the close on `will-quit`.
  The protocol, origin, window, Bridge, migration and **Quarantine** modules
  each have table tests, and "Start the app" covers the whole path. The one
  gap is the order of the **Quarantine check**'s violations, which no test
  pins (its helper ignores order and the entry tests sort the lines). Step 01
  closes it against the current behaviour before step 11 moves code.
- Existing tests keep every assertion, except where a step changes a
  module's interface: step 02 drops the guard argument and replaces the one
  test about a given guard with one over the **Contract**'s Channels; step
  05 points the protocol tests at the function that now does each part.
- New modules and exports get tests: `openDataFolderDatabase` its own file
  (step 06), `readQuarantineEntry` two tests beside `readQuarantine` (step
  10). Renamed private functions get none; their module's tests cover them.
- Prior art: the `startApp` tests on `createFakeElectron` and the connection
  watch; `openDatabase`'s tests against real SQLite in a temporary folder;
  the **Quarantine check**'s `entry`, `onEntry` and `expired` builders.
- Tests stay deterministic, offline and use invented data only: invented
  paths, versions and entries, fixed dates in the cores.

## Out of Scope

- **A configurable or less common Debug port** (ticket 14 Notes). Another
  program held 9222 on the developer's machine, so the debug server did not
  open. Making the port configurable or moving it changes behaviour and the
  design log's Q36, so it needs a ticket.
- **The App protocol serves any host.** The handler checks the path, not the
  host, so `app://other/index.html` is served like `app://dashcash/index.html`.
  The origin matcher still refuses such a page as a sender or navigation
  target, so the IPC and navigation guards hold. Refusing other hosts
  changes behaviour; if wanted, it is a ticket.
- **Design.** This feature has no prototype part (design log, Background).
  The facts it takes from the prototype hold: the window and page title
  "DashCash", the content size of 1440 × 900 from the reference viewport,
  and `dashcash.db` in the **Data folder**. There is no design bug to list.
- **Money.** The feature holds no money math.
- The Playwright config, the dependency-cruiser config, the tsconfig files,
  the workflows, `quality/`, the npm scripts, the tests under `gates/` and
  the electron-vite config: unchanged.
- The audit check and every module of 01 to 03 the feature did not write.

## Further Notes

For the human. None of these is a step, because each touches a gate file,
another feature's code or a decision the design log leaves to the human.

- **The Playwright config repeats a sequence the reader could own.** The
  config loads the **Quarantine**, reads it, throws its violations and builds
  the patterns, and formats the `<subject>: <reason>` lines with its own
  `throwViolations`, which the shared gate reporter already writes out. One
  exported function in the **Quarantine** reader (load, read, throw, build)
  would leave the config one call. The config is a gate file, and the
  `endToEnd` gate test pins it; say so if you want it as a step or a ticket.
- **The Quarantine check's entry test reads the real clock.** The entry takes
  today from `new Date()`, so its tests place their dates around `Date.now()`
  (`utcDate`), against CLAUDE.md's "fixed clock". The cores take today as a
  parameter and are fixed. A clock seam for the entry (for example an
  environment variable read only in tests) is a change to the gate's
  interface; the audit check's entry also reads `new Date()`. A ticket, if
  wanted.
- **Two gates share their date rules.** The audit check and the **Quarantine
  check** each write out "added later than today", "expires before added"
  and "more than N days after added", with 90 and 30 days. One shared module
  would touch 02's audit check, outside this feature, and both gates'
  mutation scores.
- **The `node:sqlite` probe is a test without a module.** It sits in its own
  folder under `main/db/` (design log D1), while `docs/conventions.md` puts
  each test beside its module and a test that proves a configuration in
  `gates/`. It checks Electron's runtime rather than code of ours. Moving it
  under `gates/` is a gate change; leaving it is also fine, as the
  **Layer rule** keeps `node:sqlite` tests inside `main/db/`.
- **Considered and left as they are.** `startApp`'s type for `app` restates
  parts of the types its modules take; the compiler already fails when they
  drift. The environment type `Readonly<Record<string, string | undefined>>`
  appears in four modules; a shared type would need a folder for one line.
  The window module exports `WINDOW_TITLE`, `WindowSize` and
  `MainWindowOptions`, which nothing else imports; they describe its
  interface and cost nothing. `startApp` spells the **App build**'s `out`
  folders twice and the electron-vite config spells them again; a constant
  in `startApp` alone would not join them with the config. The fake
  Electron's own IPC event type mirrors the one in the IPC registration on
  purpose: it models Electron, not our code.
