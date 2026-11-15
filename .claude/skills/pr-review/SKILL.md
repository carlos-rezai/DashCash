---
name: pr-review
description: Review an open feature or refactor pull request with the reviewer agent, fix what it finds, and leave the PR approved for the human to merge. Followed by issue-loop and refactor-loop after they open the PR.
disable-model-invocation: true
---

# PR Review

The last gate before the human merges. The per-ticket and per-step reviews
judged slices; this one judges only what no slice could see. Nobody is
watching: a fresh `reviewer` subagent reviews, fresh `builder` or
`refactorer` subagents fix, the driver — your session — posts every verdict
on the PR, so the PR carries the full record. The review is comment-only:
the PR is opened with the same GitHub account, which cannot approve its own
PR.

## Input

The PR number, its kind (`feature` or `refactor`), the feature folder
(`01-csv-import`) and the feature name (`csv-import`), all known to the loop
that opened the PR.

## 1. CI

`gh pr checks <pr> --watch`. A red check stops: report which one failed.
A green run means `verify:full` passed; the reviewer does not run it again.

## 2. Review

Dispatch a fresh `reviewer` with the FEATURE or REFACTOR prompt, the range
`origin/main...HEAD` on the first round; on the second, the range of the fix
commits and the round-1 findings, each to be checked off as fixed or not.

Post its answer on the PR as plain Markdown, headed `Review round <n>`:
write the answer into a file outside the repository with the Write tool,
never with a heredoc or other Bash command, then
`gh pr comment <pr> --body-file <file>`. Write the answer as it came, with
no table, no quote markers and no other wrapping.

- **APPROVE**: done. Report the PR link and that it waits for the merge.
- **CHANGES** on round 1: go to **3**.
- **CHANGES** on round 2: stop with both reviews verbatim. The PR stays
  open for the human.

## 3. Fix

- **Feature PR**: group the findings by the ticket number each one names.
  Per ticket, dispatch a fresh `builder` with issue-loop's FIX prompt and
  that ticket's findings, adding: "Where the fix changes what the ticket
  says, update the ticket in the same commit. Where the code now differs
  from `prd.md` or `plan.md`, do not rewrite them: append a deviation to
  `design-log.md` Implementation Results that names the difference and why.
  Never edit the design log's original sections." Verify
  `git log -1 --format=%s` reads `fix: [<feature>] <nn> address review` and
  the tree is clean.
- **Refactor PR**: append each finding to `refactor-plan.md` as a new
  unticked step, numbered on from the last, description under 50
  characters, the reviewer's reason in Further Notes; commit
  `docs: [<feature>] extend refactor plan`; then run each new step as
  refactor-loop's **Per step** does, without its push.

`git push`, then post on the PR one line per finding: `<n>. fixed in <sha>`,
written to a file with the Write tool as in **2**. Back to **1** for round 2.

## Verdict format

Both prompts ask for this format, so every comment reads the same:

- First line: `APPROVE` or `CHANGES`.
- One line on what you checked, for example: "CI green; 14 tickets, 95
  user stories, 69 files".
- Each required change as a numbered item of at most three lines: what is
  wrong, where (file:line), the fix, and for a feature PR its ticket
  (`<nn>`).
- Points that are not required changes: one line each, under `Notes`.
- No praise, no list of what checks out beyond the one line above.

## The prompts

### FEATURE

> Review pull request `<pr>`: the feature `docs/features/<folder>/` as
> implemented in `git diff <range>`. Every ticket was already reviewed on
> its own, and CI has run `verify:full` green. Do not re-check each
> ticket's acceptance criteria and do not run `verify`. Review only what a
> single ticket's review cannot see.
>
> Check, and cite file and line for every finding:
>
> - the PRD as a whole: every user story of `prd.md` is covered by some
>   ticket, and every main user flow it names has its end-to-end test in
>   `e2e/`
> - across tickets: one name per concept, no duplicated or drifted logic,
>   no dead code or leftovers from earlier slices, no contradiction between
>   tickets
> - conventions that changed during the feature: every earlier ticket
>   follows the version in force at the end
> - docs that drifted from the code: ticket texts must still say what was
>   built. `prd.md` and `plan.md` record the plan; where they differ from
>   the code, a deviation in `design-log.md` Implementation Results must
>   explain it. A difference without such a deviation is a finding; one
>   with it is not. Docs outside the feature folder (README, conventions,
>   glossary, quality-gates) must match the code.
> - the screens the feature touches, together: consistent with each other
>   and with `docs/design/`
>
> Name the ticket each finding belongs to (`<nn>`). Change no files.
> Answer in the verdict format of `.claude/skills/pr-review/SKILL.md`.
> Style preferences are not changes.

### REFACTOR

> Review pull request `<pr>`: the refactor of `docs/features/<folder>/` as
> implemented in `git diff <range>`, against its plan `refactor-plan.md`.
> CI has run `verify:full` green; do not run `verify`.
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
> Change no files. Answer in the verdict format of
> `.claude/skills/pr-review/SKILL.md`. Style preferences are not changes.