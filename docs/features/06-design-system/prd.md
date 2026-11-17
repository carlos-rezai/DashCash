# PRD: 06 design-system

> Source: `design-log.md` (Grill-me, 2026-11-17, Q1–Q42; Assumptions from
> write-a-prd, A1–A5). Terms in bold are defined in
> `docs/ubiquitous-language.md`.

## Problem Statement

Five features have built the gates, the supply chain, **Mutation testing**
and the desktop shell, but the **Renderer** is still an empty page. Its
**Layer** folders exist and are empty; there is no React, no
styled-components, no Storybook and no money type, and `packages/domain`
is not even a **Workspace member** yet. Every screen still to come (the
app shell, accounts, the dashboard, the import wizard) is drawn in the
prototype from the same few dozen pieces: one dark theme, thirteen
**Primitives**, twelve **Components**, one way to show money.

Built screen by screen, those pieces would arrive with their first
consumer and drift from the prototype a little each time: a hex colour
typed into a style, a button 34 px high in one place and 36 px in another,
money formatted by hand with a hyphen instead of U+2212, a dialog nobody
can name to a screen reader. Nothing checks today that a component has
stories, that the stories still run, that a form control has a label, or
that new code is run by any test at all. `docs/quality-gates.md` gives
exactly these checks to this row.

## Solution

The design system, row 06 of `docs/feature-checklist.md`, built 1:1 from
the prototype and shown only in Storybook:

- One **Theme** holds every **Token** of the dark token sheet over
  Industry's styles: colours, the accent and neutral ramps, the account
  and 40 category colours, type, spacing, **Control heights**, shadows,
  durations, and every literal the prototype uses. A global style sets the
  ground, ink, fonts, focus ring, selection and scrollbars; Barlow and
  Barlow Condensed are self-hosted.
- Thirteen **Primitives** (Icon, Button, Amount, Tag, Input, Select,
  Segmented, Swatch, Checkbox, Meter, Chip, Switch, Loader) and twelve
  **Components** (Card, Modal, FormField, PageHeader, NavItem, Stepper,
  Accordion, StatTile, Logo, Sparkline, YearTable, Snackbar), each typed by
  SPEC §3, styled from the **Theme** only, with one **Story** per state the
  prototype shows. Accordion and YearTable reveal what they open through
  the shared `useRevealOnExpand` hook.
- `packages/domain` becomes `@dashcash/domain` and brings the **Cents**
  type, `toCents` and `formatCents`, the one **Money format** every amount
  on screen uses.
- `npm run storybook` serves the living inventory; `npm run test:stories`
  runs every **Story** as a **Story test** in headless Chromium, with its
  **Play function** and the **Accessibility check**. Colour-contrast
  failures are reported for review, everything else axe finds fails.
- Three new gates in **Verify**: the story tests, the **Story check**
  (every **Primitive**, **Component** and **Feature component** has its
  stories file) and **Changed-lines coverage** against an 80 %
  **Coverage threshold**.
- Storybook serves the **Storybook MCP**; the reviewer gets its tools in a
  ticket the human builds.

No **End-to-end test**: nothing here is a **User flow**. The human's `go`
is needed for the gate files the tickets name, and the human builds the
reviewer ticket.

## User Stories

**Theme and tokens**

1. As the developer, I want one typed **Theme** holding every **Token**,
   so that every style reads its values from one place and a typo in a
   key fails the type check.
2. As the developer, I want the **Theme** grouped by kind (colour, font,
   font size, space, size, shadow, motion, z-index), so that I find a
   value by what it is.
3. As the developer, I want each **Token** keyed by SPEC §2's bracketed
   name where it gives one and otherwise by its CSS variable's name in
   camelCase without the prefix, so that the prototype and the code name a
   value the same way.
4. As the user, I want the app ground `#1b2a39`, the sunken ground
   `#16222f`, the surface `#213345` and the ink `#e9f1fa`, with muted,
   faint, divider, hover and backdrop derived exactly as the token sheet
   writes them, so that the app looks as designed.
5. As the user, I want the inverted accent ramp 100 to 900 and the neutral
   ramp, so that tints, fills and accent text sit where the design put
   them.
6. As the user, I want positive money green `#7cc59a`, negative money red
   `#e8877b`, warning `#e0b469` and danger with their tints, and the
   payoff in the **Milestone tone** (green with its tint and row colour),
   never amber, so that colour means the same thing everywhere.
7. As the user, I want the five account colours and the 40 category
   colours with the token sheet's exact values, so that an account or a
   category keeps its colour across every screen.
8. As the user, I want Barlow Condensed 600 for headings and Barlow 400
   and 500 for body text, with the type scale 42 · 34 · 22 · 19 · 15 · 14
   · 13 · 12 · 11, so that type reads as designed.
9. As the user, I want the 0.85× spacing scale (3.4 to 27.2 px), square
   corners and the dark shadows, so that density and depth match the
   prototype.
