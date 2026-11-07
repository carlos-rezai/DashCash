# Plan: 04 desktop-shell

> Source PRD: `prd.md`. Decisions: `design-log.md` (Q1–Q52, A1–A9,
> P1–P4). Terms in bold are defined in `docs/ubiquitous-language.md`.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: none. The renderer is one HTML page with the title and, from
  phase 2, the **CSP**; no script, no screen (Q3). React and routing are 05
  and 06.
- **IPC channels**: exactly one, `app:info`: request `undefined` (any
  argument ignored), response `AppInfo = { version: string }`, the **App
  version** from `app.getVersion()` (Q20, Q52). The **Contract**
  (`@dashcash/contract`) holds `ChannelMap`, `Channel`, `CHANNELS`,
  `isChannel`, `AppInfo` and `DashCashBridge`, and imports nothing (Q19).
  The **Bridge** is `window.dashcash.invoke(channel, request)`, the only
  thing the **Preload** exposes (Q21). Main registers one handler per
  **Channel** behind the **Sender check**; a thrown error rejects the
  page's promise, no error envelope (Q22, Q24, Q27).
- **Schema**: one **Database**, `dashcash.db` in the **Data folder**,
  opened once by the **Main process** with `node:sqlite` (`DatabaseSync`),
  `foreign_keys = ON`, default rollback journal (Q30–Q32). The **Schema
  version** is `PRAGMA user_version`; **Migrations** are
  `{ version, name, up }`, numbered 1 … n, each applied in its own
  transaction with its version bump; the list is empty in 04, so the
  schema has no table (Q33). Only `apps/desktop/src/main/db/` imports
  `node:sqlite`, tests included (Q47).
- **Key models**: `AppInfo`; `Migration`; the **Data folder**
  (`DASHCASH_DATA_FOLDER` when absolute, else Electron's `userData`,
  `%APPDATA%\DashCash`; A4); the **App origins** (`app://dashcash`, plus
  the dev server's origin only when unpackaged with `ELECTRON_RENDERER_URL`
  set); `QuarantineEntry = { file, title, ticket, owner, added, expires }`
  (Q43).
- **Process structure** (A1): `main.ts` and `preload.ts` are the only files
  that import `electron` as a value; every other module of main and preload
  takes the Electron objects as parameters and is tested in plain Vitest.
  Modules sit in camelCase folders beside their entry, as the design log's
  Files table lists them.
- **Startup order** (design log, Design): resolve the **Data folder** and,
  when overridden, set `userData` → take the **Single-instance lock** or
  quit → enable the sandbox, register the `app` scheme, add the **Debug
  port** switch in dev → when ready: create the **Data folder**, open and
  migrate the **Database** (**Startup error** and quit on failure) →
  register the protocol handler, the session's handlers and the IPC
  handlers → create the window → close the **Database** on `will-quit`;
  quit when all windows are closed. Each phase adds its steps in this
  order.
- **Workspace members**: `@dashcash/desktop` (phase 1) and
  `@dashcash/contract` (phase 3), private ES modules, importing each other
  by package name; the **Contract** is bundled into main and preload; the
  **Preload** is emitted as CommonJS (A2). electron-vite builds the **App
  build** into `apps/desktop/out/`.
- **Scripts**: `dev`, `build`, `test:e2e` (phase 1); `verify:full` =
  `verify`, `build`, `test:e2e`, chained with `&&` (phase 1);
  `check:quarantine` (phase 7), which joins **Verify** last, as its twelfth
  gate.
- **End-to-end**: `playwright.config.ts` at the root, `e2e/` for specs,
  the **App fixture** in `e2e/test-support/`, one **User flow**,
  `e2e/start-app.spec.ts` "Start the app", written RED in phase 1 and
  extended by phases 2, 3 and 4 with the facts they add (Q40).
- **CI**: the `pull-request` job runs `verify:full` under
  `xvfb-run --auto-servernum` after a step that allows unprivileged user
  namespaces, never with `--no-sandbox` (Q42); the push job keeps
  **Verify**; the `daily` job gains `check:quarantine` (phase 7).
- **Supply chain**: `electron`, `electron-vite` and `vite` as exact dev
  dependencies of the desktop member, `@playwright/test` at the root, each
  the newest release at least 14 days old on the day of building; every
  licence the lockfile gains listed in the ticket, open **Advisories**
  handled as 02 and 03 did (Q49). Only phase 1 installs packages.
