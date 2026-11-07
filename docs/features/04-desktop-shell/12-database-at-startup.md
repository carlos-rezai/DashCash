---
status: open
---
# Database at startup

## Parent PRD

`prd.md`

## What to build

The app opens and migrates `dashcash.db` in the **Data folder** before its
window, and stops with the **Startup error** when it cannot (plan Phase 4;
PRD "Main process: database" and "Main process: startup"; design log
Q30–Q32, Q34, A5).

- `openDatabase(path, migrations)` in `main/db/openDatabase/`: opens one
  `DatabaseSync` with `node:sqlite`, sets `PRAGMA foreign_keys = ON`,
  keeps SQLite's default rollback journal, migrates with
  `migrateDatabase` (`11-migration-runner.md`) and returns the connection;
  any failure throws with its cause and leaves the connection closed. A
  file that is not a SQLite database fails and is not overwritten.
- `startApp`, when ready, after the **Data folder** is created
  (`10-data-folder.md`): opens `dashcash.db` there with the committed
  list; a failure ends in the **Startup error** with the cause and the
  folder, and no handler, protocol or window is set up. The **Database**
  closes on `will-quit`.
- "Start the app" also asserts that `dashcash.db` exists in the fixture's
  **Data folder**.

## Acceptance criteria

- [ ] A RED commit extends "Start the app" and adds the Vitest tests, and
      fails on them.
- [ ] Against real SQLite in a temporary file: `openDatabase` creates
      `dashcash.db`, `foreign_keys` is on, the journal mode is SQLite's
      default, and a file that is not SQLite fails and leaves the
      connection closed.
- [ ] The startup tests show a failing **Database** ending in the
      **Startup error** with no window created, and the **Database**
      closed on `will-quit`.
- [ ] Only files in `main/db/` import `node:sqlite`; `npm run lint:deps`
      is green.
- [ ] "Start the app" asserts `dashcash.db` in the **Data folder**.
- [ ] `npm run verify:full` is green.

## Blocked by

- Blocked by `10-data-folder.md`
- Blocked by `11-migration-runner.md`

## User stories addressed

- User stories 41, 42, 43, 44, 52, 54, 55, 56, 85
