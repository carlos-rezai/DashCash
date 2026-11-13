---
name: issue-loop
description: Drive a feature's tickets through tdd → RED commit → build → GREEN commit → review → push, one ticket at a time, unattended, then open the feature pull request and run pr-review on it.
disable-model-invocation: true
---

# Issue Loop

The loop after `prd-to-issues`. For each ticket
a fresh `tdd-writer` subagent (Opus, high effort) runs `tdd` and commits RED, a
fresh `builder` subagent (Sonnet, high effort) runs `build` and commits GREEN, a
fresh `reviewer` subagent (Opus, high effort) reviews the ticket's diff, and the
driver — this skill, in your session — pushes, waits for CI and grabs the next.
Nobody is watching: the ticket stands in for every approval the two skills ask
for, the commit is the checkpoint, the reviewer and CI are the gates, and a step
that cannot reach its checkpoint stops the loop.

## The feature

`$ARGUMENTS` is the feature folder (`01-csv-import`). Given nothing, take it
from the current branch: `feat/01-csv-import` → `docs/features/01-csv-import/`.
The feature name for commits is the folder name without its number
(`csv-import`). Everything happens on the feature branch; never commit to
`main`.

## Per ticket

### 1. Grab

The next ticket is the lowest-numbered file in the feature folder with
`status: open` whose every `Blocked by` ticket has `status: done`.

Stop, before dispatching anything, when the next ticket

- has `status: in-progress` — a previous run stopped inside it,
- binds nothing outside `docs/` (a prototype amendment, a docs-only
  ticket). A ticket that builds gates (`scripts/`, `.github/`, root
  configuration files) is buildable,
- binds anything under `.claude/` — a ticket never approves `.claude/`, so
  it is the human's turn, or
- does not exist — every open ticket waits on an open blocker.

When no ticket is open at all, go to **Feature pull request**.

The tree must be clean: `git status --porcelain` empty. A dirty tree is a step
a previous run left half-done — report it and stop.

### 2. RED

Dispatch a fresh `tdd-writer` subagent with the RED prompt below and wait for
it. Its completion criterion, which you verify rather than take from its
report: `git log -1 --format=%s` reads
`test: [<feature>] <nn> <description>, RED` and the tree is clean.
Anything else stops the loop with the subagent's report.

### 3. GREEN

Dispatch a fresh `builder` subagent with the GREEN prompt and verify the same
way: `git log -1` reads `feat: [<feature>] <nn> <description>` and the tree is
clean.

### 4. Review

Dispatch a fresh `reviewer` subagent with the REVIEW prompt, giving it the
ticket path and the range from the commit before RED to `HEAD`.

- **APPROVE**: set the ticket to `status: done`, add it to the last commit
  (`git commit --amend --no-edit`, the commit is not pushed yet).
- **CHANGES**: dispatch a fresh `builder` with the FIX prompt and the
  reviewer's list, verify `git log -1` reads
  `fix: [<feature>] <nn> address review` and the tree is clean, then review
  again. A second **CHANGES** stops the loop with both reviews verbatim.

### 5. Push

`git push -u origin HEAD`, then wait for the CI run on that commit: `gh run watch` on the
latest run of the branch. A red run stops the loop: report which job failed.

If no workflow ran for the pushed commit because none exists yet (no file
in `.github/workflows/` at `HEAD`), skip the wait and write `no CI yet` in
the ticket's report line. Once a workflow exists, the wait applies.

### 6. Next

Back to 1.

## Feature pull request

When every ticket in the folder is `done`, set the feature's status in
`docs/feature-checklist.md` to `done`, commit it
(`docs: [<feature>] mark feature done`) and push, then open the pull request
into `main`. Write the body into a file outside the repository with the
Write tool, never with a heredoc or other Bash command, then:

```
gh pr create --base main --title "feat: [<feature>] <description>" --body-file <file>
```

The body: the feature folder, one line per ticket, and that the agents wrote
both the code and its tests. Then a section `## Assumptions`: every line
marked `**Assumption:**` in the feature's `design-log.md`, verbatim, each
with its place in the file (heading and line number). Read them from the
design log, not from memory, so a resumed run lists them too. If there are
none, write `None`.

Then follow `.claude/skills/pr-review/SKILL.md` for this PR, kind `feature`.
It ends with the PR approved and waiting for the human's merge, or stopped.

