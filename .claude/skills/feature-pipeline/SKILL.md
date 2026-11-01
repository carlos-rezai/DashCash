---
name: feature-pipeline
description: Run one feature end to end, unattended: one planner per planning skill → issue-loop → feature PR → refactor-loop → refactor PR, pausing for the human to merge each PR and write "merged", and for a "go" before the build when a ticket names a gate file. Until a CI workflow runs on pull requests, it stops before the feature PR.
disable-model-invocation: true
---

# Feature Pipeline

One feature from its checklist row to `refactored`, in your session. Every
stage runs unattended; the pipeline pauses only at the two merges, which are
the human's, and before the build when a ticket names a gate file. A stage
that stops short stops the pipeline: report it with the stage's own report
and stop.

## The feature

`$ARGUMENTS` is the feature name (`csv-import`), optionally followed by a
short description for the planner. A last word `build` or `refactor` starts
at that stage instead: a previous run is being resumed.

## 1. Plan

Dispatch a fresh `planner` agent per planning skill, in this order, each
with the skill, the name and the description:

| Skill | Commit |
| --- | --- |
| `grill-me` (with design-log and ubiquitous-language) | `docs: [<feature>] add design log and glossary` |
| `write-a-prd` | `docs: [<feature>] add prd` |
| `prd-to-plan` | `docs: [<feature>] add plan` |
| `prd-to-issues` | `docs: [<feature>] add tickets` |

Only the first starts from a fresh `main` and creates the branch; the
others work on the existing feature branch. The committed files are the
handoff between them. After each, verify before the next: the branch is
`feat/<NN>-<feature>`, `git log -1 --format=%s` reads its commit, the tree
is clean. Anything else stops the pipeline with that planner's report.

### Gate approval

A ticket that names a gate file is the approval to change it (CLAUDE.md,
"Ask first"), and no human has read the tickets yet. Check every ticket in
the feature folder: does its **What to build** or **Acceptance criteria**
name a gate file from `CLAUDE.md`'s "Ask first" list, or anything under
`.claude/`?

- None does: continue into **2**.
- At least one does: pause before **2**. Report those tickets, each with
  the gate files it names; list the tickets naming anything under
  `.claude/` separately, as "built by the human, issue-loop will stop
  here". Add every line marked `**Assumption:**` in the feature's
  `design-log.md`, with its place in the file. Ask the human to
  read them and write `go`. End the turn and wait; do not poll. On `go`,
  continue into **2**. If the human corrects a ticket instead, wait for
  `go` after the correction.

A run started with `build` skips this pause: a human who starts the build
stage directly has decided to build.

## 2. Build

Follow `.claude/skills/issue-loop/SKILL.md` for `<NN>-<feature>`. It ends
with the feature PR approved by `pr-review`.

Before the loop opens the feature PR, check that `.github/workflows/` holds
a workflow that runs on pull requests (`pull_request` under `on:`). The
feature that builds CI creates it on the way. If none does by then, stop
there, before the PR, and report: the tickets are built, with the
issue-loop report; the feature PR waits until a workflow runs on pull
requests.

## 3. Merge

Pause: give the PR link and ask the human to merge it and write `merged`.
End the turn and wait; do not poll.

Add that the run so far fills this session's context: after merging, the
human may continue in a fresh session with
`/feature-pipeline <name> refactor` instead.

On `merged`: `gh pr view <pr> --json state` must read `MERGED`. If it does
not, say so and wait again.

## 4. Refactor

Follow `.claude/skills/refactor-loop/SKILL.md` for `<NN>-<feature>`. It
starts from a fresh `main` and ends with the refactor PR approved, or with
an empty plan (no PR: go to **6**).

## 5. Merge

As **3**, for the refactor PR, without the fresh-session line.

## 6. Done

`git checkout main && git pull`. Report:

- the planner's assumptions, one line each: every line marked
  `**Assumption:**` in the feature's `design-log.md`, with its place in the
  file, read from the file so a resumed run lists them too
- the issue-loop and refactor-loop reports
- both PR links
- the next `planned` row of `docs/feature-checklist.md`, as the command to
  run it: `/feature-pipeline <name>`
