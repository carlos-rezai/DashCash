# PRD: 04 desktop-shell

> Source: `design-log.md` (Grill-me, 2026-11-07, Q1–Q52; Assumptions from
> write-a-prd, A1–A9). Terms in bold are defined in
> `docs/ubiquitous-language.md`.

## Problem Statement

Three features have built **Verify**, the supply-chain gates and
**Mutation testing**, but there is no app yet. `apps/desktop` and
`packages/contract` hold only empty folders, `e2e/` is empty, and
`npm run verify:full` runs nothing beyond **Verify**. Every later feature
needs the same ground to stand on: a window that opens, a place for the
user's data, a **Database** that can grow table by table, and a safe way
for the page to ask the **Main process** for anything.

Built later and piecemeal, each of these would arrive with its first
consumer and be judged only by it: a window without the sandbox because a
screen was easier that way, a bridge that hands the page all of
`ipcRenderer`, a **Database** opened wherever it was first needed, schema
changes applied by hand. And nothing proves that the real app starts: unit
tests and stories never launch Electron. The first flaky end-to-end test
would then meet a pipeline with no rule for it, and the easy answer, a
retry, is exactly what the quality gates forbid.

## Solution

The desktop shell, row 04 of `docs/feature-checklist.md`, with no UI of its
own:

- `npm run dev` starts DashCash with hot reload; `npm run build` produces
  the **App build** of main, preload and renderer.
- The app opens one window titled "DashCash", 1440 × 900 or the screen's
  work area if smaller, with the **Secure defaults**: sandbox and context
  isolation on, Node integration off, every navigation away, new window,
  webview and permission refused. The page comes from the **App protocol**
  `app://dashcash` and carries a strict **CSP**.
- The **Renderer** reaches the **Main process** only through the
  **Bridge** `window.dashcash.invoke`, which sends only **Channels** of the
  **Contract**; main refuses any request that fails the **Sender check**.
  One **Channel** exists: `app:info`, returning the **App version**.
- The app keeps its data in one **Data folder**, `%APPDATA%\DashCash` by
  default or the folder named in `DASHCASH_DATA_FOLDER`. There it opens
  `dashcash.db` with Node's built-in SQLite and brings it to the newest
  **Schema version** through ordered **Migrations** (none yet). When the
  folder or the **Database** cannot be opened or migrated, the app shows the
  **Startup error** and quits.
- A second start on the same **Data folder** focuses the running window and
  quits. In `npm run dev` only, Chromium's **Debug port** 9222 is open on
  loopback.
- Playwright drives the **App build**: the **App fixture** gives each
  **End-to-end test** a fresh **Data folder**, and the first **User flow**,
  "Start the app", proves window, security, bridge, main and **Database**
  together. **Verify full** becomes **Verify**, then the **App build**, then
  `test:e2e`, and the `pull-request` job runs it on Linux with the sandbox
  intact.
- Flaky tests get a **Quarantine** before the first one exists: a
  **Quarantine entry** names the test, a ticket, an owner and an **Expiry
  date** at most 30 days out; quarantined tests are left out of the run,
  and the **Quarantine check** in **Verify** and the **Daily run** fails
  the build from the day after expiry.
- A new **Layer rule** keeps SQLite inside `main/db/`.

No manual step beyond the human's `go` for the gate files, and the first
`pull-request` run, which confirms the Linux sandbox step.

## User Stories

**Starting the app**

1. As the user, I want DashCash to open one window titled "DashCash" when I
   start it, so that I know which app I am in.
2. As the user, I want the window's content to be 1440 × 900, so that the
   app opens at the size it was designed for.
3. As a user on a smaller screen, I want the window shrunk to fit the
   screen's work area, so that no edge of the app is hidden off screen.
4. As the user, I want the window shown only once its page is ready, so
   that I never see an empty white frame.
5. As the user, I want Electron's default menu, so that copy, paste and the
   usual window commands work without a custom menu.
6. As the user, I want the app to quit when I close its window, so that no
   background process keeps my **Database** open.
7. As the user, I want the shell to show no screen of its own yet, so that
   the first real screen arrives as designed, not as a placeholder.

**Secure defaults**

