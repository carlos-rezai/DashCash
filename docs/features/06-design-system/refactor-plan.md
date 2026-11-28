# 06 design-system: refactor plan

## Problem Statement

The design-system feature is merged: the **Theme** with every **Token**, the
global style and the self-hosted fonts, 13 **Primitives** and 12
**Components** with their **Stories**, `useRevealOnExpand`, **Cents** and the
**Money format** in the domain, the **Accessibility check**, the **Story
check**, **Changed-lines coverage** and the **Storybook MCP**. Much of it is
gate files (the Storybook and Vitest configs, `gates/`, `quality/`, the npm
scripts, the tsconfig and ESLint configs, `.claude/`), which no **Refactor
step** may change (`CLAUDE.md`, "Ask first"). What a step can change is the
renderer's code and **Stories**, the two gate scripts in `scripts/` with the
shared git reader, and the tests beside them. Read against `CLAUDE.md`,
`docs/conventions.md` and `docs/ubiquitous-language.md`, that code shows:

- **Problems flagged in the tickets' Notes.**
  - Ticket 12: the Loader's styles use literal opacities, against "Theme
    tokens only".
  - Ticket 13: no **Story** checks the Tag's side padding, the gap between
    its parts or its letter spacing.
  - Ticket 14: the font-family check is written three ways. Amount and
    Button strip quotes inline, Input and Select only check
    `startsWith('Barlow')`, which "Barlow Condensed" passes too, and fourteen
    stories files each have their own `firstFamily`, in three variants.
  - Ticket 24: two rules have no **Story** that fails without them, the
    Accordion header's `display: flex` and the jump instead of the smooth
    scroll under `prefers-reduced-motion`. The first is out of date: removed
    while this plan was written, five of the seven Accordion **Stories**
    failed (the rule was then restored and the tree was clean). The second
    still holds, and the Loader's whole reduced-motion block (still strokes,
    the 2,4 s breathing) is unchecked too.
  - Ticket 28: seven copies of the `:hover` probe across the stories files;
    three copies of the story-config reader; `checkStories` and
    `checkCoverage` each list untracked files themselves, beside the shared
    git reader; about 20 literal `1px` borders and the icon size constants;
    three different checks for an empty string.
  - The other Notes record versions, licences, hand checks, mutation scores
    and prototype rules that were left out because they change nothing
    visible. `CLAUDE.md` asks for exactly that, so those are not findings.
- **Duplication in the stories.** Besides the hover and font probes, 19
  stories files each have their own `computedColour`.
- **Three checks for an empty string.** `x === undefined || x === ''` and its
  negation in nine modules, truthiness (`tag ?`, `Boolean(kicker)`,
  `backLabel ||`) in six, and YearTable's private `present`. All mean "an
  empty string is absent" (`CLAUDE.md`, Design). Three **Stories** do not yet
  pin the empty string for a prop: the Accordion's `tag` and `meta`, the
  Button's `label` and the Loader's `label`.
- **The logo geometry written twice.** The Loader and the Logo each hold the
  32 × 32 view box's centre, the 45° diagonal, the dash unit, the C path, its
  cut and the line path, and each computes the same stroke width by size
  (3.2 up to 20 px, 2.6 up to 32, 2.2 above) and the same end of dash 3.
- **Naming drift.** `docs/conventions.md` asks for functions named verb
  first. Private helpers named as nouns sit in thirteen modules: `look`,
  `badgeLook`, `textColour` (three), `toneColour` (two), `toneTint`,
  `polarityColour`, `ground`, `fill`, `stateOf`, `scrollerOf`, `loop`,
  `motionOf`, `onDiagonal`, `segment`, `dashPaths`, `dashMotion` and
  `thirdDashPath`.
- **No money math outside the domain.** Amount formats through the domain's
  `formatCents`. The Sparkline's scaling is chart geometry (design log Q19).
  Amount's **Polarity** is a sign test that picks a colour. Nothing to move.
- **No drift in layers or filing.** Every module sits in its **Layer** folder
  with its stories file, the barrels re-export them, and no shipping module
  imports `test-support/`. The empty `utils/` and the renderer's
  `test-support/` hold only `.gitkeep`.

## Solution

Behaviour-preserving moves, one module at a time:

