---
status: in-progress
---
# Meter

## Parent PRD

`prd.md`

## What to build

The Meter (plan Phase 11; PRD "Primitives"; SPEC §3, §5;
`Meter.dc.html`; design log Q9, Q10, Q24, P1). It shows its value as a
solid bar and the projected value beyond it as a dashed outline, in the
neutral, warning or danger tone; its width animates over 300 ms. It is a
`role="meter"` with its value and an optional `ariaLabel` (Q10).
`Meter.stories.tsx` is titled `Primitives/Meter`; the **Theme** gains the
values it uses (P1). Touches no gate file.

## Acceptance criteria

- [ ] A RED commit adds the Meter's **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3 plus `ariaLabel`; the 300 ms width
      transition from the **Theme**.
- [ ] **Stories** for each tone, value only, value with projection, and
      full.
- [ ] Each **Story**'s meter is named and carries its value.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`

## User stories addressed

- User stories 56, 57, 58, 59, 102