8. As the user, I want the page sandboxed, with context isolation on and
   Node integration off, so that nothing in the page can touch my files or
   start programs.
9. As the user, I want the page served from `app://dashcash` rather than
   from `file://`, so that the page cannot read other files on my disk.
10. As the user, I want any request to `app://dashcash` for a path outside
    the app's own renderer files answered as not found, so that a crafted
    URL like `app://dashcash/../../secrets` reads nothing.
11. As the user, I want every navigation away from the app's origin
    stopped, including redirects, so that the window only ever shows
    DashCash.
12. As the user, I want every attempt to open a new window refused, so that
    no link or script opens a second browser in the app.
13. As the user, I want webviews refused, so that no foreign page can be
    embedded in the app.
14. As the user, I want every permission request and permission check of
    the page refused (camera, microphone, notifications, geolocation and
    the rest), so that a local finance app asks for nothing.
15. As the user, I want spellcheck off, so that the app never downloads
    dictionaries and stays offline.
16. As the developer, I want the sandbox enabled for every renderer of the
    app, so that a window created later cannot start without it.

**Content Security Policy**

17. As the user, I want the page to carry a **CSP** that allows only the
    app's own scripts, styles, images, fonts and connections, so that
    injected content cannot load code from anywhere.
18. As the user, I want inline scripts and `eval` blocked, so that a string
    turned into code never runs.
19. As the developer, I want the same **CSP** in dev and in the **App
    build**, so that what passes in dev passes in the build.
20. As the developer, I want the **CSP** in the page's HTML, so that every
    loosening is a reviewed line with its reason in the feature that needs
    it.

**Contract and bridge**

21. As the developer, I want the **Contract** to list every **Channel**
    with its request and response types, so that main, preload and
    renderer agree on one definition.
22. As the developer, I want the **Contract** to hold a runtime list of its
    **Channels** and a type guard for a channel name, so that the preload
    can refuse what the types cannot stop at runtime.
23. As the developer, I want the **Contract** to import nothing, so that
    its **Layer rule** stays satisfied.
24. As the developer, I want `window.dashcash.invoke(channel, request)`
    typed from the **Contract**, so that a wrong channel or request fails
    the type check.
25. As the user, I want the **Bridge** to refuse any channel the
    **Contract** does not list, with `Unknown channel: <channel>`, before
    anything reaches main, so that the page cannot call into main beyond
    the **Contract**.
26. As the developer, I want the **Preload** to expose only
    `window.dashcash` with its one `invoke` method, and never
    `ipcRenderer`, so that the page has no other way into main.
27. As the developer, I want the **Preload** unchanged when a **Channel** is
    added, so that new features only touch the **Contract** and main.

**IPC handlers**

28. As the developer, I want one registration function that takes a
    handler for every **Channel**, so that a **Channel** without a handler
    fails the type check.
29. As the user, I want every request whose sending frame is not on the
    app's origin refused with `Refused <channel> from <origin>` before its
    handler runs, so that a foreign frame cannot use the bridge.
30. As the developer, I want a request from a frame that no longer exists
    refused the same way, so that the **Sender check** never fails open.
31. As the developer, I want the dev server's origin accepted only in
    `npm run dev`, so that the **App build** accepts `app://dashcash`
    alone.
32. As the developer, I want each handler whose **Channel** takes a request
    to check that request with a type guard from the **Contract** before
    using it, so that untyped input from the page is never trusted.
33. As the developer, I want an error thrown in a handler to reject the
    page's promise with its message, so that failures reach the caller.
34. As the developer, I want `app:info` to return `{ version }`, the **App
    version**, ignoring any argument, so that the first **Channel** proves
    the whole path and later app facts can join the same object.

**Data folder**

35. As the user, I want my data in `%APPDATA%\DashCash`, so that it sits
    where the settings page will say it is.
36. As the user, I want the **Data folder** created when it is missing, so
    that the first start just works.
37. As the developer, I want `DASHCASH_DATA_FOLDER` to name another
    absolute **Data folder**, also used as Electron's `userData`, so that
    each test gets its own folder, browser files and **Single-instance
    lock**.
38. As the developer, I want an empty `DASHCASH_DATA_FOLDER` treated as
    unset, so that a blank variable does not move my data.
