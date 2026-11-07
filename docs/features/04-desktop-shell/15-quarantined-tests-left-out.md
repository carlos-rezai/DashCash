---
status: open
---
# Quarantined tests left out

## Parent PRD

`prd.md`

## What to build

A flaky end-to-end test can be taken out of the run before one exists
(plan Phase 6; PRD "Quarantine", "Playwright" and "Gate tests"; design log
Q43, Q44, Q46, A6–A9, I3, I6). The **Quarantine check** that ends a
quarantine follows in `16-quarantine-check.md`.

- `scripts/readCalendarDate/` (A7, I3, I6): the audit check's private
  `readDate` moves here unchanged as `readCalendarDate`, with its own
  tests; `scripts/checkAudit/checkAudit.ts` uses it, its behaviour and its
  tests unchanged.
- `quality/flaky-quarantine.json`, committed as `[]`. An entry is
  `{ file, title, ticket, owner, added, expires }` (Q43).
- `scripts/readQuarantine/` (A8, I6): `readQuarantine(quarantine)` returns
  the well-formed entries and the shape violations, each with the subject
  `quality/flaky-quarantine.json` and the reasons of A6: not an array
  (`must be an array of quarantine entries`), a missing or empty field
  (`entry <i>, field <f>: must not be empty`), a date that is not a real
  `YYYY-MM-DD` (`entry <i>, field <f>: must be a real YYYY-MM-DD date`).
  `buildQuarantinePatterns(entries)` turns each entry into one regular
  expression from its file (relative to `e2e/`) and its title, both
  escaped, so a title matches literally and only in its own file. The date
  and file rules stay in the **Quarantine check**.
- `playwright.config.ts` reads the committed file, throws on any shape
  violation or unreadable file, so `test:e2e` fails rather than running or
  skipping tests silently, and always sets `grepInvert` to the reader's
  patterns, an empty list for an empty **Quarantine**; six keys in all
  (A9).
- `gates/endToEnd/endToEnd.test.ts` pins the sixth key and the key set,
  feeds invented entries to the reader, and shows the patterns leave out
  exactly the quarantined test.

This ticket is the approval to create `quality/flaky-quarantine.json`, to
add `grepInvert` and the reading of the **Quarantine** to
`playwright.config.ts`, and to change `gates/endToEnd/endToEnd.test.ts`.

## Acceptance criteria

- [ ] A RED commit adds the readers' tests and the gate test changes, and
      fails on them.
- [ ] `readCalendarDate` accepts real dates and refuses malformed and
      impossible ones; the audit check uses it and its existing tests stay
      unchanged and green.
- [ ] `quality/flaky-quarantine.json` is `[]`.
- [ ] `readQuarantine` reports a non-array, a missing or empty field and a
      date that is not a real `YYYY-MM-DD` with the lines of A6, and
      returns the well-formed entries.
- [ ] A quarantined title in its file matches its pattern; the same title
      in another file, and a title with regex characters matched loosely,
      do not.
- [ ] The config holds exactly six keys, `grepInvert` equal to the
      reader's patterns for the committed file; the gate test fails when
      the filter is removed or a seventh key appears.
- [ ] The config throws on a malformed **Quarantine**.
- [ ] The **Mutation score** stays at or above the **Break threshold** of
      81 (`npm run test:mutation`, run by the builder, score in the Notes).
- [ ] `npm run verify:full` is green.

## Blocked by

- Blocked by `02-start-app-flow.md`

## User stories addressed

- User stories 89, 90, 91, 92, 93
- User story 101 (the quarantine filter)
