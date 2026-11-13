---
status: in-progress
---
# Typed bridge

## Parent PRD

`prd.md`

## What to build

The page asks main for exactly what the **Contract** lists, and the first
**Channel**, `app:info`, answers with the **App version** (plan Phase 3;
PRD "Contract", "Preload", "Main process: IPC" and "Workspace members and
scripts"; design log Q11, Q19–Q24, Q52, A1, A2). The **Sender check**
follows in `09-sender-check.md`.

- `packages/contract/package.json`: `@dashcash/contract`, private,
  `"type": "module"`, `exports` at its TypeScript source; a TypeScript
  project extending `tsconfig.base.json`, covered by `npm run typecheck`.
- `packages/contract/src/channels/`: `AppInfo = { version: string }`,
  `ChannelMap` with `'app:info': { request: undefined; response: AppInfo }`,
  `Channel`, `CHANNELS`, `isChannel(value: unknown): value is Channel` and
  `DashCashBridge`, shaped as in the PRD. It imports nothing. `app:info`
  takes no request, so no request guard yet (Q23).
- Preload: `createBridge(invoke, isChannel): DashCashBridge` rejects a
  channel `isChannel` refuses with `Unknown channel: <channel>` without
  calling `invoke`, and otherwise forwards channel and request.
  `preload.ts` imports `electron` and exposes
  `createBridge(ipcRenderer.invoke, isChannel)` as `dashcash` through
  `contextBridge.exposeInMainWorld`, nothing else.
- electron-vite builds the preload from `src/preload/preload.ts` as one
  CommonJS file with the **Contract** bundled in, and bundles
  `@dashcash/*` into main as well (A2, story 68). Main and preload import
  the **Contract** by package name.
- Main: `registerIpcHandlers(ipcMain, handlers)` takes a mapped type with
  one handler per **Channel**, so a missing handler fails the type check,
  and registers each with `ipcMain.handle`; a handler that throws rejects
  the page's promise with its message, no error envelope (Q24).
  `getAppInfo(app)` returns `{ version: app.getVersion() }` and ignores any
  argument. `startApp` registers the handlers when ready, before the
  window; the window loads the preload with the sandbox on.
- "Start the app" also asserts that `window.dashcash.invoke('app:info')`
  resolves with `{ version }` equal to `apps/desktop/package.json`'s
  version, read from that file, never a literal.

This ticket is the approval to create `packages/contract/package.json` and
its `tsconfig.json`; to change the desktop member's `package.json` and
`tsconfig*.json`, the root `tsconfig.json`, the `typecheck` script and
`package-lock.json` as far as the new member needs; and to change
`eslint.config.js` only if the new member needs it to lint green.

## Acceptance criteria

- [ ] A RED commit extends "Start the app" and adds the Vitest tests, and
      fails on them.
- [ ] `@dashcash/contract` is private, `"type": "module"`, its `exports`
      at its source; it imports nothing; `npm run typecheck` covers it;
      main and preload import it by package name.
- [ ] `isChannel` accepts every entry of `CHANNELS` and refuses other
      strings and non-strings.
- [ ] `createBridge` forwards a listed channel with its request and
      rejects an unknown one with `Unknown channel: <channel>` without
      calling `invoke`.
- [ ] The **Preload** exposes only `dashcash` with `invoke`, never
      `ipcRenderer`; the **App build** emits it as CommonJS with the
      **Contract** bundled, and the window loads it with the sandbox on.
- [ ] `registerIpcHandlers` registers one `handle` per **Channel**; a
      throwing handler rejects with its message.
- [ ] `getAppInfo` returns the fake app's version and ignores any
      argument.
- [ ] "Start the app" asserts that `invoke('app:info')` resolves with
      `{ version }` equal to `apps/desktop/package.json`'s version, read
      from the file.
- [ ] `npm run verify:full` is green.

## Blocked by

- Blocked by `04-secure-window.md`

## User stories addressed

- User stories 21, 22, 23, 24, 25, 26, 27, 28, 32, 33, 34, 68, 69, 70, 84
- User story 63 (the contract member)
- User story 71 (the contract project)
