---
status: done
---
# Commit description rules

## Parent PRD

`prd.md`

## What to build

The description and mention rules of the commit convention (second half of
plan Phase 6; PRD Implementation Decisions, "Commit convention"), added to
`commitlint.config.js` and proven in `gates/commitMessages/commitMessages.test.ts`:

- the description (`subject`, without the `, RED` part) no trailing full
  stop, at most 50 characters (Q30);
- `subject-case`: the whole description lower case, not only its first
  letter;
- plugin rule `red-only-on-test`: the `, RED` suffix only on `test:`
  commits;
- plugin rule `no-at-or-hash`: no `@` and no `#` anywhere in the raw
  message, header, body and trailers alike.

`check:commits` enforces them in **Verify** from this ticket on; every
commit already on the branch passes them (P3).

## Acceptance criteria

- [x] A description ending in a full stop is rejected.
- [x] A 50-character description passes and a 51-character one is
      rejected; a 50-character description followed by `, RED` on a
      `test:` commit passes.
- [x] A description with an upper-case letter anywhere is rejected.
- [x] `, RED` on a `feat:`, `fix:` or `docs:` commit is rejected.
- [x] An `@` or a `#` in the header, the body or a trailer (such as
      `Co-Authored-By: Name <a@b.example>`) is rejected.
- [x] `npm run check:commits` passes on the branch's own history.
- [x] CI's `verify` job is green.

## Blocked by

- Blocked by `06-commit-header-gate.md`

## User stories addressed

- User stories 48, 49, 50