39. As the developer, I want a relative `DASHCASH_DATA_FOLDER` to end in
    the **Startup error** naming the variable, so that data never lands in
    a folder nobody looks in.
40. As the developer, I want the override honoured in every build, so that
    the installer's smoke test can use the same seam later.

**Database and migrations**

41. As the user, I want my data in `dashcash.db` in the **Data folder**,
    so that one file holds it all.
42. As the developer, I want the **Database** opened once, by the **Main
    process**, with Node's built-in SQLite, so that no native module or
    rebuild is needed and tests use real SQLite.
43. As the developer, I want foreign keys switched on for the connection,
    so that later tables can rely on them.
44. As the developer, I want SQLite's default rollback journal, so that the
    **Data folder** holds one file to move or back up.
45. As the developer, I want every **Migration** above the stored **Schema
    version** applied in order on open, so that any older **Database** is
    brought up to date.
46. As the user, I want each **Migration** applied in one transaction with
    its **Schema version** bump, so that a failing one leaves my
    **Database** at the previous version, intact.
47. As the developer, I want the **Schema version** kept in SQLite's
    `user_version`, so that no bookkeeping table is needed.
48. As the developer, I want the runner to refuse a list with a gap or a
    duplicate version, so that a numbering mistake never reaches a user.
49. As the user, I want a **Database** from a newer DashCash refused, with
    `dashcash.db has schema version <n>, but this DashCash knows only up to
    <m>.`, so that an older app never writes to data it does not
    understand.
50. As the developer, I want the shell to ship the runner with an empty
    list, so that the first table arrives with the first feature that needs
    it.
51. As the developer, I want a fresh **Database** at **Schema version** 0
    to open without error, so that an empty list is a valid state.
52. As the developer, I want the **Database** closed when the app quits, so
    that SQLite releases the file.
53. As the developer, I want no file outside `main/db/`, tests included, to
    import SQLite, so that the **Database** has one gate.

**Startup error**

54. As the user, I want a native error box titled "DashCash couldn't
    start", with the cause and `Data folder: <path>`, when the **Data
    folder** cannot be created or the **Database** cannot be opened or
    migrated, so that I know what failed and where.
55. As the user, I want the app to quit after that box without opening a
    window, so that nothing runs on a half-migrated **Database**.
56. As the user, I want a file that is not a SQLite database to end in the
    same **Startup error**, so that a damaged file is reported, not
    overwritten.

**Single instance**

57. As the user, I want a second start of DashCash to bring the running
    window to the front, restored if minimised, and then quit, so that two
    copies never write to the same **Database**.
58. As the user, I want a second start while the first has no window yet to
    just quit, so that it never opens a second window.
59. As the developer, I want the **Single-instance lock** to belong to the
    **Data folder**, so that parallel tests with their own folders do not
    block each other.
60. As the developer, I want the lock taken before the **Database** or any
    window opens, so that the second process touches nothing.

**Debug port**

61. As the developer, I want Chromium's **Debug port** 9222 open on
    loopback when I run `npm run dev`, so that DevTools tools can attach.
62. As the user, I want the **Debug port** closed in every **App build**
    and every packaged app, so that nothing on my machine can drive the
    app.

**Workspace and build tooling**

63. As the developer, I want `@dashcash/desktop` and `@dashcash/contract`
    as private ES-module **Workspace members**, so that the app and its
    **Contract** are packages like the plan says.
64. As the developer, I want the desktop member's product name "DashCash",
    so that Electron's `userData` is `%APPDATA%\DashCash` and the app's
    name is DashCash.
65. As the developer, I want the desktop member at version `0.0.0`, so that
    the release pipeline decides the first real number.
66. As the developer, I want Electron at the newest release at least 14
    days old, exact, as a dev dependency of the desktop member, so that the
    install follows the supply-chain rules.
67. As the developer, I want electron-vite to build main, preload and
    renderer into the desktop member's `out/` folder, and to serve the
    renderer with hot reload in `npm run dev`, so that one config covers
    all three processes.
68. As the developer, I want the **Contract** bundled into main and
    preload, so that no TypeScript runs from `node_modules` at runtime.
69. As the developer, I want the preload emitted as CommonJS, so that
    Electron can load it with the sandbox on.
