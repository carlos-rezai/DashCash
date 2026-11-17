---
status: open
---
# Checkbox and Switch

## Parent PRD

`prd.md`

## What to build

The other two toggles (plan Phase 10, Checkbox and Switch; PRD
"Primitives"; SPEC §3, §5; `Checkbox.dc.html`, `Switch.dc.html`; design
log Q9, Q24, P1, I1). The 16 px Checkbox shows the accent fill and a check
when checked, with an optional label ("Mark as recurring"). The square
34 × 18 Switch is accent when on, a `role="switch"` named by its label or
`ariaLabel`, with no knob transition (Q9). Each toggles on click and
reports the new value, and does nothing when disabled. Stories titled
`Primitives/Checkbox` and `Primitives/Switch`; the **Theme** gains the
values they use, Checkbox 16 and Switch 34 × 18 included (P1). Touches no
gate file.

## Acceptance criteria

- [ ] A RED commit adds both components' **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3; Checkbox 16 and Switch 34 × 18 are
      **Tokens**; the Switch has no transition.
- [ ] **Stories**: checked and unchecked, labelled and unlabelled, and
      disabled for the Checkbox; on and off, with a label, with
      `ariaLabel`, and disabled for the Switch.
- [ ] **Play functions**: a click checks or switches and reports the new
      value; a click on a disabled control reports nothing; the Switch is
      named by its label or `ariaLabel`.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`

## User stories addressed

- User stories 52, 53, 102, 103
