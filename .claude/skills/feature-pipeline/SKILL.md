---
name: feature-pipeline
description: Run one feature end to end, unattended: planner → issue-loop → feature PR → refactor-loop → refactor PR, pausing only for the human to merge each PR and write "merged".
disable-model-invocation: true
---

# Feature Pipeline

One feature from its checklist row to `refactored`, in your session. Every
stage runs unattended; the pipeline pauses only at the two merges, which are
the human's. A stage that stops short stops the pipeline: report it with the
stage's own report and stop.

## The feature

`$ARGUMENTS` is the feature name (`csv-import`), optionally followed by a
short description for the planner. A last word `build` or `refactor` starts
at that stage instead: a previous run is being resumed.

## 1. Plan

Dispatch the `planner` agent with the name and description. Verify: the
branch is `feat/<NN>-<feature>`, `git log -1 --format=%s` reads
`docs: [<feature>] add tickets`, the tree is clean. Keep its list of
assumptions for the final report.

## 2. Build

Follow `.claude/skills/issue-loop/SKILL.md` for `<NN>-<feature>`. It ends
with the feature PR approved by `pr-review`.

## 3. Merge

Pause: give the PR link and ask the human to merge it and write `merged`.
End the turn and wait; do not poll.

On `merged`: `gh pr view <pr> --json state` must read `MERGED`. If it does
not, say so and wait again.

## 4. Refactor

Follow `.claude/skills/refactor-loop/SKILL.md` for `<NN>-<feature>`. It
starts from a fresh `main` and ends with the refactor PR approved, or with
an empty plan (no PR: go to **6**).

## 5. Merge

As **3**, for the refactor PR.

## 6. Done

`git checkout main && git pull`. Report:

- the planner's assumptions, one line each
- the issue-loop and refactor-loop reports
- both PR links
- the next `planned` row of `docs/feature-checklist.md`, as the command to
  run it: `/feature-pipeline <name>`