- **Gate files the phases name** (Q50): `package.json`,
  `package-lock.json`, the new and changed `tsconfig*.json`,
  `eslint.config.js` if the members need it, `.dependency-cruiser.js`,
  `playwright.config.ts`, `.github/workflows/pull-request.yml`,
  `quality/license-allowlist.json`, `quality/audit-exceptions.json` and
  `gates/` tests (phase 1); `tsconfig*.json` (phase 3);
  `.dependency-cruiser.js` and `gates/layerRules/` (phase 4);
  `quality/flaky-quarantine.json`, `playwright.config.ts` and
  `gates/endToEnd/` (phase 6); `package.json` (`verify`,
  `check:quarantine`), `.github/workflows/daily.yml` and
  `gates/gateWiring/` (phase 7). So `/feature-pipeline` pauses for the
  human's `go` after planning.

---

## Phase 1: The app starts, end to end

**User stories**: 1, 4, 5, 6, 7, 63, 64, 65, 66, 67, 71, 72, 73, 74, 75,
76, 77, 78, 79, 80, 81, 86, 87, 88, 101 (without the filter), 102
(`verify:full` and the `pull-request` job), 104, 105, 106

### What to build

The tracer bullet. The desktop member gets its `package.json` (private ES
module, `productName` "DashCash", version `0.0.0`, `main` pointing at the
built main entry) and its Electron tooling; electron-vite builds main and
the renderer into `out/` and serves the renderer with hot reload. Main
starts the app with injected Electron objects: when ready it creates one
hidden window titled "DashCash", shows it on `ready-to-show`, keeps
Electron's default menu and quits when the window closes. The page is
`index.html` with its title and no script, loaded from the **App build**
as a file and from the dev server in `npm run dev` until phase 2 replaces
the file load with the **App protocol** (P2). The desktop member's Node
and DOM TypeScript projects join `npm run typecheck`, the renderer without
Node's types; `e2e/` and the Playwright config are type-checked and
linted; `lint:deps` skips `out/` (P3).

Playwright arrives with its config (`testDir`, `retries: 0`,
`forbidOnly: true`, `list` reporter, traces kept on failure) and the **App
fixture**: per test a fresh temporary **Data folder** passed as
`DASHCASH_DATA_FOLDER`, the **App build** launched through Playwright's
`_electron` without `ELECTRON_RENDERER_URL`, the app and its first window
handed over, then the app closed and the folder deleted (P1). "Start the
app" is written RED first: exactly one window, titled "DashCash".
`test:e2e` runs it, **Verify full** becomes **Verify**, the **App build**,
`test:e2e`, and the `pull-request` job runs it under a virtual display
with the Linux sandbox allowed. The new `endToEnd` gate test pins the
config's keys and values; the gate wiring test pins **Verify full** and
the job's sysctl and `xvfb-run` steps.

### Acceptance criteria

- [ ] A RED commit holds `e2e/start-app.spec.ts` (one window, title
      "DashCash") and the new Vitest tests, and fails on them.
- [ ] `@dashcash/desktop` is private, `"type": "module"`, `productName`
      "DashCash", version `0.0.0`, `main` at the built main entry, scripts
      `dev` and `build`; `electron`, `electron-vite` and `vite` are its
      exact dev dependencies at the newest releases at least 14 days old on
      the day of building.
