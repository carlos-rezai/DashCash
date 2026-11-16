---
status: done
---
# Configurable debug port, then the ratchet

## Parent PRD

`prd.md`

## What to build

The developer can move the dev **Debug port**; then, as the last change
the issue-loop builds, the **Break threshold** rises to the measured
**Mutation score** (plan Phases 13 and 14; PRD "Debug port" and
"Ratchet"; design log Q28–Q31, A1, A5, P3; Assumptions from
prd-to-issues, I1).

**Debug port**

- `apps/desktop/src/main/enableDebugPort/enableDebugPort.ts`:
  `enableDebugPort(app, env): { cause: string } | undefined`. In dev only
  (`readDevServerUrl` defined) it reads `DASHCASH_DEBUG_PORT`: unset or
  empty appends `remote-debugging-port=9222`; a value matching
  `^[1-9]\d{0,4}$` and at most 65535 appends that port; anything else
  appends nothing and returns `{ cause: 'DASHCASH_DEBUG_PORT must be a whole
  number from 1 to 65535.' }`. Outside dev it appends nothing and returns
  `undefined`, whatever the variable holds.
- `apps/desktop/src/main/startApp/startApp.ts`: calls it right after
  resolving the **Data folder** and before the **Single-instance lock**
  (A1). A cause shows the **Startup error** with the resolved **Data
  folder** in its last line, and startup stops: no lock, no sandbox or
  scheme registration, no **Database**. `showStartupError` is unchanged. A
  valid port keeps the startup order of the plan's header.
- `README.md`, Getting started: one line naming `DASHCASH_DEBUG_PORT` and
  its default 9222.
- Vitest only; no **End-to-end test** changes (Q4).
- By hand, after `npm run verify:full` is green: `npm run dev` with
  `DASHCASH_DEBUG_PORT` set to a free port other than 9222, then
  `http://127.0.0.1:<port>/json/version` answers from the app and the port
  listens on loopback only; recorded in the ticket's Notes, as
  `docs/features/04-desktop-shell/14-dev-debug-port.md` did.

**Ratchet** (the builder's run, no test; I1)

- After the debug port is green, the builder runs `npm run test:mutation`
  the way `docs/features/03-mutation-testing/06-break-threshold.md` did (in
  the background, the log outside the repository, only the summary table
  and the exit code read), and sets `thresholds.break` in
  `stryker.config.js` to the measured **Mutation score** rounded down to a
  whole number. `high` 80 and `low` 60 stay; `gates/mutationTesting/` is
  unchanged (Q31, P3). Every earlier ticket's change to mutated code
  (`scripts/`, `gates/`) is in by then; this ticket's own code lives in
  `apps/desktop/`, which Stryker does not mutate.
- A score that rounds down to 81 leaves the threshold at 81, and the Notes
  say so. A score below 81 is answered by tests for this feature's
  **Surviving mutants** until it clears 81, never by a lower threshold
  (A5).
- A confirming `npm run test:mutation` with the new threshold exits 0.
- The measured score, the threshold and the confirming run go into the
  ticket's Notes.

This ticket is the approval to change exactly `thresholds.break` in
`stryker.config.js`.

## Acceptance criteria

- [x] A RED commit adds the port and startup tests, and fails on them.
- [x] Outside dev, nothing is appended for any value; in dev, unset,
      empty, 1, 9222 and 65535 append the expected port.
- [x] 0, 65536, `09222`, `-1`, `92.5`, ` 9222` and `abc` each return the
      cause and append no switch.
- [x] An invalid port shows the **Startup error** with the **Data folder**
      in its last line and takes no lock, registers no protocol and opens
      no **Database**; a valid one keeps the startup order.
- [x] `npm run dev` with another port exposes it on loopback (checked by
      hand, recorded in the ticket's Notes).
- [x] `README.md` names `DASHCASH_DEBUG_PORT` and 9222 in one line.
- [x] The builder's run, no test: `thresholds.break` is the measured
      score rounded down, at least 81; `high` stays 80 and `low` 60;
      `gates/mutationTesting/` is unchanged; `npm run test:mutation` exits
      0 with the new threshold; score and threshold are in the Notes.
- [x] `npm run verify:full` is green.

## Blocked by

The ratchet measures every other change of this feature (Q30):

- Blocked by `01-app-protocol-host.md`
- Blocked by `02-quarantine-patterns.md`
- Blocked by `03-renovate-commit-message-parts.md`
- Blocked by `04-renovate-hold-rules.md`
- Blocked by `05-workflow-readers.md`
- Blocked by `06-pull-request-finders.md`
- Blocked by `07-daily-finders.md`
- Blocked by `08-secret-scan-and-electron-install-finders.md`
- Blocked by `09-quarantine-check-takes-today.md`
- Blocked by `10-entry-date-rules.md`
- Blocked by `11-playwright-config-one-call.md`
- Blocked by `12-electron-binary-postinstall.md`

## User stories addressed

- User stories 47, 48, 49, 50, 51, 52
- User stories 53, 54, 55

## Notes

- Startup order: `startApp` calls `enableDebugPort` right after the **Data
  folder** resolves and before `app.setPath` and the lock, so a failed start
  leaves nothing behind, not even the `userData` path. The RED tests leave
  this open; the PRD says "right after resolving the Data folder".
- Manual check, with `DASHCASH_DEBUG_PORT=9333` in `npm run dev`:
  `http://127.0.0.1:9333/json/version` answered with the user agent
  `DashCash/0.0.0 ... Electron/45.1.0`, `/json/list` listed one page titled
  `DashCash` at `http://localhost:5173/`, and `netstat` showed the port
  listening on `127.0.0.1:9333` only. Port 9222 stayed held by another
  program (MediaMonkey), which is the case this ticket fixes. The app was
  stopped afterwards.
- `npm run verify:full` exited 0 (end-to-end test included) before the
  ratchet.
- Ratchet: measured **Mutation score** 83.95 (all files; 2124 killed, 10
  timeout, 235 survived, 173 no coverage). **Break threshold** set to 83
  (rounded down) in `stryker.config.js`; `high` 80 and `low` 60 unchanged;
  `gates/mutationTesting/` unchanged.
- Confirming `npm run test:mutation` with the threshold at 83: exit code 0,
  score 83.95, "greater than or equal to break threshold 83".
