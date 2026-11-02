---
status: done
---
# License allowlist

## Parent PRD

`prd.md`

## What to build

The licence gate end to end for plain licence ids (plan Phase 3; PRD "Gate
script modules", `checkLicenses`; design log Q21–Q26, A5–A7). SPDX
expressions follow in `04-license-expressions.md`; until then a `license`
value is compared as a whole, so an expression fails.

- `quality/license-allowlist.json`: a JSON array of exactly today's eight
  SPDX ids, `MIT`, `ISC`, `Apache-2.0`, `BSD-2-Clause`, `BSD-3-Clause`,
  `BlueOak-1.0.0`, `Python-2.0`, `MPL-2.0` (Q23).
- `scripts/checkLicenses/checkLicenses.ts` with its test beside it: the
  pure core `findLicenseViolations(lockfile: unknown, allowlist: unknown):
  Violation[]` judges every `packages` entry of the lockfile whose key
  holds a `node_modules/` segment and that is not `link: true`; the root
  and **Workspace member** entries are skipped (A5). A missing, non-string
  or empty `license` is "has no licence" (A6). The subject is
  `<name>@<version>`, the name taken from the key after its last
  `node_modules/`. A malformed allowlist (not an array, empty, a
  non-string or empty entry) is one violation with the allowlist file as
  subject (A7). The thin entry reads `package-lock.json` and the allowlist
  offline and ends through `runGate`.
- `package.json`: script `check:licenses`, and the `verify` script runs it
  right after `check:docs-drift`. `gates/gateWiring/gateWiring.test.ts`
  expects it there.

This ticket is the approval to create exactly
`quality/license-allowlist.json`, to change the `verify` script in
`package.json`, and to change the gate wiring test.

## Between this ticket and 04

This ticket ends with `npm run verify` and CI green, and `check:licenses`
active in **Verify** (design log, Implementation Results, D4). Every
licence in today's lockfile is a plain SPDX id, none an expression, so
comparing a value whole fails nothing. If `check:licenses` fails on an
SPDX expression on the day of building, `verify` does not run it yet:
this ticket adds the script and the wiring test expects it absent, and
`04-license-expressions.md` adds it to `verify` right after
`check:docs-drift`.

## Acceptance criteria

- [x] The core's tests, on invented lockfiles, cover an allowed, a
      disallowed and a missing licence, a non-string and an empty licence,
      nested `node_modules` entries checked, and the root,
      workspace-member and link entries skipped.
- [x] A malformed allowlist (not an array, empty, a non-string or an empty
      entry) is one violation naming the allowlist file.
- [x] Each violation names `<name>@<version>` and its licence
      (`licence "<value>" is not on the licence allowlist`), or "has no
      licence".
- [x] An allowed licence no package uses does not fail.
- [x] `npm run check:licenses` passes on today's lockfile without
      `node_modules` and without the network.
- [x] `verify` runs `check:licenses` right after `check:docs-drift`; the
      wiring test expects it there and fails when it moves or goes.
- [x] `npm run verify` and CI's `verify` job are green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 26, 27, 28, 31, 32, 33, 34
- User story 30 (no licence, non-string or empty licence)