70. As the developer, I want members to import each other by package name,
    so that no relative path crosses a member.
71. As the developer, I want `npm run typecheck` to cover every member,
    with the renderer checked without Node's types, so that the renderer
    cannot even name a Node API.
72. As the developer, I want the end-to-end tests and the Playwright config
    type-checked and linted like the rest, so that **Verify** covers them.
73. As the developer, I want `npm run lint:deps` to skip the **App build**,
    so that a local build never turns **Verify** red.
74. As the developer, I want only the process entries to import Electron at
    runtime, every other module taking the Electron objects as parameters,
    so that each module is tested in plain Vitest.

**End-to-end harness and the first flow**

75. As the developer, I want `npm run test:e2e` to run Playwright against
    the **App build**, so that end-to-end tests see the app as shipped.
76. As the developer, I want Playwright to launch the Electron binary
    already installed, so that no browser is downloaded.
77. As the repository owner, I want no retries and `.only` rejected, so
    that a flaky or focused test can never pass quietly.
78. As the developer, I want a trace kept for each failed test, so that a
    failure can be replayed.
79. As the developer, I want the **App fixture** to give each test a fresh
    temporary **Data folder**, the launched app and its first window, and
    to close the app and delete the folder afterwards, so that no test
    shares state with another.
80. As the developer, I want the **App fixture** to start the app without
    the dev server's URL in its environment, so that a test never loads the
    dev server by accident.
81. As the user, I want "Start the app" proven end to end: on a fresh
    **Data folder** exactly one window opens, titled "DashCash", so that a
    broken start never merges.
82. As the repository owner, I want the same flow to prove that the window
    has context isolation and the sandbox on and Node integration off, and
    that the page sees no `require` or `process`, so that loosening the
    **Secure defaults** fails a test.
83. As the repository owner, I want the flow to prove that the **CSP**
    blocks `eval`, so that loosening the **CSP** fails a test.
84. As the developer, I want the flow to prove that
    `window.dashcash.invoke('app:info')` resolves with the desktop member's
    version, read from its package file, so that bridge, **Sender check**
    and handler work together.
85. As the developer, I want the flow to prove that `dashcash.db` exists in
    the **Data folder**, so that the **Database** really opens there.
86. As the developer, I want **Verify full** to run **Verify**, then the
    **App build**, then `test:e2e`, so that every pull request proves the
    app starts.
87. As the repository owner, I want the `pull-request` job to run **Verify
    full** under a virtual display with the Linux sandbox allowed, never
    with `--no-sandbox`, so that CI tests the app that ships.
88. As the developer, I want the push job to keep running **Verify** only,
    so that pushes stay fast.

**Flaky quarantine**

89. As the developer, I want a committed, empty **Quarantine**, so that the
    rule exists before the first **Flaky test**.
90. As the developer, I want a **Quarantine entry** to hold the test's
    file and title, a ticket, an owner, the date added and an **Expiry
    date**, so that every quarantined test has an owner and a way out.
91. As the developer, I want quarantined tests left out of `test:e2e`, so
    that CI stays green and binding while the test is being fixed.
92. As the developer, I want an entry to leave out only the test with that
    title in that file, with the title matched literally, so that a
    quarantine never hides another test.
93. As the repository owner, I want `test:e2e` to fail when the
    **Quarantine** cannot be read or is malformed, so that a broken file
    never runs or skips tests silently.
94. As the repository owner, I want the **Quarantine check** to fail when
    the file is missing, not JSON or not an array, so that it **Fails
    closed**.
95. As the repository owner, I want it to fail when an entry lacks a field
    or has an empty one, so that no entry is anonymous or unowned.
96. As the repository owner, I want it to fail when a date is not a real
    `YYYY-MM-DD`, when `added` is later than today, when `expires` is
    before `added` or more than 30 days after it, so that a quarantine
    cannot be stretched.
97. As the repository owner, I want it to fail from the day after an
    entry's **Expiry date** (UTC), with `expired on <date>`, so that a
    quarantine ends in a fix or a deletion.
98. As the repository owner, I want it to fail when `file` is not a
    tracked `e2e/` spec or `ticket` not a tracked ticket, so that every
    entry points at something real.
