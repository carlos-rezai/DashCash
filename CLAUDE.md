# CLAUDE.md

DashCash: local-only Electron app for personal finances (CSV import, account history, projection to mortgage payoff, goals, streaks, headroom). Built around quality gates: the gates matter as much as the features.

@docs/conventions.md

Read when relevant: `docs/quality-gates.md` before adding or changing a gate, `docs/feature-checklist.md` before starting a feature.

## Definition of done

- `npm run verify` is green, and you report the result. For changes to a user flow: `npm run verify:full`.
- A failing check is fixed at its cause, never by weakening the check.

## Ask first

- Before changing gate files: `.github/`, `gates/`, `eslint.config.*`, `.prettierrc*`, `tsconfig*.json`, `.dependency-cruiser.*`, `vitest*.config.*`, `playwright.config.*`, `stryker.config.*`, `quality/`, and the `verify*` / `test*` scripts.
  - Exception: a ticket whose What to build or Acceptance criteria name a gate file is the approval to create or change exactly that file, for that ticket only. Every other change to a gate file still needs asking.
  - A ticket that approves a gate file also approves updating a gate test that pins that file's content, but only to pin the new content exactly. Never loosen a check this way: a pin may change, a check may not become weaker.
- Before changing anything under `.claude/`: skills, agents, hooks, `settings.json`. A ticket never counts as approval for `.claude/`.
- Before adding `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `.skip`, `.only` or a retry.
- Before a larger change: write a short plan and wait.
- When the spec is unclear or contradicts itself.
- When a failing test looks wrong rather than the implementation: the builder never edits the test; stop and report it.

## Commands

```bash
npm run dev | storybook | test | test:stories | test:e2e | verify | verify:full
```

Run tools only through these scripts or `node_modules/.bin`, never `npx`.

Run `git push` as its own command, never chained with other commands.

Search files with the Grep and Glob tools, not with grep, find or Select-String in Bash.

Edit files with the Edit and Write tools, not with sed or shell redirection in Bash.

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
- A prototype element's class carries its states from the prototype's `styles.css` (hover, focus-visible, caret): build and test those states too.
- Add no styling the prototype lacks, however sensible; if something beyond it seems needed, stop and report instead.
- Reuse an existing Theme token (e.g. `size.controlHeight`) before adding a new one.

## Tests

- Deterministic: fixed clock, seeded data, no network, no order dependence.
- Invented data only. Never real bank data, IBANs or names.
- UI behaviour: story with a `play` function. Complete user flow: Playwright in `e2e/`.
- Say so when you wrote both the code and its tests.
- Every prop and every style rule has a story that fails when it is removed.
- Confirm a new assertion fails without the change it covers before keeping it; an assertion that passes either way is dropped, not committed.
- `userEvent.hover` from `storybook/test` does not make Chromium apply `:hover`: check hover styles by reading the `:hover` rule, and drive focus for real with `userEvent.tab()`.
- A reviewer may temporarily change the code to prove a test fails without it, but restores it and confirms `git status --porcelain` is empty.

## Never

- Commit to `main`, or commit `.env`, `*.db`, real CSVs or app data.
- Publish, release or push tags.
- Add a `Co-Authored-By` line, or any other trailer or body, to a commit message.
- Work around a refusal: when a hook, a permission rule or a safety check denies an action, stop and report it. Never make the same change through another tool or command. The one exception: when the refusal itself names the allowed form (a push as its own command, say), using that form is not a workaround.