10. As the developer, I want every literal size the prototype uses and
    SPEC §2 does not name (NavItem 38 px, Tag 22 px, a 10 px gap, the
    Logo's light colours) as a named **Token** with exactly the
    prototype's value, so that no style holds a magic number and nothing
    is rounded to a nearby step.
11. As the developer, I want the two **Control heights** (md 36, sm 28)
    and the fixed exceptions (NavItem 38, Tag 22, Stepper step 44,
    Checkbox 16, Switch 34 × 18) as **Tokens**, so that every control of
    one size lines up.
12. As the developer, I want SPEC §5's durations (160 ms, 300 ms, the
    Loader's 1,6 s loop, 200 ms fade-in and 2,4 s breathing) as
    **Tokens**, so that nothing else animates by accident.
13. As the developer, I want a Tokens **Story** with the inventory's
    colour tiles, type scale and spacing bars, so that Storybook replaces
    the prototype's inventory from its first section.

**Global styles and fonts**

14. As the user, I want the page ground, ink and body font set once
    globally, so that every screen starts on the dark ground.
15. As the user, I want headings in Barlow Condensed, links in the accent,
    the 2 px accent focus ring with offset 2 on `:focus-visible`, the
    selection colour and the dark scrollbars, so that the whole page
    follows the design, not only its components.
16. As the user, I want a disabled button to show the `not-allowed`
    cursor, so that I see it does nothing.
17. As the user, I want the fonts served from the app itself, so that the
    offline app never fetches anything and text renders the same every
    time.
18. As the developer, I want Industry's class rules turned into the
    styles of the components that use them, and Industry's Google Fonts
    import dropped, so that no global class exists that a component
    secretly relies on.

**Money**

19. As the developer, I want a branded **Cents** type, so that a plain
    number cannot be passed where money is expected.
20. As the developer, I want `toCents(value)` to return **Cents** for a
    safe integer and to throw a `RangeError` for anything else (a
    fraction, `NaN`, infinity, a number beyond the safe range), so that
    money is made without a cast and never from a float.
21. As the user, I want amounts in German format with exactly two
    decimals (`1.234,56 €`), so that money reads the way I expect it.
22. As the user, I want a no-break space before `€`, so that an amount
    never breaks across lines.
23. As the user, I want a negative amount to start with U+2212
    (`−86,40 €`), so that the minus is as wide as the plus and reads as a
    minus.
24. As the user, I want `sign: 'always'` to put `+` before a positive
    amount, `sign: 'none'` to drop the sign, and zero to have no sign, so
    that changes read as changes and magnitudes as magnitudes.
25. As the user, I want `whole` to round to whole euros (`30.000 €`), with
    the sign following the cents rather than the rounded figure (−40 cents
    whole is `−0 €`), so that axis labels and totals are short and still
    honest about the sign.
26. As the developer, I want the formatter in the domain, so that every
    screen formats money through one tested function.
27. As the developer, I want `@dashcash/domain` to be a **Workspace
    member** whose modules are imported by their path, so that the
    renderer imports the formatter without an `index.ts` per module.

**Icon**

28. As the developer, I want `IconName` to be exactly the 41 names of the
    prototype's icon set, including `undo` and `folder`, so that every
    icon the screens use is available and nothing else.
29. As the user, I want each icon drawn as its Lucide glyph at stroke 1.5,
    16 px by default, in the current text colour, so that icons match the
    prototype.
30. As the user of a screen reader, I want icons hidden from assistive
    technology, so that I hear the label beside them, not the icon.
31. As the developer, I want a **Story** showing every icon with its name,
    so that I can pick one by sight.

**Button**

32. As the user, I want primary (solid accent, the one solid object),
    secondary, ghost and danger buttons, so that the weight of an action
    is visible.
33. As the user, I want md buttons 36 px and sm buttons 28 px high, with
    16 or 14 px icons, so that a button beside an input lines up with it.
34. As the user, I want a button without a label to be a square icon
    button whose `title` names it, so that compact actions are still
    named.
35. As the user, I want a left icon, a right icon and a full-width
    (`block`) button, so that every button the screens use exists.
36. As the user, I want a disabled button at 45 % opacity with no hover or
    pressed state, and a click on it to do nothing, so that I never
    trigger what is not allowed.
37. As the user, I want a loading button to replace its icon with a Loader
    at icon size, show its `loadingLabel` ("Importing…"), stay at full
    strength, keep its width and report itself busy, so that I see the
    action running and cannot press it twice.

**Amount**

38. As the user, I want amounts coloured by **Polarity** by default (green
    above 0, red below, ink at 0), so that I read gain and loss at a
    glance.
39. As the user, I want `muted` (polarity at 62 % opacity) for projected
    values, `neutral` to opt out of colour, and `positive`, `negative`,
    `warning`, `danger` and `accent` tones, so that every amount on every
    screen has its designed colour.
40. As the user, I want sizes sm 13, md 14, lg 22 and xl 34, the large two
    in Barlow Condensed, with tabular figures, so that columns of amounts
    align.
41. As the user, I want `strong` amounts in the heavier weight, so that
    totals stand out.
42. As the user, I want a missing amount (`null`) shown as "-", so that an
    empty cell is visibly empty.

**Tag**

43. As the user, I want accent, neutral, outline, warning, danger and
    milestone tags with the fills SPEC §3 gives, so that each label's
    meaning shows in its colour.
44. As the user, I want a tag with an icon or an 8 px colour swatch, so
    that "New bank format" carries its info icon and a category its
    colour.
45. As the user, I want "Paid off" in the **Milestone tone** with its
    flag, so that the payoff reads as good news.

**Input and Select**

46. As the user, I want inputs 36 px (md) or 30 px (sm) on the inset input
    ground, with an optional left icon, a suffix such as "€", right
    alignment and numeric mode, so that "1.529,60 €" reads like a money
    field.
47. As the user, I want typing in an input to report the new text, so
    that the screen can react to it.
48. As the user, I want a select with a placeholder as its empty option,
    options with an optional colour swatch for the chosen option, sm and
    md sizes and a width, so that a category picker shows the category's
    colour.
49. As the user, I want a select in the warning tone (warning border and
    placeholder colour), so that "Pick a category" draws my eye without
    blocking me.
50. As the user of a screen reader, I want an input or select that no
    FormField labels to carry an accessible name from an optional
    `ariaLabel`, so that every control is named.

**Segmented, Checkbox, Switch, Chip, Swatch**

51. As the user, I want a segmented control whose selected option has the
    accent fill, 28 px by default and 36 px at md, so that I switch a view
    in one click.
52. As the user, I want a 16 px checkbox that shows the accent fill and a
    check when checked and toggles on click, with an optional label, so
    that "Mark as recurring" works as a checkbox.
53. As the user, I want a square 34 × 18 switch, accent when on, with a
    label or an `ariaLabel`, that toggles on click and does nothing when
    disabled, so that settings switch on and off.
54. As the user, I want a 28 px chip that toggles on click, shows its
    pressed state, an optional swatch (square, circle or line) and a muted
    meta value on the right, and a disabled chip that keeps its resting
    fill, so that legends and month pickers work.
55. As the user, I want swatches as squares (categories), circles
    (accounts) or lines, at a given size, so that colour markers are
    consistent.

**Meter**

56. As the user, I want a meter whose solid bar shows the value and whose
    dashed outline shows the projected value beyond it, so that "so far"
    and "once due items book" are both visible.
57. As the user, I want neutral, warning and danger meters, so that
    headroom shows its state in colour.
58. As the user, I want the meter's width to animate over 300 ms, so that
    a change is noticeable but quick.
59. As the user of a screen reader, I want a meter with an accessible name
    and its value, so that the bar is not silent.

**Loader**

60. As the user, I want the Loader to draw the logo (the solid line, then
    the three dashes one by one, then the C) in a 1,6 s loop, so that
    waiting looks like DashCash.
61. As the user, I want the march, orbit and grow variants available, so
    that the documented alternatives stay usable.
62. As the user, I want a Loader at 20 px or less reduced to its three
    dashes, so that it stays legible in buttons and inline.
63. As the user, I want the Loader to appear only after its delay
    (300 ms by default) and fade in over 200 ms, so that quick tasks never
    flash a spinner.
64. As the user who prefers reduced motion, I want the Loader to stop
    moving and only breathe (opacity 1 to 0,45 over 2,4 s), so that
    nothing spins at me.
65. As the user of a screen reader, I want the Loader announced as a
    status with its label, or "Loading", so that I know something is
    happening.
66. As the user, I want the Loader with a label beside it ("Recalculating…",
    "Checking…"), in accent-600 by default and in the current colour
    inside a button, so that it fits every context the prototype shows.

**Card, FormField, PageHeader**

67. As the user, I want cards filled with the surface colour and a soft
    1 px outline, square, with an optional kicker and title and none, sm,
    md or lg padding, so that content sits on the designed panels.
68. As the user, I want a form field with its label, a hint below the
    control, and an error in the danger colour replacing the hint, so that
    I know what to type and what went wrong.
69. As the user of a screen reader, I want the field's label tied to its
    control, so that the control is announced by its label.
70. As the user, I want a page header with title, subtitle, a tag and
    right-aligned actions, and an optional back link with its label, so
    that every page opens the same way.
71. As the user, I want the back link to call back when clicked, so that I
    return to where I came from.

**Modal**

72. As the user, I want a modal with title, subtitle and content on the
    raised fill with the large shadow, 460 px wide unless told otherwise,
    over the dark backdrop, so that it reads as a layer above the page.
73. As the user, I want Esc and a click on the backdrop to close the
    modal, and a click inside the panel not to, so that I can leave it the
    usual ways without closing it by accident.
74. As the user, I want the modal's actions as the last row of its
    content, right aligned, so that "Cancel" and "Confirm" sit where I
    expect them.
75. As the user, I want nothing rendered while the modal is closed, so
    that it never blocks the page.
76. As the user of a screen reader, I want the modal announced as a modal
    dialog named by its title, so that I know where I am.

**NavItem**

77. As the user, I want navigation items 38 px high with icon and label,
    an active state, and a count badge in accent or warning that hides at
    0, so that the sidebar shows where I am and what needs attention.
78. As the user, I want a compact navigation item showing only its icon,
    centred, with the label as tooltip and accessible name and the badge
    as a corner chip, so that the collapsed sidebar still works.
79. As the user, I want a click on a navigation item to call back, so that
    navigation can react.

**Stepper**

80. As the user, I want a stepper of equal cells where done steps show a
    check in an accent square and are clickable, the current step has the
    accent-100 fill and a 2 px bottom bar, and future steps are faint and
    disabled, so that I see my progress and can go back but not skip
    ahead.
81. As the user, I want a click on a done step to report its index, and a
    click on a future step to do nothing, so that the wizard can move
    back.

**Accordion and YearTable**

82. As the user, I want an accordion with title, a meta value on the
    right and a tag, whose chevron turns over 160 ms when I toggle it, so
    that I open and close sections of a year list.
83. As the user, I want the clicked row to stay where it is and the
    content to open below it, so that the page never jumps under my
    cursor.
84. As the user, I want the scroll area to scroll smoothly just far
    enough to show an opened block with a 24 px margin, never past the
    clicked row, and not at all when the block fits or on collapse, so
    that what I opened is in view.
85. As the user who prefers reduced motion, I want that scroll to jump
    instead of animating, so that nothing glides.
86. As the user, I want a year table whose year rows open and close on
    click with a chevron, the condensed year, a tag and bold totals, so
    that I drill from years to months.
87. As the user, I want month rows on the sunken ground, today's month in
    accent-100, the payoff month in the milestone row colour, and future
    months faded, so that I see where I am on the timeline.
88. As the user, I want cells showing an amount, an icon with its tooltip,
    a text or nothing, so that each table shows what its screen needs.
89. As the user, I want years open by default as told, and each toggle
    reported, so that the current year starts open.
90. As the user, I want an equal-columns layout (first column 230 px,
    every data column the same width of at least 130 px) that scrolls
    inside the card when narrow, so that account columns sit on an even
    rhythm.
91. As the user, I want column headers that never wrap and columns with
    their colour dot and alignment, so that the header row stays one line.

**StatTile, Sparkline, Logo**

92. As the user, I want a stat tile with a kicker label, a text value or
    an amount, a hint, and the default, accent, warning or danger tone, so
    that the import preview shows its numbers.
93. As the user, I want a sparkline with the past solid, the future dashed
    and a hairline tick at today, in the account's colour, 36 px high by
    default, so that an account card shows its trend.
94. As the user, I want the DashCash logo as mark or full (mark plus
    wordmark), in its dark and light colours, with the stroke width
    adjusted by size (3.2 up to 20 px, 2.6 up to 32, 2.2 above) and the
    third dash ending flush with the C, so that the logo is crisp at every
    size.

**Snackbar**

95. As the user, I want success, error, info and warning snackbars with a
    tone-tinted fill, a tone hairline, the large shadow and the tone's
    icon (or a given icon), so that a message's weight shows at a glance.
96. As the user, I want a snackbar's primary action as a primary button
    for info and success and a secondary button for warning and error,
    with an optional icon, a secondary action and a close button, so that
    I can act on the message.
97. As the user, I want each action and the close button to call back, so
    that the message can be answered or dismissed.
98. As the user of a screen reader, I want error and warning snackbars
    announced as alerts and the others as status, so that urgent messages
    interrupt and the rest do not.
99. As the user, I want a loading snackbar to show an 18 px Loader in
    place of the tone icon, so that "Installing…" shows progress.

**Storybook and story tests**

100. As the developer, I want `npm run storybook` to serve every **Story**
     on port 6006 without opening a browser, so that I and the agents can
     look components up.
101. As the developer, I want every **Story** wrapped in the **Theme**, the
     global style and the fonts, so that a **Story** looks like the app.
102. As the developer, I want one **Story** per state the prototype shows,
     titled `<Layer>/<Name>`, with the prototype's copy and German number
     formats verbatim and invented data, so that Storybook is the living
     inventory.
103. As the developer, I want every interaction a **Play function**, so
     that a click, a toggle, Esc or a disabled control doing nothing is
     tested, not only shown.
104. As the developer, I want `npm run test:stories` to run every **Story**
     as a **Story test** in headless Chromium, so that stories that throw
     or whose **Play function** fails turn **Verify** red.
105. As the developer, I want `npm test` to stay the Node run of the unit
     tests, so that the fast suite stays fast and **Mutation testing**
     never meets a browser.
106. As the developer, I want `npm ci` to install the headless Chromium
     the **Story tests** use, so that no test downloads a browser.
107. As the user, I want Storybook's telemetry off, so that nothing about
     the project leaves the machine.
108. As the developer, I want the React hooks rules and Storybook's lint
     rules, so that hook mistakes and unloadable story files fail lint.

**Accessibility check**

109. As the user of assistive technology, I want axe run on every
     **Story**, so that a missing label, a wrong role or an unnamed control
     fails before it ships.
110. As the human, I want colour-contrast failures reported for review in
     the a11y panel and through the **Storybook MCP** instead of failing,
     until I decide the prototype's faint and muted colours, so that the
     builder neither redesigns the colours nor disables the rule.
111. As the repository owner, I want a gate test that pins the check to
     fail on violations and allows exactly that one exception, so that
     the check cannot be loosened silently.

**Story check**

112. As the repository owner, I want **Verify** to fail when a
     **Primitive**, **Component** or **Feature component** has no stories
     file beside it, naming each one, so that no component ships without
     its **Stories**.
113. As the developer, I want new, uncommitted components checked too, so
     that the check fails before the first commit, not after the push.

**Coverage on changed lines**

114. As the repository owner, I want the unit tests and the **Story tests**
     to write coverage reports, so that the lines they run are known.
115. As the repository owner, I want **Verify** to fail when less than the
     **Coverage threshold** of the coverable **Changed lines** is run by
     any test, naming the uncovered lines by file, so that new code comes
     with tests.
116. As the repository owner, I want the threshold in a file in `quality/`
     that the gate fails closed on, so that a missing or broken threshold
     never passes.
117. As the developer, I want only **Shipping code** counted, so that tests,
     stories and `test-support/` do not inflate or dilute the number.
118. As the developer, I want **Mutation testing** to run without coverage,
     so that its sandbox stays as fast as before.

**Storybook MCP and the reviewer**

119. As an agent, I want the running Storybook to serve the **Storybook
     MCP**, so that I can list components and **Stories** and read their
     documentation and a11y results.
120. As the human, I want the reviewer agent to get the `storybook` MCP
     tools and be told to start Storybook and check changed **Stories**
     and their a11y results when a diff touches them, so that reviews see
     the components, not only their code.

**Gates and supply chain**

121. As the repository owner, I want **Verify** to run `format:check`,
     `lint`, `typecheck`, `lint:deps`, `check:stories`, `test`,
     `test:stories`, `check:coverage` and then the seven gates that follow
     `test` today, pinned by the gate wiring test, so that the order cannot
     drift.
122. As the repository owner, I want every new dependency at an exact
     version, the newest release at least 14 days old, and the Vitest
     companions at the installed Vitest's version, so that the install
     follows the supply-chain rules.
123. As the repository owner, I want `OFL-1.1` added to the **License
     allowlist** in the ticket that adds the fonts, and any other new
     licence to stop the builder, so that no licence slips in.
124. As the developer, I want README's Getting started to say that
     `npm ci` also installs Chromium for the **Story tests**, so that a
     new clone knows what it downloads.

## Implementation Decisions

The design log's Design table names where each module lives; this section
names modules and their interfaces.

**Domain member** (Q16–Q18)

- `@dashcash/domain`: private, `"type": "module"`, version `0.0.0`,
  `exports` `"./*": "./src/*.ts"`, its own TypeScript project like the
  contract's, added to `npm run typecheck`. The desktop member depends on
  it. The domain imports nothing outside itself (existing **Layer rule**).
- `Cents = number & { readonly __brand: 'Cents' }`.
- `toCents(value: number): Cents`: returns the value for a safe integer
  (negative and zero included); throws a `RangeError` naming the value
  otherwise.
- `formatCents(cents: Cents, options?: { whole?: boolean; sign?: 'auto'
  | 'always' | 'none' }): string`: German grouping and decimals as
  `Intl.NumberFormat('de-DE')` gives them, two decimals or, with `whole`,
  none; U+00A0 then `€`; U+2212 before a negative amount unless `sign` is
  `none`; `+` before a positive amount when `sign` is `always`; no sign at
  zero; the sign from the cents, not from the rounded figure.
- No `null` input: Amount handles its own empty case (Q7).

**Theme, global style, fonts** (Q11–Q15)

- `theme`: one object typed as styled-components' `DefaultTheme`, which a
  declaration in `types/` derives from the object's type. Groups `color`,
  `font`, `fontSize`, `space`, `size`, `shadow`, `motion`, `zIndex`; keys
  and values per Q11 and Q12; `color-mix()` strings kept as the token
  sheet writes them. Every value a component's styles use comes from it.
- `GlobalStyle` (`createGlobalStyle`) in `styles/`: the element-level
  rules of Q13, nothing class-based.
- The fonts module in `styles/` imports Barlow 400, 500, 600 and Barlow
  Condensed 500, 600 from `@fontsource`; Storybook's preview imports it
  now, the App later.
- Card fill per SPEC's Card fill: cards and stat tiles on the surface with
  the soft card border; Modal and Snackbar on the raised fill; inputs and
  selects on the input ground.

**Primitives** (Q2, Q6–Q10)

Each in its own folder under `primitives/`, `<Name>.tsx` and
`<Name>.styles.ts`, exported through the one `primitives/` barrel; props
exactly SPEC §3 plus the additions below.

- Icon: `glyph: IconName`, `size = 16`; `IconName` is the 41 keys of the
  prototype's icon set; a fixed map from each name to its `lucide-react`
  component; `strokeWidth` 1.5, `aria-hidden`.
- Button: SPEC §3 plus `loading`, `loadingLabel`, `loaderVariant` (SPEC,
  Loaders); `aria-busy` and disabled while loading, at full strength,
  width kept.
- Amount: `cents: Cents | null` (`null` → "-"); `tone` is SPEC §3's seven
  plus `accent` (Q7); formats through `formatCents`.
- Tag: `TagTone` = SPEC §1's five plus `milestone`.
- Input, Select: SPEC §3 plus an optional `ariaLabel` (Q10); Select's
  `tone: 'default' | 'warning'`.
- Segmented, Swatch, Checkbox, Chip: SPEC §3. Chip is a toggle button
  with `aria-pressed`.
- Switch: SPEC §3 (`checked`, `onChange`, `label?`, `ariaLabel?`,
  `disabled?`), `role="switch"`; no knob transition (Q9).
- Meter: SPEC §3 plus an optional `ariaLabel`; `role="meter"` with its
  value; width transition 300 ms.
- Loader: SPEC, Loaders (`variant = 'draw'`, `size = 32`, `label?`,
  `delay = 300`, `dashesOnly?`, `color`), the four motions with their
  keyframes, the reduced-motion breathing, `role="status"`, in
  `primitives/` (Q6).

**Components** (Q2, Q7, Q10, Q42)

Each in its own folder under `components/`, exported through the one
`components/` barrel; props exactly SPEC §3 plus the additions below.

- Card: no `actions` slot (Q7).
- Modal: no `actions` prop; `role="dialog"`, `aria-modal`, labelled by its
  title; Esc on the window and a backdrop click call `onClose`; renders
  nothing while closed.
- FormField: ties its label to the control it wraps (Q10).
- PageHeader, StatTile, Stepper: SPEC §3. StatTile passes its `tone` to
  Amount.
- NavItem: SPEC §3 plus `compact`.
- Accordion, YearTable: SPEC §3; the payoff row uses the milestone row
  colour (Q7); both call `useRevealOnExpand` after opening.
- Logo: SPEC, Name and logo; the dash 3 end point and the stroke width by
  size are a pure function of the module.
- Sparkline: the mapping from `past` and `future` **Cents** to points of
  its box is a pure function of the module (Q19).
- Snackbar: SPEC §3 plus `loading` (an 18 px Loader replaces the icon).

**Hook** (Q42)

- `useRevealOnExpand(headRef, blockRef)` in `hooks/`, after `lib/reveal.js`:
  scrolls the nearest scroll container after the block opens. Its pure
  part, `computeRevealScroll`, takes the header's, the block's and the
  container's boxes and the 24 px margin and returns the scroll target or
  none; the hook jumps instead of smooth-scrolling under
  `prefers-reduced-motion`.

**Storybook** (Q20–Q22, Q24, Q26, Q29–Q30, Q36, A1, A5)

- `.storybook/main.ts`: framework `@storybook/react-vite`, stories from
  the renderer's `**/*.stories.tsx`, addons `@storybook/addon-vitest`,
  `@storybook/addon-a11y`, `@storybook/addon-mcp`; telemetry off.
- `.storybook/preview.tsx`: a decorator with the `ThemeProvider`,
  `GlobalStyle` and the fonts; the a11y parameters from a small module of
  their own in `.storybook/` (A5): `test: 'error'` and exactly one rule
  change, `color-contrast` with `reviewOnFail: true`.
- `vitest.storybook.config.ts`: the Storybook Vitest plugin pointed at
  `.storybook/`, browser mode with `@vitest/browser-playwright`, headless,
  one Chromium instance, coverage to `coverage/stories/`.
- Stories titled `<Layer>/<Name>`; the Tokens story `Tokens`. A Loader
  story sets `delay` 0 except the one that shows the delay.

| Script | Runs |
| --- | --- |
| `storybook` | `storybook dev --port 6006 --no-open` |
| `test:stories` | `vitest run --config vitest.storybook.config.ts` |
| `check:stories` | `node scripts/checkStories/checkStories.ts` |
| `check:coverage` | `node scripts/checkCoverage/checkCoverage.ts` |
| `verify` | Q35's order, chained with `&&` |
| `postinstall` | `install-electron && playwright install --only-shell chromium` |

**TypeScript and lint** (Q27–Q28, A1)

- `tsconfig.web.json`: `"jsx": "react-jsx"`, and `.storybook/preview.tsx`
  plus the a11y parameters module (A1).
- The root project: `.storybook/main.ts` beside the root configs, which
  already include `vitest.storybook.config.ts` (A1).
- `eslint.config.js`: `eslint-plugin-react-hooks` and
  `eslint-plugin-storybook`, each with its recommended config.

**Story check** (Q31, A4)

- `findMissingStories(paths: readonly string[]): Violation[]`: for every
  path `<Layer>/<Name>/<Name>.tsx` with a PascalCase `<Name>` directly
  under `primitives/`, `components/` or `features/<feature>/` of the
  renderer, one violation when `<Name>.stories.tsx` is not in the list
  (line in A4).
- The entry reads the tracked and the untracked, not ignored paths
  (a shared `runGit` reader) and reports through `runGate`.

**Coverage on changed lines** (Q32–Q34, A2, A3, A4)

- `@vitest/coverage-v8` in both Vitest configs, always on, LCOV, reports
  in `coverage/unit/` and `coverage/stories/`, over **Shipping code** in
  `apps/`, `packages/`, `scripts/` and `gates/` (no tests, stories,
  `test-support/`, `e2e/` or declaration files). `vitest.stryker.config.ts`
  turns coverage off.
- `quality/coverage-threshold.json`: `{ "changedLines": 80 }` (A2).
- Pure core: `findChangedLines(diff)` parses a zero-context unified diff
  into added line numbers per file; `readLcov(text)` gives the coverable
  lines and their hits per file; `findCoverageViolations(changed,
  reports, threshold)` returns the violations of A3 and A4.
- The entry finds the merge base with `origin/main`, the diff from it to
  the working tree and the untracked, not ignored files, filters them to
  measured files, reads both reports and the threshold, and reports
  through `runGate`; every input it cannot read fails closed (A3).

**Gate tests** (Q29, Q35, A5)

- Gate wiring: **Verify** runs its fifteen gates in Q35's order; the
  scripts of the table above; `postinstall` exactly its new value.
- The a11y setting, the story-test config, the coverage settings: A5.

**Reviewer** (Q37)

- Built by the human, as a ticket of its own: `.claude/agents/reviewer.md`
  gains the `storybook` MCP tools; the issue-loop's and pr-review's review
  prompts tell the reviewer to start `npm run storybook` in the background
  when the diff touches a story or a component and to check the changed
  **Stories** and their a11y results. No `.mcp.json` is committed (Q36).

**Dependencies** (Q20, Q39)

- Desktop member, dev dependencies: `react`, `react-dom`,
  `styled-components`, `lucide-react`, `@fontsource/barlow`,
  `@fontsource/barlow-condensed`, `@types/react`, `@types/react-dom`,
  `@dashcash/domain`.
- Root, dev dependencies: `storybook`, `@storybook/react-vite`,
  `@storybook/addon-vitest`, `@storybook/addon-a11y`,
  `@storybook/addon-mcp`, `@vitest/browser-playwright`,
  `@vitest/coverage-v8`, `eslint-plugin-react-hooks`,
  `eslint-plugin-storybook`.
- Exact versions, each the newest release at least 14 days old on the day
  of the ticket; the Vitest companions at the installed Vitest's version.

**Gate files the tickets name**

`package.json`, `package-lock.json`, `tsconfig.json`,
`apps/desktop/tsconfig.web.json`, the domain member's `tsconfig.json`,
`eslint.config.js`, `vitest.config.ts`, `vitest.stryker.config.ts`,
`vitest.storybook.config.ts`, `quality/license-allowlist.json`,
`quality/coverage-threshold.json`, `quality/audit-exceptions.json` if an
install brings an **Advisory**, and the tests under `gates/`. The reviewer
ticket names `.claude/`. So `/feature-pipeline` pauses after planning for
the human's `go`.

**Ticket order** (design log, Implementation Plan)

1. One primitive as a **Story test**: React, styled-components, the
   **Theme**, `GlobalStyle`, the fonts, Storybook, the story-test config,
   Chromium in `postinstall`, `test:stories` in **Verify**, the lint
   rules, `OFL-1.1`; the Icon with its **Stories**.
2. The **Accessibility check** and its gate test.
3. The **Story check**.
4. **Changed-lines coverage**.
5. Money: the domain member, `Cents`, `toCents`, `formatCents`, and
   Amount.
6. The other primitives (Loader first, then Button), in as many tickets as
   the plan needs.
7. The components, Accordion and YearTable with `useRevealOnExpand`, and
   the Tokens story.
8. The **Storybook MCP** and the README.
9. The reviewer's tools (built by the human).

## Testing Decisions

- A good test drives a module through its public interface and asserts
  what the user or caller sees: the string a formatter returns, the
  violations a gate core returns, the exit code and lines of a gate entry,
  the settings a config holds, what a **Story** renders and how it reacts
  to a click or a key. It never asserts on internals, class names or
  styles it could read from the source.
- Domain (Vitest, measured by **Mutation testing**, which must stay at or
  above the **Break threshold** of 83):
  - `toCents`: safe integers in, including 0, negatives and the safe
    limits; fractions, `NaN`, infinities and unsafe integers throw a
    `RangeError`.
  - `formatCents`: a table per rule of Q18: grouping and two decimals,
    `whole` rounding, U+00A0 before `€`, U+2212 for negatives, `always`
    and `none`, zero without sign, the sign of −40 cents whole.
- Gate code (Vitest, measured by **Mutation testing**):
  - `findMissingStories`: a component with and without its stories file
    in each of the three places; lower-case folders, nested folders,
    layouts and pages, a name that does not match its folder, and
    non-component files are not components.
  - The diff parser, the LCOV reader and `findCoverageViolations`: added,
    changed and deleted lines; untracked files; a hit in one report only;
    lines no report lists; the threshold exactly met, just missed and
    above; each fail-closed case of A3.
  - Both entries: exit codes and lines in a temporary sample repository,
    as the other entry suites do.
  - The gate tests of A5 and the gate wiring.
- Renderer pure functions (Vitest in Node, `npm test`, Q25): the
  Sparkline's point mapping, the Logo's stroke width and dash end point,
  `computeRevealScroll` (fits, runs past the bottom, longer than the
  area, clicked row near the top, collapse).
- **Stories** (Storybook, `npm run test:stories`): every **Primitive** and
  **Component** with one **Story** per state of Q24, each a **Story test**
  with the **Accessibility check**; **Play functions** for every
  interaction: Button click, disabled click, loading; Input typing; Select
  change; Segmented, Checkbox, Switch and Chip toggles and their disabled
  forms; Modal Esc, backdrop and inside click; PageHeader back; NavItem
  click; Stepper done step and future step; Accordion and YearTable
  toggles with `onToggle`; Snackbar actions and close; the Loader's delay.
  No fake bridge is needed: no component calls IPC.
- No **End-to-end test**: there is no **User flow** (Q4).
- Deterministic: no component reads a date, fonts come from
  `node_modules`, telemetry is off, story data is fixed and invented, and
  a timer story waits for its result (Q41).
- The issue-loop's agents write both the code and its tests, through the
  RED and GREEN steps (`CLAUDE.md`, Tests).
- Prior art: the gate entries' suites with `scripts/test-support/` sample
  repositories; `runGit`'s readers; the gate tests that import a root
  config and check its settings (Playwright, Stryker, Renovate); the gate
  wiring test and `VERIFY_GATES`; the audit check's fail-closed reading of
  a `quality/` file.

## Out of Scope

- SnackbarHost, LoadingOverlay, the splash, Sidebar, AppShell,
  PageLayout, routing, the **CSP** change styled-components needs, and
  `overflow-anchor: none` on the main scroll area (07).
- StreakStrip and HeadroomMeter, which SPEC §1 puts in `features/saving/`
  (18).
- `PageId` and `AccountType` (07, 08); the `Cents` lint rule (08).
- Visual regression (21).
- The prototype tweaks (`headroomScenario`, `chartRange`, `demoSnackbar`,
  `cardFill`), and the logo and loader explorations beyond 7c and the
  Loader's four variants (Q3).
- A Card `actions` slot and a Modal `actions` prop (Q7).
- Switch's knob transition (Q9).
- A `.mcp.json` (Q36); the reviewer's DevTools MCP (07); changes to
  `CLAUDE.md`.
- **Mutation testing** of the renderer: its scope stays `packages/domain`,
  `scripts/` and `gates/`.

## Further Notes

- `npm ci` now downloads a Chromium headless shell beside Electron in
  every CI job, and **Verify** grows by a browser run and coverage. A
  Linux runner may lack a library headless Chromium needs; the first CI
  run shows it, and the fix is a CI step, never a skipped test.
- Contrast stays informative until the human decides the faint and muted
  colours (Q30); dropping `reviewOnFail` then is a gate-file change with
  its own ticket.
- The coverage gate reads the reports of the last runs, so a stale local
  report can mislead until the next `npm test` and `npm run
  test:stories`; **Verify** always runs them first.
- `.storybook/` is not on `CLAUDE.md`'s "Ask first" list; the gate tests
  pin what matters in it. Adding it is the human's call.
- 07 adds the **CSP** source styled-components needs when React first
  renders in the window; this supersedes 04's note that "05" would do it
  (Q38).
- The Storybook releases of 2026-11-13 are younger than 14 days on the
  day of planning; the builder takes the newest release that is old
  enough.
- Q35 says "the eight gates as today" after the new ones; **Verify** has
  seven gates after `test` today (`check:commits` to `check:quarantine`),
  so it runs fifteen in all.
