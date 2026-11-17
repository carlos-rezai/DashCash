---
status: open
---
# Input and Select

## Parent PRD

`prd.md`

## What to build

The text and choice fields (plan Phase 9; PRD "Primitives"; SPEC §3, Card
fill; `Input.dc.html`, `Select.dc.html`; design log Q7, Q10, Q15, Q24, P1).
The Input is 36 px (md) or 30 px (sm) on the input ground, with an
optional left icon, a suffix such as "€", right alignment and numeric
mode, reporting each change of its text. The Select, sm or md and with a
width, has its placeholder as the empty option, options with an optional
swatch of the chosen option's colour, and the warning tone (warning border
and placeholder colour). Both take an optional `ariaLabel` for when no
FormField labels them (Q10). Stories titled `Primitives/Input` and
`Primitives/Select`; the **Theme** gains the values they use (P1). Touches
no gate file.

## Acceptance criteria

- [ ] A RED commit adds both components' **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3 plus `ariaLabel`; Select's
      `tone: 'default' | 'warning'`.
- [ ] **Stories** for each size, the left icon, the money field
      ("1.529,60 €" right aligned, suffix "€"), the empty and chosen
      Select, the swatch, and the warning "Pick a category".
- [ ] **Play functions**: typing reports the new text; choosing an option
      reports its value; both controls are named by `ariaLabel`.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `13-tag-and-swatch.md`

## User stories addressed

- User stories 46, 47, 48, 49, 50, 102, 103
