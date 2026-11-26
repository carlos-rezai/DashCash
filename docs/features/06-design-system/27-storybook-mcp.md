---
status: in-progress
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
  their documentation and a11y results. No `.mcp.json` is committed (Q36).
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

- [ ] A RED commit adds the `main.ts` pin to `gates/storyTests/`, which
      fails at its assertion.
- [ ] `@storybook/addon-mcp` is an exact root dev dependency, the newest
      release at least 14 days old on the day of building; every licence
      the lockfile gains is listed in the ticket's Notes; a licence the
      **License allowlist** lacks stops the builder; an open **Advisory**
      gets an **Audit exception** with its reason, or the builder stops
      when a fix exists; `check:licenses` and `check:audit` pass.
- [ ] The pin fails when an addon is added or removed or telemetry is on.
- [ ] With `npm run storybook` running, the MCP endpoint lists the
      components and **Stories** and returns a **Story**'s a11y results
      (the builder checks it against the running server, recorded in the
      ticket's Notes).
- [ ] README's Getting started names Chromium beside Electron in `npm ci`;
      `check:docs-drift` passes.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `04-accessibility-check.md`

## User stories addressed

- User stories 119, 122, 124
