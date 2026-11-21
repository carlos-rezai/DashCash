---
status: in-progress
---
# PageHeader and NavItem

## Parent PRD

`prd.md`

## What to build

The pieces that tell the user where they are (plan Phase 14, PageHeader
and NavItem; PRD "Components"; SPEC §3, Layouts; `PageHeader.dc.html`,
`NavItem.dc.html`; design log Q7, Q24, P1, I1). The PageHeader shows
title, subtitle, a tag and right-aligned actions, and an optional back
link with its label that calls back. The NavItem is 38 px with icon and
label, an active state and a count badge in accent or warning that hides
at 0; compact, it shows only its centred icon with the label as tooltip
and accessible name and the badge as a corner chip; a click calls back.
Stories titled `Components/PageHeader` and `Components/NavItem`; the
**Theme** gains the values they use, NavItem 38 included (P1). Touches no
gate file.

## Acceptance criteria

- [ ] A RED commit adds both components' **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3, NavItem plus `compact`; NavItem 38 is
      a **Token**.
- [ ] **Stories** for the PageHeader with and without back link, tag and
      actions; the NavItem resting, active, with each badge tone, at 0 and
      compact.
- [ ] **Play functions**: the back link calls back; a NavItem click calls
      back; the compact NavItem is named by its label; a badge at 0 is not
      shown.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `12-button.md`
- Blocked by `13-tag-and-swatch.md`

## User stories addressed

- User stories 70, 71, 77, 78, 79, 102, 103

## Notes

- The PageHeader's `children` (its actions) is optional like the other
  props but `title`: SPEC's Dashboard header has no actions, and the
  stories render the header without them.
- While `PageHeader.tsx` and `NavItem.tsx` are missing, Vite's unresolved
  imports also fail the story files that run beside them in the same
  `npm run test:stories`.
