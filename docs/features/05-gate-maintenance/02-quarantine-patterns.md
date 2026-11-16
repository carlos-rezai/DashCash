---
status: done
---
# Quarantined tests left out, tagged or in a subfolder

## Parent PRD

`prd.md`

## What to build

A **Quarantine entry** leaves out its test whatever tags it carries and on
either platform (plan Phase 2; PRD "Quarantine reader" and "Gate tests";
design log Q8–Q12, A7).

- `scripts/readQuarantine/readQuarantine.ts`: `buildQuarantinePatterns`
  builds each **Quarantine pattern** as `(?:^| )<file> <title>(?: @\S+)*$`,
  the file relative to `e2e/` with every `/` written as `[\\/]`, file and
  title otherwise escaped literally (design log, Design: the pattern for
  `e2e/sub/start.spec.ts`). The entry keeps naming its file with `/`.
- `scripts/readQuarantine/readQuarantine.test.ts`: a subfolder entry's
  pattern matches with `/` and with `\`; a test with no tag, one tag and
  several tags matches; a title that itself holds a tag (`Start the app
  @slow`, repeated as a tag) matches; the same title in another file, a
  title that merely starts with the entry's title and a title with regex
  characters matched loosely do not.
- `gates/endToEnd/endToEnd.test.ts`: the hand-made model of Playwright's
  match string (`grepTitle`) and the cases that use it go (A7). A new test
  runs Playwright's own `playwright test --list` with the committed
  `playwright.config.ts` in a sample tree (`installGateScripts`), holding:
  an invented spec in `e2e/sub/` with a tagged quarantined test, an
  untagged quarantined test and a third test; a top-level spec with the old
  model's cases (the same title in another file, a longer title, regex
  characters in a title); and an invented **Quarantine** naming the
  quarantined ones. It checks which tests Playwright lists, on the platform
  it runs on: CI's Linux run proves `/`, a Windows run `\` (Q11). No app,
  no browser, no network: `--list` only loads the spec files.
- The test that the config's `grepInvert` equals the reader's patterns for
  the committed file stays; the **Quarantine check**'s file rule is
  unchanged (Q12).

This ticket is the approval to change `gates/endToEnd/endToEnd.test.ts`.

## Acceptance criteria

- [ ] A RED commit adds the pattern tests and the `--list` gate test, and
      fails on them.
- [ ] A subfolder entry's pattern matches with `/` and with `\`; a test
      with no tag, one tag and several tags matches; a title that itself
      holds a tag matches.
- [ ] The same title in another file, a title that merely starts with the
      entry's title and a title with regex characters matched loosely do
      not match.
- [ ] Playwright's `--list` in the sample tree lists the third test and
      neither quarantined test, and lists the old model's non-matching
      cases; the test starts no app, no browser and no network.
- [ ] The hand-made model of Playwright's string is gone; the check that
      the config's `grepInvert` equals the reader's patterns for the
      committed file stays.
- [ ] The **Quarantine check**'s file rule is unchanged, and
      `e2e/sub/<x>.spec.ts` passes it.
- [ ] `npm run verify:full` is green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 9, 10, 11, 12, 13, 14, 15
