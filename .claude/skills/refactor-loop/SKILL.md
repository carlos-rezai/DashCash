---
name: refactor-loop
description: Drive a merged feature through request-refactor-plan → refactor, one plan step at a time, unattended, then open the refactor pull request and run pr-review on it.
disable-model-invocation: true
---

# Refactor Loop

The refactor after a feature is merged. A fresh `refactor-planner` subagent
(Opus, high effort) runs `request-refactor-plan` and commits the plan, a fresh
`refactorer` subagent (Sonnet, high effort) runs one step of `refactor` per
dispatch and commits it, and the driver — this skill, in your session —
pushes, waits for CI, opens the pull request and runs `pr-review` on it.
Nobody is watching: the plan stands in for every approval the two skills ask
for, the commit is the checkpoint, `npm run verify`, CI and `pr-review` are
the gates, and a step that cannot reach its checkpoint stops the loop.

A refactor preserves behaviour: every existing test, story and end-to-end
flow stays green, and the UI stays 1:1 with `docs/design/`.

## The feature

`$ARGUMENTS` is the feature folder (`01-csv-import`) or its name
(`csv-import`). Given nothing, take it from the current branch:
`refactor/01-csv-import` → `docs/features/01-csv-import/`. The feature name for
commits is the folder name without its number.

## 1. Plan

Skip to **2** when `refactor-plan.md` already exists in the feature folder
and you are on `refactor/<NN>-<feature>`: a previous run is being resumed.

Otherwise the tree must be clean (`git status --porcelain` empty); then
`git checkout main && git pull`. Stop, before dispatching anything, unless
the feature's row in `docs/feature-checklist.md` now reads `done` (the
feature pull request is merged).

Dispatch a fresh `refactor-planner` with the PLAN prompt. Its completion
criterion, which you verify rather than take from its report: the current
branch is `refactor/<NN>-<feature>`, `git log -1 --format=%s` reads
`docs: [<feature>] add refactor plan`, and the tree is clean. Then `git push -u
origin HEAD`.

A plan with no steps (the planner found nothing worth changing) ends the loop:
report it, open no pull request.

## 2. Per step

### Grab

The next step is the first unticked `- [ ] <nn> <description>` in the plan's
Commits section. None left: go to **3**. The tree must be clean; a dirty tree
is a step a previous run left half-done — report it and stop.

### Refactor

Dispatch a fresh `refactorer` with the STEP prompt and verify: `git log -1
--format=%s` reads `refactor: [<feature>] <nn> <description>`, that step is
ticked in the plan, and the tree is clean.

### Push

`git push`, then wait for the CI run on that commit: `gh run watch` on the
latest run of the branch. A red run stops the loop: report which job failed.

Back to **Grab**.

## 3. Refactor pull request

Set the feature's status in `docs/feature-checklist.md` to `refactored`,
commit it (`docs: [<feature>] mark feature refactored`) and push, then open the
pull request into `main`:

```
gh pr create --base main --title "refactor: [<feature>] <description>" --body-file <tmp>
```

The body: the feature folder, one line per plan step, and that the agents
wrote the refactor and any tests it added.

Then follow `.claude/skills/pr-review/SKILL.md` for this PR, kind
`refactor`. It ends with the PR approved and waiting for the human's merge,
or stopped.

## Reporting

When the loop stops — the PR approved, or a failed step — report one line per
dispatch and the reason it stopped:

```
PLAN    c3d4e5 (72k)  9 steps
03      REFACTOR a1b2c3 (28k)  CI green
PR 14   REVIEW round 1 changes (41k)  round 2 approve (22k)
```

The bracketed figure is the subagent's token count from its completion notice.
A step far over 50k says the plan's steps are too thick: keep the number. A
failed step's report goes in verbatim. What a subagent left in the tree is
what the human diagnoses: leave it as it is.

## The prompts

Fill `<folder>`, `<feature>`, `<nn>` and `<description>`.

### PLAN

> Read `.claude/skills/request-refactor-plan/SKILL.md` and follow it to its
> end, for the feature folder `docs/features/<folder>/` in this repository.
>
> Nobody is present. Where the skill interviews the user, the evidence
> answers:
>
> - the **Notes** sections of the feature's tickets and the design log's
>   Implementation Results: the problems flagged for this phase;
> - the feature's merged code, read against `CLAUDE.md`,
>   `docs/conventions.md` and `docs/ubiquitous-language.md`: drift in
>   layers, filing, naming and terms; duplication; shallow modules that
>   should be deep; money math outside `packages/domain`;
> - `docs/design/`: anything that is not 1:1 with the prototype is a bug,
>   not a refactor — list it under Out of Scope as a bug to fix.
>
> Scope is behaviour-preserving change to this feature's code only. Where
> coverage is too thin to refactor safely, the plan's first steps add the
> missing tests against the current behaviour. Each step is small enough to
> leave `npm run verify` green on its own and fits in one sitting of a
> Sonnet agent with a fresh context: one move, one module.
>
> Never plan a step that changes a gate file or anything under `.claude/`
> (CLAUDE.md, "Ask first"). If the evidence points at one, record it under
> Further Notes for the human instead.
>
> You are on an up-to-date `main`; branch from it as the skill says. Commit
> as the skill says. Never `--no-verify`. If a hook refuses, stop and report
> what it said.
>
> Report: the branch, the commit hash, the number of steps — or the reason
> you stopped short.

### STEP

> Read `.claude/skills/refactor/SKILL.md` and follow it on
> `docs/features/<folder>/refactor-plan.md` in this repository, for step
> `<nn> <description>` only.
>
> Nobody is present. A green `npm run verify` is the approval the skill
> waits for: when it is green, tick the step in the plan and commit both:
> `git commit -m "refactor: [<feature>] <nn> <description>"`. Do not push,
> and stop after this one step; the driver pushes and grabs the next.
> Never `--no-verify`.
>
> Change existing tests only where the step moves or renames what they
> import; their assertions stay as they are. Anything outside the step
> goes into the plan's Further Notes, not into the code. If the step
> cannot be made green, stop and report what is red and why, leaving the
> tree as it is.
>
> Nobody can answer "Ask first" (CLAUDE.md): where it applies, stop and
> report instead of asking. A refactor plan is never the approval.
>
> Your context is the budget: read the plan's Decision Document and this
> step, and open only the units the step touches.
>
> Report: the commit hash — or the reason you stopped short.
