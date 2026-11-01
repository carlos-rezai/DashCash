---
status: done
---
# Commit header gate

## Parent PRD

`prd.md`

## What to build

The commit gate over the **Branch range**, with the header grammar but not
yet the description rules (first half of plan Phase 6; PRD Implementation
Decisions, "Gate script modules": `readBranchRange` and "Commit
convention"):

- `commitlint.config.js`, the single source of the **Commit header**
  grammar (A7): its parser preset holds the full pattern with the parts
  `type`, `scope`, `ticket`, `subject` and `red`; the rules `type-enum`,
  `body-empty`, `footer-empty`, the default ignores, and the plugin rule
  `header-format`, whose message shows the expected format. Ticket 07 adds
  the description rules to this config.
- `scripts/readBranchRange/`: `resolveBranchName(env, currentBranch)` and
  `readBranchRange(cwd)` (Q24, Q35, A1, A8).
- `scripts/checkCommits/`: core `lintCommitMessages(messages, config)` with
  `@commitlint/lint`, and an entry that loads the config with
  `@commitlint/load`, lints every commit of the range and reports through
  `reportViolations`.

`check:commits` joins **Verify** after `test`; every commit already on the
branch passes it (P3).

## Acceptance criteria

- [x] `commitlint.config.test.ts`, through `@commitlint/lint` with the
      loaded config and headers given as literal strings: accepts the
      examples of `docs/conventions.md` (Commit messages) and the header
      forms the issue-loop writes (`test: … , RED`, `feat: …`,
      `fix: [<feature>] <nn> address review`, `docs: [<feature>] add
      tickets`).
- [x] It rejects an unknown type, a feature that is not kebab-case, a one-
      or three-digit number, a header that does not match the pattern at all
      (the message shows the expected format), a body and a footer.
- [x] Merge commits, `Revert` commits and `fixup!`/`squash!` commits are
      ignored.
- [x] `resolveBranchName`'s pure tests cover `GITHUB_HEAD_REF`, then
      `GITHUB_REF_NAME`, then the current branch, with empty values
      skipped.
- [x] `readBranchRange`'s tests, against a temporary repository with a fake
      `origin/main`, read the branch's commits, an empty range, and throw
      the "fetch `origin/main`" error when the ref is missing.
- [x] `npm run check:commits` passes on `main` (empty range), exits 1 with
      the "fetch `origin/main`" message when the ref is missing, and passes
      on the branch's own history.
- [x] `verify` runs `check:commits` after `test`; the gate wiring test
      expects it there.
- [x] CI's `verify` job is green.

## Blocked by

- Blocked by `05-project-lint-rules.md`

## User stories addressed

- User stories 11, 46, 47
- User stories 51, 52, 53, 54