- [ ] `npm run build` writes main and renderer into `apps/desktop/out/`;
      `npm run dev` opens the window with hot reload (checked by hand,
      recorded in the ticket's Notes).
- [ ] Only `main.ts` imports `electron` as a value; Vitest tests drive the
      startup and window modules with fake Electron objects: window hidden
      until `ready-to-show`, title "DashCash", the build's page and the dev
      URL, quit when all windows are closed, no custom menu.
- [ ] `npm run typecheck` covers both desktop projects, `e2e/` and
      `playwright.config.ts`; a Node type used in the renderer fails it;
      it writes nothing tracked.
- [ ] `.dependency-cruiser.js` excludes `apps/desktop/out/`; after a local
      build `npm run lint:deps` stays green.
- [ ] `playwright.config.ts` holds exactly `testDir: 'e2e'`, `retries: 0`,
      `forbidOnly: true`, `reporter: 'list'` and
      `use: { trace: 'retain-on-failure' }`; the `endToEnd` gate test fails
      when a key is added or removed or a value changes (P4).
- [ ] The **App fixture** gives each test its own temporary folder, removes
      `ELECTRON_RENDERER_URL` from the app's environment, and closes the app
      and deletes the folder afterwards; no browser is downloaded.
- [ ] `test:e2e` runs `playwright test`; `verify:full` is exactly `verify`,
      `build`, `test:e2e`; the gate wiring test fails on any other chain.
- [ ] The `pull-request` job runs the sysctl step before `verify:full`, runs
      `verify:full` under `xvfb-run --auto-servernum`, keeps the order
      `npm ci`, `verify:full`, `check:pr`, `test:mutation`, and never passes
      `--no-sandbox`; the wiring test names each missing piece; the push
      job is unchanged.
- [ ] Every licence the lockfile gains is listed in the ticket's Notes; a
      permissive one joins the **License allowlist**, any other stops the
      builder; every open **Advisory** has an **Audit exception** with its
      reason, or the builder stops when a fix exists;
      `npm run check:licenses` and `npm run check:audit` pass.
- [ ] `npm run verify:full` is green, "Start the app" included.

---

## Phase 2: Secure window

**User stories**: 2, 3, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
82, 83

### What to build

The window becomes the one that ships. The sandbox is enabled for every
renderer before ready; the window gets the **Secure defaults**' web
preferences (context isolation, sandbox, no Node integration, web
security, no insecure content, no webview tag, no spellcheck) and a content
size of 1440 × 900, each side capped at the primary display's work area.
The privileged, standard, secure `app` scheme is registered before ready,
and its handler serves the renderer folder through a pure path check that
answers 404 for anything resolving outside it; the **App build** loads
`app://dashcash/index.html`. The session prevents navigation and redirects
off the **App origins**, denies every new window, prevents webviews and
denies every permission request and check, with one pure origin matcher
the **Sender check** reuses in phase 3. `index.html` gains the **CSP**
meta tag, the same in dev and the build. "Start the app" now also proves
the web preferences, read in main, that the page sees no `require` or
`process`, and that the **CSP** blocks `eval`.

### Acceptance criteria

- [ ] A RED commit extends "Start the app" and adds the Vitest tests, and
      fails on them.
- [ ] `fitWindowSize` returns 1440 × 900 for larger and equal work areas
      and caps each side on its own for smaller ones; the window's content
      size comes from it.
- [ ] The window's web preferences are exactly the **Secure defaults** of
      Q15, `app.enableSandbox()` runs before ready, and the tests fail when
      any one is dropped.
- [ ] `resolveRendererPath` serves files inside the renderer folder and
      returns `undefined` for `..`, encoded `..`, absolute paths and paths
      on another drive or root; the handler answers those with 404.
- [ ] The origin matcher accepts the **App origins** only; look-alike
      hosts, other schemes and other ports are refused; `will-navigate` and
      `will-redirect` off-origin are prevented, window opens denied,
      `will-attach-webview` prevented, every permission request and check
      denied.
- [ ] The dev server's origin counts only when unpackaged with
      `ELECTRON_RENDERER_URL` set.
- [ ] `index.html` carries exactly the **CSP** of Q18 and still no script.
- [ ] "Start the app" asserts context isolation and sandbox on, Node
      integration off, no `require` or `process` in the page, and `eval`
      blocked; loosening any of them fails it.
- [ ] `npm run verify:full` is green.

---

## Phase 3: Typed bridge

**User stories**: 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
63 (contract), 68, 69, 70, 84

### What to build

The page can ask main for exactly what the **Contract** lists. The
contract member gets its `package.json` (private ES module, `exports` at
its TypeScript source) and TypeScript project, and holds the channel map
with `app:info`, the runtime list, `isChannel`, `AppInfo` and the bridge
type, importing nothing. The **Preload**, built as CommonJS with the
**Contract** bundled in, exposes `window.dashcash` with one `invoke` that
refuses unlisted channels with `Unknown channel: <channel>` before
anything reaches main. Main registers one handler per **Channel**, typed
so a missing handler fails the type check, each behind the **Sender
check** (`Refused <channel> from <origin>`, a missing frame refused, the
dev origin only in dev); `app:info` answers `{ version }`. The window
loads the preload. "Start the app" now proves that
`window.dashcash.invoke('app:info')` resolves with the version in the
desktop member's `package.json`.

### Acceptance criteria

- [ ] A RED commit extends "Start the app" and adds the Vitest tests, and
      fails on them.
- [ ] `@dashcash/contract` is private, `"type": "module"`, its `exports`
      at its source; it imports nothing; `npm run typecheck` covers it;
      main and preload import it by package name.
- [ ] `isChannel` accepts every entry of `CHANNELS` and refuses other
      strings and non-strings.
- [ ] `createBridge` forwards a listed channel with its request and
      rejects an unknown one with `Unknown channel: <channel>` without
      calling `invoke`.
- [ ] The **Preload** exposes only `dashcash` with `invoke`, never
      `ipcRenderer`; the **App build** emits it as CommonJS with the
      **Contract** bundled, and the window loads it with the sandbox on.
- [ ] `registerIpcHandlers` registers one `handle` per **Channel**; a
      sender on the app's origin reaches its handler; another origin, a
      missing frame and, in the build, the dev origin are refused with
      `Refused <channel> from <origin>`; a throwing handler rejects with
      its message.
- [ ] `getAppInfo` returns the fake app's version and ignores any
      argument.
- [ ] "Start the app" asserts that `invoke('app:info')` resolves with
      `{ version }` equal to `apps/desktop/package.json`'s version, read
      from the file, never a literal.
- [ ] `npm run verify:full` is green.

---

## Phase 4: Data folder and database

**User stories**: 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
49, 50, 51, 52, 53, 54, 55, 56, 85, 103

### What to build

The app keeps its data in one place. Main resolves the **Data folder**
before anything else: an absolute `DASHCASH_DATA_FOLDER` becomes the
folder and Electron's `userData`, unset or empty means `userData`, a
relative one is a cause for the **Startup error**. When ready, main
creates the folder, opens `dashcash.db` there with `node:sqlite`, switches
foreign keys on and migrates it: the runner validates the list, refuses a
**Database** from a newer DashCash, and applies each pending **Migration**
with its `user_version` bump in one transaction. 04 ships the runner with
an empty list. Any failure shows the native **Startup error** box with the
cause and `Data folder: <path>`, then quits without a window. The
**Database** closes on `will-quit`. The new **Layer rule** keeps
`node:sqlite` inside `main/db/`, tests included, and the layer-rule gate
test proves it. "Start the app" now proves that `dashcash.db` exists in
the fixture's **Data folder**.

### Acceptance criteria

- [ ] A RED commit extends "Start the app" and adds the Vitest and gate
      tests, and fails on them.
- [ ] `resolveDataFolder` returns `userData` when the variable is unset or
      empty, the path when it is absolute, and the cause
      `DASHCASH_DATA_FOLDER must be an absolute path.` when it is relative;
      the override sets `userData` before ready.
- [ ] Against real SQLite in a temporary file or in memory: an empty list
      leaves version 0; sample migrations run in order and set the
      version; an applied one does not run again; a failing one leaves the
      previous version and table set; a gap or duplicate is refused with
      `The migrations are not numbered 1 to <n> without gaps or
      duplicates.`; a newer stored version is refused with
      `dashcash.db has schema version <n>, but this DashCash knows only up
      to <m>.`; `foreign_keys` is on; a file that is not SQLite fails and
      leaves the connection closed.
- [ ] The committed migration list is empty, and the journal mode is
      SQLite's default.
- [ ] `showStartupError` shows "DashCash couldn't start" with the cause, a
      blank line and `Data folder: <path>`, then quits; the startup tests
      show a failing folder or **Database** ends there with no window
      created, and the **Database** closed on `will-quit`.
- [ ] `.dependency-cruiser.js` forbids `node:sqlite` outside
      `apps/desktop/src/main/db/`; the layer-rule gate test shows it
      forbidden from main outside `main/db/`, from a test outside it, from
      the renderer, the preload and `e2e/`, and allowed from `main/db/`
      and its tests.
- [ ] "Start the app" asserts `dashcash.db` in the **Data folder**.
- [ ] `npm run verify:full` is green.

---

## Phase 5: One instance and the dev debug port

**User stories**: 57, 58, 59, 60, 61, 62

### What to build

Two copies of DashCash never share a **Database**, and the developer can
attach DevTools tools in dev. Right after the **Data folder** is resolved,
main takes the **Single-instance lock**, which follows `userData` and so
the **Data folder**; a second process quits before touching the
**Database** or a window, and the first restores its window if minimised
and focuses it, or does nothing when it has none yet. Before ready, main
appends Chromium's `remote-debugging-port=9222` only when unpackaged with
`ELECTRON_RENDERER_URL` set. Vitest only (Q41); "Start the app" stays
green with each test holding its own lock.

### Acceptance criteria

- [ ] A RED commit adds the Vitest tests and fails on them.
- [ ] `lockSingleInstance`: lock held returns true; lock refused quits;
      `second-instance` with a minimised window restores and focuses it,
      with no window does nothing.
- [ ] The startup tests show the lock taken after the **Data folder** and
      before the **Database** or any window, and the second process
      stopping there.
- [ ] `enableDebugPort` appends the switch only when the app is unpackaged
      and `ELECTRON_RENDERER_URL` is set; packaged, or without the URL, it
      appends nothing.
- [ ] `npm run dev` exposes port 9222 on loopback (checked by hand,
      recorded in the ticket's Notes).
- [ ] `npm run verify:full` is green.

---

## Phase 6: Quarantined tests left out of the run

**User stories**: 89, 90, 91, 92, 93, 101 (the filter)

### What to build

A flaky end-to-end test can be taken out of the run before one exists.
`quality/flaky-quarantine.json` is committed as `[]`. A shared module in
`scripts/` reads the **Quarantine**: it returns the well-formed entries
and the shape violations (not an array, a missing or empty field, an
unreadable date), and turns each entry into one `grepInvert` pattern built
from its file (relative to `e2e/`) and its title, both escaped, so a title
matches literally and only in its own file. `playwright.config.ts` throws
on any shape violation and always sets `grepInvert`, empty for an empty
**Quarantine**. The `endToEnd` gate test pins the sixth key and shows the
patterns leave out exactly the quarantined test.

### Acceptance criteria

- [ ] A RED commit adds the reader's tests and the gate test changes, and
      fails on them.
- [ ] `quality/flaky-quarantine.json` is `[]`.
- [ ] The reader reports a non-array, a missing or empty field and a date
      that is not a real `YYYY-MM-DD` with the lines of A6, and returns
      the well-formed entries.
- [ ] A quarantined title in its file matches its pattern; the same title
      in another file, and a title with regex characters matched loosely,
      do not.
- [ ] The config holds exactly six keys, `grepInvert` equal to the
      reader's patterns for the committed file; the gate test fails when
      the filter is removed or a seventh key appears.
- [ ] The config throws on a malformed **Quarantine**, so `test:e2e` fails
      rather than running or skipping tests silently.
- [ ] The **Mutation score** stays at or above the **Break threshold**
      of 81.
- [ ] `npm run verify:full` is green.

---

## Phase 7: Quarantine check

**User stories**: 94, 95, 96, 97, 98, 99, 100, 102 (`check:quarantine`)

### What to build

A quarantine ends in a fix or a deletion. The audit check's private
reading of a `YYYY-MM-DD` date moves into a shared module, the audit
check's behaviour and tests unchanged (A7). The **Quarantine check**'s
core takes the parsed file, today and the tracked paths, and returns one
violation per cause: the reader's shape violations, `added` later than
today, `expires` before `added` or more than 30 days after it, an expired
entry from the day after its **Expiry date** (UTC), a `file` that is not a
tracked `e2e/` spec and a `ticket` that is not a tracked ticket. Its entry
reads the file, today in UTC and the tracked paths and reports through
the shared gate reporter, failing closed when the file is missing or not
JSON. `check:quarantine` joins **Verify** last, after the **Audit**, and
the `daily` job beside `check:audit`; the gate wiring test pins both.

### Acceptance criteria

- [ ] A RED commit adds the core, entry, date-reader and wiring tests, and
      fails on them.
- [ ] The shared date reader accepts real dates and refuses malformed and
      impossible ones; the audit check uses it and its existing tests stay
      unchanged and green.
- [ ] `findQuarantineViolations` has a table per rule of A6, the 30-day
      limit on both sides (`MAX_QUARANTINE_DAYS = 30`), expiry valid on its
      date and failing the day after with `expired on <date>`, and several
      causes reported in one run.
- [ ] The entry, in a temporary sample repository, exits 0 on `[]` and on
      a valid entry, and 1 with one `quality/flaky-quarantine.json:
      <reason>` line per cause on a missing file, invalid JSON and each
      rule.
- [ ] `verify` runs its twelve gates with `check:quarantine` last; the
      `daily` job runs it beside `check:audit`; the wiring test fails when
      either is missing.
- [ ] The **Mutation score** stays at or above the **Break threshold**
      of 81.
- [ ] `npm run verify:full` is green.
