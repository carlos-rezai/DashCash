---
status: open
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

- [ ] A RED commit adds the Vitest tests and fails on them.
- [ ] `enableDebugPort` appends the switch only when the app is unpackaged
      and `ELECTRON_RENDERER_URL` is set; packaged, or without the URL, it
      appends nothing.
- [ ] The startup tests show the switch appended before ready.
- [ ] `npm run dev` exposes port 9222 on loopback (checked by hand,
      recorded in the Notes).
- [ ] `npm run verify:full` is green.

## Blocked by

- Blocked by `05-app-protocol.md`

## User stories addressed

- User stories 61, 62
