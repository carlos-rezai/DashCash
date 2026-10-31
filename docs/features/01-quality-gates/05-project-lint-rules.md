---
status: in-progress
---
# Project lint rules

## Parent PRD

`prd.md`

## What to build

The project rules of the ESLint config (second half of plan Phase 4; PRD
Implementation Decisions, "Prettier and ESLint"), between
typescript-eslint and `eslint-config-prettier`:

- `@typescript-eslint/no-explicit-any`;
- `no-console`, allowing only `warn` and `error` (A9);
- `@typescript-eslint/ban-ts-comment` for `@ts-ignore` and
  `@ts-expect-error`;
- `@vitest/eslint-plugin`'s no-focused-tests and no-disabled-tests;
- `linterOptions.reportUnusedDisableDirectives` as an error;
- for files under `packages/domain`: `Date.now()` and an argument-less
  `new Date()` forbidden, with a message saying that today is a parameter.

Each rule is proven in `eslint.config.test.ts` through `lintText` with a
file path; `npm run lint` keeps enforcing them in **Verify**, and the
existing code passes.

## Acceptance criteria

- [ ] One violating and one clean sample per project rule: `any`;
      `console.log` rejected while `console.error` and `console.warn` pass;
      `@ts-ignore` and `@ts-expect-error`; `.only` and `.skip` in a test;
      an unused `eslint-disable` directive.
- [ ] `Date.now()` and `new Date()` fail under a `packages/domain` path,
      with the "today is a parameter" message; `new Date(value)` passes
      there; both pass outside `packages/domain`.
- [ ] `npm run lint` passes on the tree.
- [ ] CI's `verify` job is green.

## Blocked by

- Blocked by `04-lint-gate.md`

## User stories addressed

- User stories 22, 23, 24, 25, 26, 27
