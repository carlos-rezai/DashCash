---
status: done
---
# The reviewer's Storybook tools

## Parent PRD

`prd.md`

## What to build

The reviewer sees components, not only their code (plan Phase 21; PRD
"Reviewer"; design log Q36, Q37).

- `.claude/agents/reviewer.md` gains the tools of the `storybook` MCP
  server, except `test-run` (design log D14, D15). Its text says that the
  human starts Storybook before a run and the reviewer never starts or
  stops it, that a missing Storybook never blocks a review, and that
  accessibility results come from `npm run test:stories`, not from these
  tools.
- The issue-loop's and pr-review's review prompts tell the reviewer, when
  the storybook tools are available and the diff touches a story or a
  component (issue-loop) or the feature touches **Stories** (pr-review),
  to check the changed **Stories** as Storybook shows them, and otherwise
  to say so in one line. The human decides the wording.

## Who builds it

The human, or an agent with the human's go in an interactive session. A
ticket never counts as approval for `.claude/` (`CLAUDE.md`, "Ask first";
design log Q37), so the issue-loop stops at this ticket. It must be
`status: done` before the feature pull request.

## Acceptance criteria

- [x] `reviewer.md` lists the `storybook` MCP tools.
- [x] Both review prompts carry the instruction, in the human's wording.
- [x] `npm run verify` is green.

## Blocked by

- Blocked by `27-storybook-mcp.md`

Numbered last so that the issue-loop builds every other ticket before it
stops here.

## Notes

- The ticket's first text had the reviewer start `npm run storybook` in
  the background and check the a11y results through the tools. Design log
  D15 replaced that, set by the human on 2026-11-26: an MCP server connects
  only when a session starts, so a Storybook the reviewer starts mid-run
  cannot be reached, and the human starts Storybook before a run. The
  `test-run` tool is left out of the reviewer's tools, since it returns no
  a11y results here (D14); a11y results stay with `npm run test:stories`.

### For the refactor

- Seven copies of the `:hover` probe helper across the stories; one shared
  helper in `renderer/test-support/` would replace them.
- Three copies of the story-config reader.
- `checkStories.ts` and `checkCoverage.ts` each have their own reader for
  untracked files, beside the shared one in `scripts/runGit/`.
- About 20 literal `1px` borders and the icon size constants.
- The code checks for an empty string in three different ways.

## User stories addressed

- User story 120
