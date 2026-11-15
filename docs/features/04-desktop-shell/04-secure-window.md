---
status: done
---
# Secure window

## Parent PRD

`prd.md`

## What to build

The window gets the size and the web preferences it ships with (plan
Phase 2; PRD "Main process: startup", `createMainWindow`; design log Q13,
Q15, I5).

- `fitWindowSize(workArea)`, pure, in `createMainWindow/`: 1440 × 900,
  each side capped on its own at the primary display's work area. The
  window's content size comes from it (`useContentSize`); no minimum size,
  no remembered bounds (Q13).
- The **Secure defaults**' web preferences, exactly those of Q15:
  `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`,
  `webSecurity: true`, `allowRunningInsecureContent: false`,
  `webviewTag: false`, `spellcheck: false`.
- `startApp` calls `app.enableSandbox()` before the app is ready, as the
  design log's startup order says.
- "Start the app" also asserts, with the window's web preferences read in
  main through Playwright's `evaluate`, context isolation and sandbox on
  and Node integration off, and that the page sees no `require` or
  `process`. Electron enables these by default, so these assertions may
  pass before the build; the RED commit then fails on its Vitest tests
  (I5).

## Acceptance criteria

- [x] A RED commit extends "Start the app" and adds the Vitest tests, and
      fails on the Vitest tests.
- [x] `fitWindowSize` returns 1440 × 900 for larger and equal work areas
      and caps each side on its own for smaller ones; the window's content
      size comes from it.
- [x] The window's web preferences are exactly the **Secure defaults** of
      Q15, `app.enableSandbox()` runs before ready, and the Vitest tests
      fail when any one is dropped or changed.
- [x] "Start the app" asserts context isolation and sandbox on, Node
      integration off, and no `require` or `process` in the page.
- [x] `npm run verify:full` is green.

## Blocked by

- Blocked by `02-start-app-flow.md`

## User stories addressed

- User stories 2, 3, 8, 15, 16, 82
