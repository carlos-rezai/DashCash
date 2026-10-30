---
name: build
description: Implement a feature to make all failing tests pass.
Use after the tdd skill has written failing tests. Use when user
says "build this", "implement this", or "make the tests pass".
Do not write code that is not required by a test or AC.
---

# Build

## Before starting

1. Read the ticket file named in the request:
   `docs/features/<NN>-<feature-name>/<nn>-<description>.md`
2. Read the failing test files to understand expected behaviour
3. Read CLAUDE.md for project-specific stack rules and boundaries
4. Do not implement anything not covered by a failing test or AC

## Running tests

The commands are in CLAUDE.md. Run the tests after each change to confirm
nothing regresses.

## Process

1. Read the failing tests first — understand what is expected
   before writing anything
2. Implement the minimum code to make each test pass, one at a time
3. After each passing test, run the full suite — nothing else should break
4. Only touch files required by the current ticket
5. Do not refactor during build — that is a separate step

## Hard rules

- No `any` types — ever
- No business logic in components or pages — domain logic goes to
  `packages/domain`, UI logic to hooks
- No `console.log` in committed code
- Check CLAUDE.md for any additional project-specific rules

## Definition of done

- [ ] `npm run verify` is green (`npm run verify:full` if the ticket
      changes a user flow)
- [ ] ACs in the ticket checked off
- [ ] Every new primitive, component or feature component has a story
- [ ] No console.log in code

## After completing

Report the definition of done checklist to the user.
Wait for the user to review and approve before committing.
When the user approves:

1. Check if there are uncommitted changes: `git status`
2. Set the ticket to `status: done`
3. Commit on the feature branch with:
   `feat: [feature] [nn] [short description]`
4. Confirm to the user which ticket was closed and the commit hash