99. As the developer, I want one `quality/flaky-quarantine.json: <reason>`
    line per cause, so that one run names every problem.
100. As the repository owner, I want the **Quarantine check** in **Verify**,
     after the **Audit**, and in the `daily` job of the **Daily run**, so
     that an expiry turns both red even without a push.

**Gates and supply chain**

101. As the repository owner, I want a gate test for the Playwright config
     that fails when its key set, `testDir`, `retries`, `forbidOnly`,
     reporter, trace or quarantine filter changes, so that the harness
     cannot be loosened silently.
102. As the repository owner, I want the gate wiring test to cover
     `check:quarantine` in **Verify** and the `daily` job, **Verify
     full**'s three steps and the `pull-request` job's sandbox and display
     steps, so that the wiring cannot drift.
103. As the repository owner, I want the SQLite **Layer rule** tested in
     the layer-rule gate test like the others, so that it cannot stop
     enforcing.
104. As the repository owner, I want every licence the install adds listed
     in the ticket, a permissive one added to the **License allowlist** and
     any other stopping the builder, so that no licence slips in.
105. As the repository owner, I want every open **Advisory** the install
     brings handled by an **Audit exception** with a reason, or the builder
     stopped when a fix exists, so that the **Audit** stays meaningful.
106. As the human, I want `/feature-pipeline` to pause before the build,
     since the tickets name gate files, so that I approve them first.

## Implementation Decisions

Locations of every file are in the design log's **Files** table; this
section names modules and their interfaces.

**Contract** (Q19–Q21, Q23)

- `AppInfo = { version: string }`; `ChannelMap` maps each **Channel** to
  `{ request; response }`, with `'app:info': { request: undefined;
  response: AppInfo }`; `Channel = keyof ChannelMap`.
- `CHANNELS`, the runtime list, and `isChannel(value: unknown): value is
  Channel`.
- `DashCashBridge = { invoke<C extends Channel>(channel: C, request:
  ChannelMap[C]['request']): Promise<ChannelMap[C]['response']> }`.
- A request type guard per **Channel** that takes a request; `app:info`
  needs none.
- No import of any kind.

**Preload** (Q21, A1, A2)

- `createBridge(invoke, isChannel): DashCashBridge`: refuses a channel
  `isChannel` rejects with `Unknown channel: <channel>` (a rejected
  promise), otherwise forwards to `invoke`.
- The entry exposes `createBridge(ipcRenderer.invoke, isChannel)` as
  `dashcash` through `contextBridge.exposeInMainWorld`, nothing else.
- Built as CommonJS with the **Contract** bundled.

**Main process: startup** (Q13–Q16, Q28–Q29, Q34–Q36, A1, A4)

- `startApp(electron, env)`: the startup order of the design log's Design
  section, with every Electron object injected. The entry calls it and
  does nothing else.
- `resolveDataFolder(env, userData)`: `{ folder, overridden }`, or a cause
  for a relative override (A4).
- `lockSingleInstance(app, getWindow)`: returns whether this process holds
  the lock; on `second-instance`, restores and focuses the window if one
  exists.
- `enableDebugPort(app, env)`: appends `remote-debugging-port=9222` when
  the app is not packaged and `ELECTRON_RENDERER_URL` is set.
- `createMainWindow(...)`: one hidden window, title "DashCash", content
  size from a pure `fitWindowSize(workArea)` (1440 × 900, each side capped
  at the work area), the **Secure defaults**' web preferences, the CommonJS
  preload, shown on `ready-to-show`; loads `app://dashcash/index.html`, or
  the dev server URL in dev.
- `hardenSession(...)`: prevents `will-navigate` and `will-redirect` to
  any URL off the app's origins, denies every window open, prevents
  `will-attach-webview`, and denies every permission request and check.
  Origin matching is a pure function shared with the **Sender check**.
- `registerAppProtocol(...)`: the privileged standard, secure scheme
  `app`, registered before ready; the handler serves through a pure
  `resolveRendererPath(rendererFolder, url)` that returns `undefined`, and
  so a 404, for any path resolving outside the folder.
- `showStartupError(dialog, app, cause, folder)`: the box of A5, then
  quit.
- App origins: `app://dashcash` always; the dev server's origin only when
  `enableDebugPort`'s dev condition holds.
