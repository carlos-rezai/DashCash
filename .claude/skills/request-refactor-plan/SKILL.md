---
name: request-refactor-plan
description: Create a detailed refactor plan with tiny commits via
user interview, then save it in the feature folder. Use when user wants to
plan a refactor, create a refactoring RFC, or break a refactor into
safe incremental steps.
---

# Request Refactor Plan

## Before starting

1. Read the feature's design log in `docs/features/<NN>-<feature-name>/`
   — it is an immutable snapshot, do not modify it
2. Read `docs/ubiquitous-language.md` for correct terminology
3. Read the **Notes** sections of the feature's tickets for known issues
   flagged for the refactor phase

## Steps

You may skip steps if you don't consider them necessary.

1. Ask the user for a long, detailed description of the problem they
   want to solve and any potential ideas for solutions

2. Explore the repo to verify their assertions and understand the
   current state of the codebase

3. Ask whether they have considered other options, and present other
   options to them

4. Interview the user about the implementation — be extremely
   detailed and thorough

5. Hammer out the exact scope of the implementation — work out what
   you plan to change and what you plan not to change

6. Look in the codebase to check for test coverage of this area —
   if there is insufficient test coverage, ask the user what their
   plans for testing are

7. Break the implementation into a plan of tiny commits — remember
   Martin Fowler's advice: "make each refactoring step as small as
   possible, so that you can always see the program working"

8. Save the refactor plan in the feature folder

## Refactor Plan Template

Use this structure for the plan document:

---

## Problem Statement

The problem that the developer is facing, from the developer's
perspective.

## Solution

The solution to the problem, from the developer's perspective.

## Commits

A LONG, detailed implementation plan. Write the plan in plain
English, breaking down the implementation into the tiniest commits
possible. Each commit should leave the codebase in a working state.

Number the commits as a checklist; the number and short description
become the commit message, so keep the description under 50 characters:

- [ ] 01 extract csv parser
- [ ] 02 move duplicate check into domain

## Decision Document

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets — they may end
up being outdated very quickly.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external
  behaviour, not implementation details)
- Which modules will be tested
- Prior art for the tests (similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this refactor.

## Further Notes (optional)

Any further notes about the refactor.

---

## After writing

1. Create the refactor branch `refactor/<NN>-<feature-name>` from an
   up-to-date `main` (the feature pull request is merged)
2. Save as `docs/features/<NN>-<feature-name>/refactor-plan.md`
3. Commit it: `docs: [<feature-name>] add refactor plan`
4. Confirm to the user which file was saved
