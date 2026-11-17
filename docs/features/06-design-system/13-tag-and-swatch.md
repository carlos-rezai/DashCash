---
status: open
---
# Tag and Swatch

## Parent PRD

`prd.md`

## What to build

Labels and colour markers (plan Phase 8; PRD "Primitives"; SPEC §2
Milestone, §3 Tag fills; `Tag.dc.html`, `Swatch.dc.html`; design log Q7,
Q24, P1). The Swatch draws a square, circle or line at the given size and
colour. The Tag comes in the accent, neutral, outline, warning, danger and
milestone tones with SPEC §3's fills, 22 px high, with an optional 12 px
icon or an 8 px colour swatch; "Paid off" is milestone with its flag, never
accent. Stories titled `Primitives/Tag` and `Primitives/Swatch`; the
**Theme** gains the milestone colours, the tag tints and the tag height
(P1). Touches no gate file.

## Acceptance criteria

- [ ] A RED commit adds the Tag's and the Swatch's **Stories**, which fail.
- [ ] (review) `TagTone` is SPEC §1's five plus `milestone`; Swatch's props
      exactly SPEC §3; the tag height 22 is a **Token**.
- [ ] **Stories** for every tone, a tag with an icon ("New bank format"
      with its info icon), with a swatch, "Paid off" in the **Milestone
      tone** with its flag, and each swatch shape.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`

## User stories addressed

- User stories 6 (the **Milestone tone**), 43, 44, 45, 55, 102
