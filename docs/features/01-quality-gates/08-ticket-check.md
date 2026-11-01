---
status: in-progress
---
# Ticket check

## Parent PRD

`prd.md`

## What to build

The **Ticket check** over the **Branch range** (plan Phase 7; PRD
Implementation Decisions, "Ticket check"): `scripts/checkTickets/` with the
pure core `checkTicketReferences(commits, trackedPaths, readFile, branch)`
and an entry that takes the range from `readBranchRange`, the tracked paths
and file contents from the tree at `HEAD` (`git ls-tree -r --name-only
HEAD`, `git show HEAD:<path>`), and reports through `reportViolations`.

The core parses each header with the pattern from the commitlint config
(A7), skips what commitlint's `isIgnored` skips (A2), and leaves a header
that does not parse to the commit gate. `check:tickets` joins **Verify**
after `check:commits`.

## Acceptance criteria

- [x] One passing and one failing case per rule: the feature names a
      **Feature folder**; `feat`, `fix` and `test` carry a **Ticket number**
      naming a **Ticket** `<nn>-<name>.md` in it; `refactor` carries a
      number naming a **Refactor step** (`- [ ] <nn> …` or `- [x] <nn> …`)
      in its `refactor-plan.md`; `docs`, `chore` and `ci` may omit the
      number, and one they carry must name a **Ticket**.
- [x] A **Planning commit** passes; a merge commit is skipped; an
      unparsable header raises no ticket violation.
- [x] On `feat/<NN>-<feature>` and `refactor/<NN>-<feature>` a commit
      naming another feature fails; on other branches the feature is not
      compared.
- [x] The entry reads paths and contents from `HEAD`, not the working tree:
      an uncommitted ticket file does not count.
- [x] `npm run check:tickets` passes on the branch's own history.
- [x] `verify` runs `check:tickets` after `check:commits`; the gate wiring
      test expects it there.
- [ ] CI's `verify` job is green.

## Blocked by

- Blocked by `07-commit-description-rules.md`

## User stories addressed

- User story 11
- User stories 55, 56, 57, 58, 59, 60, 61, 62