1. Pin what later steps rely on and no **Story** pins yet: the Tag's spacing,
   the reveal's jump under reduced motion, the Loader under reduced motion,
   and the empty string for the Accordion's `tag` and `meta`, the Button's
   `label` and the Loader's `label`.
2. Give the stories three shared probes in the renderer's `test-support/`,
   for computed colour, first font family and hovered style, each with
   **Stories** of its own that prove it, and use them in every stories file
   that holds a copy.
3. Add a reader for untracked paths to the shared git reader, and use it in
   the **Coverage** gate and the **Story check**.
4. Add one `hasText` helper to `utils/` and use it wherever a module checks
   for an empty string.
5. Add a hairline **Token** for the 1 px borders and use it in every styles
   module, and name the Loader's partial opacities as **Tokens**.
6. Move the logo geometry into one `utils/` module that the Logo and the
   Loader share.
7. Rename the noun-named private helpers verb first.

Every **Primitive** and **Component** keeps what the user sees and does:
every **Story** stays green, and no existing assertion is weakened. Each
**Story** step only adds assertions. The **Story check** and the
**Coverage** gate keep their lines, their order and their exit codes.

## Commits

Each **Refactor step** is one `refactor:` commit with the step's number and
description. Run `npm run verify` before committing; every step must leave it
green. No step touches a **User flow** (06 renders only in Storybook), so no
step needs `npm run verify:full`. Steps 33 to 35 change `scripts/`, which
Stryker mutates; after step 35 run `npm run test:mutation`. The **Mutation
score** must stay at or above the **Break threshold** of 83.

- [x] 01 pin the tag spacing
- [x] 02 pin the reveal jump under reduced motion
- [x] 03 pin the loader under reduced motion
- [x] 04 pin an empty accordion tag and meta
- [x] 05 pin an empty button label
- [x] 06 pin an empty loader label
- [x] 07 add the shared computed colour probe
- [x] 08 add the shared first family probe
- [x] 09 add the shared hover probe
- [x] 10 use shared probes in the amount stories
- [x] 11 use shared probes in the button stories
- [x] 12 use shared probes in the checkbox stories
- [x] 13 use shared probes in the chip stories
- [x] 14 use shared probes in the input stories
- [x] 15 use shared probes in the meter stories
- [x] 16 use shared probes in the segmented stories
- [x] 17 use shared probes in the select stories
- [x] 18 use shared probes in the swatch stories
- [x] 19 use shared probes in the switch stories
- [x] 20 use shared probes in the tag stories
- [x] 21 use shared probes in the accordion stories
- [x] 22 use shared probes in the card stories
- [x] 23 use shared probes in the form field stories
- [x] 24 use shared probes in the logo stories
- [x] 25 use shared probes in the modal stories
- [x] 26 use shared probes in the nav item stories
- [x] 27 use shared probes in the page header stories
- [x] 28 use shared probes in the sparkline stories
- [x] 29 use shared probes in the stat tile stories
- [x] 30 use shared probes in the stepper stories
- [x] 31 use shared probes in the year table stories
- [x] 32 use shared probes in the global style stories
- [x] 33 add the untracked path reader to run git
- [x] 34 use the untracked reader in check coverage
- [x] 35 use the shared readers in check stories
- [x] 36 add the has text helper
- [x] 37 use has text in the button
- [x] 38 use has text in the checkbox
- [x] 39 use has text in the chip
- [x] 40 use has text in the input
- [x] 41 use has text in the loader
- [x] 42 use has text in the select
- [x] 43 use has text in the switch
- [x] 44 use has text in the accordion
- [x] 45 use has text in the card
- [x] 46 use has text in the form field
- [x] 47 use has text in the modal
- [x] 48 use has text in the page header
- [x] 49 use has text in the snackbar
- [x] 50 use has text in the stat tile
- [x] 51 use has text in the year table
- [x] 52 add the hairline token in the accordion styles
- [x] 53 use the hairline token in the card styles
- [x] 54 use the hairline token in the modal styles
- [x] 55 use the hairline token in the nav item styles
- [x] 56 use the hairline token in the snackbar styles
- [x] 57 use the hairline token in the stat tile styles
- [x] 58 use the hairline token in the stepper styles
- [x] 59 use the hairline token in the year table styles
- [x] 60 use the hairline token in the button styles
- [x] 61 use the hairline token in the checkbox styles
- [x] 62 use the hairline token in the chip styles
- [x] 63 use the hairline token in the input styles
- [x] 64 use the hairline token in the meter styles
- [x] 65 use the hairline token in the segmented styles
- [x] 66 use the hairline token in the select styles
- [x] 67 use the hairline token in the switch styles
- [x] 68 use the hairline token in the tag styles
- [x] 69 use opacity tokens in the loader styles
- [x] 70 move the logo geometry into utils
- [x] 71 use the logo geometry in the loader
- [x] 72 rename the amount colour helpers
- [x] 73 rename the button text colour helper
- [x] 74 rename the loader helpers verb first
- [x] 75 rename the meter fill helper
- [ ] 76 rename the select text colour helper
- [ ] 77 rename the tag look helper
- [ ] 78 rename the logo third dash builder
- [ ] 79 rename the nav item badge look helper
- [ ] 80 rename the snackbar tone helpers
- [ ] 81 rename the stat tile text colour helper
- [ ] 82 rename the stepper helpers verb first
- [ ] 83 rename the year table ground helper
- [ ] 84 rename the reveal scroller lookup

