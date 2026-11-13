---
status: open
---
# Migration runner

## Parent PRD

`prd.md`

## What to build

The **Database** can grow table by table through ordered **Migrations**,
and only `main/db/` may touch SQLite (plan Phase 4; PRD "Main process:
database" and "Gate tests"; design log Q31–Q33, Q47, A5, Implementation
Results D1). Opening the **Database** at startup follows in
`12-database-at-startup.md`.

- First, before anything builds on `node:sqlite` (D1): a test in
  `apps/desktop/src/main/db/` runs the pinned Electron binary with
  `ELECTRON_RUN_AS_NODE=1` and no flag, on a script that loads
  `node:sqlite` and opens an in-memory `DatabaseSync`, and asserts a zero
  exit, the database opened, and no `ExperimentalWarning` (nor any other
  warning) on stderr. If it fails, stop building on `node:sqlite`: the
  driver becomes `better-sqlite3` rebuilt for Electron, and every doc that
  names `node:sqlite` (design log Q31 through a further deviation, `plan.md`,
  `prd.md`, this ticket and `12-database-at-startup.md`) is updated, the
  change recorded in the design log's Implementation Results as a
  deviation from Q51.
- `apps/desktop/src/main/db/migrations/`: the type
  `Migration = { version: number; name: string; up: (db: DatabaseSync) => void }`
  and the ordered list, empty in 04.
- `migrateDatabase(db, migrations)` in `main/db/migrateDatabase/`:
  validates the list (versions 1 … n, no gap, no duplicate, else
  `The migrations are not numbered 1 to <n> without gaps or duplicates.`);
  refuses a stored `PRAGMA user_version` above n with
  `dashcash.db has schema version <n>, but this DashCash knows only up to <m>.`;
  then runs each pending `up` together with its `user_version` bump in one
  transaction, in order, so a failing one leaves the previous version and
  tables intact. A **Migration** is never edited once merged (Q33).
- Its tests run against real `node:sqlite` in memory or in a temporary
  file, with invented sample migrations.
- `.dependency-cruiser.js`: a new **Layer rule** forbids importing
  `node:sqlite` from any file outside `apps/desktop/src/main/db/`, tests
  included (Q47). `gates/layerRules/layerRules.test.ts` shows it
  forbidden from main outside `main/db/`, from a test outside it, from the
  renderer, the preload and `e2e/`, and allowed from `main/db/` and its
  tests.

This ticket is the approval to change `.dependency-cruiser.js` (the new
rule only) and `gates/layerRules/layerRules.test.ts`.

## Acceptance criteria

- [ ] Before the runner is built, a test of its own runs the pinned
      Electron with `ELECTRON_RUN_AS_NODE=1` and shows that `node:sqlite`
      loads and opens an in-memory database without an experimental
      warning and without a flag; should it fail, the driver is switched
      to `better-sqlite3` rebuilt for Electron and the docs are updated as
      described above (D1).
- [ ] A RED commit adds the runner's Vitest tests and the layer-rule gate
      test cases, and fails on them.
- [ ] Against real SQLite: an empty list leaves version 0; sample
      migrations run in order and set the version; an applied one does not
      run again; a failing one leaves the previous version and table set.
- [ ] A gap or a duplicate is refused with
      `The migrations are not numbered 1 to <n> without gaps or duplicates.`;
      a newer stored version is refused with
      `dashcash.db has schema version <n>, but this DashCash knows only up to <m>.`
- [ ] The committed migration list is empty.
- [ ] The layer-rule gate test shows `node:sqlite` forbidden from main
      outside `main/db/`, from a test outside it, from the renderer, the
      preload and `e2e/`, and allowed from `main/db/` and its tests.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-electron-window.md`

## User stories addressed

- User stories 45, 46, 47, 48, 49, 50, 51, 53, 103