- Quit when every window is closed; close the **Database** on `will-quit`.

**Main process: database** (Q30–Q33, A5)

- `openDatabase(path, migrations)`: opens a `DatabaseSync`, sets
  `foreign_keys = ON`, migrates, returns the connection; any failure
  throws with the cause of A5 and leaves the connection closed.
- `migrateDatabase(db, migrations)`: validates the list (versions 1 … n,
  no gap, no duplicate), refuses a stored `user_version` above n, then
  runs each pending `up` and its `user_version` bump in one transaction.
- `Migration = { version: number; name: string; up: (db) => void }`; the
  list is empty in 04.
- The only files that import `node:sqlite` live in `main/db/`.

**Main process: IPC** (Q22, Q24, Q27, A5)

- `registerIpcHandlers(ipcMain, handlers, origins)`: `handlers` is a
  mapped type with one entry per **Channel**; each is registered with
  `ipcMain.handle` behind the **Sender check** (`Refused <channel> from
  <origin>`; a missing frame is refused).
- `getAppInfo(app): AppInfo`, from `app.getVersion()`.
- No error envelope: a thrown error rejects the page's promise.

**Renderer** (Q3, Q17–Q18)

- One HTML file with `<title>DashCash</title>`, the **CSP** meta tag
  `default-src 'none'; script-src 'self'; style-src 'self'; img-src
  'self'; font-src 'self'; connect-src 'self'; base-uri 'none';
  form-action 'none'`, and no script.

**Workspace members and scripts** (Q5–Q12, Q52, A2, A3)

- `@dashcash/contract`: private, `"type": "module"`, `exports` pointing at
  its TypeScript source.
- `@dashcash/desktop`: private, `"type": "module"`, `productName`
  "DashCash", `version` `0.0.0`, `main` pointing at the built main entry,
  scripts `dev` (`electron-vite dev`) and `build` (`electron-vite build`);
  exact dev dependencies `electron`, `electron-vite`, `vite`.
- electron-vite config in the desktop member: entries `main.ts`,
  `preload.ts`, `index.html`; `@dashcash/*` bundled, not externalised;
  preload as CommonJS.
- TypeScript: a Node project (main, preload, the build config) and a DOM
  project (renderer) for the desktop member, a project for the contract,
  each extending the base config; the root project gains `e2e/` and the
  Playwright config. `npm run typecheck` covers all of them; how the
  script reaches the member projects is the ticket's choice, provided it
  writes nothing tracked.
- `.dependency-cruiser.js`: the new rule (no `node:sqlite` import outside
  `apps/desktop/src/main/db/`, tests included) and the desktop `out/`
  folder excluded (A3).

| Script | Runs |
| --- | --- |
| `dev` | the desktop member's `dev` |
| `build` | the desktop member's `build` |
| `test:e2e` | `playwright test` |
| `check:quarantine` | `node scripts/checkQuarantine/checkQuarantine.ts` |
| `verify` | today's eleven gates, then `check:quarantine` |
| `verify:full` | `verify`, `build`, `test:e2e`, chained with `&&` |

**Playwright** (Q37–Q40, A8, A9)

- Root dev dependency `@playwright/test`, exact, newest release at least 14
  days old (1.64.1 on 2026-11-07).
- Root config with exactly `testDir: 'e2e'`, `retries: 0`,
  `forbidOnly: true`, `reporter: 'list'`,
  `use: { trace: 'retain-on-failure' }` and `grepInvert` from the
  **Quarantine** module (A8).
- **App fixture** in `e2e/test-support/`: per test a temporary folder,
  `_electron.launch` of the desktop member with `DASHCASH_DATA_FOLDER` set
  and `ELECTRON_RENDERER_URL` removed, the app and its first window handed
  to the test, then close and delete.
- `start-app.spec.ts`, "Start the app": story 81–85, the window's web
  preferences read in main through Playwright's `evaluate`.

**Quarantine** (Q43–Q46, A6–A8)

- `quality/flaky-quarantine.json`, committed as `[]`; entry
  `{ file, title, ticket, owner, added, expires }`.
- Shared reader in `scripts/`: shape violations and well-formed entries;
  `grepInvert` patterns per entry (A8).
