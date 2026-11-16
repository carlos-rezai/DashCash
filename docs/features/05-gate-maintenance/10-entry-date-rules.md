---
status: in-progress
---
# Shared entry date rules

## Parent PRD

`prd.md`

## What to build

The **Entry date rules** live once (plan Phase 10; PRD "Entry date rules
and the Quarantine check"; design log Q24).

- `scripts/findEntryDateProblems/findEntryDateProblems.ts`, its test
  beside it: `findEntryDateProblems(dates: { added: number; expires:
  number }, today: number, maxDays: number): EntryDateProblem[]`, with
  `EntryDateProblem = { field: 'added' | 'expires'; why: string }`. The
  rules: `is later than today` on `added`; `is before added` on `expires`,
  else `is more than <N> days after added` on `expires`, `<N>` being
  `maxDays`. Dates arrive already read by `readCalendarDate`.
- `scripts/checkAudit/checkAudit.ts` calls it with 90 and
  `scripts/checkQuarantine/checkQuarantine.ts` with 30; each turns a
  problem into its own `entry <i>, field <f>: <why>` violation and keeps
  its own subject, its own expiry line (the **Audit** names the advisory,
  the **Quarantine check** the entry) and its order of lines. Neither
  writes the three rules out any more.
- The **Audit**'s and the **Quarantine check**'s existing tests stay
  unchanged and green; behaviour, messages and output are unchanged.

No gate file is changed.

## Acceptance criteria

- [ ] A RED commit adds the shared module's tests, which fail because it
      does not exist yet.
- [ ] A table per rule, the limit on both sides (`maxDays` and one day
      more), and both limits, 30 and 90.
- [ ] The **Audit**'s and the **Quarantine check**'s existing tests stay
      unchanged and green; neither check writes the three rules out any
      more.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `09-quarantine-check-takes-today.md`

## User stories addressed

- User stories 34, 35
