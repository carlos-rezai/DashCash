---
status: open
---
# Data folder

## Parent PRD

`prd.md`

## What to build

The app keeps its data in one **Data folder** and stops with the **Startup
error** when it cannot have one (plan Phase 4; PRD "Main process:
startup", `resolveDataFolder` and `showStartupError`; design log Q28, Q29,
Q34, A4, A5, P1). The **Database** in that folder follows in
`12-database-at-startup.md`.

- `resolveDataFolder(env, userData)`: `{ folder, overridden }`; unset or
  empty `DASHCASH_DATA_FOLDER` gives `userData` (`%APPDATA%\DashCash`), an
  absolute one gives that path with `overridden`, a relative one gives the
  cause `DASHCASH_DATA_FOLDER must be an absolute path.` (A4). The override
  is honoured in every build.
- `showStartupError(dialog, app, cause, folder)`: a native error box titled
  "DashCash couldn't start", body the cause, a blank line, then
  `Data folder: <path>` (A5); then the app quits.
- `startApp`, first of all: resolves the **Data folder** and, when
  overridden, sets Electron's `userData` to it before ready; a relative
  override ends in the **Startup error**. When ready, it creates the
  folder (recursively, when missing) before anything else; a failure ends
  in the **Startup error** with the error's message as cause, and no
  window is created.
- From here on the **App fixture**'s `DASHCASH_DATA_FOLDER` takes effect,
  so end-to-end runs no longer touch the default `userData` (P1); "Start
  the app" stays green.

## Acceptance criteria

- [ ] A RED commit adds the Vitest tests and fails on them.
- [ ] `resolveDataFolder` returns `userData` when the variable is unset or
      empty, the path when it is absolute, and the cause
      `DASHCASH_DATA_FOLDER must be an absolute path.` when it is
      relative.
- [ ] The startup tests show the override setting `userData` before ready,
      the folder created when ready, and a relative override or a failing
      folder ending in the **Startup error** with no window created.
- [ ] `showStartupError` shows "DashCash couldn't start" with the cause, a
      blank line and `Data folder: <path>`, then quits.
- [ ] `npm run verify:full` is green.

## Blocked by

- Blocked by `02-start-app-flow.md`

## User stories addressed

- User stories 35, 36, 37, 38, 39, 40
- User story 54 (the **Data folder** cannot be created)
