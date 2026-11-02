---
status: open
---
# License expressions

## Parent PRD

`prd.md`

## What to build

SPDX expressions in the **License allowlist** check (plan Phase 3; PRD
"Gate script modules", `checkLicenses`, SPDX evaluation; design log Q24,
A6), inside `scripts/checkLicenses/`. `A OR B` passes when one side is
allowed, `A AND B` when both are, parentheses group; `OR` and `AND` are
matched in upper case only; any other term, a `WITH` term included, is
compared as a whole against the allowlist. An expression with unbalanced
parentheses or a dangling operator fails as unreadable, naming
`<name>@<version>` and the value. No file outside `scripts/checkLicenses/`
changes.

## Between 03 and this ticket

`03-license-allowlist.md` ends green with `check:licenses` active in
**Verify**, because today's lockfile holds no SPDX expression (design log,
Implementation Results, D4). If 03 had to leave `check:licenses` out of
`verify` (it says when), this ticket switches it on: `verify` runs it right
after `check:docs-drift`, and the gate wiring test expects it there.

## Acceptance criteria

- [ ] The core's tests, on invented lockfiles, cover `OR` with one and with
      no allowed side, `AND` with both and with one allowed side,
      parentheses that change the result, a `WITH` term compared whole,
      lower-case `or` / `and` not read as operators, and an unreadable
      expression (unbalanced parentheses, a dangling operator).
- [ ] An unreadable expression is one violation naming the package and its
      licence value.
- [ ] `npm run check:licenses` still passes on today's lockfile.
- [ ] `npm run verify` and CI's `verify` job are green.

## Blocked by

- Blocked by `03-license-allowlist.md`

## User stories addressed

- User story 29
- User story 30 (unreadable expression)
