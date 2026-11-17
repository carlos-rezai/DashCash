---
status: open
---
# The Icon as a story test

## Parent PRD

`prd.md`

## What to build

The tracer bullet: one **Primitive** rendered from the **Theme** in a real
browser, as a **Story test** (plan Phase 1 without the global style, the
fonts and the lint rules; PRD "Theme, global style, fonts", "Primitives",
"Storybook", "TypeScript and lint"; design log Q8, Q11, Q20–Q23, Q28, A1,
P1, I1, I2).

- Dependencies (Q39): `react`, `react-dom`, `styled-components`,
  `lucide-react`, `@types/react` and `@types/react-dom` in the desktop
  member; `storybook`, `@storybook/react-vite`, `@storybook/addon-vitest`
  and `@vitest/browser-playwright` at the root.
- `tokens/theme/theme.ts`: `theme` with its eight groups (`color`, `font`,
  `fontSize`, `space`, `size`, `shadow`, `motion`, `zIndex`) and the
  **Tokens** the Icon uses, keyed and valued per Q11 and Q12 (P1);
  `types/` declares styled-components' `DefaultTheme` from its type; the
  `tokens/` barrel exports it.
- `primitives/Icon/`: `IconName` is exactly the 41 keys of
  `docs/design/prototype/lib/icons.js` (`undo` and `folder` included); each
  name maps to its `lucide-react` glyph at `strokeWidth` 1.5, `size = 16`,
  in the current colour, `aria-hidden` (Q8). `Icon.stories.tsx`
  (`Primitives/Icon`) shows every icon beside its name. The `primitives/`
  barrel exports it.
- `.storybook/main.ts` (framework `@storybook/react-vite`, stories from the
  renderer's `**/*.stories.tsx`, `@storybook/addon-vitest`, telemetry off)
  and `.storybook/preview.tsx` (every **Story** inside the `ThemeProvider`
  with `theme`). `vitest.storybook.config.ts`: the Storybook plugin on
  `.storybook/`, browser mode with the Playwright provider, headless, one
  Chromium instance.
- Root scripts: `storybook` = `storybook dev --port 6006 --no-open`,
  `test:stories` = `vitest run --config vitest.storybook.config.ts`,
  `postinstall` = `install-electron && playwright install --only-shell
  chromium`; **Verify** runs `test:stories` right after `test`. `npm test`
  stays the Node run.
- `apps/desktop/tsconfig.web.json` gains `"jsx": "react-jsx"` and
  `.storybook/preview.tsx`; the root `tsconfig.json` gains
  `.storybook/main.ts` (A1).

The RED (I2): no **Story test** can run before Storybook is installed, and
installing it is this ticket's build. So the RED commit's failing tests are
the **Gate wiring** and `postinstall` pins, which fail at their
assertions; the Icon's stories file is committed beside them and runs
first in GREEN.

This ticket is the approval to change exactly: the root `package.json`
(the dependencies and the four scripts above), `apps/desktop/package.json`
(the dependencies above), `package-lock.json`, `tsconfig.json`,
`apps/desktop/tsconfig.web.json`, to create `vitest.storybook.config.ts`,
to change `gates/verifyScripts/verifyScripts.test.ts`,
`gates/test-support/verifyGates/verifyGates.ts` and `gates/electronInstall/`
to pin the new values, and `quality/audit-exceptions.json` only for an
**Advisory** with no fix.

## Acceptance criteria

- [ ] A RED commit changes the **Gate wiring** test (`test:stories` after
      `test`, thirteen gates, the `storybook` and `test:stories` commands)
      and the `postinstall` pin in `gates/electronInstall/`, which fail at
      their assertions, and adds `Icon.stories.tsx`.
- [ ] Every new package is an exact dev dependency in the member Q39 names,
      the newest release at least 14 days old on the day of building,
      `@vitest/browser-playwright` at the installed Vitest's version; every
      licence the lockfile gains is listed in the ticket's Notes; a licence
      the **License allowlist** lacks stops the builder; an open
      **Advisory** gets an **Audit exception** with its reason, or the
      builder stops when a fix exists; `check:licenses` and `check:audit`
      pass.
- [ ] (review) `theme` has the eight groups, its keys follow Q11 and its
      values the token sheet exactly; `DefaultTheme` is derived from its
      type, so an unknown key fails `npm run typecheck`.
- [ ] `IconName` is exactly the 41 names of `lib/icons.js`; each renders its
      Lucide glyph at stroke 1.5, 16 px by default, `aria-hidden`; the
      **Story** shows all 41 with their names, and it passes as a **Story
      test**.
- [ ] `npm run storybook` serves the Icon on port 6006 without opening a
      browser (the builder starts it and fetches the page, recorded in the
      ticket's Notes); telemetry is off.
- [ ] `test:stories` runs headless Chromium with no browser download; a
      **Story** that throws fails it (shown in the Notes, never committed);
      `npm test` runs no browser.
- [ ] `postinstall` is exactly `install-electron && playwright install
      --only-shell chromium`, pinned by `gates/electronInstall/`.
- [ ] **Verify** runs `test:stories` right after `test`, pinned by the
      **Gate wiring** test.
- [ ] The **Mutation score** stays at or above the **Break threshold** of
      83 (`npm run test:mutation`).
- [ ] `npm run verify` is green.

## Notes

- A Linux CI runner may lack a library headless Chromium needs (PRD,
  Further Notes). If the first CI run fails on it, the loop stops: the fix
  is a CI step, which this ticket does not approve.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 1, 2, 3, 28, 29, 30, 31, 100, 101, 102, 104, 105, 106, 107,
  121, 122
