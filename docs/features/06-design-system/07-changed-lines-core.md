---
status: done
---
# Changed lines measured against the reports

## Parent PRD

`prd.md`

## What to build

The pure core of **Changed-lines coverage** (plan Phase 4, the core; PRD
"Coverage on changed lines"; design log Q33, Q34, A2, A3, A4, I1), in
`scripts/checkCoverage/`, with no I/O:

- `findChangedLines(diff)`: a zero-context unified diff (`git diff -U0`)
  into the added line numbers per file; a deleted line adds nothing, a
  changed line counts as added.
- `readLcov(text)`: an LCOV report into the coverable lines and their hits
  per file.
- `findCoverageViolations(changed, reports, threshold)`: a line is covered
  when either report counts a hit on it; a changed line no report lists is
  not coverable and does not count; a changed file in neither report is a
  violation ("not measured; run `npm test` and `npm run test:stories`",
  A3). Below the **Coverage threshold** it returns A4's summary
  `changed lines: <covered> of <coverable> covered (<p> %), below the
  threshold of <t> %` and one `<path>: lines <a>, <b>–<c> not covered`
  per file, ranges joined; at or above it, or with no coverable changed
  lines, nothing.

Untracked files reach the core as every line added; the entry
(`08-changed-lines-coverage-gate.md`) builds that input. Touches no gate
file.

## Acceptance criteria

- [ ] A RED commit adds the core's tests, which fail.
- [ ] `findChangedLines` covers added, changed and deleted lines, several
      hunks and several files, and a new file.
- [ ] `readLcov` covers lines with and without hits and several files.
- [ ] `findCoverageViolations` covers a hit in one report only, lines no
      report lists, a changed file in neither report, no coverable changed
      lines, and the threshold exactly met, just missed and above, with
      A4's lines and ranges.
- [ ] The **Mutation score** stays at or above the **Break threshold** of
      83 (`npm run test:mutation`).
- [ ] `npm run verify` is green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 115, 117
