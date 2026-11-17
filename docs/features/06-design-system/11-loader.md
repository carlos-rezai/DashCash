---
status: open
---
# Loader

## Parent PRD

`prd.md`

## What to build

The Loader, a **Primitive** (plan Phase 6; PRD "Primitives"; SPEC,
Loaders; `Loader.dc.html`, `loader-keyframes.css`; design log Q6, Q9, Q24,
Q41, P1). It draws the logo in a 1,6 s loop: the solid line, the three
dashes one by one, then the C; the march, orbit and grow variants keep
their keyframes. At 20 px or less (or `dashesOnly`) it shows only the three
dashes. It appears after its `delay` (300 ms by default) and fades in over
200 ms; under `prefers-reduced-motion` it stops moving and breathes from
opacity 1 to 0,45 over 2,4 s. It is a `role="status"` named by its label or
"Loading", in accent-600 by default or the colour given, with an optional
visible label beside it. `Loader.stories.tsx` is titled
`Primitives/Loader`; the **Theme** gains its durations (P1). Touches no
gate file.

## Acceptance criteria

- [ ] A RED commit adds the Loader's **Stories**, which fail.
- [ ] (review) Props exactly SPEC, Loaders (`variant = 'draw'`,
      `size = 32`, `label?`, `delay = 300`, `dashesOnly?`, `color`); every
      duration from the **Theme**.
- [ ] **Stories** for the four variants, the small dashes-only size, the
      labels "Recalculating…" and "Checking…", the current colour, and the
      delay; every story but the delay one sets `delay` 0.
- [ ] The delay story's **Play function** shows nothing before the delay
      and the status after it; the status is named by its label or
      "Loading".
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `01-icon-story-test.md`

## User stories addressed

- User stories 12 (the Loader's durations), 60, 61, 62, 63, 64, 65, 66,
  102, 103
