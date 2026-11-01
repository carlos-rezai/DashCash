---
status: in-progress
---
# Commit description rules

## Parent PRD

`prd.md`

## What to build

The description and mention rules of the commit convention (second half of
plan Phase 6; PRD Implementation Decisions, "Commit convention"), added to
`commitlint.config.js` and proven in `commitlint.config.test.ts`:

- the description (`subject`, without the `, RED` part) no trailing full
  stop, at most 50 characters (Q30);
- plugin rule `red-only-on-test`: the `, RED` suffix only on `test:`
  commits;
- plugin rule `no-at-or-hash`: no `@` and no `#` anywhere in the raw
  message, header, body and trailers alike.

`check:commits` enforces them in **Verify** from this ticket on; every
commit already on the branch passes them (P3).

## Acceptance criteria

- [ ] A description ending in a full stop is rejected.
- [ ] A 50-character description passes and a 51-character one is
      rejected; a 50-character description followed by `, RED` on a
      `test:` commit passes.
- [ ] `, RED` on a `feat:`, `fix:` or `docs:` commit is rejected.
- [ ] An `@` or a `#` in the header, the body or a trailer (such as
      `Co-Authored-By: Name <a@b.example>`) is rejected.
- [ ] `npm run check:commits` passes on the branch's own history.
- [ ] CI's `verify` job is green.

Note: the lower-case description rule is not part of this ticket. Ticket
06's `header-format` rule already covers it: the header pattern in
`commitlint.config.js` requires the description to start with a lower-case
letter, and `commitlint.config.test.ts` proves it.

## Blocked by

- Blocked by `06-commit-header-gate.md`

## User stories addressed

- User stories 48, 49, 50
