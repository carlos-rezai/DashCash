---
status: in-progress
---
# Renovate hold rules

## Parent PRD

`prd.md`

## What to build

Renovate stops proposing what the project cannot take yet (plan Phase 4;
PRD "Renovate"; design log Q15–Q18, A3).

- `renovate.json`: three **Hold rules** follow the Node rule, last in
  `packageRules`, in this order:
  - `@types/node` (manager `npm`) with `allowedVersions: "24.x"`;
  - `typescript` (manager `npm`), `matchUpdateTypes: ["major"]`,
    `enabled: false`;
  - `node` (managers `nvm` and `npm`), `matchUpdateTypes: ["major"]`,
    `enabled: false`.
  Minors and patches of TypeScript and Node still come; Node's still group
  into `update node`. No hold rule opens a PR, so none sets
  **Commit-message parts**.
- `gates/renovate/renovate.ts`: `findRenovateViolations(config,
  commitConfig, nodeVersion)` gains the text of `.nvmrc` as its third
  parameter (A3), read by the gate test. It fails when the `@types/node`
  cap's major differs from the major in `.nvmrc`, when the TypeScript or
  the Node hold is missing, when a hold comes before the Node rule, and
  when a hold reaches lockfile maintenance. The order check becomes: the
  Node rule comes after every other npm rule except the hold rules, and
  every hold rule (recognised by `enabled: false` or `allowedVersions`)
  comes after it.
- `gates/renovate/renovate.test.ts`: the committed `renovate.json` and
  `.nvmrc` pass; one failing sample per new rule.
- `renovate.json`'s `schedule` and the `lockFileMaintenance` schedule are
  widened to all of Monday (`"on monday"`). The hosted Renovate app runs
  only every few hours or days, and Renovate's first scheduled week showed
  no run inside the old window (before 6am, and before 4am for lockfile
  maintenance). The Renovate gate test checks both schedules (design log
  D1).

This ticket is the approval to change `gates/renovate/renovate.ts` and
`gates/renovate/renovate.test.ts`.

## Acceptance criteria

- [x] A RED commit adds the hold checks and their failing samples, and the
      committed `renovate.json` fails them.
- [x] The committed `renovate.json` and `.nvmrc` pass; the cap is `24.x`
      while `.nvmrc` holds 24.
- [x] A cap one major off `.nvmrc`, a missing TypeScript hold, a missing
      Node hold, a hold before the Node rule and a hold reaching lockfile
      maintenance each fail.
- [x] The TypeScript and Node holds match majors only; the Node group still
      groups minors and patches into `update node`.
- [x] The relaxed rule-order check allows exactly the three hold rules after
      the Node rule and nothing else; any other rule after the Node rule
      still fails. The review checks that the gate is not looser than that.
- [x] `renovate.json`'s `schedule` and the `lockFileMaintenance` schedule
      are widened to all of Monday (`"on monday"`). The hosted Renovate app
      runs only every few hours or days, and Renovate's first scheduled week
      showed no run inside the old window (before 6am, and before 4am for
      lockfile maintenance). The Renovate gate test checks both schedules.
- [x] The title checks of `03-renovate-commit-message-parts.md` still pass.
- [x] `npm run verify` is green.

## Blocked by

- Blocked by `03-renovate-commit-message-parts.md`

## User stories addressed

- User stories 20, 21, 22, 23, 24, 25, 28
