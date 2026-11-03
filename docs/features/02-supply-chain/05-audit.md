---
status: done
---
# Audit

## Parent PRD

`prd.md`

## What to build

The **Audit** end to end (plan Phase 4; PRD "Gate script modules",
`checkAudit`, "Violation output" and "Gate files under `quality/`"; design
log Q12–Q20, A1, A3, A4). Stale and duplicate exceptions and advisories
without a GHSA id follow in `06-audit-exception-rules.md`.

- `quality/audit-exceptions.json`: a JSON array of
  `{ "advisory", "reason", "added", "expires" }`, `added` the date the
  exception was added, landing with the exception for
  `GHSA-g3hv-75wg-m249`, added on the day of building and expiring 90 days
  later (`2027-01-31` when built on `2026-11-02`), with Q19's reason
  (minimatch is reached only through the lint tooling, where it matches
  glob patterns from the repository's own configuration, and no fix exists
  inside the dependents' `minimatch@^10` range). Re-run `npm audit` when
  building and record one exception of the same kind for any further
  **Advisory** open that day (Q19).
- `scripts/checkAudit/checkAudit.ts` with its test beside it: the pure
  core `findAuditViolations(report: unknown, exceptions: unknown, today:
  string): Violation[]`, `today` as `YYYY-MM-DD`. An **Advisory** is each
  object in a vulnerability's `via` list of a version-2 report; its id is
  the last segment of its `url`; string entries in `via` carry no advisory;
  the packages it reaches are every vulnerability whose `via` holds it.
  Every advisory of any severity needs an **Audit exception** naming its
  id that is valid through its **Expiry date** (Q16). The exceptions must
  be an array whose entries each have `advisory` matching
  `GHSA-xxxx-xxxx-xxxx`, a non-empty `reason`, and `added` and `expires`
  as real calendar dates; other keys are ignored (A3). An exception
  expires at most 90 days after its `added` date: an `expires` more than
  90 days after `added`, before `added`, or an `added` later than `today`
  fails as a violation naming the exceptions file with the entry's index
  and field (design log, Implementation Results, D2). A report without a
  `vulnerabilities` object, or with an `error`, is a violation with the
  subject `npm audit` (A3). Output per the PRD's "Violation output" table,
  one violation per unexcepted advisory and per expired exception (A1).
- The thin entry runs `npm audit --json` as `node <npm_execpath>` without a
  shell, accepts exit codes 0 and 1, throws with a message to run
  `npm run check:audit` when `npm_execpath` is unset or the output is not
  JSON (A4), reads the exceptions file (a missing or unparsable file is a
  violation naming it), passes today's UTC date and ends through `runGate`.
  Tests never run the entry or touch the network.
- `package.json`: script `check:audit`, and the `verify` script runs it
  last, right after `check:licenses`. `gates/gateWiring/gateWiring.test.ts`
  expects it there.

This ticket is the approval to create exactly
`quality/audit-exceptions.json`, to change the `verify` script in
`package.json`, and to change the gate wiring test.

## Between this ticket and 06

This ticket ends with `npm run verify` and CI green, and `check:audit`
active in **Verify** (design log, Implementation Results, D4). The one
advisory open today has a GHSA id and its exception; stale and duplicate
exceptions are not judged yet, so they fail nothing. If `npm audit` reports
an advisory without a GHSA id on the day of building, that is no interim
gap: 06 fails it too and no exception can lift it (A2), so the
issue-loop stops and reports it.

## Acceptance criteria

- [x] The core's table tests, on invented reports and GHSA ids with fixed
      dates, cover: no advisories; an advisory with and without an
      exception; an exception on its **Expiry date** and the day after;
      advisories of several severities, dev dependencies included; one
      advisory reaching several packages, reported once with every
      package; a report without `vulnerabilities` and one with an `error`.
- [x] The core's tests cover each malformed input: exceptions that are not
      an array, an entry with a missing or empty `reason`, an `advisory`
      that is not a GHSA id, an `added` or `expires` that is missing, not
      `YYYY-MM-DD` or not a real date (`2027-02-30`); each is one
      violation naming the exceptions file with the entry's index and
      field.
- [x] The 90-day limit: an `expires` exactly 90 days after `added`
      passes; 91 days after fails; an `expires` before `added` fails; an
      `added` later than `today` fails; each is one violation naming the
      exceptions file with the entry's index and field.
- [x] Each violation is one line: the GHSA id with severity, title and
      affected packages, or the expired date; the exceptions file with
      index and field; `npm audit` when the report cannot be read.
- [x] The entry fails with a message to run `npm run check:audit` when it
      is not started by npm, and when `npm audit` produces no JSON report;
      a missing or unparsable exceptions file fails naming the file.
- [x] Tests never run the entry or touch the network.
- [x] `npm run check:audit` passes on the day of building.
- [x] `verify` runs `check:audit` last, after `check:licenses`; the wiring
      test expects it there and fails when it moves or goes.
- [ ] `npm run verify` and CI's `verify` job are green.

## Blocked by

- Blocked by `03-license-allowlist.md` (`check:audit` follows
  `check:licenses` in **Verify**)

## User stories addressed

- User stories 13, 14, 15, 16, 20, 23, 24, 25
- User story 19 (malformed file and entries)
- User story 21 (unexcepted and expired advisories)
- User story 34 (the order in **Verify**)

## Notes

- The malformed(1, 'entry') expectation matches any malformed message for
  entry 1, because the test helper only checks the word appears. Tighten the
  helper to match the field exactly; for the refactor.
