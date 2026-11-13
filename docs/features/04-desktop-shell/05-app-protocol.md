---
status: done
---
# App protocol

## Parent PRD

`prd.md`

## What to build

The **App build** serves its page from `app://dashcash` instead of
`file://` (plan Phase 2; PRD "Main process: startup",
`registerAppProtocol`; design log Q16, P2).

- `registerAppProtocol(...)`: the scheme `app` registered as privileged,
  standard and secure before the app is ready; when ready, its handler
  serves files of the built renderer folder through a pure
  `resolveRendererPath(rendererFolder, url)`, which returns the file's
  path, or `undefined` for any path that resolves outside the folder. The
  handler answers `undefined` with 404.
- `startApp` registers the scheme before ready and the handler when ready,
  in the design log's startup order.
- `createMainWindow` loads `app://dashcash/index.html` in the **App
  build**, and the dev server URL in dev (`readDevServerUrl`); the file
  load of `01-electron-window.md` is gone.
- "Start the app" stays green with the page served through the protocol;
  the path check and the 404 stay in Vitest (Q41).

## Acceptance criteria

- [x] A RED commit adds the Vitest tests and fails on them.
- [x] `resolveRendererPath` serves files inside the renderer folder and
      returns `undefined` for `..`, encoded `..`, absolute paths and paths
      on another drive or root; the handler answers those with 404.
- [x] The scheme is registered privileged, standard and secure before
      ready; the handler is registered when ready.
- [x] The **App build** loads `app://dashcash/index.html`; dev loads the
      dev server URL; no file load remains.
- [x] `npm run verify:full` is green.

## Blocked by

- Blocked by `04-secure-window.md`

## User stories addressed

- User stories 9, 10
