---
status: done
---
# Electron window

## Parent PRD

`prd.md`

## What to build

The first half of the tracer bullet (plan Phase 1; PRD "Workspace members
and scripts" and "Main process: startup"; design log Q5–Q14, Q28, Q52,
A1, A3, P2, P3, I1, I4): DashCash starts and opens one window. Playwright,
`test:e2e` and **Verify full** follow in `02-start-app-flow.md`.

- `apps/desktop/package.json`: `@dashcash/desktop`, private,
  `"type": "module"`, `productName` "DashCash", `version` `0.0.0`, `main`
  at the built main entry, scripts `dev` (`electron-vite dev`) and `build`
  (`electron-vite build`). `electron`, `electron-vite` and `vite` are its
  exact dev dependencies, each the newest release at least 14 days old on
  the day of building (on 2026-11-07: `electron` 45.0.0, `electron-vite`
  6.0.0, `vite` 8.3.5; design log, Background).
- Root `package.json`: scripts `dev` and `build` run the desktop member's.
  `verify` and `verify:full` are unchanged.
- `apps/desktop/electron.vite.config.ts`: main entry
  `src/main/main.ts`, renderer entry `src/renderer/index.html`, output in
  `apps/desktop/out/`. No preload yet (`08-typed-bridge.md`).
- `apps/desktop/src/renderer/index.html`: `<title>DashCash</title>`, no
  script, no screen (Q3). The **CSP** follows in `07-content-security-policy.md`.
- Main, every module but the entry taking its Electron objects as
  parameters (A1): `main.ts` imports `electron` and calls `startApp` and
  nothing else; `startApp(electron, env)` creates the window when the app
  is ready and quits when all windows are closed, keeping Electron's
  default menu (Q14); `createMainWindow` creates one hidden window titled
  "DashCash", shows it on `ready-to-show`, and loads the built
  `index.html` as a file, or the dev server URL in dev (P2; the **App
  protocol** replaces the file load in `05-app-protocol.md`).
- `readDevServerUrl(app, env)` (I1): the `ELECTRON_RENDERER_URL` when the
  app is not packaged and the variable is set, else `undefined`.
- TypeScript (Q12): a Node project (main, preload, the build config, with
  Node's and Electron's types) and a DOM project (renderer, without Node's
  types) for the desktop member, each extending `tsconfig.base.json`;
  `npm run typecheck` covers both and writes nothing tracked. How the
  script reaches the member projects is this ticket's choice. The DOM
  project has no TypeScript file until 05: TypeScript reports a project
  without inputs as an error (TS18003) unless its config has `files` or
  `references`, and no placeholder file is committed to the renderer (I4).
- `.dependency-cruiser.js`: `options.exclude` gains `apps/desktop/out/`
  (A3, P3); `gates/layerRules/layerRules.test.ts` shows a file under that
  folder is not cruised.
- Supply chain (Q49): every licence the lockfile gains is listed in this
  ticket's Notes; a permissive one joins `quality/license-allowlist.json`,
  any other stops the builder for the human. Every open **Advisory** gets
  an **Audit exception** in `quality/audit-exceptions.json` with its
  reason and a 90-day expiry, or the builder stops when a fix exists. An
  Electron patch with a security fix younger than 14 days stops the
  builder.

This ticket is the approval to create `apps/desktop/package.json` and the
desktop member's `tsconfig*.json`; to add the `dev` and `build` scripts
and change the `typecheck` script in the root `package.json`; to change
`package-lock.json`, the root `tsconfig.json`,
`.dependency-cruiser.js` (the `out/` exclude only),
`gates/layerRules/layerRules.test.ts`, `quality/license-allowlist.json`
and `quality/audit-exceptions.json`; and to change `eslint.config.js` only
if the new member needs it to lint green.

## Acceptance criteria

- [x] A RED commit holds the new Vitest tests and the layer-rule gate
      test case, and fails on them.
- [x] `@dashcash/desktop` is private, `"type": "module"`, `productName`
      "DashCash", version `0.0.0`, `main` at the built main entry, scripts
      `dev` and `build`; `electron`, `electron-vite` and `vite` are its
      exact dev dependencies at the newest releases at least 14 days old on
      the day of building.
- [x] `npm run build` writes main and renderer into `apps/desktop/out/`;
      `npm run dev` opens the window with hot reload (checked by hand,
      recorded in the Notes).
- [x] Only `main.ts` imports `electron` as a value; Vitest tests drive
      `startApp` and `createMainWindow` with fake Electron objects: window
      hidden until `ready-to-show`, title "DashCash", the build's page and
      the dev URL, quit when all windows are closed, no custom menu.
- [x] `readDevServerUrl` returns the URL only when unpackaged with
      `ELECTRON_RENDERER_URL` set; packaged, unset or empty, `undefined`.
- [x] `npm run typecheck` covers both desktop projects and writes nothing
      tracked; a temporary renderer file naming `process` fails it
      (checked by hand, recorded in the Notes, file removed).
- [x] `.dependency-cruiser.js` excludes `apps/desktop/out/`; the gate test
      shows a file there is not cruised; after a local build
      `npm run lint:deps` stays green.
- [x] Every licence the lockfile gains is in the Notes and handled as
      above; `npm run check:licenses` and `npm run check:audit` pass.
- [x] `npm run verify` is green.

## Notes

- npm install did not download the Electron binary; the first run did.
  Make sure the binary is in place after npm ci, before any test or
  end-to-end run, so no test downloads Electron. Check it in CI too.
- Electron 45.1.0 per the 14-day rule; 45.2.x/45.3.x security fixes arrive
  through Renovate once 14 days old, well before feature 20 builds the first
  installer. The app loads only its own local files (loadFile until ticket
  05, then app://dashcash), so the Chromium fixes do not apply to an exposed
  surface yet.
- `skipLibCheck` is set in `apps/desktop/tsconfig.node.json` only:
  electron-vite's type files import the optional peer `@swc/core`, which is
  not installed. No other tsconfig skips library checks.
- Hand check, `npm run dev`: the window opens and shows a loaded page
  (checked with a temporary visible line in `index.html`, removed before
  this commit).
- Hand check, hot reload: editing the renderer updates the window without
  a restart.
- Hand check, `npm run build`: writes `apps/desktop/out/main/main.js` and
  `apps/desktop/out/renderer/index.html`; `npm run lint:deps` stays green
  afterwards.
- Hand check, typecheck: a temporary `apps/desktop/src/renderer/tmpProbe.ts`
  naming `process` failed `npm run typecheck` with TS2591; file removed.
  The script writes nothing tracked.
- Licences the lockfile gains: MIT, ISC, Apache-2.0, all already on
  `quality/license-allowlist.json`. `npm audit` shows no advisory beyond
  those already in `quality/audit-exceptions.json`.
- `gates/gateWiring/gateWiring.test.ts` pins the new `typecheck` script
  exactly (approved by the human for this ticket).

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 1, 4, 5, 6, 7, 64, 65, 66, 67, 73, 74, 106
- User story 63 (the desktop member)
- User story 71 (the desktop projects)
- User stories 104, 105 (Electron, electron-vite and Vite)
