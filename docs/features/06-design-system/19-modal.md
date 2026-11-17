---
status: open
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
