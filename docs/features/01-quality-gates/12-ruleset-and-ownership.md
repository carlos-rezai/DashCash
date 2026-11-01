---
status: in-progress
---
# Ruleset and ownership

## Parent PRD

`prd.md`

## What to build

The **Ruleset** as code, its apply script, CODEOWNERS and the PR template
(plan Phase 10; PRD Implementation Decisions, "Gate script modules":
`applyBranchProtection`, and "Ruleset, ownership and template"; design log
Q48–Q53):

- `.github/rulesets/main.json` targeting `main`: pull request required
  with 0 approvals and no code-owner review; **Required check**
  `pull-request`, strict (up to date); merge method `merge` only; deletion
  and non-fast-forward blocked; no bypass actors.
- `scripts/applyBranchProtection/`: the pure core
  `planRulesetRequests(ruleset, existing)` and an entry, run only by the
  human, that resolves the repository with `gh`, lists its rulesets and
  sends each planned request with `gh api`, the body on standard input.
- The gate wiring test also reads the **Ruleset** (P2).
- `.github/CODEOWNERS`: the owner `carlos-rezai` for `*` and, explicitly,
  for each gate file of `CLAUDE.md`'s "Ask first" list and for `/.claude/`.
- `.github/pull_request_template.md`: the feature folder, one line per
  ticket, and `## Assumptions`.

Applying the **Ruleset** is the human's step, not this ticket's; the
handover note sits in the final ticket, `13-docs-drift-check.md` (Q50).

## Acceptance criteria

- [ ] `planRulesetRequests`'s tests: no ruleset of that name plans a
      create; an existing one plans an update by its id; both plans patch
      the repository to merge commits only (squash and rebase off).
- [ ] The **Ruleset** file holds every setting listed above.
- [ ] The gate wiring test fails when the **Ruleset**'s required check
      stops naming the `pull-request` job of the workflow, or when it
      allows a merge method other than `merge`.
- [ ] `.github/CODEOWNERS` and `.github/pull_request_template.md` exist
      with the content above.
- [ ] `npm run verify` and CI's `verify` job are green.

## Blocked by

- Blocked by `11-renderer-layer-ladder.md`

## User stories addressed

- User stories 85, 86, 87, 88, 89, 90, 91
- User stories 92, 93, 94