- Shared calendar-date reader in `scripts/`, moved out of the audit check
  (A7).
- `findQuarantineViolations(quarantine: unknown, today: string,
  trackedPaths: readonly string[]): Violation[]`: the rules and lines of
  Q45 and A6, `MAX_QUARANTINE_DAYS = 30`. The entry reads the file, today
  in UTC and the tracked paths, and reports through `runGate`.

**CI** (Q42, Q45)

- `pull-request` job: a step before `verify:full` runs
  `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0`;
  `verify:full` runs as `xvfb-run --auto-servernum npm run verify:full`;
  the order `npm ci`, `verify:full`, `check:pr`, `test:mutation` is kept.
- `daily` job: `npm run check:quarantine` beside `check:audit`.
- Push workflow unchanged.

**Gate tests** (Q47–Q48, A9)

- Layer rules: an import of `node:sqlite` from main outside `main/db/`,
  from a test outside it, from the renderer, the preload and `e2e/` is
  forbidden; from `main/db/` and its tests it is allowed; a file under the
  desktop `out/` folder is not cruised.
- End-to-end (new gate folder): imports the Playwright config and asserts
  its six keys and their values; feeds invented entries to the shared
  reader and shows that a quarantined title in its file matches a pattern
  while the same title in another file, and a title with regex characters
  matched loosely, do not; asserts the config's `grepInvert` equals the
  reader's patterns for the committed file.
- Gate wiring: **Verify** runs its twelve gates with `check:quarantine`
  last; `verify:full` is exactly `verify`, `build`, `test:e2e`; the
  `pull-request` job has the sysctl step before `verify:full` and runs it
  under `xvfb-run`; the `daily` job runs `check:quarantine`.

**Gate files the tickets name** (Q50)

`package.json`, `package-lock.json`, every `tsconfig*.json` touched,
`eslint.config.js` if the members need it, `.dependency-cruiser.js`,
`playwright.config.ts`, `.github/workflows/pull-request.yml`,
`.github/workflows/daily.yml`, `quality/flaky-quarantine.json`,
`quality/license-allowlist.json`, `quality/audit-exceptions.json` and the
tests under `gates/`. So `/feature-pipeline` pauses after planning for the
human's `go`.

**Ticket order** (design log, Implementation Plan)

1. The app starts, end to end: members, Electron, electron-vite, window,
   Playwright, the **App fixture**, the first flow (window and title),
   `test:e2e`, **Verify full**, the Linux CI steps.
2. Secure window: **Secure defaults**, the **App protocol**, the **CSP**,
   the window size; the flow asserts the security facts.
3. Typed bridge: the **Contract**, the **Preload**, handler registration
   with the **Sender check**, `app:info`; the flow asserts the version.
4. Data folder and database: the override, `openDatabase`, the runner, the
   **Startup error**, the SQLite **Layer rule**; the flow asserts
   `dashcash.db`.
5. One instance and the dev **Debug port**: Vitest only.
6. Flaky quarantine: the file, the shared modules, the **Quarantine
   check** in **Verify** and the **Daily run**, the config's filter, the
   gate tests.

## Testing Decisions

- A good test drives a module through its public interface and asserts
  what it does: the calls a startup module makes on its fake Electron
  objects, the value a pure function returns, the rows and `user_version`
  of a real SQLite database, the violations of a gate core, the exit code
  and lines of a gate entry, the parsed settings of a configuration. It
  never asserts on internals.
