---
status: done
---
# Amount

## Parent PRD

`prd.md`

## What to build

The first money on screen (plan Phase 5, the Amount; PRD "Primitives";
design log Q7, Q24, P1, I1, D1). `primitives/Amount/` takes
`cents: Cents | null` and formats through `formatCents` from
`@dashcash/domain`: coloured by **Polarity** by default (`auto`), `muted`
at 100 % (the **Polarity** colour exactly like `auto`, D1; the prototype's
62 % fails contrast), `neutral`, and the `positive`, `negative`, `warning`,
`danger` and `accent` tones; sizes sm 13, md 14, lg 22 and xl 34 (the large
two in Barlow Condensed), tabular figures, `strong`, and "-" for `null`.
`Amount.stories.tsx` is titled `Primitives/Amount`; the **Theme** gains the
colours and type sizes it uses (P1), with D1's values: `negative` and
`danger` are `#ed8c80`, not the prototype's `#e8877b`. Touches no gate
file.

## Acceptance criteria

- [x] A RED commit adds the Amount's **Stories**, which fail.
- [x] (review) Props exactly SPEC §3 with `tone` SPEC §3's seven plus
      `accent` (Q7); every value from the **Theme**; `muted` renders the
      same colour as `auto` at full opacity (D1).
- [x] Every tone's **Story** passes the **Accessibility check**, contrast
      included.
- [x] The Amount has a **Story** per tone, per size, `strong`, zero and
      `null`, with invented values in German format verbatim, each showing
      the formatted text (`−86,40 €`, "-" for `null`).
- [x] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`
- Blocked by `09-money-format.md`

## User stories addressed

- User stories 38, 39, 40, 41, 42, 102
