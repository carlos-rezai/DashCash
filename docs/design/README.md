# Handoff: DashCash v2 (desktop personal finance app)

## Overview
DashCash is a local-only personal finance app (Electron, Windows). It shows past, present and future balances of five account types (income, spending, savings, credit card, mortgage) on one timeline, solid history and dashed projection, with the mortgage payoff highlighted, plus a calm motivation layer: monthly goals, streaks and headroom. Data comes only from imported bank CSVs. The name is the mark: the dash (the projection line) first, then the C for cash.

Screens: Dashboard, Accounts (list + detail), Import (5-step wizard + imported files), Compare, Categories (+ rules, uncategorised), Settings, plus the app shell, modals, snackbars, loaders, splash and logo.

## Changes in this build (30 Oct 2026)
- Import step 3: no per-row checkboxes; rule matches count as categorised. Filter is now All / No category / From rules. Only rows with no category are highlighted (warning tint, never blocking).
- Recategorising a merchant applies the new exact rule at once to all same-merchant rows in that import; the reset icon reverts a row and clears its rule (and opts applied rows out).
- Timeline account toggles + range and year-table column toggles persist across app starts.
- Higher-contrast accent and neutral tags; consistent gap between the category Select and the reset icon.
- Compare gains a Months / Years toggle. Years mode: chips only for years with imported data (2024–2026); the current year is labelled "to date" and, when selected, all years are compared over the same months (Jan–Oct), with a *Full years* switch to compare full calendar years (current year then excluded from the highlight). The change column runs earliest → latest selected in both modes.

## About the design files
The files in `prototype/` are **design references built in HTML**: a clickable prototype showing the intended look and behaviour, not production code to ship. Recreate them in the target codebase (planned: React + styled-components with typed props, Electron renderer). Every `.dc.html` file maps 1:1 to one React component; `SPEC.md` §1 lists the target path for each.

## Fidelity
**High fidelity.** Final colours, type, spacing, states, copy and interactions. Rebuild pixel-accurately at the 1440 × 900 reference viewport. All sample data is invented (including the mortgage, chosen to show a long time span); amounts use German formatting (1.234,56 €); "today" is fixed at 26 Oct 2026.

## How to view the prototype
Serve `prototype/` with a local web server (e.g. `npx serve prototype`), then open:
- `DashCash.dc.html`: the whole app.
- `Component Inventory.dc.html`: every level in isolation (tokens → primitives → components → features → layouts → pages).
- `Logo Options.dc.html`: logo exploration; **7c is final**.
- `Loader Options.dc.html`: loader motions and every loader context; **8a Draw is final**.

Opening the files straight from disk may block the component fetches.

## Contents
- `SPEC.md`: the complete specification, built from:
  1. file → React mapping
  2. design tokens (colours with hex, ramps, semantic money / warning / milestone tokens, type scale, spacing, sizes, shadows)
  3. component API (typed props)
  4. screens and behaviour
  5. interactions: control sizing, card spacing, scroll anchoring, sidebar overlay, snackbars, import reminders, mortgage schedule, streak rule, headroom threshold, loaders, name and logo
- `prototype/`: all components and pages, `lib/store.js` (mock data and domain logic; the source of truth where text and prototype disagree), `lib/icons.js`, `lib/reveal.js`, `tokens/dashcash-dark.css`, the Industry design system files in `_ds/`, and `support.js` (prototype runtime only).
- `assets/icons/`: all 40 interface icons as SVG (Lucide geometry, 24 viewBox, stroke 1.5, `currentColor`). In code, use `lucide-react` at `strokeWidth={1.5}` with the same names.
- `assets/logo/`: mark 7c for dark, dark on the app ground and light, optical 16 / 32 px versions, and dark/light wordmarks (Barlow Condensed 600).
- `assets/loaders/`:
  - self-contained animated SVGs: Draw (final) at 96 / 48 / 28 / 16 px; march, orbit, grow at 96 / 16
  - `loader-keyframes.css`: exact keyframes (1,6 s loop, reduced-motion fallback). Draw order: line, dashes one by one, then the C from the tip of the last dash.
- `assets/typography/fonts.md`: Barlow Condensed + Barlow, weights, number formatting, how to self-host offline.
- The product concept lives in [`../concept.md`](../concept.md).