## Reporting

When the loop stops — the PR approved, or a failed step — report one line per
ticket taken and the reason it stopped:

```
01     RED 9f8e7d (52k)  GREEN 6c5b4a (70k)  REVIEW approve (30k)  no CI yet
02     RED a1b2c3 (84k)  GREEN d4e5f6 (61k)  REVIEW approve (38k)  CI green
PR 12  REVIEW round 1 changes (55k)  round 2 approve (24k)
```

The bracketed figure is the subagent's token count from its completion notice
— the budget is 100k a step, and a step over it says the slice was too thick
for `prd-to-issues`, so keep the number. A failed step's report goes in
verbatim. What a subagent left in the tree is what the human diagnoses: leave
it as it is.

## The prompts

Fill `<path>`, `<feature>`, `<nn>`, `<description>` and `<range>`.

### RED

> Read `.claude/skills/tdd/SKILL.md` and follow it to its end, for the
> ticket `<path>` in this repository.
>
> Nobody is present. Where the skill asks the user to confirm the interface or
> the behaviour list: the ticket's **What to build** and the PRD's
> **Implementation Decisions** section are the interface, and the ticket's
> **Acceptance criteria** are the behaviour list — every one of them gets a
> test, at the layer the PRD's **Testing Decisions** name, end-to-end tests
> included. Decide from those and ask nothing.
>
> Your context is the budget. Read the PRD's Implementation Decisions and
> Testing Decisions sections, not the file; grep `docs/ubiquitous-language.md`
> for the terms the ticket bolds rather than reading it; open only the units
> the tests touch.
>
> Nobody can answer "Ask first" (CLAUDE.md): where it applies and the ticket
> is not the approval, stop and report instead of asking.
>
> When every new test is confirmed RED for the right reason, set the ticket to
> `status: in-progress`, then commit: `git add` only the files you wrote and
> the ticket, then
> `git commit -m "test: [<feature>] <nn> <description>, RED"` with a
> description under 50 characters. Never `--no-verify`. If a hook refuses,
> stop and report what it said.
>
> Report: the test files, the count of RED tests, the commit hash — or the
> reason you stopped short.

### GREEN

> Read `.claude/skills/build/SKILL.md` and follow it to its end, for the
> ticket `<path>` in this repository.
>
> Nobody is present. The skill's definition of done is the review: when every
> box holds, commit without waiting —
> `git commit -m "feat: [<feature>] <nn> <description>"`, description under
> 50 characters. Leave the ticket at `status: in-progress`; the driver closes
> it after the review. Do not push. Never `--no-verify`. If `npm run verify`
> will not go green, stop and report what is red and why, leaving the tree as
> it is.
>
> Your context is the budget: the failing tests and the units they import are
> the spec; open the PRD's Implementation Decisions section only when a test
> leaves a shape undecided.
>
> Nobody can answer "Ask first" (CLAUDE.md): where it applies and the ticket
> is not the approval, stop and report instead of asking.
>
> Report: the commit hash — or the reason you stopped short.

### REVIEW

> Review the ticket `<path>` as implemented in `git diff <range>`.
>
> Check, and cite file and line for every finding:
>
> - every acceptance criterion has a test, and the code meets it
> - the tests check behaviour through public interfaces and would fail
>   without the implementation — no tautologies, no testing of mocks
> - `docs/conventions.md` and CLAUDE.md: layers, filing, naming, `Cents`
>   for money, stories for new components
> - UI matches `docs/design/` 1:1
> - nothing was built that no test or acceptance criterion asks for
>
> Change no files. Answer with `APPROVE`, or `CHANGES` followed by a numbered
> list of what must change and why. Style preferences are not changes.

### FIX

> The review of the ticket `<path>` asked for these changes:
>
> <the reviewer's list>
>
> Make exactly these changes, nothing else.
>
> Nobody can answer "Ask first" (CLAUDE.md): where it applies and the ticket
> is not the approval, stop and report instead of asking.
>
> When `npm run verify` is green,
> commit: `git commit -m "fix: [<feature>] <nn> address review"`. Do not push.
> Never `--no-verify`. If you cannot make a change, stop and report why.
>
> Report: the commit hash — or the reason you stopped short.