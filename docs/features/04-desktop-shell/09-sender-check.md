---
status: in-progress
---
# Sender check

## Parent PRD

`prd.md`

## What to build

Main answers only frames on the app's own origin (plan Phase 3; PRD "Main
process: IPC"; design log Q27, A5, I1, I2).

- `registerIpcHandlers(ipcMain, handlers, origins)` runs the **Sender
  check** before every handler: the request's sending frame must exist and
  its URL must pass `isAppOrigin` against the **App origins** from
  `listAppOrigins` (`06-session-hardening.md`). Otherwise the call rejects
  with `Refused <channel> from <origin>` and the handler never runs; a
  missing frame is refused the same way, so the check never fails open.
- `startApp` passes the same **App origins** the session uses, so the dev
  server's origin counts only when unpackaged with `ELECTRON_RENDERER_URL`
  set.
- "Start the app" stays green: its `app:info` call passes the check.

## Acceptance criteria

- [ ] A RED commit adds the Vitest tests and fails on them.
- [ ] A sender on the app's origin reaches its handler; another origin, a
      look-alike host and a missing frame are refused with
      `Refused <channel> from <origin>` and the handler is not called.
- [ ] In the **App build** the dev origin is refused; in dev it is
      accepted.
- [ ] `npm run verify:full` is green.

## Blocked by

- Blocked by `06-session-hardening.md`
- Blocked by `08-typed-bridge.md`

## User stories addressed

- User stories 29, 30, 31
