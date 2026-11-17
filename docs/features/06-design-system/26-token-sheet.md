---
status: open
---
# The complete token sheet and the Tokens story

## Parent PRD

`prd.md`

## What to build

The **Theme** becomes the whole dark sheet, and Storybook opens with the
inventory's Tokens section (plan Phase 19; PRD "Theme, global style,
fonts"; SPEC §2; `tokens/dashcash-dark.css` over Industry's `styles.css`;
`Component Inventory.dc.html`, section 01 Tokens; design log Q11, Q12,
Q26, P1, I5).

- `theme` gains every **Token** of the sheet still missing: the ground,
  sunken, surface and ink with muted, faint, divider, hover and backdrop as
  the sheet derives them; the inverted accent ramp 100 to 900 and the
  neutral ramp; the money, warning and danger colours with their tints and
  the **Milestone tone**; the five account and 40 category colours; Barlow
  Condensed 600 and Barlow 400 and 500 with the type scale 42 · 34 · 22 ·
  19 · 15 · 14 · 13 · 12 · 11; the 0.85× spacing scale, square corners, the
  shadows, the **Control heights**, SPEC §5's durations and the z-indices.
  Keys per Q11, values exactly as written, `color-mix()` strings kept.
- `tokens/theme/theme.stories.tsx`, titled `Tokens`, shows the inventory's
  colour tiles (each with its name and role), the type scale lines and the
  spacing bars (each with its name and px), verbatim, every value read from
  `theme`.

Touches no gate file.

## Acceptance criteria

- [ ] A RED commit adds the `Tokens` **Story**, whose **Play function**
      fails.
- [ ] The **Play function** finds every colour tile of the inventory with
      its name and role and its swatch filled (not transparent), the eight
      type-scale lines at their sizes, and every spacing bar with its name,
      its px and a width, as `Component Inventory.dc.html` writes them; a
      **Token** missing from `theme` fails it.
- [ ] (review) Every variable of `dashcash-dark.css` over Industry's
      `styles.css` is a **Token** with its key per Q11 and its value
      exactly as written, `color-mix()` strings kept.
- [ ] (review) No component's styles hold a literal colour, size or
      spacing; every value comes from the **Theme**.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `10-amount.md`
- Blocked by `11-loader.md`
- Blocked by `12-button.md`
- Blocked by `13-tag-and-swatch.md`
- Blocked by `14-input-and-select.md`
- Blocked by `15-segmented-and-chip.md`
- Blocked by `16-checkbox-and-switch.md`
- Blocked by `17-meter.md`
- Blocked by `18-card-form-field-stat-tile.md`
- Blocked by `19-modal.md`
- Blocked by `20-page-header-and-nav-item.md`
- Blocked by `21-stepper.md`
- Blocked by `22-logo-and-sparkline.md`
- Blocked by `23-snackbar.md`
- Blocked by `24-accordion-and-reveal.md`
- Blocked by `25-year-table.md`

## User stories addressed

- User stories 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 102
