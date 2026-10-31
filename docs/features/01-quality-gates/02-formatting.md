---
status: done
---
# Formatting

## Parent PRD

`prd.md`

## What to build

Prettier as the first **Gate** of **Verify** (plan Phase 2; PRD
Implementation Decisions, "Prettier and ESLint"): Prettier's defaults with
single quotes, ignoring Markdown, `docs/design/`, the lockfile and build
and test output. `format:check` runs first in **Verify**, `format` writes
in place, and the tree is formatted once so the gate starts green. The
gate wiring test expects `format:check` first.

The config is tested beside it at the root, through Prettier's Node API
with the resolved project config, as the design log (Q22) places config
tests.

## Acceptance criteria

- [x] `.prettierrc.json` sets `singleQuote: true` on Prettier's defaults; a
      double-quoted TypeScript sample is reported as unformatted, its
      single-quoted twin as formatted.
- [x] `.prettierignore` leaves out `*.md`, `docs/design/`,
      `package-lock.json` and build and test output; Prettier reports each
      of them as ignored and never checks or rewrites them.
- [x] `npm run format:check` fails on any file Prettier would change and
      passes on the tree; `npm run format` fixes formatting in place.
- [x] `verify` runs `format:check` first; the gate wiring test expects it
      there and fails when it moves or goes.
- [ ] CI's `verify` job is green.

## Blocked by

- Blocked by `01-workspace-and-verify.md`

## User stories addressed

- User story 11
- User stories 15, 16, 17, 18
