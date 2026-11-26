---
status: done
---
# Accordion and auto-scroll on expand

## Parent PRD

`prd.md`

## What to build

The Accordion and the shared reveal hook (plan Phase 17; PRD "Components",
"Hook"; SPEC §3, §5, Auto-scroll on expand; `Accordion.dc.html`,
`lib/reveal.js`; design log Q24, Q25, Q42, P1). The Accordion has a title,
a meta value and a tag, and its chevron turns over 160 ms on toggle; the
clicked row stays put and its content opens below it. After it opens,
`hooks/useRevealOnExpand/` scrolls the nearest scroll container smoothly
just far enough to show the block with a 24 px margin, never past the
clicked row, not at all when it fits or on collapse, and jumps instead
under `prefers-reduced-motion`. Its pure part, `computeRevealScroll`
(the header's, the block's and the container's boxes and the margin in,
the scroll target or none out), is tested in Node by `npm test`.
`Accordion.stories.tsx` is titled `Components/Accordion`; the **Theme**
gains the values it uses, the 160 ms turn and the 24 px margin included
(P1). Touches no gate file.

## Acceptance criteria

- [x] A RED commit adds the hook's unit tests and the Accordion's
      **Stories**, which fail.
- [x] (review) Props exactly SPEC §3; the 160 ms turn and the 24 px margin
      are **Tokens**.
- [x] `computeRevealScroll`: a block that fits, one running past the
      bottom, one longer than the area, a clicked row near the top, and
      collapse.
- [x] **Stories** for closed, open, with meta and tag, and several
      accordions in a scroll area.
- [x] **Play functions**: a click toggles and reports `onToggle`; opening
      the last accordion in a scroll area brings its block into view
      without moving the clicked row out of it.
- [x] `npm run verify` is green.

## Blocked by

- Blocked by `13-tag-and-swatch.md`

## User stories addressed

- User stories 82, 83, 84, 85, 102, 103

## Notes

- `computeRevealScroll(head, block, container, margin)` lives in
  `hooks/useRevealOnExpand/useRevealOnExpand.ts` beside the hook. The three
  boxes are viewport boxes with `top` and `bottom`, as
  `getBoundingClientRect` gives them; `block` is `null` on collapse. It
  returns how far to scroll down, or `null` when nothing scrolls (it fits,
  the row already sits at or inside the top margin, or collapse), after
  `lib/reveal.js`.
- The block is the whole accordion, header and content, as
  `Accordion.dc.html` passes its section to `SB_reveal`; the **Stories**
  take the header's parent element as the accordion.
- The scroll-area **Story** leaves 48 px of room below the last accordion,
  as a page leaves below its content: without room, the area cannot scroll
  far enough to keep the 24 px margin below the last block.
- The parts are compared with references rendered beside the Accordion:
  the 16 px chevronRight Icon, and the Tag, neutral when no tone is given.
- While `Accordion.tsx` and `useRevealOnExpand.ts` are missing, Vite's
  unresolved import also fails the story files that run beside it in the
  same `npm run test:stories`, and lint (with the lint tree gate test) and
  typecheck report the unresolved types.
- For the refactor: two rules have no **Story** that fails without them.
  The Header's `display: flex` (`Accordion.styles.ts`; the Chevron's
  `display: flex` is checked) and the jump under `prefers-reduced-motion`
  in `useRevealOnExpand.ts` (`behavior: 'auto'` instead of `'smooth'`).
