---
status: done
---
# Commit message check

## Parent PRD

`prd.md`

## What to build

The script the **Commit-msg hook** runs (plan Phase 9; PRD "Gate script
modules", `checkCommitMessage`; design log Q40, Q42, Q43, A9, A11). The
hook file and its installation follow in `13-commit-msg-hook.md`.

`scripts/checkCommitMessage/checkCommitMessage.ts` with its test beside
it:

- The pure core `cleanCommitMessage(raw: string): string` returns the text
  git stores with its default cleanup: CRLF to LF, the scissors line
  (`# ------------------------ >8 ------------------------`) and every
  line after it dropped, lines starting with `#` dropped, trailing
  whitespace stripped, consecutive blank lines collapsed, leading and
  trailing blank lines removed (A9).
- The thin entry, `node scripts/checkCommitMessage/checkCommitMessage.ts
  <message-file>`, reads the file, cleans it, exits 0 on an empty result
  (git then aborts with its own message), and otherwise lints the cleaned
  message with `lintCommitMessages` and the config from `loadCommitConfig`
  (`scripts/lintCommitMessages/`), reporting through `runGate`: one line
  per violation, exit 1. A missing argument or an unreadable file exits 1
  with one line (A11). It checks only the message: no **Ticket check**, no
  **Branch range**, no git history, no `origin/main` (Q40).

The entry's behaviour is tested by running it with `node` on temporary
message files, a fresh temporary folder per test.

## Between this ticket and 13

This ticket ends with `npm run verify` and CI green (design log,
Implementation Results, D4). Nothing runs the entry yet: the hook file,
`prepare` and the hook's gate test arrive in `13-commit-msg-hook.md`.

## Acceptance criteria

- [x] The core's tests cover comment lines, the scissors line and what
      follows, CRLF, trailing whitespace, consecutive and surrounding blank
      lines, and an all-comment message (empty result).
- [x] Run on a temporary message file, the entry exits 0 for a valid
      header, for a valid header followed by git's comment block, for a
      merge, a revert and a `fixup!` message, and for an empty or
      all-comment message.
- [x] It exits 1 with one line per violation for an invalid header, a
      header with `@` or `#`, a 51-character description and a message
      with a body.
- [x] It exits 1 with one line for a missing argument and for a file that
      does not exist.
- [x] It checks the message only: a valid header naming a feature folder
      and ticket that do not exist (`feat: [sample-feature] 99 add sample`)
      exits 0, with the message file in a temporary folder outside the
      repository.
- [x] `npm run verify` and CI's `verify` job are green.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 55, 56, 57, 58, 59
- User story 53 (one line per violation)

## Notes

- The comment at `scripts/checkCommitMessage/checkCommitMessage.test.ts` line 58 says "Descriptions at and just over the limit", but only the 51-character constant exists; for the refactor.
- `expect(DESCRIPTION_OF_51).toHaveLength(51)` (line 242) runs inside every `it.each` row instead of once; for the refactor.
