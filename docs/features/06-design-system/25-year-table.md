---
status: open
---
# YearTable

## Parent PRD

`prd.md`

## What to build

The YearTable (plan Phase 18; PRD "Components"; SPEC §2 Milestone, §3,
§4; `YearTable.dc.html`; design log Q7, Q12, Q24, Q42, P1). Year rows open
and close on click with a chevron, the condensed year, a tag and bold
totals; month rows sit on the sunken ground, today's month in accent-100,
the payoff month in the milestone row colour (Q7), future months faded.
Cells show an amount, an icon with its tooltip, a text or nothing. Years
start open as told, and each toggle is reported. The equal-columns layout
(first column 230 px, every data column the same width of at least
130 px) scrolls inside the card when narrow; column headers never wrap and
carry their colour dot and alignment. Opening a year reveals it through
`useRevealOnExpand`. `YearTable.stories.tsx` is titled
`Components/YearTable`, with invented data; the **Theme** gains the values
it uses, the column widths included (P1). Touches no gate file.

## Acceptance criteria

- [ ] A RED commit adds the YearTable's **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3; the payoff row uses the milestone row
      colour; the column widths are **Tokens**.
- [ ] **Stories** for years closed and open by default, today's month, the
      payoff month, future months, each cell kind, and a narrow width with
      several account columns.
- [ ] **Play functions**: a year row click toggles its months and reports
      `onToggle`.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `10-amount.md`
- Blocked by `24-accordion-and-reveal.md`

## User stories addressed

- User stories 86, 87, 88, 89, 90, 91, 102, 103
