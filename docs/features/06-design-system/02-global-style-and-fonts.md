---
status: done
---
# Global style and self-hosted fonts

## Parent PRD

`prd.md`

## What to build

Every **Story** looks like the app: the dark ground, the ink and the
Barlow fonts, served from the app itself (plan Phase 1, the global style
and the fonts; PRD "Theme, global style, fonts"; design log Q13, Q14, Q21,
P1, I1, I3).

- `@fontsource/barlow` and `@fontsource/barlow-condensed` in the desktop
  member (Q39). `styles/fonts/fonts.ts` imports Barlow 400, 500, 600 and
  Barlow Condensed 500, 600; nothing loads a font from the network.
- `styles/GlobalStyle/GlobalStyle.ts` (`createGlobalStyle`) holds only the
  element-level rules of Q13: the ground, ink and body font on
  `html`/`body`, headings in Barlow Condensed, links in the accent, the 2 px
  accent focus ring with offset 2 on `:focus-visible`, the selection
  colour, the dark scrollbars and the `not-allowed` cursor on a disabled
  button. Industry's class rules are not carried over; its Google Fonts
  import is dropped.
- The **Theme** gains the **Tokens** these rules use (P1).
- `.storybook/preview.tsx` wraps every **Story** in `GlobalStyle` and
  imports the fonts.
- The proof (I3): `styles/GlobalStyle/GlobalStyle.stories.tsx`
  (`Styles/GlobalStyle`) shows a heading, body text, a link, a button and a
  disabled button; its **Play functions** read what the browser computes.

This ticket is the approval to change exactly: `apps/desktop/package.json`
(the two font packages), `package-lock.json`,
`quality/license-allowlist.json` (`OFL-1.1` only), and
`quality/audit-exceptions.json` only for an **Advisory** with no fix.

## Acceptance criteria

- [x] A RED commit adds the `Styles/GlobalStyle` **Stories**, which fail at
      their assertions.
- [x] Both font packages are exact dev dependencies of the desktop member,
      the newest release at least 14 days old on the day of building;
      every licence the lockfile gains is listed in the ticket's Notes;
      `OFL-1.1` joins the **License allowlist**, any other new licence
      stops the builder; an open **Advisory** gets an **Audit exception**
      with its reason, or the builder stops when a fix exists;
      `check:licenses` and `check:audit` pass.
- [x] The **Play functions** show: the page on the ground `#1b2a39` in the
      ink `#e9f1fa`; body text in Barlow, the heading in Barlow Condensed;
      the link in the accent; keyboard focus draws a 2 px accent outline at
      offset 2; the disabled button has the `not-allowed` cursor; Barlow
      400, 500, 600 and Barlow Condensed 500, 600 are loaded
      (`document.fonts`).
- [x] (review) `GlobalStyle` holds only element-level rules, every value
      from the **Theme**; no Google Fonts import and no class rule exist.
- [x] `npm run verify` is green.

## Notes

- `@fontsource/barlow` 5.3.0 (2026-07-19) and `@fontsource/barlow-condensed`
  5.3.0 (2026-07-19), the newest releases, both older than 14 days.
- Licences the lockfile gains: `OFL-1.1` (both packages); added to the
  **License allowlist**. No other new licence.
- No **Advisory** is open for either package; `quality/audit-exceptions.json`
  is unchanged.

## Blocked by

- Blocked by `01-icon-story-test.md`

## User stories addressed

- User stories 8 (the font families), 14, 15, 16, 17, 18, 101, 122, 123
