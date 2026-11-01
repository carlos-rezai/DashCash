---
status: in-progress
---
# Docs-drift check

## Parent PRD

`prd.md`

## What to build

The **Docs drift** gate (plan Phase 5; PRD Implementation Decisions,
"Docs-drift check"; design log Q39): `scripts/checkDocsDrift/` with the
pure core `findDocsDrift(docs, trackedPaths)` and an entry that reads
`README.md`, `CLAUDE.md` and the top-level `docs/*.md`, takes the tracked
paths from `git ls-files` and reports through `reportViolations`, one
`<doc>: <named path>` subject per missing path. `check:docs-drift` joins
**Verify** last.

This ticket comes last although the plan has it as Phase 5:
`docs/ubiquitous-language.md` names `.github/rulesets/main.json`, which
only ticket 12 creates, so the gate passes on today's docs only after it
(design log I3).

## Acceptance criteria

- [x] `findDocsDrift`'s tests cover relative Markdown links resolved from
      the linking file's folder (such as `feature-checklist.md` from
      `docs/`), links with an `#anchor` or a query, inline-code paths that
      start with a top-level folder resolved from the root, fenced code
      blocks skipped, URLs skipped, a span with each placeholder character
      (`<`, `>`, `*`, `{`, `…`, a space) skipped, and a folder that counts
      because git tracks its `.gitkeep`.
- [x] A renamed or deleted path named in a doc fails
      `npm run check:docs-drift`, naming the doc and the path.
- [x] `npm run check:docs-drift` passes on today's docs.
- [x] `verify` runs `check:docs-drift` last; the gate wiring test expects
      it there.
- [ ] CI's `verify` job is green.

## Handover note

Not an agent's criterion. After the first green `pull-request` run of this
feature's pull request, the owner applies the **Ruleset** once:
`node scripts/applyBranchProtection/applyBranchProtection.ts` with a `gh`
login that has admin rights on the repository (Q50). The agents' token
cannot reach the branch-protection API.

## Blocked by

- Blocked by `12-ruleset-and-ownership.md` (the glossary names its
  `.github/rulesets/main.json`)

## User stories addressed

- User story 11
- User stories 74, 75, 76, 77, 78, 79
- User story 95
