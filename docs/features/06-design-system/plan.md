# Plan: 06 design-system

> Source PRD: `prd.md`. Decisions: `design-log.md` (Q1–Q42, A1–A5,
> P1–P2). Terms in bold are defined in `docs/ubiquitous-language.md`.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: none. Nothing renders in the app window; every piece is shown
  only in Storybook, served by `npm run storybook` on port 6006. **Story**
  titles are `<Layer>/<Name>` (`Primitives/Button`, `Components/Modal`);
  the token sheet's **Story** is `Tokens` (Q24, Q26). The **CSP** is
  unchanged (Q38).
- **IPC channels**: none. No component calls the **Bridge**, so no
  **Story** needs a fake bridge.
- **Schema**: none. No **Database** change, no **Migration**.
- **Key models**:
  - `Cents = number & { readonly __brand: 'Cents' }`,
    `toCents(value: number): Cents` (a `RangeError` unless a safe
    integer), `formatCents(cents, { whole?, sign?: 'auto' | 'always' |
    'none' })`, the one **Money format**, in `@dashcash/domain`, imported
    by module path (`@dashcash/domain/money/formatCents/formatCents`)
    (Q16–Q18).
  - `theme`: one object typed as styled-components' `DefaultTheme`, which
    `types/` derives from its type; groups `color`, `font`, `fontSize`,
    `space`, `size`, `shadow`, `motion`, `zIndex`; keys by SPEC §2's
    bracketed name, else the CSS variable's name in camelCase without its
    prefix; values exactly the dark sheet over Industry's styles, and every
    prototype literal SPEC §2 does not name as a named **Token** with its
    exact value (Q11, Q12). It grows phase by phase and is complete in
    phase 19 (P1).
  - `IconName` (the 41 names of `lib/icons.js`), `TagTone` (SPEC §1's five
    plus `milestone`), Amount's `tone` (SPEC §3's seven plus `accent`),
    every other prop exactly SPEC §3 plus the PRD's additions (Q7, Q8,
    Q10).
  - `Violation` and `runGate` from `scripts/reportViolations/` for both new
    gates; `quality/coverage-threshold.json` = `{ "changedLines": 80 }`
    (A2).
- **Renderer placement**: `apps/desktop/src/renderer/<layer>/<Name>/` with
  `<Name>.tsx`, `<Name>.styles.ts`, `<Name>.stories.tsx`; one barrel each
  for `primitives/`, `components/` and `tokens/`; the Loader is a
  **Primitive** (Q6); the global style and the fonts in `styles/`; the
  auto-scroll hook in `hooks/`. A component gets a Node unit test only for
  a pure function its module exports (Q25). The **Layer rules** stay as
  they are.
- **Test layers**: domain rules in Vitest, measured by **Mutation testing**
  (**Break threshold** 83); gate cores and entries in Vitest with sample
  repositories; config pins in `gates/`; every state a **Story**, every
  interaction a **Play function**, every **Story** a **Story test** in
  headless Chromium with, from phase 2, the **Accessibility check**. No
  **End-to-end test** (Q4).
- **Scripts**: `storybook` and `test:stories` (phase 1),
  `check:stories` (phase 3), `check:coverage` (phase 4), `typecheck` gains
  the domain project (phase 5); `postinstall` =
  `install-electron && playwright install --only-shell chromium`
  (phase 1). **Verify** ends as `format:check`, `lint`, `typecheck`,
  `lint:deps`, `check:stories`, `test`, `test:stories`, `check:coverage`,
  then the seven gates from `check:commits` to `check:quarantine`, fifteen
  in all, each phase inserting its gate at its place in `VERIFY_GATES`.
- **Storybook**: `.storybook/main.ts` (framework `@storybook/react-vite`,
  stories from the renderer's `**/*.stories.tsx`, telemetry off; addons
  `addon-vitest` in phase 1, `addon-a11y` in phase 2, `addon-mcp` in
  phase 20); `.storybook/preview.tsx` wraps every **Story** in the
  `ThemeProvider`, `GlobalStyle` and the fonts; `vitest.storybook.config.ts`
  runs the **Story tests** (Q20–Q22, A1).
