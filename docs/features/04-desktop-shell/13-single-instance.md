---
status: open
---
# Single instance

## Parent PRD

`prd.md`

## What to build

Two copies of DashCash never share a **Database** (plan Phase 5; PRD
"Main process: startup", `lockSingleInstance`; design log Q29, Q35, Q41).

- `lockSingleInstance(app, getWindow)`: requests the **Single-instance
  lock** and returns whether this process holds it; when refused, the app
  quits. On `second-instance` it restores the window if minimised and
  focuses it, or does nothing when there is no window yet.
- `startApp` takes the lock right after the **Data folder** is resolved and
  `userData` set, so the lock follows the **Data folder**; a second process
  stops there, before the folder, the **Database** or a window.
- Vitest only (Q41); "Start the app" stays green with each test holding
  its own lock.

## Acceptance criteria

- [ ] A RED commit adds the Vitest tests and fails on them.
- [ ] `lockSingleInstance`: lock held returns true; lock refused quits;
      `second-instance` with a minimised window restores and focuses it,
      with no window does nothing.
- [ ] The startup tests show the lock taken after the **Data folder** is
      resolved and before the **Database** or any window, and the second
      process stopping there.
- [ ] `npm run verify:full` is green.

## Blocked by

- Blocked by `12-database-at-startup.md`

## User stories addressed

- User stories 57, 58, 59, 60