### What each step does

Every step that adds an assertion first confirms it fails without the code it
covers: change the code temporarily, watch the assertion fail, restore the
code, and check that `git status --porcelain` shows only the step's own
files (`CLAUDE.md`, Tests). An assertion that passes either way is dropped.
If a step finds that the current code does not do what the step says, it
stops and reports instead of changing the code: that is a bug, not a
refactor.

**01 pin the tag spacing.** In the Tag's **Stories**, assert what ticket 13
found unprotected. Each tone's Tag has an 8 px padding left and right
(`space.tagPadding`). In `WithIcon` and `WithSwatch`, the label starts 5 px
after the icon or the swatch (`space.tagGap`), measured between their boxes.
The label's letter spacing is 0.02em at 11 px (`font.tagLetterSpacing`),
compared with what Chromium computes for `0.02em` on a probe at 11 px. The
expected values are written out in the stories file, apart from the
**Theme**, like the file's other expected values. Only assertions; the Tag
does not change.

**02 pin the reveal jump under reduced motion.** In the Accordion's
**Stories**, add a scroll-area **Story** in which `window.matchMedia` reports
`(prefers-reduced-motion: reduce)` as matching (with `spyOn` from
`storybook/test`, passing every other query through and restored at the
end). Open an accordion whose content needs the area to scroll, and assert
that the area's `scrollBy` is called once with `behavior: 'auto'` and the
same `top` as without reduced motion. In the existing scroll-area **Story**,
assert `behavior: 'smooth'` the same way, unless an assertion already pins
it. Only **Stories**; the hook does not change.

**03 pin the loader under reduced motion.** In the Loader's **Stories**,
assert the rules of the `prefers-reduced-motion: reduce` block, read from
the document's style sheets as the Input's and Select's **Stories** read a
`:hover` rule (Chromium in the **Story tests** does not report reduced
motion). Find the media rule that selects the mark and the ones that select
a stroke and the orbit, with `element.matches`. The mark breathes: its
animation runs 2,4 s, `ease-in-out`, infinite, through keyframes that hold
opacity 1 at 0 % and 100 % and 0.45 at 50 %. Every stroke and the orbit
stand still and in full: animation `none`, `stroke-dashoffset` 0, opacity 1,
transform `none`. Only assertions; the Loader does not change.

**04 pin an empty accordion tag and meta.** Add the **Story**
`EmptyTagAndMeta` to the Accordion's **Stories**, with `tag: ''` and
`meta: ''`. The header holds the chevron and the title only, with no Tag and
no meta element, as Chip's `EmptyMeta` asserts it.

**05 pin an empty button label.** Add a **Story** to the Button's
**Stories**: an icon Button with `label: ''` and a `title`. It is the
icon-only Button: square, at its **Control height**, one icon and no text,
named by its `title`. Compare it with the existing icon-only **Story**.

