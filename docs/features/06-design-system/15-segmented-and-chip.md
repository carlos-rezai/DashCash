---
status: open
---
# Segmented and Chip

## Parent PRD

`prd.md`

## What to build

Two of the four toggles (plan Phase 10, Segmented and Chip; PRD
"Primitives"; SPEC §3; `Segmented.dc.html`, `Chip.dc.html`; design log
Q24, P1, I1). The Segmented shows its selected option in the accent fill,
28 px by default and 36 px at md, and reports the option clicked. The
28 px Chip is a toggle button with `aria-pressed`, an optional square,
circle or line swatch and a muted meta value on the right; it toggles on
click, and a disabled chip keeps its resting fill and reports nothing.
Stories titled `Primitives/Segmented` and `Primitives/Chip`; the **Theme**
gains the values they use, the Chip's 28 px included (P1). Touches no gate
file.

## Acceptance criteria

- [ ] A RED commit adds both components' **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3; the Chip's 28 px is a **Token**.
- [ ] **Stories**: the Segmented with each option selected and at both
      sizes; the Chip resting and pressed, with each swatch shape, with
      meta, and disabled.
- [ ] **Play functions**: a click on an option selects it and reports its
      value; a click on a chip reports the new pressed state; a click on a
      disabled chip reports nothing.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `13-tag-and-swatch.md`

## User stories addressed

- User stories 51, 54, 102, 103
