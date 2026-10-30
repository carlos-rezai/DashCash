---
name: refactor
description: Execute a refactor plan commit by commit. Use after
request-refactor-plan has saved the plan. Each commit must leave
the codebase in a working state with all tests passing.
---

# Refactor

## Before starting

1. Read `docs/features/<NN>-<feature-name>/refactor-plan.md` (the
   refactor branch `refactor/<NN>-<feature-name>` names the feature)
2. Read `docs/ubiquitous-language.md` for correct terminology
3. Check CLAUDE.md for the commands for this project
4. Run `npm run verify` to confirm green before touching anything

## Steps

1. Work through the Commits section of the refactor plan one commit
   at a time

2. Before each commit, state which commit you are implementing and
   what it changes

3. After each change, run `npm run verify` — do not proceed to
   the next commit until it is green

4. Wait for the user to review and approve before committing —
   do not commit speculatively

5. After the user approves, tick the step off in the plan's Commits
   checklist and commit both with:
   `refactor: [feature] [nn] [short description from plan]`,
   then push

6. Repeat for each commit in the plan

7. After the final commit, set the feature's status in
   `docs/feature-checklist.md` to `refactored`, commit it
   (`docs: [feature] mark feature refactored`) and push. Then open the
   pull request into `main`:
   title `refactor: [feature] [short description]`, body the feature
   folder and one line per commit. Do not merge it; confirm the pull
   request to the user

## Rules

- No new features — if something outside the plan is discovered,
  add it to the plan's Further Notes and continue
- No skipping commits — each one must be reviewed individually
- If a commit would break tests, stop and report to the user
  before proceeding
- Do not modify design logs — they are immutable snapshots
