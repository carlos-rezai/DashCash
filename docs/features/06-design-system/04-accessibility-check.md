---
status: open
---
# Accessibility check on every story

## Parent PRD

`prd.md`

## What to build

Every **Story test** runs axe (plan Phase 2; PRD "Storybook", "Gate
tests"; design log Q29, Q30, A1, A5, P2).

- `@storybook/addon-a11y` at the root (Q39), added to `.storybook/main.ts`.
- The a11y parameters live in a module of their own in `.storybook/` that
  imports nothing and that the preview uses: `test: 'error'`, so any
  violation fails the **Story test** and **Verify**, and exactly one rule
  change, `{ id: 'color-contrast', reviewOnFail: true }`, so contrast
  failures show as "needs review" in the a11y panel instead of failing.
  The module joins `apps/desktop/tsconfig.web.json` (A1).
- `gates/storyTests/` imports that module and pins it, and pins
  `vitest.storybook.config.ts`: the Storybook plugin on `.storybook/`,
  browser mode, the Playwright provider, headless, exactly one Chromium
  instance (A5). The config pins hold already and pass in RED; the a11y
  module's pins fail.
- The Icon's **Stories** pass.

This ticket is the approval to change exactly: the root `package.json`
(the addon), `package-lock.json`, `apps/desktop/tsconfig.web.json`, to
create `gates/storyTests/`, and `quality/audit-exceptions.json` only for
an **Advisory** with no fix.

## Acceptance criteria

- [ ] A RED commit adds the `gates/storyTests/` tests; the a11y module's
      pins fail (missing module).
- [ ] `@storybook/addon-a11y` is an exact root dev dependency, the newest
      release at least 14 days old on the day of building; every licence
      the lockfile gains is listed in the ticket's Notes; a licence the
      **License allowlist** lacks stops the builder; an open **Advisory**
      gets an **Audit exception** with its reason, or the builder stops
      when a fix exists; `check:licenses` and `check:audit` pass.
- [ ] The a11y module holds `test: 'error'` and rule changes exactly
      `[{ id: 'color-contrast', reviewOnFail: true }]`, imports nothing,
      and the preview uses it.
- [ ] The gate test fails when `test` is not `'error'`, when a rule is
      added, removed or changed, and when any pinned setting of the
      story-test config changes.
- [ ] A **Story** with an unnamed control fails its **Story test** (shown
      in the ticket's Notes, never committed as a failing story).
- [ ] The **Mutation score** stays at or above the **Break threshold** of
      83 (`npm run test:mutation`).
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`

## User stories addressed

- User stories 109, 110, 111, 122
