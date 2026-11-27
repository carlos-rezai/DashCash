---
status: done
---
# Storybook MCP and the README

## Parent PRD

`prd.md`

## What to build

Agents can look the components up (plan Phase 20; PRD "Storybook",
"Dependencies"; design log Q36, Q40, I6).

- `@storybook/addon-mcp` at the root (Q39), added to `.storybook/main.ts`,
  so the running dev server serves the **Storybook MCP** at
  `http://localhost:6006/mcp`, listing components and **Stories** with
  their documentation. The MCP returns no a11y results (design log D14):
  they stay with `npm run test:stories`. No `.mcp.json` is committed (Q36).
- `gates/storyTests/` gains a pin of `.storybook/main.ts` (I6): its addons
  are exactly `@storybook/addon-vitest`, `@storybook/addon-a11y` and
  `@storybook/addon-mcp`, and telemetry is off.
- `README.md`, Getting started: the `npm ci` comment names Chromium for the
  **Story tests** beside the **Electron binary**.

This ticket is the approval to change exactly: the root `package.json`
(the addon), `package-lock.json`, `gates/storyTests/` (the `main.ts` pin
only), and `quality/audit-exceptions.json` only for an **Advisory** with no
fix.

## Acceptance criteria

- [x] A RED commit adds the `main.ts` pin to `gates/storyTests/`, which
      fails at its assertion.
- [x] `@storybook/addon-mcp` is an exact root dev dependency, the newest
      release at least 14 days old on the day of building; every licence
      the lockfile gains is listed in the ticket's Notes; a licence the
      **License allowlist** lacks stops the builder; an open **Advisory**
      gets an **Audit exception** with its reason, or the builder stops
      when a fix exists; `check:licenses` and `check:audit` pass.
- [x] The pin fails when an addon is added or removed or telemetry is on.
- [x] With `npm run storybook` running, the MCP endpoint lists the
      components and **Stories**; it returns no a11y results, which stay
      with `npm run test:stories` (design log D14; the builder checks it
      against the running server, recorded in the ticket's Notes).
- [x] README's Getting started names Chromium beside Electron in `npm ci`;
      `check:docs-drift` passes.
- [x] `npm run verify` is green.

## Blocked by

- Blocked by `04-accessibility-check.md`

## Notes

- Version: `@storybook/addon-mcp` 10.6.5, exact. It is the newest release
  that is at least 14 days old (2026-11-26) and accepts the installed
  Storybook 10.6.5 (D8): 10.6.6 and 10.6.7 (16 days old) declare the peers
  `storybook@^10.6.6` and `^10.6.7`, 10.6.8 and 10.6.9 are under 14 days
  old. 10.6.5 was published 2026-10-27.
- Licences the lockfile gains: MIT (`@standard-schema/spec`,
  `@storybook/addon-mcp`, `@tmcp/adapter-valibot`, `@tmcp/session-manager`,
  `@tmcp/transport-http`, `@valibot/to-json-schema`, `esm-env`, `sqids`,
  `tmcp`, `valibot`) and ISC (`uri-template-matcher`). All are on the
  License allowlist; `check:licenses` passes.
- Advisory: none on the new packages; `check:audit` passes with no new
  Audit exception.
- MCP endpoint, checked against a running `npm run storybook` (stopped
  afterwards): `http://localhost:6006/mcp` initialises as
  `@storybook/addon-mcp` 10.6.5 and lists the tools `docs-list`,
  `docs-show`, `docs-show-story`, `stories-find-by-component`,
  `stories-changed`, `stories-preview`, `test-run` and
  `get-storybook-story-instructions`. `docs-list` lists all components and
  `docs-show primitives-chip` lists its **Stories**, props and story IDs.
  `test-run`, the only tool that returns a11y results, fails with "Failed
  to start Vitest": the addon-vitest looks up only `vitest.config.*`,
  `vite.config.*` or `vitest.workspace.*`, and the root `vitest.config.ts`
  holds no `storybookTest` plugin (it is in `vitest.storybook.config.ts`),
  so the project `storybook:<configDir>` is not found.
- The a11y part of the endpoint criterion is relaxed by the human (design
  log D14): the endpoint lists components and **Stories**; a11y results
  stay with `npm run test:stories`, in `npm run verify` and CI.

## User stories addressed

- User stories 119, 122, 124
