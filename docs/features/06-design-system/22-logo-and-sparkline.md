---
status: open
---
# Logo and Sparkline

## Parent PRD

`prd.md`

## What to build

The brand mark and the account trend line (plan Phase 15; PRD
"Components"; SPEC §3, Name and logo; `Logo.dc.html`, `Sparkline.dc.html`;
design log Q12, Q19, Q24, Q25, P1). The Logo is the mark or full (mark plus
wordmark) in its dark and light colours, its stroke width chosen by size
(3.2 up to 20 px, 2.6 up to 32, 2.2 above) and its third dash ending flush
with the C. The Sparkline draws the past solid, the future dashed and a
hairline tick at today in the account's colour, 36 px high by default. The
stroke width, the dash end point and the mapping from `past` and `future`
**Cents** to points of the box are pure functions of their modules, tested
in Node by `npm test` (Q25). Stories titled `Components/Logo` and
`Components/Sparkline`; the **Theme** gains the values they use, the
Logo's light colours included (Q12, P1). Touches no gate file.

## Acceptance criteria

- [ ] A RED commit adds the unit tests and both components' **Stories**,
      which fail.
- [ ] (review) Props exactly SPEC §3 and SPEC, Name and logo; the Logo's
      light colours are **Tokens**.
- [ ] Unit tests: the stroke width at and either side of 20 and 32 px; the
      dash end point; the Sparkline's points for a rising, a falling, a
      flat and a past-only series.
- [ ] **Stories** for mark and full, dark and light, at several sizes; the
      Sparkline with past and future, past only, and in an account colour.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`
- Blocked by `09-money-format.md`

## User stories addressed

- User stories 93, 94, 102
