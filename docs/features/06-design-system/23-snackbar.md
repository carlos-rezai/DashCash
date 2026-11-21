---
status: done
---
# Snackbar

## Parent PRD

`prd.md`

## What to build

The Snackbar (plan Phase 16; PRD "Components"; SPEC §3, Card fill,
Loaders; `Snackbar.dc.html`; design log Q7, Q24, P1). Success, error, info
and warning tones, with a tone-tinted fill on the raised ground, a tone
hairline, the large shadow and the tone's icon or a given one. Its primary
action is a primary Button for info and success and a secondary one for
warning and error, with an optional icon; a secondary action and a close
button are optional; each calls back. Error and warning are alerts, the
others status. Loading, an 18 px Loader replaces the icon ("Installing…").
`Snackbar.stories.tsx` is titled `Components/Snackbar`; the **Theme** gains
the values it uses (P1). Touches no gate file.

## Acceptance criteria

- [x] A RED commit adds the Snackbar's **Stories**, which fail.
- [x] (review) Props exactly SPEC §3 plus `loading`.
- [x] **Stories** for each tone, with primary and secondary actions, with
      an action icon, with close, with a custom icon, and loading
      ("Installing…").
- [x] **Play functions**: each action and the close button call back; the
      error and warning **Stories** expose an alert, the others a status.
- [x] `npm run verify` is green.

## Blocked by

- Blocked by `12-button.md`

## User stories addressed

- User stories 95, 96, 97, 98, 99, 102, 103

## Notes

- The tone **Stories** are `SuccessTone`, `ErrorTone`, `InfoTone` and
  `WarningTone`: an export named `Error` would shadow the global `Error`
  the stories file throws.
- The error tone's icon and hairline use `--sb-danger` as design log D1
  raises it, `#ed8c80`; its tint keeps the base `#e8877b` (D1). The success
  tint is `--sb-positive-tint`, the info tint `--color-accent-100`.
- The **Stories** take `aria-live` from `Snackbar.dc.html`: `assertive` for
  error, `polite` for the others.
- The parts are compared with references rendered beside the Snackbar: the
  Icon at 18 px, the Loader at 18 px with `delay` 0 and `currentColor`, the
  actions as sm Buttons and the close button as `Snackbar.dc.html`'s ghost
  sm Button with the x icon, titled "Dismiss".
- While `Snackbar.tsx` is missing, Vite's unresolved import also fails the
  story files that run beside it in the same `npm run test:stories`, and
  lint (with the lint tree gate test) and typecheck report the unresolved
  types.
