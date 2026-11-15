---
status: done
---
# Dev debug port

## Parent PRD

`prd.md`

## What to build

In `npm run dev`, DevTools tools can attach to the app; never anywhere
else (plan Phase 5; PRD "Main process: startup", `enableDebugPort`;
design log Q36, I1).

- `enableDebugPort(app, env)`: appends Chromium's
  `remote-debugging-port=9222` switch only when `readDevServerUrl` gives a
  URL, that is, unpackaged with `ELECTRON_RENDERER_URL` set; otherwise it
  appends nothing.
- `startApp` calls it before ready, after the sandbox and the scheme, in
  the design log's startup order.
- Vitest only (Q41); "Start the app" runs without the dev URL, so the port
  stays closed there.

## Acceptance criteria

- [x] A RED commit adds the Vitest tests and fails on them.
- [x] `enableDebugPort` appends the switch only when the app is unpackaged
      and `ELECTRON_RENDERER_URL` is set; packaged, or without the URL, it
      appends nothing.
- [x] The startup tests show the switch appended before ready.
- [x] `npm run dev` exposes port 9222 on loopback (checked by hand,
      recorded in the Notes).
- [x] `npm run verify:full` is green.

## Blocked by

- Blocked by `05-app-protocol.md`

## User stories addressed

- User stories 61, 62

## Notes

- First manual check failed: `npm run dev` started, but Chromium logged
  `bind() returned an error ... Cannot start http server for devtools`:
  another program (MediaMonkey) already listened on 127.0.0.1:9222, so the
  answer to `/json/version` did not come from the app.
- Manual check, repeated with port 9222 free: during `npm run dev`,
  `http://127.0.0.1:9222/json/version` answered with the user agent
  `DashCash/0.0.0 ... Electron/45.1.0`, `/json/list` listed one page titled
  `DashCash` at `http://localhost:5173/`, and `netstat` showed the port
  listening on `127.0.0.1:9222` only.
- For a later ticket: Port 9222 is a common default; another app
  (MediaMonkey) already held it on this machine. If the port is taken, the
  debug server does not open. Consider making the port configurable through
  an environment variable, or choosing a less common default.
