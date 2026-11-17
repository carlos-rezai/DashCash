---
status: open
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

- [ ] A RED commit adds the Snackbar's **Stories**, which fail.
- [ ] (review) Props exactly SPEC §3 plus `loading`.
- [ ] **Stories** for each tone, with primary and secondary actions, with
      an action icon, with close, with a custom icon, and loading
      ("Installing…").
- [ ] **Play functions**: each action and the close button call back; the
      error and warning **Stories** expose an alert, the others a status.
- [ ] `npm run verify` is green.

## Blocked by

- Blocked by `12-button.md`

## User stories addressed

- User stories 95, 96, 97, 98, 99, 102, 103
