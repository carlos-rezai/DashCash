---
status: done
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

- [x] A RED commit changes the **Gate wiring** test (`test:stories` after
      `test`, thirteen gates, the `storybook` and `test:stories` commands)
      and the `postinstall` pin in `gates/electronInstall/`, which fail at
      their assertions, and adds `Icon.stories.tsx`.
- [x] Every new package is an exact dev dependency in the member Q39 names,
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
- [x] `IconName` is exactly the 41 names of `lib/icons.js`; each renders its
      Lucide glyph at stroke 1.5, 16 px by default, `aria-hidden`; the
      **Story** shows all 41 with their names, and it passes as a **Story
      test**.
- [x] `npm run storybook` serves the Icon on port 6006 without opening a
      browser (the builder starts it and fetches the page, recorded in the
      ticket's Notes); telemetry is off.
- [x] `test:stories` runs headless Chromium with no browser download; a
      **Story** that throws fails it (shown in the Notes, never committed);
      `npm test` runs no browser.
- [x] `postinstall` is exactly `install-electron && playwright install
      --only-shell chromium`, pinned by `gates/electronInstall/`.
- [x] **Verify** runs `test:stories` right after `test`, pinned by the
      **Gate wiring** test.
- [x] The **Mutation score** stays at or above the **Break threshold** of
      83 (`npm run test:mutation`).
- [x] `npm run verify` is green.

## Notes

- A Linux CI runner may lack a library headless Chromium needs (PRD,
  Further Notes). If the first CI run fails on it, the loop stops: the fix
  is a CI step, which this ticket does not approve.
- Removal condition: drop `skipLibCheck` from `apps/desktop/tsconfig.web.json`
  and `.storybook/tsconfig.json` once a Storybook release at least 14 days
  old fixes the misplaced `@ts-expect-error` comments in `@storybook/react`
  (TS2578 and TS2344 at `dist/chunk-ojHmM-yX.d.ts` lines 1026 and 1072 in
  10.6.x; design log D8).
- Install: every Storybook package is exactly 10.6.5 (`storybook`,
  `@storybook/react-vite`, `@storybook/addon-vitest`, and their
  `@storybook/*` dependents), one `vitest` (5.0.5), no `overrides`. A plain
  `npm install` and then `npm ci` after deleting `node_modules` both exit 0,
  without `--legacy-peer-deps` or `--force`. On that install `npm run
  typecheck` exits 0 and `npm run test:stories` passes the Icon story.
- Licences the lockfile gained (211 packages, all in the **License
  allowlist**; `check:licenses` exits 0): MIT 200, Apache-2.0 2
  (`aria-query`, `doctrine`), BlueOak-1.0.0 4 (`glob`, `minipass`,
  `path-scurry`, `lru-cache`), ISC 3 (`css-color-keywords`, `lucide-react`,
  `semver`), BSD-2-Clause 1 (`esprima`), BSD-3-Clause 1 (`source-map`).
- Audit: GHSA-3g3m-2fjr-6pw4 (`glob` 13.0.7, range 9.0.0 to 14.0.1) still
  applies. It is reached through `@storybook/react-vite` 10.6.5, which pins
  `@joshwooding/vite-plugin-react-docgen-typescript` `^0.7.0`, whose `glob`
  is `^13`; the first fixed `glob` is 14.0.2, outside that range, and the
  only `npm audit` fix is a downgrade of Storybook to 8.5.3. So the **Audit
  exception** in `quality/audit-exceptions.json` stays; `check:audit` exits
  0.
- Storybook server: `npm run storybook` started on port 6006 without
  opening a browser; fetching `http://localhost:6006/` returned 200,
  `index.json` listed `primitives-icon--all-icons` (`Primitives/Icon`, from
  `Icon.stories.tsx`), and `iframe.html?id=primitives-icon--all-icons`
  returned 200. The server was then stopped.
- Throwing story: a temporary `Throws` story whose component throws, beside
  the Icon, made `npm run test:stories` exit 1 (`Throws` failed, the Icon
  story passed, headless Chromium, no download). It was deleted and never
  committed.
- Mutation score: `npm run test:mutation` exit 0, final score 84.00 against
  the **Break threshold** of 83.

## Blocked by

None — can start immediately.

## User stories addressed

- User stories 1, 2, 3, 28, 29, 30, 31, 100, 101, 102, 104, 105, 106, 107,
  121, 122
