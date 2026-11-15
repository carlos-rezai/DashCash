---
status: open
---
# App protocol serves only the host dashcash

## Parent PRD

`prd.md`

## What to build

The security fix, failing test first (plan Phase 1; PRD "App protocol";
design log Q5–Q7).

- `apps/desktop/src/main/registerAppProtocol/registerAppProtocol.test.ts`:
  the refused-URL table (`REFUSED_URLS`), which drives both the
  `resolveRendererPath` test and the `serveAppProtocol` test, gains the host
  cases: `app://other/index.html`, `app://dashcash:8080/index.html`,
  `app://x@dashcash/index.html`, a URL with an empty host, and an upper-case
  host where the URL parser keeps the case (if the parser lowers it, that
  URL is served and its case is left out of the table, with a line in the
  ticket's Notes). The RED commit shows each of them served.
- `resolveRendererPath(rendererFolder, url)` returns `undefined` for any
  URL whose parsed host is not exactly `dashcash` (the host holds the port,
  so a port is refused) or that holds user info, before its path rules.
  Its comment names the new refusals. `serveAppProtocol` keeps its single
  404 path.
- The protocol module imports nothing from `matchAppOrigin/`
  (`matchAppOrigin` imports `APP_ORIGIN` from it).
- Vitest only; "Start the app" still loads `app://dashcash/index.html` and
  is not changed.

## Acceptance criteria

- [ ] A RED commit adds the host cases to the refused-URL table, and the
      path function's test and the handler's test fail on them.
- [ ] `app://other/index.html`, `app://dashcash:8080/index.html`,
      `app://x@dashcash/index.html`, an empty host and an upper-case host
      the parser keeps each return `undefined` from `resolveRendererPath`
      and 404 from `serveAppProtocol`.
- [ ] Every existing served URL is still served and every existing refused
      URL (`..`, encoded `..`, absolute paths, another drive) still
      refused.
- [ ] The protocol module imports nothing from `matchAppOrigin/`.
- [ ] `npm run verify:full` is green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 1, 2, 3, 4, 5, 6, 7, 8
