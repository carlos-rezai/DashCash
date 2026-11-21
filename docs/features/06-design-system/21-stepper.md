---
status: in-progress
---
# Stepper

## Parent PRD

`prd.md`

## What to build

The Stepper (plan Phase 14, Stepper; PRD "Components"; SPEC §3;
`Stepper.dc.html`; design log Q24, P1, I1). It has equal cells: done steps
show a check in an accent square and report their index on click; the
current step has the accent-100 fill and a 2 px bottom bar; future steps
are faint and disabled. `Stepper.stories.tsx` is titled
`Components/Stepper`; the **Theme** gains the values it uses, the step
height 44 included (P1). Touches no gate file.

## Acceptance criteria

- [ ] A RED commit adds the Stepper's **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3; the Stepper step 44 is a **Token**.
- [ ] **Stories** for the Stepper at the first, a middle and the last step.
- [ ] **Play functions**: a done step reports its index; a future step is
      disabled and reports nothing.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`

## User stories addressed

- User stories 80, 81, 102, 103

## Notes

- Stepper.dc.html sets the cursor inline: pointer on a done step, default
  on the current and on a future step, so a future step keeps the default
  cursor over `GlobalStyle`'s `button:disabled` rule; and only a done step
  calls `onStep`, the current step does not.
- While `Stepper.tsx` is missing, Vite's unresolved import also fails the
  story files that run beside it in the same `npm run test:stories`.
