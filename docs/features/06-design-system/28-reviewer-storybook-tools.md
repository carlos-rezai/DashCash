---
status: open
---
# The reviewer's Storybook tools

## Parent PRD

`prd.md`

## What to build

The reviewer sees components, not only their code (plan Phase 21; PRD
"Reviewer"; design log Q36, Q37).

- `.claude/agents/reviewer.md` gains the tools of the `storybook` MCP
  server.
- The issue-loop's and pr-review's review prompts tell the reviewer to
  start `npm run storybook` in the background when the diff touches a
  story or a component, and to check the changed **Stories** and their
  a11y results through those tools. The human decides the wording.

## Who builds it

The human, or an agent with the human's go in an interactive session. A
ticket never counts as approval for `.claude/` (`CLAUDE.md`, "Ask first";
design log Q37), so the issue-loop stops at this ticket. It must be
`status: done` before the feature pull request.

## Acceptance criteria

- [ ] `reviewer.md` lists the `storybook` MCP tools.
- [ ] Both review prompts carry the instruction, in the human's wording.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `27-storybook-mcp.md`

Numbered last so that the issue-loop builds every other ticket before it
stops here.

## User stories addressed

- User story 120
