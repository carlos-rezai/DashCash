---
status: done
---
# Lint gate

## Parent PRD

`prd.md`

## What to build

Typed ESLint as a **Gate** of **Verify**, without the project rules yet
(first half of plan Phase 4; PRD Implementation Decisions, "Prettier and
ESLint"): a flat `eslint.config.js` with `@eslint/js` recommended,
typescript-eslint `strictTypeChecked` with type information from the root
project, and `eslint-config-prettier` last; `docs/`, `node_modules/` and
build and test output are ignored. `lint` runs `eslint . --max-warnings 0`
and joins **Verify** after `format:check`; the code of tickets 01–03
passes it.

The config is tested in `gates/lint/lint.test.ts`, through
ESLint's Node API (`lintText` with a file path), with violating code passed
as text, never committed (Q22). Ticket 05 adds the project rules to this
config and test.

## Acceptance criteria

- [x] A sample breaking a typescript-eslint strict type-checked rule (for
      example a floating promise) is reported; its clean twin is not.
- [x] A sample that differs from Prettier's output only in formatting
      raises no ESLint report.
- [x] Files under `docs/` (the prototype's JavaScript included) are
      ignored.
- [x] `npm run lint` fails on any error or any warning and passes on the
      tree.
- [x] `verify` runs `lint` after `format:check`; the gate wiring test
      expects it there.
- [x] CI's `verify` job is green.

## Blocked by

- Blocked by `03-data-file-check.md`

## User stories addressed

- User story 11
- User stories 19, 20, 21, 28