**06 pin an empty loader label.** Add a **Story** to the Loader's **Stories**
with `label: ''`: no label element is rendered, and the status is named
"Loading", as with no `label`.

**07 add the shared computed colour probe.** Create the module
`readComputedColour` in the renderer's `test-support/`, and delete its
`.gitkeep`. `readComputedColour(css)` returns what Chromium computes as the
`color` of a probe element for a CSS colour. It throws on a string that is no
colour, and removes the probe again: the stories files' `computedColour`,
under a verb-first name. Its stories file beside it, titled
`Test support/readComputedColour`, renders an empty frame. Its
**Play functions** prove that a hex colour gives its `rgb()` form, that a
`color-mix()` string gives what a probe styled with it computes, that a
string that is no colour throws, and that no probe is left in the document.
Nothing uses it yet.

**08 add the shared first family probe.** Create `readFirstFamily` in the
same way. `readFirstFamily(style)` takes a `CSSStyleDeclaration` and returns
the first family of its `font-family`, trimmed and without quotes
(`docs/conventions.md`: "A font check compares the family name without
quotes"), or `''` when there is none. Its **Stories** render one element in
`"Barlow Condensed", system-ui`, one in `Barlow, sans-serif` and one with a
single family, and assert `Barlow Condensed`, `Barlow` and that family.

**09 add the shared hover probe.** Create `readHoveredStyle` in the same way.
`readHoveredStyle(element, read)` copies every `:hover` rule right after
itself with a marker attribute in place of `:hover`, sets the marker on the
element and its ancestors, and returns what `read` returns for the element's
computed style. Afterwards it removes the markers and the copies, even when
`read` throws. This is the stories files' `hoveredFill`, `hoveredStyle` and
`hoveredColour` with the value read passed in. Its **Stories** render a
styled element with a `:hover` fill and a child coloured by its parent's
`:hover`, and assert that both hovered values are read, that the resting
values are unchanged afterwards, that the style sheets hold as many rules as
before and that no element keeps the marker.

**10 to 32 use shared probes in the `<name>` stories.** One stories file per
step: delete its own `computedColour`, `firstFamily` and hover probe, and its
inline family checks, and import `readComputedColour`, `readFirstFamily` and
`readHoveredStyle` instead. Every assertion keeps what it compares. Per
file:

- Amount (10) and Button (11): the inline quote-stripping family check
  becomes `readFirstFamily`.
- Checkbox (12), Switch (19), Card (22), Logo (24), StatTile (29) and
  Stepper (30): colour and family.
- Chip (13), Accordion (21) and YearTable (31): colour, family and the
  hovered fill.
- Segmented (16) and NavItem (26): colour, family and the hovered fill and
  text colour.
- PageHeader (27): colour, family and the hovered text colour.
- Input (14) and Select (17): colour, and `startsWith('Barlow')` becomes
  `readFirstFamily(style)` equal to `Barlow`, which "Barlow Condensed" no
  longer passes. Their `hoverBorderColours` rule reader stays (Further
  Notes).
- Meter (15), Swatch (18), Tag (20), FormField (23) and Sparkline (28):
  colour only.
- Modal (25): family only. Its `computed`, which reads box shadows too,
  stays.
- GlobalStyle (32): its `firstFamily` takes an element and becomes
  `readFirstFamily(getComputedStyle(element))`. Its hover probe marked only
  the element, and the shared one marks the ancestors as well, as a real
  hover does. The link's hovered colour must come out the same.

**33 add the untracked path reader to run git.** In the shared git reader,
add `listUntrackedPaths(cwd)`: every untracked path that is not ignored
(`ls-files -z --others --exclude-standard`), split on NUL, without empty
entries, as `listTrackedPaths` does. Add a test beside the existing ones, in
the temporary repository with a `.gitignore`: an untracked file is listed,
an ignored one and a tracked one are not. Nothing uses it yet.

**34 use the untracked reader in check coverage.** In `checkCoverage`,
replace the inline `ls-files` call in `readChangedLines` with
`listUntrackedPaths(cwd)`, filtered by `isMeasured` as before. The gate's
tests stay green unchanged.

**35 use the shared readers in check stories.** In `checkStories`,
`listCandidatePaths(cwd)` stays, exported and small: it returns the tracked
paths followed by the untracked ones, from the shared `listTrackedPaths` and
`listUntrackedPaths`, the same set as `ls-files --cached --others
--exclude-standard`. Its inline `ls-files` call goes. The `import.meta.main`
block only calls it, as now, so no logic is left where the coverage gate
cannot see it. Add a unit test for `listCandidatePaths` in a temporary
repository with a `.gitignore`: a tracked file and an untracked one are
listed, tracked first, and an ignored one is not. Show the test fails without
the function before keeping it. The gate's tests, whose output check sorts
the lines, stay green unchanged. Then run `npm run test:mutation`.

**36 add the has text helper.** Create the module `hasText` in the
renderer's `utils/`, with its test, the `utils/` barrel `index.ts` (the
category folder's one barrel, `docs/conventions.md`) and without the
folder's `.gitkeep`. `hasText(text)` takes a `string | undefined`, returns
`false` for `undefined` and `''` and `true` for any other string, and narrows
the type to `string`. Tests: `undefined`, `''`, a word, a single space, and
that the barrel re-exports it (prior art: the **Stories** that import a
barrel with `import * as`). Nothing uses it yet.

**37 to 51 use has text in the `<name>`.** One module per step: every check
for an absent text prop becomes `hasText(...)` or `!hasText(...)`, whether
it was spelled `=== undefined || === ''`, `!== undefined && !== ''`, a
truthiness test or `Boolean(...)`. Each fallback keeps its operands, so
`title` still falls back to `label` and `backLabel` to "Back". Per module:
Button `label`, `title`, `loadingLabel` and the face's text (37); Checkbox
`label` (38); Chip `swatch` and `meta` (39); Input `suffix` (40); Loader
`label` (41); Select `placeholder` (42; `value !== ''`, a chosen value, is
not an absent prop and stays); Switch `label` (43); Accordion `tag` and
`meta` (44); Card `kicker`, `title` and the header (45); FormField `error`
and the message (46); Modal `subtitle` (47); PageHeader `tag`, `subtitle`
and `backLabel` (48); Snackbar `message`, `actionLabel` and
`secondaryLabel` (49); StatTile `hint` (50); YearTable, whose private
`present` is deleted for the import (51). Props that are not text
(`onBack`, `onClose`, `icon`, `cents`, a `swatch` checked only against
`undefined`) stay as they are (Out of Scope). The empty-string **Stories**,
steps 04 to 06 among them, stay green unchanged.

**52 add the hairline token in the accordion styles.** Add `size.hairline`,
`'1px'`, to the **Theme**, with the comment "SPEC section 2: the 1px
hairlines of every frame and divider". The Accordion's section border reads
it in place of the literal `1px`. The Tokens **Story** and the Accordion's
**Stories** stay green unchanged.

**53 to 68 use the hairline token in the `<name>` styles.** One styles module
per step: every literal `1px` of a `border`, `border-left` or `border-bottom`
reads `size.hairline`, the dashed one and the conditional one included (Meter
64, Stepper 58). Card, Modal, NavItem, Snackbar, StatTile, Stepper,
YearTable, Button, Checkbox, Chip (both borders), Input, Meter, Segmented
(both), Select, Switch, Tag. `border: 0`, the Sparkline's tick and the
Snackbar's icon nudge stay as they are. Each
module's **Stories**, which read every border width as `1px`, stay green
unchanged.

**69 use opacity tokens in the loader styles.** Add three entries to
`color.opacity`, valued exactly as `loader-keyframes.css` gives them:
`loaderMarch` 0.2 (a marching dash between its pulses), `loaderGrow` 0.18 (a
growing dash before it lights up) and `loaderBreathe` 0.45 (the low point of
the reduced-motion breathing). The `march`, `grow` and `breathe` keyframes
are built from the **Theme** they receive, through `css` as `loop` already
uses the **Theme**'s loop duration, and read those entries. Opacities 0 and 1
stay literal: they mean none and full, like `border: 0`. The Loader's
**Stories**, step 03's included, stay green unchanged.

**70 move the logo geometry into utils.** Create the module `logoGeometry` in
`utils/`, re-exported from the barrel. It exports the 32 × 32 view box's
`LOGO_CENTRE` (16), `LOGO_RADIUS` (13), `LOGO_DIAGONAL`, `LOGO_UNIT`
(radius / 9), the C path, its cut and the line path, and moves
`computeLogoStrokeWidth` and `computeLogoDashEnd` out of the Logo. The
Logo's tests move to `logoGeometry.test.ts` unchanged except for the import,
and `Logo.test.tsx` goes. The Logo imports the geometry and keeps
`thirdDashPath`, the first dashes' path and its name. The Logo's
**Stories**, `MarkLarge` among them, stay green unchanged.

**71 use the logo geometry in the loader.** The Loader deletes its copies of
the centre, diagonal, unit, C path, cut and line path, and imports them.
`strokeWidthFor` is replaced by `computeLogoStrokeWidth`, and dash 3 ends at
`LOGO_RADIUS + strokeWidth / 2` in place of the literal 13. Its styles' orbit
`transform-origin` is built from `LOGO_CENTRE`. `DASHES_ONLY_UP_TO`,
`LARGE_FROM`, the dash array and the small dash width stay the Loader's. The
Loader's **Stories** stay green unchanged.

**72 to 84 rename verb first.** One module per step, each private helper
renamed together with its callers, with no other change:

- 72 Amount: `polarityColour` to `pickPolarityColour`, `toneColour` to
  `pickToneColour`.
- 73 Button styles: `textColour` to `pickTextColour`.
- 74 Loader: `onDiagonal` to `placeOnDiagonal`, `segment` to
  `drawSegment`, `dashPaths` to `buildDashPaths`, `dashMotion` to
  `pickDashMotion`; in its styles `loop` to `animateLoop`, `motionOf` to
  `pickStrokeMotion`.
- 75 Meter styles: `fill` to `pickFill`.
- 76 Select styles: `textColour` to `pickTextColour`.
- 77 Tag styles: `look` to `pickLook`.
- 78 Logo: `thirdDashPath` to `buildThirdDashPath`.
- 79 NavItem styles: `badgeLook` to `pickBadgeLook`.
- 80 Snackbar styles: `toneColour` to `pickToneColour`, `toneTint` to
  `pickToneTint`.
- 81 StatTile styles: `textColour` to `pickTextColour`.
- 82 Stepper: `look` to `pickLook` in its styles, `stateOf` to
  `readStepState`.
- 83 YearTable styles: `ground` to `pickGround`.
- 84 `useRevealOnExpand`: `scrollerOf` to `findScroller`.

## Decision Document

- **Scope.** The renderer's **Primitives**, **Components**, hook, global
  style, **Theme** and their **Stories** and tests; the renderer's
  `test-support/` and `utils/`; `checkStories`, `checkCoverage` and the
  shared git reader with their tests. No gate file changes (`CLAUDE.md`,
  "Ask first"): not `.storybook/`, not the Vitest, Stryker, ESLint,
  dependency-cruiser or tsconfig files, not `gates/`, not `quality/`, not the
  npm scripts. Nothing under `.claude/` changes.
- **Behaviour.** What the user sees and does stays as the **Stories** pin it.
  The assertions of steps 01 to 06 and the shared probes' own **Stories**
  are the only new tests of the renderer; no existing assertion is removed or
  loosened. The Input and Select family checks get stricter (step 14, 17).
  The **Story check** prints the same lines for the same files, and the
  **Coverage** gate counts the same untracked files.
- **Shared story probes live in the renderer's `test-support/`,** one module
  per probe, each named verb first: `readComputedColour`, `readFirstFamily`,
  `readHoveredStyle`. Stories may import `test-support/`; shipping code may
  not (**Layer rule**, enforced). They need a real browser, so each module's
  test is a stories file beside it, titled `Test support/<name>`, run by the
  **Story tests**, not a `.test.ts` that `npm test` runs in Node. Prior art:
  the global style is proven by its own **Story** (design log I3), and the
  Tokens **Story** is no component's. The **Story check** neither requires
  nor forbids them, and coverage leaves `test-support/` out.
- **`readHoveredStyle` takes what to read as a function,** so one probe
  serves a fill, a text colour or both without returning a live
  `CSSStyleDeclaration` that changes once the markers are gone. It marks the
  ancestors too, as six of the seven copies do and as a real hover does.
- **Probes that stay local.** Every file's "out of the pointer's reach"
  holder differs in shape and stays. So do the Input's and Select's
  `:hover` rule readers, `middle`, and Modal's and Snackbar's `computed`,
  which read box shadows as well (Further Notes).
- **`listUntrackedPaths` joins the shared git reader,** beside
  `listTrackedPaths`, with the same output shape. The **Story check** builds
  its list from the two readers instead of one combined `ls-files`; its
  violations are found per path, so the order of the input does not change
  which lines it prints, and its gate test sorts them.
- **`hasText` lives in `utils/`,** a shared folder every **Layer** may
  import, with the category's one barrel. It is the one spelling of
  `CLAUDE.md`'s "an empty string is absent" for text props. Modules import
  it by its path, as components import primitives today.
- **The hairline Token is `size.hairline`, `1px`,** one **Token** for every
  1 px border, after SPEC section 2 ("All 1px hairlines"; "1px divider
  border"). It does not replace `size.sparklineTick` or
  `space.snackbarIconNudge`, which are other roles that happen to be 1 px
  (design log Q12: never merged by value). The `1px` rings inside
  `shadow.sm`, `md` and `lg` are part of those **Tokens** and stay.
- **The Loader's partial opacities become Tokens** in `color.opacity`, beside
  `disabled`, `projection` and `future`. 0 and 1 are not design values. The
  keyframe percentages are the animation's timing from
  `loader-keyframes.css`, like the path data, and stay in the styles module.
- **`logoGeometry` lives in `utils/`.** Both a **Primitive** (Loader) and a
  **Component** (Logo) need it, and a shared folder is the one place both may
  import without a **Component** depending on the Loader. It holds values
  and two pure functions, like the domain's `cents` module holds a type and
  `toCents`. It is tested in Node by Vitest, as the Logo's pure functions
  were (design log Q25).
- **Verb-first names** use `pick…` for a helper that chooses a colour or a
  look from a **Tone**, variant or state, `build…` and `draw…` for path
  builders, `read…` and `find…` for lookups, as in `docs/conventions.md`
  (Naming). Helpers already verb first stay: `clamp`, `round`, `reveal`,
  `toPath` (like `toCents`), `styleGlyph`, `useAfterDelay`.
- **Commit type.** Every step, the test-only steps included, is a
  `refactor:` commit with its step number, so the **Ticket check** finds it in
  this plan.

## Testing Decisions

- A good test checks what the user gets: what Chromium computes and lays out
  for a **Story**, what a **Play function** can click and read, the
  **Accessibility check** in every **Story test**, a pure function's result,
  a gate's lines and exit code. It never asserts on private helpers, class
  names or how a module is wired inside. The one rule read from the style
  sheets (step 03) is read because Chromium in the **Story tests** reports no
  reduced motion, as `CLAUDE.md` has hover rules read.
- Coverage is enough to refactor once steps 01 to 06 are in. Every other
  rule a later step touches already has a **Story** that fails without it:
  every border width is read as `1px`, every empty-string prop but the four
  of steps 04 to 06 has its `Empty…` **Story**, the Loader's march and grow
  opacities are read at fixed times, the Logo's geometry is tested in Node
  and painted in `MarkLarge`, and the two gate scripts have unit and
  sample-repository tests.
- New modules get tests: the three probes their own **Stories** (07 to 09),
  `listUntrackedPaths` a test in the shared git reader's tests (33),
  `hasText` and the barrel a Vitest test (36), `logoGeometry` the Logo's
  moved tests (70). Renamed private helpers get none; their module's
  **Stories** cover them.
- Existing tests keep every assertion. Only the imports change in steps 10
  to 32 and 70, and the Input and Select family checks become stricter.
- Prior art: the Input's and Select's `:hover` rule reading (step 03); Chip's
  `EmptySwatch` and `EmptyMeta` (steps 04 to 06); the Button's resting
  holder; the global style's own **Story** (the probes' **Stories**); the
  shared git reader's temporary repository (step 33); `Logo.test.tsx`
  (step 70).
- Tests stay deterministic, offline and on invented data: fixed story data,
  `delay` 0 on every Loader but the delay **Story**, the reduced-motion stub
  restored at the end of its **Story**.
- `CLAUDE.md` asks to say so: the refactor-loop's agents write both the code
  and its tests.

## Out of Scope

- **Bugs found while planning, against `CLAUDE.md`'s "an empty string is
  absent, as in the prototype".** Each needs a ticket with its **Story**,
  because each changes what is drawn:
  - Tag: `swatch: ''` draws an empty 8 px swatch and its gap. `Tag.dc.html`
    hides it (`sc-if`).
  - Select: an option whose `color` is `''` draws an empty swatch and pads
    the text 26 px. `Select.dc.html` hides it and pads 10 px.
  - Input and Select: `width: ''` reaches the CSS as an empty width, which
    the browser drops. `Input.dc.html` and `Select.dc.html` fall back to
    100 % (`p.width || '100%'`).
  - YearTable: a column `color: ''` draws an empty dot, and `width: ''`
    reaches the CSS. `YearTable.dc.html` hides the dot and falls back to
    `auto`.
  These modules check those props against `undefined` only, so steps 37 to
  51 leave them as they are. A fix uses `hasText` once it exists.
- **Design.** Apart from the bugs above, nothing found differs from the
  prototype. The prototype rules left out in tickets 18, 19, 21 and 22 change
  nothing visible and are listed in their Notes, as `CLAUDE.md` asks. The
  deviations D1, D2 and D10 to D19 were set by the human.
- **Icon size constants.** Ticket 28 lists them; Further Notes explains why
  they need a decision first.
- **Money.** No money math sits outside `packages/domain`; the domain's
  modules are unchanged.
- **Every gate file and `.claude/`** (Further Notes for what the evidence
  points at there), and the code of features 01 to 05.

## Further Notes

For the human. None of these is a step, because each touches a gate file or
needs a decision the design log leaves open.

- **Three copies of the story-config reader** (ticket 28). `gates/storyTests/`
  and `gates/coverage/` each import `vitest.storybook.config.ts` in a fresh
  Node process to read its settings, and `checkCoverage.test.ts` does it a
  third time. One reader in `scripts/test-support/` would serve all three,
  but two of them are gate tests. Say so if you want a ticket that names
  them.
- **Icon size constants** (ticket 28). Eleven modules pass a literal pixel
  size to the Icon, the Loader or the Swatch (12, 13, 14, 15, 16, 18; the
  YearTable's 9 px dot; the Select's and Tag's 8 px swatch). SPEC section 3
  types the Icon's `size` as a number, while the **Theme**'s sizes are CSS
  strings. As **Tokens** they would need `useTheme()` and `parseFloat` in
  every render (as `useRevealOnExpand` reads `size.revealMargin`), or a
  numeric group beside Q11's eight. Decide which, or that a size passed as a
  prop stays a prop value.
- **`skipLibCheck`** in `apps/desktop/tsconfig.web.json` and
  `.storybook/tsconfig.json` (design log D8, ticket 01) comes out once a
  Storybook release at least 14 days old fixes `@storybook/react`'s
  misplaced `@ts-expect-error`. Both are gate files.
- **`eslint.config.js` casts the Storybook plugin's config** through
  `unknown` (ticket 03), because its rule types do not fit ESLint 10's. It
  can go when the plugin's types fit. It is a gate file.
- **The `glob` Audit exception** (ticket 01) stays until Storybook's
  `react-docgen-typescript` plugin accepts `glob` 14.0.2 or later. Renovate
  will bring that; it is not a refactor.
- **Ticket 25's failed Verify** happened once, with no captured cause. If it
  happens again during this loop, keep the log.
- **Considered and left as they are.** The "out of the pointer's reach"
  holders differ per file (a frame, a column, a flex row), so one shared
  holder would need as many options as there are files. The Input's and
  Select's `hoverBorderColours` read the `.input:hover` rule both share; two
  copies of one prototype class may stay together until a third needs it.
  `middle` is one line. Modal's and Snackbar's `computed` read box shadows
  as well as colours. The Logo's gap (`size * 0.32`) and wordmark size
  (`size * 0.78`) are `Logo.dc.html`'s formulas, not sizes. Amount's
  **Polarity** is a sign test that picks a **Tone**, not money math.
