---
status: done
---
# Modal

## Parent PRD

`prd.md`

## What to build

The Modal (plan Phase 13; PRD "Components"; SPEC §3, Card fill;
`Modal.dc.html`; design log Q7, Q10, Q24, P1). It renders nothing while
closed. Open, it shows title, subtitle and content on the raised fill with
the large shadow, 460 px wide unless told otherwise, over the dark
backdrop; its actions are the last row of its content, right aligned, and
it has no `actions` prop (Q7). Esc on the window and a click on the
backdrop call `onClose`; a click inside the panel does not. It is a modal
dialog labelled by its title (Q10). `Modal.stories.tsx` is titled
`Components/Modal`; the **Theme** gains the values it uses (P1). Touches no
gate file.

## Acceptance criteria

- [ ] A RED commit adds the Modal's **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3, no `actions` prop.
- [ ] The open Modal is a `role="dialog"` with `aria-modal`, named by its
      title.
- [ ] **Stories** for open with actions ("Cancel", "Confirm"), a custom
      width, and closed.
- [ ] **Play functions**: Esc and a backdrop click call `onClose`, a click
      inside the panel does not; the closed **Story** renders no dialog.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `12-button.md`

## User stories addressed

- User stories 72, 73, 74, 75, 76, 102, 103

## Notes

- Three rules of `Modal.dc.html` and `styles.css` have no visible effect,
  and no story can fail without them: the panel's `max-width: 100%` (the
  backdrop is a grid whose `auto` column grows to the panel, so a panel
  wider than the backdrop overflows it either way, as in the prototype),
  the panel's `position: relative` (nothing inside it is positioned), and
  the header's `align-items: flex-start` (the close button has a fixed
  height, so stretch places it the same). The Modal leaves them out, as the
  Card left out its inert header rules (ticket 18).
- The backdrop's `padding` (`--space-4`) is visible: when the backdrop is
  smaller than the panel plus 2 x space4 in a direction, it keeps the panel
  a space4 gap from the left and top edges instead of flush. The Modal keeps
  it; the `SmallBackdrop` story pins it.
- While `Modal.tsx` is missing, Vite's unresolved import also fails the
  story files that run beside it in the same `npm run test:stories`;
  without the new stories file all 159 stories pass.