- **Supply chain**: every new package an exact dev dependency, the newest
  release at least 14 days old on the day of building (the Storybook
  releases of 2026-11-13 are too young today), the Vitest companions at
  the installed Vitest's version; renderer libraries in the desktop member,
  test and lint tools at the root (Q39). `OFL-1.1` joins the **License
  allowlist** in phase 1; any other new licence stops the builder; an open
  **Advisory** gets an **Audit exception** with its reason, or the builder
  stops when a fix exists. Phases 1, 2, 4 and 20 install packages.
- **Gate files the phases name**: `package.json`, `package-lock.json`,
  `tsconfig.json`, `apps/desktop/tsconfig.web.json`, `eslint.config.js`,
  `vitest.storybook.config.ts`, `quality/license-allowlist.json`,
  `quality/audit-exceptions.json` if needed, `gates/verifyScripts/`,
  `gates/test-support/verifyGates/` and `gates/electronInstall/`
  (phase 1); `package.json`, `package-lock.json`,
  `apps/desktop/tsconfig.web.json` and `gates/storyTests/` (phase 2);
  `package.json` and the gate wiring (phase 3); `package.json`,
  `package-lock.json`, `vitest.config.ts`, `vitest.stryker.config.ts`,
  `vitest.storybook.config.ts`, `quality/coverage-threshold.json`,
  `gates/coverage/` and the gate wiring (phase 4); `package.json`,
  `package-lock.json` and the domain member's `tsconfig.json` (phase 5);
  `package.json` and `package-lock.json` (phase 20). Phase 21 changes
  `.claude/` and is built by the human. So `/feature-pipeline` pauses for
  the human's `go` after planning.

---

## Phase 1: The Icon as a story test

**User stories**: 1, 2, 3, 8 (the font families), 14, 15, 16, 17, 18, 28,
29, 30, 31, 100, 101, 102, 104, 105, 106, 107, 108, 121 (`test:stories`),
122, 123

### What to build

The tracer bullet: one **Primitive** rendered from the **Theme** in a real
browser, as a test. The desktop member gains React, styled-components,
`lucide-react` and the two Barlow font packages; the root gains Storybook
with `@storybook/react-vite` and `@storybook/addon-vitest`, the Playwright
browser provider and the React hooks and Storybook lint rules. The
**Theme** arrives with its eight groups, its `DefaultTheme` declaration and
the **Tokens** the global style and the Icon use (P1). `GlobalStyle` sets
the ground, ink and body font, headings in Barlow Condensed, links in the
accent, the 2 px accent focus ring with offset 2 on `:focus-visible`, the
selection colour, the dark scrollbars and the `not-allowed` cursor on a
disabled button; Industry's class rules are not carried over and its Google
Fonts import is dropped. The fonts module self-hosts Barlow 400, 500, 600
and Barlow Condensed 500, 600. Storybook's preview wraps every **Story** in
the **Theme**, `GlobalStyle` and the fonts, with telemetry off.

The Icon maps each of the 41 `IconName`s to its Lucide glyph at stroke 1.5,
16 px by default, in the current colour, hidden from assistive technology,
with a **Story** showing every icon beside its name. `npm run storybook`
serves it; `npm run test:stories` runs it as a **Story test** in headless
Chromium, which `npm ci` now installs through `postinstall`; `npm test`
stays the Node run. `test:stories` joins **Verify** after `test`.

### Acceptance criteria

- [ ] A RED commit adds the Icon's **Stories** and the changed gate tests,
      and fails on them.
- [ ] Every new package is an exact dev dependency in the member Q39 names,
      at the newest release at least 14 days old on the day of building,
      `@vitest/browser-playwright` at the installed Vitest's version; every
      licence the lockfile gains is listed in the ticket's Notes; `OFL-1.1`
      joins the **License allowlist**, any other new licence stops the
      builder; `check:licenses` and `check:audit` pass.
- [ ] `theme` has the eight groups, its keys follow Q11's rule and its
      values the token sheet exactly; `DefaultTheme` is derived from its
      type, so an unknown key fails `npm run typecheck`.
- [ ] `GlobalStyle` holds only element-level rules (Q13), every value from
      the **Theme**; no Google Fonts import and no class rule exist.
- [ ] Icon: `IconName` is exactly the 41 names of `lib/icons.js`, `undo`
      and `folder` included; each renders its Lucide glyph at stroke 1.5,
      16 px by default, `aria-hidden`; the **Story** shows all 41 with their
      names.
