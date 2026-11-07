---
status: in-progress
---
# Licence check fails closed

## Parent PRD

`prd.md`

## What to build

The licence check **Fails closed** on a lockfile it cannot judge (plan
Phase 1; PRD "Licence check core"; design log Q5–Q10, A3). Today
`findLicenseViolations` in `scripts/checkLicenses/checkLicenses.ts` returns
no violation when the lockfile is not a plain object or its `packages` is
not one, so `npm run check:licenses` passes without judging a package.

- RED first, committed before the fix: in
  `scripts/checkLicenses/checkLicenses.test.ts`, a table of malformed
  lockfiles with a valid allowlist (`null`, an array, a string, a number;
  an object whose `packages` is missing, `null`, an array or a string),
  each giving exactly the one lockfile violation; a malformed allowlist
  with a malformed lockfile giving both, the allowlist's first; a lockfile
  whose `packages` is an empty object giving none. In the existing entry
  suite, one test writes a lockfile without `packages` into a fresh
  temporary folder and expects exit 1 and the line
  `package-lock.json: must be an object with a packages object` (A3).
- Then the core: `findLicenseViolations(lockfile: unknown, allowlist:
  unknown): Violation[]`, signature unchanged. A malformed allowlist stays
  one violation. A lockfile that is not a plain object (the existing
  `isRecord`, an array is not one), or whose `packages` is not one, is one
  violation with subject `package-lock.json` and reason `must be an object
  with a packages object`. Both malformed: both violations, allowlist
  first. Packages are judged only when both inputs are valid.
- The entry is unchanged: a missing or unparsable lockfile still fails
  through `readJson` and `runGate` (Q10).

Row 03 of `docs/feature-checklist.md` already names the licence fix (it
was added with the design log); it stays as it is.

This ticket names no gate file.

## Acceptance criteria

- [ ] A RED commit holds the new core and entry tests and fails on them,
      before the fix.
- [ ] A lockfile that is `null`, an array, a string or a number, and one
      whose `packages` is missing, `null`, an array or a string, each give
      exactly `package-lock.json: must be an object with a packages object`
      with a valid allowlist.
- [ ] A malformed allowlist with a malformed lockfile gives both
      violations, the allowlist's first; a malformed allowlist with a valid
      lockfile still gives its one violation (the existing table, unchanged).
- [ ] A lockfile whose `packages` is an empty object gives no violation.
- [ ] `npm run check:licenses` exits 1 with that one line on a lockfile
      without `packages`, shown by the entry test in a temporary folder.
- [ ] A missing or unparsable lockfile still fails through the entry's
      existing error handling; the entry's code is unchanged.
- [ ] Row 03 of `docs/feature-checklist.md` names the licence fix.
- [ ] `npm run check:licenses` passes on the repository's lockfile, and
      `npm run verify` is green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 1, 2, 3, 4, 5, 6, 7, 8, 9
- User story 44
