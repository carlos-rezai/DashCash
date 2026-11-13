---
status: done
---
# Session hardening

## Parent PRD

`prd.md`

## What to build

The window never leaves DashCash and the page is granted nothing (plan
Phase 2; PRD "Main process: startup", `hardenSession` and App origins;
design log Q15, I1, I2).

- `matchAppOrigin/` (I2): `listAppOrigins(devServerUrl)` returns
  `app://dashcash`, plus the dev server's origin when `readDevServerUrl`
  gave one, so the dev origin counts only when the app is unpackaged with
  `ELECTRON_RENDERER_URL` set; `isAppOrigin(url, origins)` compares a URL's
  origin exactly. `09-sender-check.md` reuses both.
- `hardenSession(...)`: prevents `will-navigate` and `will-redirect` to any
  URL off the **App origins**, denies every window open
  (`setWindowOpenHandler`), prevents `will-attach-webview`, and denies
  every permission request and every permission check of the session.
- `startApp` registers it when ready, before the window is created, in the
  design log's startup order.
- Navigation and permission denial stay in Vitest (Q41); "Start the app"
  stays green.

## Acceptance criteria

- [x] A RED commit adds the Vitest tests and fails on them.
- [x] The origin matcher accepts the **App origins** only; look-alike
      hosts (`app://dashcash.evil`, `app://evil-dashcash`), other schemes
      and other ports are refused.
- [x] The dev server's origin is an **App origin** only when unpackaged
      with `ELECTRON_RENDERER_URL` set.
- [x] Same-origin navigation is allowed; `will-navigate` and
      `will-redirect` off-origin are prevented; window opens are denied;
      `will-attach-webview` is prevented; every permission request and
      check is denied.
- [x] `npm run verify:full` is green.

## Blocked by

- Blocked by `05-app-protocol.md`

## User stories addressed

- User stories 11, 12, 13, 14
