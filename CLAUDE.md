# CLAUDE.md

DashCash: local-only Electron app for personal finances (CSV import, account history, projection to mortgage payoff, goals, streaks, headroom). Built around quality gates: the gates matter as much as the features.

@docs/conventions.md

## Definition of done

- `npm run verify` is green, and you report the result. For changes to a user flow: `npm run verify:full`.
- A failing check is fixed at its cause, never by weakening the check.

## Ask first

- Before changing gate files: `.github/`, `eslint.config.*`, `.prettierrc*`, `tsconfig*.json`, `.dependency-cruiser.*`, `vitest.config.*`, `playwright.config.*`, `stryker.config.*`, `quality/`, and the `verify*` / `test*` scripts.
- Before adding `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `.skip`, `.only` or a retry.
- Before a larger change: write a short plan and wait.
- When the spec is unclear or contradicts itself.

## Commands

```bash
npm run dev | storybook | test | test:stories | test:e2e | verify | verify:full
```

Run tools only through these scripts or `node_modules/.bin`, never `npx`.

## Architecture

- `packages/domain`: pure TypeScript, imports nothing else, no I/O, no `Date.now()`; "today" is a parameter.
- Renderer talks to main only through `packages/contract`; no Node or Electron imports in the renderer.
- SQLite access only in `main/db/`.
- Renderer layers: tokens → primitives → components → features → layouts → pages; import only downwards **(enforced)**.

## Money

- Integer cents, type `Cents`. Never a float or plain `number`.
- All money math lives in `packages/domain`, with tests. Format only for display, via `domain/src/money/`.

## Design

- Source of truth: `docs/design/SPEC.md`, `docs/design/prototype/`, `docs/concept.md`.
- Build 1:1 from the prototype; never redesign while building.
- Theme tokens only; no hard-coded colours, sizes or spacing.
- Stories cover every state (empty, loading, error, warning where relevant).

## Tests

- Deterministic: fixed clock, seeded data, no network, no order dependence.
- Invented data only. Never real bank data, IBANs or names.
- UI behaviour: story with a `play` function. Complete user flow: Playwright in `e2e/`.
- Say so when you wrote both the code and its tests.

## Never

- Commit to `main`, or commit `.env`, `*.db`, real CSVs or app data.
- Publish, release or push tags.
