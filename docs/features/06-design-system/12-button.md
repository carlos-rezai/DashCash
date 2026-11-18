---
status: in-progress
---
# Button

## Parent PRD

`prd.md`

## What to build

The Button (plan Phase 7; PRD "Primitives"; SPEC §3, Control sizing,
Loaders; `Button.dc.html`; design log Q7, Q24, P1). Primary (solid
accent), secondary, ghost and danger variants, md 36 px and sm 28 px high
(**Control heights**) with 16 or 14 px icons; a left and a right icon,
`block`, and a square icon button named by its `title` when it has no
label. Disabled, it shows 45 % opacity, no hover or pressed state, and a
click does nothing. Loading, a Loader at icon size in the current colour
replaces its icon, `loadingLabel` replaces its label, it stays at full
strength, keeps its width, is `aria-busy` and cannot be pressed.
`Button.stories.tsx` is titled `Primitives/Button`; the **Theme** gains
the **Control heights** and the values it uses (P1). Touches no gate file.

## Acceptance criteria

- [x] A RED commit adds the Button's **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3 plus `loading`, `loadingLabel`,
      `loaderVariant`; the **Control heights** md 36 and sm 28 are
      **Tokens**.
- [x] **Stories** for each variant and size, left and right icon, icon
      only, `block`, disabled and loading ("Importing…").
- [x] **Play functions**: a click calls `onClick`; a click on a disabled
      or a loading button does not; the loading button reports itself
      busy; the icon-only button is named by its `title`.
- [x] `npm run verify` is green.

## Notes

- The Loader's styles (`primitives/Loader/Loader.styles.ts`) still use literal
  opacities, against "theme tokens only"; for the refactor.

## Blocked by

- Blocked by `11-loader.md`

## User stories addressed

- User stories 11 (md and sm), 32, 33, 34, 35, 36, 37, 102, 103
