---
status: done
---
# Cents and the money format in the domain

## Parent PRD

`prd.md`

## What to build

The domain's first money: a branded **Cents** type and the one **Money
format** (plan Phase 5, the domain; PRD "Domain member"; design log
Q16–Q18, I1).

- `packages/domain` becomes the **Workspace member** `@dashcash/domain`:
  private, `"type": "module"`, version `0.0.0`, `exports`
  `"./*": "./src/*.ts"`, its own `tsconfig.json` like the contract's, and
  `tsc -p packages/domain/tsconfig.json` in `typecheck`. The desktop member
  depends on it, so the renderer imports
  `@dashcash/domain/money/formatCents/formatCents` by module path.
- `money/cents/`: `Cents = number & { readonly __brand: 'Cents' }` and
  `toCents(value: number): Cents`, which returns a safe integer (0,
  negatives and the safe limits included) and throws a `RangeError` naming
  the value otherwise.
- `money/formatCents/`: `formatCents(cents, { whole?, sign?: 'auto' |
  'always' | 'none' })`, each rule of Q18 a domain test.

This ticket is the approval to change exactly: the root `package.json`
(`typecheck`), `apps/desktop/package.json` (`@dashcash/domain`),
`package-lock.json`, to create `packages/domain/package.json` and
`packages/domain/tsconfig.json`, and to change
`gates/verifyScripts/verifyScripts.test.ts` to pin the new `typecheck`
command.

## Acceptance criteria

- [x] A RED commit adds the domain tests and the changed `typecheck` pin,
      which fail.
- [x] `@dashcash/domain` is private, `"type": "module"`, version `0.0.0`,
      exports each module by its path; `npm run typecheck` covers it, pinned
      by the **Gate wiring** test; it imports nothing outside itself.
- [x] `toCents` returns safe integers, 0, negatives and the safe limits
      unchanged, and throws a `RangeError` naming the value for fractions,
      `NaN`, infinities and unsafe integers.
- [x] `formatCents` has a table per rule of Q18: `1.234,56 €` grouping and
      two decimals, `whole` (`30.000 €`), U+00A0 before `€`, U+2212 for
      negatives (`−86,40 €`), `always` and `none`, zero without sign, −40
      cents whole as `−0 €`.
- [x] The **Mutation score** stays at or above the **Break threshold** of
      83 (`npm run test:mutation`).
- [x] `npm run verify` is green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 19, 20, 21, 22, 23, 24, 25, 26, 27
