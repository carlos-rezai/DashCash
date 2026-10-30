---
name: prd-to-plan
description: Turn a PRD into a multi-phase implementation plan using
tracer-bullet vertical slices. Use when user wants to break down a PRD,
create an implementation plan, plan phases from a PRD, or mentions
"tracer bullets".
---

# PRD to Plan

Break a PRD into a phased implementation plan using vertical slices
(tracer bullets). Output is saved to the feature folder.

## Before starting

1. Read the feature's PRD: `docs/features/<NN>-<feature-name>/prd.md`
   (the feature branch `feat/<NN>-<feature-name>` names the feature)
2. Use it as the source of truth — do not ask the user to
   paste the PRD if it can be found there

## Process

### 1. Confirm the PRD is in context

The PRD should be found in the feature folder. If it cannot be located,
ask the user to point you to the file.

### 2. Explore the codebase

If you have not already explored the codebase, do so to understand
the current architecture, existing patterns, and integration layers.

### 3. Identify durable architectural decisions

Before slicing, identify high-level decisions unlikely to change
throughout implementation:

- Route structures / URL patterns
- IPC channels (`<area>:<action>`)
- Database schema shape
- Key data models
- Third-party service boundaries

These go in the plan header so every phase can reference them.

### 4. Draft vertical slices

Break the PRD into tracer bullet phases. Each phase is a thin
vertical slice that cuts through ALL integration layers end-to-end,
NOT a horizontal slice of one layer.

Each phase must:

- Deliver a narrow but complete path through every layer
  (schema, domain, IPC, UI, tests)
- Be demoable or verifiable on its own when complete
- Prefer many thin slices over few thick ones
- Not include specific file names or function names that are
  likely to change as later phases are built
- Include durable decisions: route paths, schema shapes,
  data model names

### 5. Quiz the user

Present the proposed breakdown as a numbered list. For each phase:

- **Title**: short descriptive name
- **User stories covered**: which stories from the PRD this addresses

Ask the user:

- Does the granularity feel right?
- Should any phases be merged or split further?

Iterate until the user approves the breakdown.

### 6. Write the plan file

Use this template:

---

# Plan: [Feature Name]

> Source PRD: `prd.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: ...
- **IPC channels**: ...
- **Schema**: ...
- **Key models**: ...

---

## Phase 1: [Title]

**User stories**: [list from PRD]

### What to build

A concise description of this vertical slice. Describe the
end-to-end behaviour, not layer-by-layer implementation.

### Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

---

## Phase 2: [Title]

**User stories**: [list from PRD]

### What to build

...

### Acceptance criteria

- [ ] ...

---

## After writing the plan file

1. Save as `docs/features/<NN>-<feature-name>/plan.md`
2. Commit it on the feature branch: `docs: [<feature-name>] add plan`
3. Confirm to the user which file was saved
