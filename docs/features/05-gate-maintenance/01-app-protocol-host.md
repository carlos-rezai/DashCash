---
status: in-progress
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
  cases: `app://other/index.html`, `app://dashcash:8080/index.html`, a URL
  with an empty host, and an upper-case host where the URL parser keeps the
  case (if the parser lowers it, that URL is served and its case is left
  out of the table, with a line in the ticket's Notes). The user-info case
  `app://x@dashcash/index.html` is not in that table: a separate
  `resolveRendererPath` test, a pure function call, shows it refused (see
  Notes; design log D1). The RED commit shows each of them served.
- `resolveRendererPath(rendererFolder, url)` returns `undefined` for any
  URL whose parsed host is not exactly `dashcash` (the host holds the port,
  so a port is refused) or that holds user info, before its path rules.
  Its comment names the new refusals. `serveAppProtocol` keeps its single
  404 path.
- The protocol module imports nothing from `matchAppOrigin/`
  (`matchAppOrigin` imports `APP_ORIGIN` from it). A guard test in
  `registerAppProtocol.test.ts` checks this; it passes from the start and
  is a guard, not a RED test.
- Vitest only; "Start the app" still loads `app://dashcash/index.html` and
  is not changed.

## Acceptance criteria

- [ ] A RED commit adds the host cases to the refused-URL table, and the
      path function's test and the handler's test fail on them; it adds
      the user-info test of `resolveRendererPath`, which fails too.
- [ ] `app://other/index.html`, `app://dashcash:8080/index.html`, an empty
      host and an upper-case host the parser keeps each return `undefined`
      from `resolveRendererPath` and 404 from `serveAppProtocol`.
- [ ] `app://x@dashcash/index.html` returns `undefined` from
      `resolveRendererPath`, tested as a pure function; it is not in the
      handler's 404 table (see Notes).
- [ ] Every existing served URL is still served and every existing refused
      URL (`..`, encoded `..`, absolute paths, another drive) still
      refused.
- [ ] The protocol module imports nothing from `matchAppOrigin/`, checked
      by a guard test that passes from the start (a guard, not a RED test).
- [ ] `npm run verify:full` is green.

## Notes

- The handler never receives a URL with user info: `Request` refuses to
  construct one ("Request cannot be constructed from a URL that includes
  credentials", checked in Node, 2026-11-16), and the fake's `request(url)`
  builds a `Request` the way Electron does. So the user-info case is
  tested on `resolveRendererPath` alone, not in the handler's 404 table
  (design log D1).

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 1, 2, 3, 4, 5, 6, 7, 8
