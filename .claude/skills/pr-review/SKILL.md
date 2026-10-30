---
name: pr-review
description: Review an open feature or refactor pull request with the reviewer agent, fix what it finds, and leave the PR approved for the human to merge. Followed by issue-loop and refactor-loop after they open the PR.
disable-model-invocation: true
---

# PR Review

The last gate before the human merges. The per-ticket and per-step reviews
judged slices; this one judges the pull request whole. Nobody is watching: a
fresh `reviewer` subagent reviews, fresh `builder` or `refactorer` subagents
fix, the driver — your session — posts every verdict on the PR, so the PR
carries the full record. The review is comment-only: the PR is opened with
the same GitHub account, which cannot approve its own PR.

## Input

The PR number, its kind (`feature` or `refactor`), the feature folder
(`01-csv-import`) and the feature name (`csv-import`), all known to the loop
that opened the PR.

## 1. CI

`gh pr checks <pr> --watch`. A red check stops: report which one failed.

## 2. Review

Dispatch a fresh `reviewer` with the FEATURE or REFACTOR prompt, the range
`origin/main...HEAD` on the first round; on the second, the range of the fix
commits and the round-1 findings, each to be checked off as fixed or not. Post its answer verbatim on the PR:
`gh pr comment <pr> --body-file <tmp>`, headed `Review round <n>`.

- **APPROVE**: done. Report the PR link and that it waits for the merge.
- **CHANGES** on round 1: go to **3**.
- **CHANGES** on round 2: stop with both reviews verbatim. The PR stays
  open for the human.

## 3. Fix

- **Feature PR**: group the findings by the ticket number each one names.
  Per ticket, dispatch a fresh `builder` with issue-loop's FIX prompt and
  that ticket's findings, and verify `git log -1 --format=%s` reads
  `fix: [<feature>] <nn> address review` and the tree is clean.
- **Refactor PR**: append each finding to `refactor-plan.md` as a new
  unticked step, numbered on from the last, description under 50
  characters, the reviewer's reason in Further Notes; commit
  `docs: [<feature>] extend refactor plan`; then run each new step as
  refactor-loop's **Per step** does, without its push.

`git push`, then post on the PR one line per finding: `<n>. fixed in <sha>`.
Back to **1** for round 2.

## The prompts

### FEATURE

> Review pull request `<pr>`: the feature `docs/features/<folder>/` as
> implemented in `git diff <range>`. Each ticket was reviewed alone; you
> judge the feature whole.
>
> Check, and cite file and line for every finding:
>
> - every user story of `prd.md` is met, and every main user flow it names
>   has its end-to-end test in `e2e/`
> - every ticket in the folder is `status: done`
> - the tickets fit together: one name per concept, no duplicated logic
>   across tickets, no dead code or leftovers from earlier slices
> - every screen the feature touches matches `docs/design/` 1:1, every
>   state the prototype shows has a story
> - `docs/conventions.md` and CLAUDE.md: layers, filing, naming, `Cents`
>   for money
>
> Name the ticket each finding belongs to (`<nn>`). Change no files.
> Answer with `APPROVE`, or `CHANGES` followed by a numbered list of what
> must change, why, and its ticket. Style preferences are not changes.

### REFACTOR

> Review pull request `<pr>`: the refactor of `docs/features/<folder>/` as
> implemented in `git diff <range>`, against its plan `refactor-plan.md`.
>
> Check, and cite file and line for every finding:
>
> - behaviour is preserved: no assertion of an existing test, story or
>   end-to-end flow was weakened or removed, and no feature was added
> - every ticked step is in the diff, and the diff holds nothing the plan
>   does not ask for
> - `docs/conventions.md` and CLAUDE.md: layers, filing, naming, `Cents`
>   for money
> - UI still matches `docs/design/` 1:1
>
> Change no files. Answer with `APPROVE`, or `CHANGES` followed by a
> numbered list of what must change and why. Style preferences are not
> changes.
