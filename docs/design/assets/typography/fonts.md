# Typography

Both families are free (SIL Open Font License) from Google Fonts. Bundle them locally in the Electron app (the app is offline): download from https://fonts.google.com/specimen/Barlow+Condensed and https://fonts.google.com/specimen/Barlow, or install via `npm i @fontsource/barlow @fontsource/barlow-condensed`.

| Role | Family | Weights used |
| --- | --- | --- |
| Headings, wordmark, big numbers | Barlow Condensed | 500, 600 |
| Body, UI, tables | Barlow | 400, 500, 600 |

- Numbers: always `font-variant-numeric: tabular-nums`; euro amounts in German formatting (1.234,56 €), via `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.
- Full type scale (sizes, line heights, letter-spacing per role): SPEC.md §2 *Type*.
- Prototype source of truth: `prototype/_ds/…/styles.css` (`--font-heading`, `--font-body`) and `prototype/tokens/dashcash-dark.css`.

```css
@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600&display=swap'); /* prototype only; self-host in the app */
```
