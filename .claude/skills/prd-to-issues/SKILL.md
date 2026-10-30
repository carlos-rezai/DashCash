---
name: prd-to-issues
description: Break a PRD into independently-grabbable ticket files
using tracer-bullet vertical slices. Use when user wants to convert
a PRD to issues or tickets, create implementation tickets, or break down a PRD
into work items.
---

# PRD to Issues

Break a PRD into independently-grabbable ticket files in the feature
folder using vertical slices (tracer bullets).

## Process

### 1. Locate the PRD and plan

1. Read the feature's `plan.md` and `prd.md` in
   `docs/features/<NN>-<feature-name>/` (the feature branch
   `feat/<NN>-<feature-name>` names the feature)
2. Use the plan phases as the basis for the ticket breakdown —
   do not re-derive phases from the PRD

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand
the current state of the code.

### 3. Draft vertical slices

Break the plan phases into tracer bullet tickets. Each ticket is a
thin vertical slice that cuts through ALL integration layers
end-to-end, NOT a horizontal slice of one layer.

Every slice must be AFK: implementable and mergeable without human
interaction, because the issue-loop agent works through the tickets
alone. If a slice needs a human decision (architecture, design review,
approval), resolve it now during the quiz and write the answer into
the ticket.

Each slice must:

- Deliver a narrow but complete path through every layer
  (schema, domain, IPC, UI, tests)
- Be demoable or verifiable on its own when complete
- Prefer many thin slices over few thick ones

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice:

- **Title**: short descriptive name
- **Blocked by**: which other slices must complete first
- **User stories covered**: which stories from the PRD this addresses

Ask the user:

- Does the granularity feel right?
- Are the dependency relationships correct?
- Should any slices be merged or split further?
- Does any slice still need a human decision before it can run AFK?

Iterate until the user approves the breakdown.

### 5. Create the ticket files

For each approved slice, create a ticket file in the feature folder:
`docs/features/<NN>-<feature-name>/<nn>-<short-description>.md`

- Number tickets in dependency order (blockers first), starting at
  `01`, so the numbers are also the build order.
- `<short-description>` is kebab-case; keep it short.
- The ticket that completes one of the PRD's main user flows gets the
  acceptance criterion "end-to-end test for <flow> in `e2e/`".
- Do NOT use conventional commit prefixes in ticket titles.

Use this template for the ticket file:

---

```markdown
---
status: open
---
# [Short description]
```

## Parent PRD

`prd.md`

## What to build

A concise description of this vertical slice. Describe the
end-to-end behaviour, not layer-by-layer implementation. Reference
specific sections of the parent PRD rather than duplicating content.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- Blocked by `[nn]-[short-description].md` (if any)

Or "None — can start immediately" if no blockers.

## User stories addressed

Reference by number from the parent PRD:

- User story 3
- User story 7

---

Do NOT modify `prd.md` or `plan.md`.

### 6. After creating all tickets

Commit the ticket files on the feature branch:
`docs: [<feature-name>] add tickets`. Then report to the user:

- How many tickets were created
- Their file names and titles in dependency order
