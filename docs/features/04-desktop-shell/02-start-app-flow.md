---
status: in-progress
---
# Start the app flow

## Parent PRD

`prd.md`

## What to build

The second half of the tracer bullet (plan Phase 1; PRD "Playwright",
"Workspace members and scripts" and "Gate tests"; design log Q9, Q37–Q40,
P1, P4): Playwright drives the **App build** and the first **User flow**,
"Start the app", proves that exactly one window opens, titled "DashCash".
The window already opens (`01-electron-window.md`); the RED commit fails
because the harness does not exist yet.

- `@playwright/test`, exact, a root dev dependency, the newest release at
  least 14 days old on the day of building (1.64.1 on 2026-11-07). No
  browser is downloaded: `_electron` launches the Electron binary already
  installed.
- `playwright.config.ts` at the root with exactly five keys (P4):
  `testDir: 'e2e'`, `retries: 0`, `forbidOnly: true`, `reporter: 'list'`,
  `use: { trace: 'retain-on-failure' }`. `grepInvert` joins as the sixth
  in `15-quarantined-tests-left-out.md`.
- The **App fixture** in `e2e/test-support/`: per test a fresh temporary
  **Data folder** passed as `DASHCASH_DATA_FOLDER`, the desktop member
  launched through `_electron.launch` with `ELECTRON_RENDERER_URL` removed
  from its environment, the app and its first window handed to the test,
  then the app closed and the folder deleted. Main honours the variable
  from `10-data-folder.md` on (P1).
- `e2e/start-app.spec.ts`, one test "Start the app": on a fresh **Data
  folder** exactly one window opens, titled "DashCash". Later tickets add
  their facts to this test (Q40).
- `gates/endToEnd/endToEnd.test.ts` (new gate folder): imports the config
  and pins its key set and each value.
- Scripts: `test:e2e` runs `playwright test`; `verify:full` is exactly
  `verify`, `build`, `test:e2e`, chained with `&&` (Q9).
  `gates/gateWiring/gateWiring.test.ts` pins **Verify full**.
- The root TypeScript project and ESLint cover `e2e/` and
  `playwright.config.ts`.
- Supply chain (Q49), as in `01-electron-window.md`: every licence the
  lockfile gains in the Notes, a permissive one on the **License
  allowlist**, any other stops the builder; every open **Advisory** an
  **Audit exception** with its reason, or the builder stops when a fix
  exists.

This ticket is the approval to create `playwright.config.ts` and
`gates/endToEnd/endToEnd.test.ts`; to add the `test:e2e` script, change
the `verify:full` script and add `@playwright/test` in the root
`package.json`; to change `package-lock.json`, the root `tsconfig.json`,
`gates/gateWiring/gateWiring.test.ts`, `quality/license-allowlist.json`
and `quality/audit-exceptions.json`; and to change `eslint.config.js`
only if `e2e/` or the config need it to lint green.

## Acceptance criteria

- [x] A RED commit holds `e2e/start-app.spec.ts` and the new gate tests,
      and fails on them.
- [x] End-to-end test for "Start the app" in `e2e/`: exactly one window,
      titled "DashCash".
- [x] `playwright.config.ts` holds exactly `testDir: 'e2e'`,
      `retries: 0`, `forbidOnly: true`, `reporter: 'list'` and
      `use: { trace: 'retain-on-failure' }`; the `endToEnd` gate test fails
      when a key is added or removed or a value changes.
- [x] The **App fixture** gives each test its own temporary folder, removes
      `ELECTRON_RENDERER_URL` from the app's environment, and closes the
      app and deletes the folder afterwards; no browser is downloaded.
- [x] `test:e2e` runs `playwright test`; `verify:full` is exactly
      `verify`, `build`, `test:e2e`; the gate wiring test fails on any
      other chain; `verify` is unchanged.
- [x] `npm run typecheck` and `npm run lint` cover `e2e/` and
      `playwright.config.ts`.
- [x] Every licence the lockfile gains is in the Notes and handled as
      above; `npm run check:licenses` and `npm run check:audit` pass.
- [x] `npm run verify:full` is green, "Start the app" included.

## Notes

- `@playwright/test` 1.64.1: 1.65.0 was published on 2026-11-05, under 14
  days before building (2026-11-13). No browser is downloaded; no script
  runs `playwright install`.
- The fixture declares `desktopFolder` as an option fixture (default
  `apps/desktop`) because Playwright needs a destructured fixture argument
  and ESLint's `no-empty-pattern` refuses an empty one.
- Licences the lockfile gains: Apache-2.0 (`@playwright/test`,
  `playwright`, `playwright-core`), already on
  `quality/license-allowlist.json`. `npm audit` shows no advisory beyond
  those already in `quality/audit-exceptions.json`.
- `eslint.config.js` needed no change: `e2e/` and `playwright.config.ts`
  lint green as they are.

## Blocked by

- Blocked by `01-electron-window.md`

## User stories addressed

- User stories 72, 75, 76, 77, 78, 79, 80, 81, 86
- User story 101 (without the quarantine filter)
- User story 102 (**Verify full**)
- User stories 104, 105 (Playwright)