- [ ] `npm run storybook` serves the Icon on port 6006 without opening a
      browser (checked by hand, recorded in the ticket's Notes); telemetry
      is off.
- [ ] `test:stories` runs `vitest run --config vitest.storybook.config.ts`
      in headless Chromium with no browser download; a **Story** that
      throws fails it; `npm test` runs no browser.
- [ ] `postinstall` is exactly `install-electron && playwright install
      --only-shell chromium`, pinned by `gates/electronInstall/`.
- [ ] **Verify** runs `test:stories` right after `test`, pinned by the gate
      wiring test.
- [ ] `tsconfig.web.json` has `"jsx": "react-jsx"` and includes the
      preview; the root project includes `.storybook/main.ts`;
      `eslint.config.js` adds the react-hooks and Storybook recommended
      configs, and `npm run lint` passes.
- [ ] The **Mutation score** stays at or above the **Break threshold** of
      83.
- [ ] `npm run verify` is green.

---

## Phase 2: Accessibility check

**User stories**: 109, 110, 111, 122

### What to build

Every **Story test** now runs axe. `@storybook/addon-a11y` joins Storybook;
the a11y parameters live in a module of their own in `.storybook/` that
the preview imports: `test: 'error'`, so any violation fails the **Story
test** and **Verify**, with exactly one rule change, `color-contrast` with
`reviewOnFail: true`, so contrast failures show as "needs review" in the
a11y panel instead of failing (Q29, Q30). `gates/storyTests/` imports that
module and pins it, and pins `vitest.storybook.config.ts`: the Storybook
plugin on `.storybook/`, browser mode, the Playwright provider, headless,
exactly one Chromium instance (A5, P2). The Icon's **Stories** pass.

### Acceptance criteria

- [ ] A RED commit adds the `gates/storyTests/` tests and fails on them.
- [ ] `@storybook/addon-a11y` is an exact root dev dependency per the
      supply-chain rules; licences and **Advisories** handled as in
      phase 1.
- [ ] The a11y module holds `test: 'error'` and rule changes exactly
      `[{ id: 'color-contrast', reviewOnFail: true }]`, imports nothing, and
      joins `tsconfig.web.json`; the preview uses it.
- [ ] The gate test fails when `test` is not `'error'`, when a rule is
      added, removed or changed, and when any pinned setting of the
      story-test config changes.
- [ ] A **Story** with an unnamed control fails its **Story test** (shown
      in the ticket's RED or Notes, never committed as a failing story).
- [ ] The **Mutation score** stays at or above the **Break threshold** of
      83.
- [ ] `npm run verify` is green.

---

## Phase 3: Story check

**User stories**: 112, 113, 121 (`check:stories`)

### What to build

No component ships without its **Stories**. The core takes a list of
paths and returns one violation for every `<Name>/<Name>.tsx` with a
PascalCase `<Name>` directly under the renderer's `primitives/`,
`components/` or `features/<feature>/` whose `<Name>.stories.tsx` is not in
the list. The entry reads the tracked and the untracked, not ignored paths
through the shared git reader and reports through `runGate`, one line
`<path of Name.tsx>: has no <Name>.stories.tsx` per missing file (A4).
`check:stories` joins **Verify** after `lint:deps`.

### Acceptance criteria

- [ ] A RED commit adds the core, entry and wiring tests and fails on
      them.
- [ ] `findMissingStories` reports a component without its stories file in
      each of the three places and nothing when the file is there; lower-case
      folders, nested folders, `layouts/`, `pages/`, a name that does not
      match its folder and non-component files are not components.
- [ ] The entry, in a temporary sample repository, exits 0 when every
      component has its stories, and 1 with one A4 line per missing file,
      an untracked component included and an ignored one left out.
- [ ] **Verify** runs `check:stories` right after `lint:deps`, pinned by
      the gate wiring test; it passes on the repository.
- [ ] The **Mutation score** stays at or above the **Break threshold** of
      83.
- [ ] `npm run verify` is green.

---

## Phase 4: Changed-lines coverage

**User stories**: 114, 115, 116, 117, 118, 121 (`check:coverage`, the final
order), 122

### What to build

New code comes with tests. `@vitest/coverage-v8` is on in both Vitest
configs, always, writing LCOV to `coverage/unit/` and `coverage/stories/`
over the **Shipping code** of `apps/`, `packages/`, `scripts/` and `gates/`
(no tests, stories, `test-support/`, `e2e/` or declaration files);
`vitest.stryker.config.ts` turns it off. The pure core parses a
zero-context unified diff into added line numbers per file, reads an LCOV
report into coverable lines and hits, and returns the A3 and A4
violations against the **Coverage threshold**. The entry takes the merge
base with `origin/main`, the diff from it to the working tree and the
untracked, not ignored files, keeps the measured files, reads both
reports and `quality/coverage-threshold.json`, and fails closed on any
input it cannot read. `check:coverage` joins **Verify** after
`test:stories`, which now has its final fifteen gates. `gates/coverage/`
pins the coverage settings of the three configs. Every line of phases 1
to 3 counts, and passes.

### Acceptance criteria

- [ ] A RED commit adds the core, entry, `gates/coverage/` and wiring tests
      and fails on them.
- [ ] `@vitest/coverage-v8` is an exact root dev dependency at the
      installed Vitest's version; licences and **Advisories** handled as in
      phase 1.
- [ ] `quality/coverage-threshold.json` is exactly `{ "changedLines": 80 }`.
- [ ] The diff parser, the LCOV reader and `findCoverageViolations` cover
      added, changed and deleted lines, untracked files, a hit in one
      report only, lines no report lists, the threshold exactly met, just
      missed and above, and each fail-closed case of A3.
- [ ] The entry, in a temporary sample repository, exits 0 at or above the
      threshold and with no coverable changed lines, and 1 with A4's
      summary and per-file lines below it, and 1 for a missing or
      malformed threshold file, a missing report, no `origin/main` and a
      changed measured file in neither report.
- [ ] `gates/coverage/` fails when either config turns coverage off,
      changes the provider, the reporter, the report folder or the measured
      and excluded paths, or when the Stryker config turns it on.
- [ ] **Verify** runs the fifteen gates in Q35's order, pinned by the gate
      wiring test.
- [ ] A **Mutation run** still runs without coverage; the **Mutation
      score** stays at or above the **Break threshold** of 83.
- [ ] `npm run verify` is green.

---

## Phase 5: Money and the Amount

**User stories**: 19, 20, 21, 22, 23, 24, 25, 26, 27, 38, 39, 40, 41, 42,
102

### What to build

The first money on screen, end to end from the domain to a **Story**.
`packages/domain` becomes the **Workspace member** `@dashcash/domain`
(private ES module, version `0.0.0`, exports `"./*": "./src/*.ts"`, its
own TypeScript project in `npm run typecheck`), and the desktop member
depends on it. It brings `Cents`, `toCents` and `formatCents`, each rule of
Q18 a domain test. The Amount formats through `formatCents`: coloured by
**Polarity** by default, `muted` at 62 % opacity, `neutral`, the
`positive`, `negative`, `warning`, `danger` and `accent` tones; sizes sm
13, md 14, lg 22 and xl 34 (the large two in Barlow Condensed), tabular
figures, `strong`, and "-" for `null`. The **Theme** gains the colours and
type sizes it uses.

### Acceptance criteria

- [ ] A RED commit adds the domain tests and the Amount's **Stories**, and
      fails on them.
- [ ] `@dashcash/domain` is private, `"type": "module"`, version `0.0.0`,
      exports each module by its path; `npm run typecheck` covers it; it
      imports nothing outside itself; the renderer imports the formatter
      by module path.
- [ ] `toCents` returns safe integers, 0, negatives and the safe limits
      unchanged, and throws a `RangeError` naming the value for fractions,
      `NaN`, infinities and unsafe integers.
- [ ] `formatCents` has a table per rule of Q18: `1.234,56 €` grouping and
      two decimals, `whole` (`30.000 €`), U+00A0 before `€`, U+2212 for
      negatives (`−86,40 €`), `always` and `none`, zero without sign, −40
      cents whole as `−0 €`.
- [ ] The Amount has a **Story** per tone, per size, `strong`, zero and
      `null`, with invented values in German format verbatim.
- [ ] The **Mutation score** stays at or above the **Break threshold** of
      83.
- [ ] `npm run verify` is green.

---

## Phase 6: Loader

**User stories**: 12 (the Loader's durations), 60, 61, 62, 63, 64, 65, 66,
102, 103

### What to build

The Loader, a **Primitive** (Q6), draws the logo in a 1,6 s loop: the
solid line, the three dashes one by one, then the C; the march, orbit and
grow variants keep their keyframes. At 20 px or less (or `dashesOnly`) it
shows only the three dashes. It appears after its `delay` (300 ms by
default) and fades in over 200 ms; under `prefers-reduced-motion` it stops
moving and breathes from opacity 1 to 0,45 over 2,4 s. It is a
`role="status"` named by its label or "Loading", in accent-600 by default
or the colour given, with an optional visible label beside it. The
**Theme** gains its durations.

### Acceptance criteria

- [ ] A RED commit adds the Loader's **Stories** and fails on them.
- [ ] Props exactly SPEC, Loaders (`variant = 'draw'`, `size = 32`,
      `label?`, `delay = 300`, `dashesOnly?`, `color`); every duration from
      the **Theme**.
- [ ] **Stories** for the four variants, the small dashes-only size, the
      labels "Recalculating…" and "Checking…", the current colour, and the
      delay; every story but the delay one sets `delay` 0.
- [ ] The delay story's **Play function** shows nothing before the delay
      and the status after it; the status is named by its label or
      "Loading".
- [ ] `npm run verify` is green.

---

## Phase 7: Button

**User stories**: 11 (md and sm), 32, 33, 34, 35, 36, 37, 102, 103

### What to build

The Button in the primary (solid accent), secondary, ghost and danger
variants, md 36 px and sm 28 px high (**Control heights**) with 16 or 14 px
icons; a left and a right icon, `block`, and a square icon button named by
its `title` when it has no label. Disabled, it shows 45 % opacity, no hover
or pressed state, and a click does nothing. Loading, a Loader at icon size
in the current colour replaces its icon, `loadingLabel` replaces its label,
it stays at full strength, keeps its width, is `aria-busy` and cannot be
pressed.

### Acceptance criteria

- [ ] A RED commit adds the Button's **Stories** and fails on them.
- [ ] Props exactly SPEC §3 plus `loading`, `loadingLabel`,
      `loaderVariant`; the **Control heights** md 36 and sm 28 are
      **Tokens**.
- [ ] **Stories** for each variant and size, left and right icon, icon
      only, `block`, disabled and loading ("Importing…").
- [ ] **Play functions**: a click calls `onClick`; a click on a disabled
      or a loading button does not; the loading button reports itself
      busy.
- [ ] `npm run verify` is green.

---

## Phase 8: Tag and Swatch

**User stories**: 6 (the **Milestone tone**), 43, 44, 45, 55, 102

### What to build

The Tag in the accent, neutral, outline, warning, danger and milestone
tones with SPEC §3's fills, 22 px high, with an optional 12 px icon or an
8 px colour swatch; "Paid off" is milestone with its flag. The Swatch
draws a square, circle or line at the given size and colour. The **Theme**
gains the milestone colours, the tag tints and the tag height.

### Acceptance criteria

- [ ] A RED commit adds the Tag's and the Swatch's **Stories** and fails on
      them.
- [ ] `TagTone` is SPEC §1's five plus `milestone`; Swatch's props exactly
      SPEC §3.
- [ ] **Stories** for every tone, a tag with an icon ("New bank format"
      with its info icon), with a swatch, "Paid off" in the **Milestone
      tone** with its flag (never accent), and each swatch shape.
- [ ] `npm run verify` is green.

---

## Phase 9: Input and Select

**User stories**: 46, 47, 48, 49, 50, 102, 103

### What to build

The Input, 36 px (md) or 30 px (sm) on the input ground, with an optional
left icon, a suffix such as "€", right alignment and numeric mode,
reporting each change of its text. The Select, sm or md and with a width,
has its placeholder as the empty option, options with an optional swatch
of the chosen option's colour and the warning tone (warning border and
placeholder colour). Both take an optional `ariaLabel` for when no
FormField labels them.

### Acceptance criteria

- [ ] A RED commit adds both components' **Stories** and fails on them.
- [ ] Props exactly SPEC §3 plus `ariaLabel`; Select's
      `tone: 'default' | 'warning'`.
- [ ] **Stories** for each size, the left icon, the money field
      ("1.529,60 €" right aligned, suffix "€"), the empty and chosen
      Select, the swatch, and the warning "Pick a category".
- [ ] **Play functions**: typing reports the new text; choosing an option
      reports its value; both are named by `ariaLabel`.
- [ ] `npm run verify` is green.

---

## Phase 10: Segmented, Checkbox, Switch and Chip

**User stories**: 51, 52, 53, 54, 102, 103

### What to build

The four toggles. The Segmented shows its selected option in the accent
fill, 28 px by default and 36 px at md. The 16 px Checkbox shows the accent
fill and a check when checked, with an optional label ("Mark as
recurring"). The square 34 × 18 Switch is accent when on, a
`role="switch"` named by its label or `ariaLabel`, with no knob transition
(Q9). The 28 px Chip is a toggle button with `aria-pressed`, an optional
square, circle or line swatch and a muted meta value; a disabled chip keeps
its resting fill. Each toggles on click and does nothing when disabled.

### Acceptance criteria

- [ ] A RED commit adds the four components' **Stories** and fails on
      them.
- [ ] Props exactly SPEC §3; the fixed sizes (Checkbox 16, Switch 34 × 18,
      Chip 28) are **Tokens**.
- [ ] **Stories** for each component's states: selected option, sizes,
      checked and unchecked, on and off, pressed, each swatch shape, meta,
      labelled and unlabelled, disabled.
- [ ] **Play functions**: a click selects, checks, switches or presses and
      reports the new value; a click on a disabled control reports nothing.
- [ ] `npm run verify` is green.

---

## Phase 11: Meter

**User stories**: 56, 57, 58, 59, 102

### What to build

The Meter shows its value as a solid bar and the projected value beyond it
as a dashed outline, in the neutral, warning or danger tone; its width
animates over 300 ms. It is a `role="meter"` with its value and an optional
`ariaLabel`.

### Acceptance criteria

- [ ] A RED commit adds the Meter's **Stories** and fails on them.
- [ ] Props exactly SPEC §3 plus `ariaLabel`; the 300 ms width transition
      from the **Theme**.
- [ ] **Stories** for each tone, value only, value with projection, and
      full.
- [ ] Each **Story**'s meter is named and carries its value.
- [ ] `npm run verify` is green.

---

## Phase 12: Card, FormField and StatTile

**User stories**: 67, 68, 69, 92, 102

### What to build

The first **Components**. The Card is filled with the surface colour and
the soft 1 px card border, square, with an optional kicker and title and
none, sm, md or lg padding, and no `actions` slot (Q7). The FormField shows
its label, the hint below the control and an error in the danger colour in
the hint's place, and ties its label to the control it wraps. The StatTile
shows a kicker, a text value or an Amount (passing its tone), a hint, in
the default, accent, warning or danger tone.

### Acceptance criteria

- [ ] A RED commit adds the three components' **Stories** and fails on
      them.
- [ ] Props exactly SPEC §3; the card fill and border per SPEC's Card fill.
- [ ] **Stories** for each Card padding, with and without kicker and
      title; FormField with hint, with error, around an Input and a Select;
      StatTile with text, with money, in each tone.
- [ ] The FormField's control is named by its label in every **Story**.
- [ ] `npm run verify` is green.

---

## Phase 13: Modal

**User stories**: 72, 73, 74, 75, 76, 102, 103

### What to build

The Modal renders nothing while closed. Open, it shows title, subtitle and
content on the raised fill with the large shadow, 460 px wide unless told
otherwise, over the dark backdrop; its actions are the last row of its
content, right aligned. Esc on the window and a click on the backdrop call
`onClose`; a click inside the panel does not. It is a modal dialog labelled
by its title.

### Acceptance criteria

- [ ] A RED commit adds the Modal's **Stories** and fails on them.
- [ ] Props exactly SPEC §3, no `actions` prop; `role="dialog"`,
      `aria-modal`, labelled by its title.
- [ ] **Stories** for open with actions ("Cancel", "Confirm"), a custom
      width, and closed.
- [ ] **Play functions**: Esc and a backdrop click call `onClose`, a click
      inside the panel does not; the closed **Story** renders no dialog.
- [ ] `npm run verify` is green.

---

## Phase 14: PageHeader, NavItem and Stepper

**User stories**: 70, 71, 77, 78, 79, 80, 81, 102, 103

### What to build

The pieces that place the user. The PageHeader shows title, subtitle, a
tag and right-aligned actions, and an optional back link with its label
that calls back. The NavItem is 38 px with icon and label, an active state
and a count badge in accent or warning that hides at 0; compact, it shows
only its centred icon with the label as tooltip and accessible name and the
badge as a corner chip. The Stepper has equal cells: done steps show a
check in an accent square and report their index on click; the current
step has the accent-100 fill and a 2 px bottom bar; future steps are faint
and disabled.

### Acceptance criteria

- [ ] A RED commit adds the three components' **Stories** and fails on
      them.
- [ ] Props exactly SPEC §3, NavItem plus `compact`; NavItem 38 and the
      Stepper step 44 are **Tokens**.
- [ ] **Stories** for the PageHeader with and without back link, tag and
      actions; the NavItem resting, active, with each badge tone, at 0 and
      compact; the Stepper at the first, a middle and the last step.
- [ ] **Play functions**: the back link calls back; a NavItem click calls
      back; a done step reports its index; a future step reports nothing.
- [ ] `npm run verify` is green.

---

## Phase 15: Logo and Sparkline

**User stories**: 93, 94, 102

### What to build

The DashCash logo as mark or full (mark plus wordmark) in its dark and
light colours, its stroke width chosen by size (3.2 up to 20 px, 2.6 up to
32, 2.2 above) and its third dash ending flush with the C. The Sparkline
draws the past solid, the future dashed and a hairline tick at today in
the account's colour, 36 px high by default. The stroke width, the dash end
point and the mapping from `past` and `future` **Cents** to points of the
box are pure functions of their modules, tested in Node.

### Acceptance criteria

- [ ] A RED commit adds the unit tests and both components' **Stories**,
      and fails on them.
- [ ] Props exactly SPEC §3 and SPEC, Name and logo; the Logo's light
      colours are **Tokens**.
- [ ] Unit tests: the stroke width at and either side of 20 and 32 px; the
      dash end point; the Sparkline's points for a rising, a falling, a
      flat and a past-only series.
- [ ] **Stories** for mark and full, dark and light, at several sizes; the
      Sparkline with past and future, past only, and in an account colour.
- [ ] `npm run verify` is green.

---

## Phase 16: Snackbar

**User stories**: 95, 96, 97, 98, 99, 102, 103

### What to build

The Snackbar in the success, error, info and warning tones, with a
tone-tinted fill on the raised ground, a tone hairline, the large shadow
and the tone's icon or a given one. Its primary action is a primary Button
for info and success and a secondary one for warning and error, with an
optional icon; a secondary action and a close button are optional; each
calls back. Error and warning are alerts, the others status. Loading, an
18 px Loader replaces the icon ("Installing…").

### Acceptance criteria

- [ ] A RED commit adds the Snackbar's **Stories** and fails on them.
- [ ] Props exactly SPEC §3 plus `loading`.
- [ ] **Stories** for each tone, with primary and secondary actions, with
      an action icon, with close, with a custom icon, and loading.
- [ ] **Play functions**: each action and the close button call back; the
      error and warning **Stories** expose an alert, the others a status.
- [ ] `npm run verify` is green.

---

## Phase 17: Accordion and auto-scroll on expand

**User stories**: 82, 83, 84, 85, 102, 103

### What to build

The Accordion with title, meta value and tag, whose chevron turns over
160 ms on toggle; the clicked row stays put and its content opens below
it. After it opens, `useRevealOnExpand` scrolls the nearest scroll
container smoothly just far enough to show the block with a 24 px margin,
never past the clicked row, not at all when it fits or on collapse, and
jumps instead under `prefers-reduced-motion`. Its pure part,
`computeRevealScroll`, is tested in Node.

### Acceptance criteria

- [ ] A RED commit adds the hook's unit tests and the Accordion's
      **Stories**, and fails on them.
- [ ] Props exactly SPEC §3; the 160 ms turn and the 24 px margin are
      **Tokens**.
- [ ] `computeRevealScroll`: a block that fits, one running past the
      bottom, one longer than the area, a clicked row near the top, and
      collapse.
- [ ] **Stories** for closed, open, with meta and tag, and several
      accordions in a scroll area.
- [ ] **Play functions**: a click toggles and reports `onToggle`; opening
      the last accordion in a scroll area brings its block into view
      without moving the clicked row out of it.
- [ ] `npm run verify` is green.

---

## Phase 18: YearTable

**User stories**: 86, 87, 88, 89, 90, 91, 102, 103

### What to build

The YearTable: year rows that open and close on click with a chevron, the
condensed year, a tag and bold totals; month rows on the sunken ground,
today's month in accent-100, the payoff month in the milestone row colour,
future months faded. Cells show an amount, an icon with its tooltip, a text
or nothing. Years start open as told, and each toggle is reported. The
equal-columns layout (first column 230 px, every data column the same width
of at least 130 px) scrolls inside the card when narrow; column headers
never wrap and carry their colour dot and alignment. Opening a year reveals
it through `useRevealOnExpand`.

### Acceptance criteria

- [ ] A RED commit adds the YearTable's **Stories** and fails on them.
- [ ] Props exactly SPEC §3; the payoff row uses the milestone row colour
      (Q7); the column widths are **Tokens**.
- [ ] **Stories** for years closed and open by default, today's month, the
      payoff month, future months, each cell kind, and a narrow width with
      several account columns.
- [ ] **Play functions**: a year row click toggles its months and reports
      `onToggle`.
- [ ] `npm run verify` is green.

---

## Phase 19: The complete token sheet and the Tokens story

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 102

### What to build

The **Theme** becomes the whole dark sheet (P1): the ground, sunken,
surface and ink with muted, faint, divider, hover and backdrop as the sheet
derives them; the inverted accent ramp 100 to 900 and the neutral ramp;
the money, warning and danger colours with their tints and the
**Milestone tone**; the five account and 40 category colours; Barlow
Condensed 600 and Barlow 400 and 500 with the type scale 42 · 34 · 22 · 19
· 15 · 14 · 13 · 12 · 11; the 0.85× spacing scale, square corners, the
shadows, the **Control heights**, SPEC §5's durations and the z-indices.
The `Tokens` **Story** shows the inventory's colour tiles, type scale and
spacing bars verbatim.

### Acceptance criteria

- [ ] A RED commit adds the `Tokens` **Story** and fails on it.
- [ ] Every variable of `dashcash-dark.css` over Industry's `styles.css` is
      a **Token** with its key per Q11 and its value exactly as written,
      `color-mix()` strings kept.
- [ ] No component's styles hold a literal colour, size or spacing; every
      value comes from the **Theme**.
- [ ] The `Tokens` **Story** shows every colour tile, the type scale and the
      spacing bars of `Component Inventory.dc.html`.
- [ ] `npm run verify` is green.

---

## Phase 20: Storybook MCP and README

**User stories**: 119, 122, 124

### What to build

Agents can look the components up. `@storybook/addon-mcp` joins Storybook,
so the running dev server serves the **Storybook MCP** at
`http://localhost:6006/mcp`, listing components and **Stories** and their
documentation and a11y results. No `.mcp.json` is committed (Q36).
README's Getting started says that `npm ci` also installs Chromium for the
**Story tests**.

### Acceptance criteria

- [ ] `@storybook/addon-mcp` is an exact root dev dependency per the
      supply-chain rules; licences and **Advisories** handled as in
      phase 1.
- [ ] With `npm run storybook` running, the `storybook` MCP server lists
      the components and **Stories** and returns a **Story**'s a11y results
      (checked by hand, recorded in the ticket's Notes).
- [ ] README's Getting started names Chromium beside Electron in `npm ci`;
      `check:docs-drift` passes.
- [ ] `npm run verify` is green.

---

## Phase 21: The reviewer's Storybook tools (built by the human)

**User stories**: 120

### What to build

The reviewer sees components, not only their code.
`.claude/agents/reviewer.md` gains the tools of the `storybook` MCP
server; the issue-loop's and pr-review's review prompts tell the reviewer to
start `npm run storybook` in the background when a diff touches a story or
a component and to check the changed **Stories** and their a11y results
through those tools. A ticket never counts as approval for `.claude/`, so
the human builds it (Q37).

### Acceptance criteria

- [ ] `reviewer.md` lists the `storybook` MCP tools.
- [ ] Both review prompts carry the instruction, in the human's wording.
- [ ] `npm run verify` is green.
