---
status: open
---
# The Playwright config in one call

## Parent PRD

`prd.md`

## What to build

`playwright.config.ts` gets its patterns from one call of the shared
**Quarantine** reader (plan Phase 11; PRD "Quarantine reader"; design log
Q25).

- `scripts/reportViolations/reportViolations.ts` exports the one-line
  format `<subject>: <reason>` of a `Violation`; `reportViolations` uses it.
- `scripts/readQuarantine/readQuarantine.ts` exports
  `loadQuarantinePatterns(root: string): RegExp[]`: it loads and reads the
  **Quarantine** under `root`; on a load failure or any shape violation it
  throws one error whose message holds one `<subject>: <reason>` line per
  violation, in the shared format; otherwise it returns the patterns of
  `buildQuarantinePatterns`.
- `playwright.config.ts`: `grepInvert: loadQuarantinePatterns(process.cwd())`
  and no other code: no function of its own, no `throwViolations`. Its six
  keys and their values stay.
- `gates/endToEnd/endToEnd.test.ts` stays as it is: its messages and key
  checks are unchanged and green, and the sample tree that imports the
  config in a fresh process still throws one line per problem for a
  missing, non-JSON, non-array and malformed **Quarantine**.

This ticket is the approval to change `playwright.config.ts`, and
`gates/endToEnd/endToEnd.test.ts` only where its sample tree must carry the
files the config now imports; no assertion of it changes.

## Acceptance criteria

- [ ] A RED commit adds the tests of `loadQuarantinePatterns` and of the
      shared line format, which fail because they do not exist yet.
- [ ] An unreadable file, a non-array and a malformed entry each throw
      with every line; a valid file returns the patterns.
- [ ] `test:e2e` still fails with one line per problem on a broken
      **Quarantine**; the end-to-end gate test's messages and key checks
      stay unchanged and green.
- [ ] The config defines no function of its own.
- [ ] `npm run verify:full` is green.

## Blocked by

- Blocked by `02-quarantine-patterns.md`

## User stories addressed

- User stories 39, 40, 41
