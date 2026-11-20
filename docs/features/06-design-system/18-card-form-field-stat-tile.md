---
status: in-progress
---
# Card, FormField and StatTile

## Parent PRD

`prd.md`

## What to build

The first **Components** (plan Phase 12; PRD "Components"; SPEC §3, Card
fill; `Card.dc.html`, `FormField.dc.html`, `StatTile.dc.html`; design log
Q7, Q10, Q15, Q24, P1). The Card is filled with the surface colour and the
soft 1 px card border, square, with an optional kicker and title and none,
sm, md or lg padding, and no `actions` slot (Q7). The FormField shows its
label, the hint below the control and an error in the danger colour in the
hint's place, and ties its label to the control it wraps (Q10). The
StatTile shows a kicker, a text value or an Amount (passing its tone), a
hint, in the default, accent, warning or danger tone. Stories titled
`Components/Card`, `Components/FormField` and `Components/StatTile`; the
`components/` barrel exports them; the **Theme** gains the values they use
(P1). Touches no gate file.

## Acceptance criteria

- [ ] A RED commit adds the three components' **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3; the card fill and border per SPEC's
      Card fill.
- [ ] **Stories** for each Card padding, with and without kicker and
      title; the FormField with hint, with error, around an Input and a
      Select; the StatTile with text ("Rows in file", "24"), with money
      ("Total spending", `−557,85 €`), in each tone.
- [ ] The FormField's control is named by its label in every **Story**.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `10-amount.md`
- Blocked by `14-input-and-select.md`

## User stories addressed

- User stories 67, 68, 69, 92, 102

## Notes

- The Card leaves out `Card.dc.html`'s header wrapper and its three rules
  (`align-items: flex-start`, `justify-content: space-between`, the
  header's `gap`): with one header child they have no visible effect and
  no story can fail without them. The wrapper and its rules come back with
  the `actions` slot, when a header has two children and the rules can be
  tested.