- No domain code, so no domain test; no component, so no story (Q4).
- Vitest, in plain Node, every module of main, preload and the
  **Contract** (A1):
  - `isChannel` and the request guards: every listed **Channel** accepted,
    other strings and non-strings refused.
  - `createBridge`: a listed channel forwarded with its request; an
    unknown one rejected without calling `invoke`.
  - `registerIpcHandlers`: one `handle` per **Channel**; a sender on the
    app's origin reaches the handler; another origin, a missing frame and,
    in the build, the dev origin are refused with the message of A5; a
    throwing handler rejects.
  - `getAppInfo`: the fake app's version.
  - `fitWindowSize`: larger, equal and smaller work areas, each side on
    its own.
  - `createMainWindow`: title, content size, every web preference of the
    **Secure defaults**, hidden until `ready-to-show`, the URL for the
    build and for dev.
  - `hardenSession` and the origin matcher: same-origin navigation
    allowed; other origins, schemes and look-alike hosts prevented; window
    opens denied; webviews prevented; every permission request and check
    denied.
  - `resolveRendererPath`: files inside served; `..`, encoded `..`,
    absolute paths and paths with a different drive or root refused.
  - `resolveDataFolder`: unset, empty, absolute, relative.
  - `lockSingleInstance`: lock held; lock refused quits; second instance
    with a minimised window restores and focuses; with no window does
    nothing.
  - `enableDebugPort`: the switch only when unpackaged with the dev URL.
  - `showStartupError`: title, body and quit.
  - `startApp`: the startup order, the override setting `userData`, the
    second process stopping after the lock, a failing **Database** showing
    the **Startup error** with no window created, the **Database** closed
    on `will-quit`.
  - `migrateDatabase` and `openDatabase` against an in-memory or
    temporary-file **Database** with sample migrations: an empty list
    leaves version 0; pending migrations run in order and set the version;
    an applied one is not run again; a failing one rolls back to the
    previous version and table set; a gap, a duplicate and a newer stored
    version are refused; `foreign_keys` is on; a non-SQLite file fails.
- Vitest, gate code (measured by **Mutation testing**, which must stay at
  or above the **Break threshold** of 81):
  - `findQuarantineViolations`: a table per rule of A6, the 30-day limit
    on both sides, expiry on and after the date, several causes in one
    run.
  - The **Quarantine** reader: shape violations, the patterns of A8.
  - The calendar-date reader: real, malformed and impossible dates; the
    audit check's existing tests stay unchanged and green.
  - The `check:quarantine` entry: exit codes and lines in a temporary
    sample repository, as the other entry suites do.
  - The gate tests above.
- Playwright, one **User flow** (Q40): `start-app.spec.ts`, written RED in
  the ticket that starts the app and extended by each ticket that adds a
  fact it asserts. Single instance, the **Debug port**, the path check,
  navigation and permission denial, the runner and the **Startup error**
  stay in Vitest (Q41).
- Deterministic: invented data, no network, a fresh temporary folder per
  test, no date shown in 04 and so no fixed clock yet (Q39).
- The same agents write the code and its tests through the issue-loop's
  RED and GREEN steps (`CLAUDE.md`, Tests).
- Prior art: the gate entries' suites with `scripts/test-support/` sample
  repositories; the audit check's date rules and expiry table; the
  Renovate and mutation-testing gate tests, which import a root config and
  check its settings; the gate wiring test's YAML helpers and problem
  finders; the layer-rule gate test's cruise of sample imports.

## Out of Scope

- React, tokens, primitives and Storybook (05); the AppShell, routing,
  splash, loading overlay, snackbars, the persisted route and the
  renderer's typing of `window.dashcash` (06).
- Every domain table and the first **Migration** (06 or 07 onward); the
  fixed clock and the seeded **Database** in the **App fixture** (Q39).
- The installer, electron-builder, Electron fuses, the app icon and window
  state (20); auto-update and main-to-renderer events (21); moving the
  **Data folder**, backup and restore (22).
- An error envelope across the **Bridge** (Q24).
- A **Quarantine** for Vitest or Storybook tests (Q44).
- **Mutation testing** of main, preload and the **Contract**: its scope
  stays `packages/domain`, `scripts/` and `gates/`
  (`docs/quality-gates.md`).
- Changes to `CLAUDE.md` and `README.md` (Q51).

## Further Notes

- `npm ci` now downloads Electron in every CI job, and the `pull-request`
  job grows by a build and an Electron start (Trade-offs).
- `node:sqlite` is still marked as in development in Node 24; `main/db/`
  is the one place to change should its API move.
- 05 must loosen the **CSP**'s `style-src` for styled-components and handle
  React's dev refresh preamble, each with its reason in its own design log.
- The first `pull-request` run confirms the Linux sandbox step (Q42); if
  it fails, the fix is that step, never `--no-sandbox`.
- An Electron patch with a security fix younger than 14 days stops the
  builder for the human (02, D3 against 02, Q19), as Q49 says.
