---
status: in-progress
---
# Audit exception rules

## Parent PRD

`prd.md`

## What to build

The rules that keep the audit exceptions file a list of live risks (plan
Phase 4; PRD "Gate script modules", `checkAudit`; design log Q17 (c), A1,
A2), inside `scripts/checkAudit/`:

- An **Audit exception** whose **Advisory** the report no longer lists
  fails as stale: `audit exception names an advisory npm audit no longer
  reports`. An exception that is both expired and stale is reported once,
  as expired (A1).
- Two exceptions naming one advisory are one violation on the exceptions
  file, naming the duplicate id (A1).
- An advisory object whose `url` does not end in a GHSA id fails and cannot
  be excepted (A2).

No file outside `scripts/checkAudit/` changes.

## Between 05 and this ticket

`05-audit.md` ends green with `check:audit` active in **Verify** (design
log, Implementation Results, D4). This ticket adds rules to the active
gate; it starts no gate. The shipped exception is live, not stale, and
not duplicated, so `npm run check:audit` stays green.

## Acceptance criteria

- [ ] The core's table tests, on invented reports and GHSA ids with fixed
      dates, cover a stale exception, an exception both expired and stale
      (one violation, expired), two exceptions for one advisory (one
      violation naming the file and the id), and an advisory whose `url`
      holds no GHSA id (a violation of its own, which no exception
      lifts).
- [ ] Each of these violations is one line, as in the PRD's "Violation
      output" table.
- [ ] Tests never run the entry or touch the network.
- [ ] `npm run check:audit` still passes on the day of building.
- [ ] `npm run verify` and CI's `verify` job are green.

## Blocked by

- Blocked by `05-audit.md`

## User stories addressed

- User stories 17, 18, 22
- User story 21 (stale exceptions)
