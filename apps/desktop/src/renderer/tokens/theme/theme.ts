// The Theme: every Token a style may use, in the dark values of
// docs/design/prototype/tokens/dashcash-dark.css over Industry's styles.css.
// Keys follow SPEC section 2's bracketed names, else the CSS variable's name
// in camelCase without its --color- or --sb- prefix. The sheet is complete:
// every variable DashCash uses is a Token here. Industry's radius variables
// are left out (design log D13).
export const theme = {
  color: {
    // --color-bg
    bg: '#1b2a39',
    // --color-text
    text: '#e9f1fa',
    // The accent ramp, inverted for the dark ground; 500 is --color-accent.
    accent: {
      100: '#22384d',
      200: '#2c455d',
      300: '#416180',
      400: '#597ea3',
      500: '#749dc4',
      600: '#94bce3',
      700: '#b5d9fd',
      800: '#d6ebff',
      900: '#eef6ff',
    },
    // The second accent: --color-accent-2 is the base, the ramp keeps its
    // steps 100 and 800 from dashcash-dark.css, the others from Industry's
    accent2: {
      base: '#749dc4',
      100: '#22384d',
      200: '#d6ebff',
      300: '#bdd8f2',
      400: '#9ebbd8',
      500: '#7e9cb8',
      600: '#627d98',
      700: '#486077',
      800: '#d6ebff',
      900: '#1f2d3a',
    },
    // The neutral ramp, inverted the same way.
    neutral: {
      100: '#243445',
      200: '#2d3e50',
      300: '#3f5063',
      400: '#5b6a7a',
      500: '#7a8794',
      600: '#9aa5b0',
      700: '#b9c1c9',
      800: '#d6dce2',
      900: '#eef2f6',
    },
    // --sb-input-bg: the ground of an Input and a Select, the page ground
    inputBg: '#1b2a39',
    // --sb-raised-bg: the fill of a Modal and a Snackbar, the surface
    raisedBg: '#213345',
    // --sb-card-bg: the fill of a Card and a StatTile
    cardBg: '#213345',
    // --sb-negative-tint, 14 %; the base stays #e8877b (design log D1)
    negativeTint: 'color-mix(in srgb, #e8877b 14%, transparent)',
    // The data palette, accounts: --sb-acc-income ... --sb-acc-mortgage
    account: {
      income: '#cdbb8b',
      spending: '#d69c8e',
      savings: '#94bce3',
      card: '#b3a3d1',
      mortgage: '#e9f1fa',
    },
    // The data palette, categories: --sb-cat-1 ... --sb-cat-40, 40 hues at one
    // lightness in golden-angle order
    category: {
      1: '#f08f87',
      2: '#5cc697',
      3: '#ba9cef',
      4: '#d8a44e',
      5: '#36c1dd',
      6: '#e88db5',
      7: '#95bd6a',
      8: '#8dabfa',
      9: '#ed946c',
      10: '#39c6b4',
      11: '#d094dd',
      12: '#c3ae4c',
      13: '#57baef',
      14: '#ef8d99',
      15: '#72c385',
      16: '#aaa1f6',
      17: '#e29d56',
      18: '#2bc4cf',
      19: '#e18fc6',
      20: '#a8b85b',
      21: '#79b1f9',
      22: '#f0907c',
      23: '#4ec6a3',
      24: '#c399e9',
      25: '#d1a84b',
      26: '#42bee5',
      27: '#ec8daa',
      28: '#88c074',
      29: '#98a7fa',
      30: '#e99863',
      31: '#2fc6bf',
      32: '#d792d5',
      33: '#b9b250',
      34: '#64b6f4',
      35: '#f08e8e',
      36: '#65c590',
      37: '#b49ef2',
      38: '#dca150',
      39: '#30c2d8',
      40: '#e68ebc',
    },
    // styles.css: ::selection, the accent at 30 %
    selection: 'color-mix(in srgb, #749dc4 30%, transparent)',
    // --sb-text-muted
    textMuted: 'color-mix(in srgb, #e9f1fa 62%, transparent)',
    // --sb-text-faint
    textFaint: 'color-mix(in srgb, #e9f1fa 60%, transparent)',
    // --color-surface
    surface: '#213345',
    // --sb-card-border: the text colour at 8 %
    cardBorder: 'color-mix(in srgb, #e9f1fa 8%, transparent)',
    // --sb-positive
    positive: '#7cc59a',
    // --sb-negative, raised from #e8877b to pass contrast (design log D1)
    negative: '#ed8c80',
    // --sb-warning
    warning: '#e0b469',
    // --sb-danger, raised from #e8877b to pass contrast (design log D1)
    danger: '#ed8c80',
    // --sb-milestone (the positive green, SPEC section 2) and its 16 % tint
    milestone: '#7cc59a',
    milestoneTint: 'color-mix(in srgb, #7cc59a 16%, transparent)',
    // --sb-milestone-row: the payoff month's row of a YearTable, the milestone
    // green at 12 % over the sunken ground (design log Q7)
    milestoneRow: 'color-mix(in srgb, #7cc59a 12%, #16222f)',
    // --sb-warning-tint and --sb-danger-tint, 14 %; the danger tint keeps the
    // base #e8877b (design log D1)
    warningTint: 'color-mix(in srgb, #e0b469 14%, transparent)',
    dangerTint: 'color-mix(in srgb, #e8877b 14%, transparent)',
    // --sb-positive-tint, 14 %
    positiveTint: 'color-mix(in srgb, #7cc59a 14%, transparent)',
    // Snackbar.dc.html: the share of the tone's colour in its hairline
    snackbarHairline: '55%',
    // --sb-backdrop: the dark backdrop behind a Modal
    backdrop: 'rgba(9, 15, 22, 0.66)',
    // --sb-ground-sunken: the ground of a Meter
    sunken: '#16222f',
    // --color-divider
    divider: 'color-mix(in srgb, #e9f1fa 16%, transparent)',
    // styles.css, .btn-secondary:hover and :active: the text colour at 7 and 14 %
    secondaryHover: 'color-mix(in srgb, #e9f1fa 7%, transparent)',
    secondaryPressed: 'color-mix(in srgb, #e9f1fa 14%, transparent)',
    // styles.css, .btn-ghost:hover and :active: the accent at 10 and 18 %
    ghostHover: 'color-mix(in srgb, #749dc4 10%, transparent)',
    ghostPressed: 'color-mix(in srgb, #749dc4 18%, transparent)',
    // styles.css, .input:hover: the text colour at 45 %
    inputHover: 'color-mix(in srgb, #e9f1fa 45%, transparent)',
    // --sb-hover: the fill of a Segmented option under the pointer
    hover: 'color-mix(in srgb, #e9f1fa 6%, transparent)',
    // Logo.dc.html: the mark and the wordmark of the light logo, drawn for a
    // light ground
    logoMarkLight: '#416180',
    logoInkLight: '#1d1f20',
    opacity: {
      // styles.css: .btn:disabled
      disabled: 0.45,
      // Meter.dc.html: the projection's dashed outline
      projection: 0.8,
      // Sparkline.dc.html: the dashed future line
      future: 0.85,
      // loader-keyframes.css: a marching dash between its pulses
      loaderMarch: 0.2,
      // loader-keyframes.css: a growing dash before it lights up
      loaderGrow: 0.18,
      // loader-keyframes.css: the low point of the reduced-motion breathing
      loaderBreathe: 0.45,
    },
  },
  font: {
    // --font-heading, --font-heading-weight, --font-body
    heading: '"Barlow Condensed", system-ui, sans-serif',
    headingWeight: 600,
    body: '"Barlow", system-ui, sans-serif',
    // SPEC section 2: Barlow 400 and 500
    bodyWeight: 400,
    bodyWeightStrong: 500,
    // Amount.dc.html: letter-spacing of its heading sizes, and its line-height
    headingLetterSpacing: '-0.01em',
    amountLineHeight: 1.15,
    // Button.dc.html: letter-spacing of the label
    buttonLetterSpacing: '0.01em',
    // Card.dc.html: the title's line-height; StatTile.dc.html and styles.css
    // (.card-kicker): the letter-spacing of a kicker
    cardTitleLineHeight: 1.2,
    kickerLetterSpacing: '0.1em',
    // FormField.dc.html: letter-spacing of the label
    labelLetterSpacing: '0.04em',
    // styles.css: .tag
    tagLetterSpacing: '0.02em',
    // Logo.dc.html: letter-spacing of the wordmark
    logoLetterSpacing: '0.02em',
    // styles.css: .table th
    tableHeadLetterSpacing: '0.08em',
    // styles.css: body { line-height: 1.55 }
    bodyLineHeight: 1.55,
    // styles.css: h1 to h6 { line-height: 1.12; letter-spacing: -0.015em },
    // h6 { letter-spacing: 0.08em }
    headingLineHeight: 1.12,
    headingElementLetterSpacing: '-0.015em',
    headingSmallLetterSpacing: '0.08em',
  },
  // SPEC section 2's type scale: display 42, xl 34, lg 22, card title 19,
  // body 15, md 14, sm 13, caption 12, kicker 11
  fontSize: {
    display: '42px',
    xl: '34px',
    lg: '22px',
    body: '15px',
    md: '14px',
    sm: '13px',
    kicker: '11px',
    // styles.css: h1 to h6, their own sizes, apart from the scale
    heading1: '42px',
    heading2: '32px',
    heading3: '25px',
    heading4: '20px',
    heading5: '16px',
    heading6: '13px',
    // Loader.dc.html: the label beside a Loader of 48 px or more
    loaderLabelLarge: '15px',
    // styles.css: .tag; StatTile.dc.html: its label
    tag: '11px',
    // FormField.dc.html: the label, the hint and the error
    caption: '12px',
    // styles.css: .card-kicker
    cardKicker: '10px',
    // SPEC section 2: the card title, 19
    cardTitle: '19px',
    // NavItem.dc.html: the text of a compact item's corner chip
    navChip: '10px',
    // Accordion.dc.html: the title
    accordionTitle: '20px',
    // styles.css, .table th and dashcash-dark.css: a column header
    tableHead: '11px',
    // YearTable.dc.html: the year of a year row
    yearTableYear: '19px',
  },
  space: {
    // SPEC section 2: --space-1, -2, -3, -4, -6 and -8 (0.85x density), the
    // Card's paddings sm, md and lg, the gaps inside a Card and a StatTile
    space1: '3.4px',
    space2: '6.8px',
    space3: '10.2px',
    space4: '13.6px',
    space6: '20.4px',
    space8: '27.2px',
    // --sb-page-pad
    pagePad: '24px',
    // Card.dc.html: the gap between a kicker and a title
    cardKickerGap: '2px',
    // StatTile.dc.html: the gap between its label, value and hint
    statTileGap: '6px',
    // FormField.dc.html: the gap between its label, control and hint
    fieldGap: '5px',
    // Loader.dc.html: the gap between a Loader and its label, below 48 px
    // and from 48 px up
    loaderGap: '8px',
    loaderGapLarge: '14px',
    // Button.dc.html: the side padding of a labelled Button, md and sm
    buttonPaddingMd: '14px',
    buttonPaddingSm: '10px',
    // Control sizing: the gap between a Button's icon and its label
    buttonGap: '6px',
    // Tag.dc.html: the side padding of a Tag and the gap between its parts
    tagPadding: '8px',
    tagGap: '5px',
    // Input.dc.html and Select.dc.html: the side padding of a field, and where
    // an adornment sits: the left icon, the suffix, the swatch and the
    // chevron are drawn inside it, so the text starts or ends past them
    inputPadding: '10px',
    inputPaddingIcon: '32px',
    inputPaddingSuffix: '28px',
    selectPaddingSwatch: '26px',
    selectPaddingChevron: '30px',
    inputAdornmentInset: '10px',
    selectChevronInset: '9px',
    // Segmented.dc.html: the side padding of an option
    segmentedPadding: '12px',
    // Chip.dc.html: the side padding of a Chip and the gap between its parts
    chipPadding: '10px',
    chipGap: '7px',
    // Checkbox.dc.html and Switch.dc.html: the gap between a toggle and its label
    checkboxGap: '8px',
    switchGap: '10px',
    // Switch.dc.html: the knob's distance from the track's top, and from its
    // left edge when off and when on
    switchKnobTop: '2px',
    switchKnobOff: '2px',
    switchKnobOn: '18px',
    // PageHeader.dc.html: the gap between the back link, the title row and the
    // subtitle, and between the back link's arrow and its label
    headerGap: '4px',
    // NavItem.dc.html: the side padding of an item, the gap between its icon,
    // label and badge, the side padding of its badge and of its corner chip,
    // and the chip's distance from the top right corner
    navItemPadding: '12px',
    navItemGap: '10px',
    navBadgePadding: '6px',
    navChipPadding: '3px',
    navChipInset: '3px',
    // Stepper.dc.html: the padding of a step, and the gap between its square
    // and its label
    stepperPaddingY: '10px',
    stepperPaddingX: '14px',
    stepperGap: '10px',
    // Snackbar.dc.html: the padding above, right and below, and on the left;
    // the gap between its icon, text and close button; the gap between its
    // title and message; the padding above its actions; the icon's drop; and
    // the close button's pull up and right out of the padding's corner
    snackbarPadding: '14px',
    snackbarPaddingLeft: '16px',
    snackbarGap: '12px',
    snackbarTextGap: '4px',
    snackbarActionsPadding: '6px',
    snackbarIconNudge: '1px',
    snackbarClosePull: '-6px',
    // Accordion.dc.html: the padding of its header above and below, and at the
    // sides; the gap between the header's parts; the content's inset from the
    // left
    accordionPaddingY: '12px',
    accordionPaddingX: '4px',
    accordionGap: '10px',
    accordionInset: '30px',
    // YearTable.dc.html: how far its scrolling wrapper reaches past the card
    // on either side (and is padded back); the gap between a year row's
    // chevron, year and tag; the gap between a month and its tag; a month
    // row's inset from the left; the gap between a column's colour dot and
    // its label
    yearTableBleed: '4px',
    yearTableYearGap: '10px',
    yearTableMonthGap: '8px',
    yearTableMonthInset: '40px',
    yearTableDotGap: '6px',
  },
  size: {
    // SPEC section 2, Shape: square corners, radius 0 on every framed element
    radius: '0',
    // SPEC section 2: the 1px hairlines of every frame and divider
    hairline: '1px',
    // styles.css: a { text-underline-offset: 3px }
    underlineOffset: '3px',
    // --sb-sidebar-width and --sb-sidebar-width-compact
    sidebarWidth: '208px',
    sidebarWidthCompact: '64px',
    // SPEC, Control sizing: the two Control heights
    controlHeight: {
      md: '36px',
      sm: '28px',
    },
    // SPEC, Control sizing: the Tag's fixed height
    tagHeight: '22px',
    // Swatch.dc.html: the height of a line
    swatchLine: '2px',
    // SPEC, Control sizing: the Chip's fixed height; Chip.dc.html: the width of
    // its swatch and the height of a line swatch
    chipHeight: '28px',
    chipSwatch: '10px',
    chipSwatchLine: '3px',
    // SPEC, Control sizing: the Checkbox's box; Switch.dc.html: the Switch's
    // track and its knob
    checkbox: '16px',
    switchWidth: '34px',
    switchHeight: '18px',
    switchKnob: '12px',
    // styles.css: :focus-visible { outline: 2px solid ...; outline-offset: 2px }
    focusRingWidth: '2px',
    focusRingOffset: '2px',
    // dashcash-dark.css: ::-webkit-scrollbar 10px, its thumb border 3px
    scrollbar: '10px',
    scrollbarThumbBorder: '3px',
    // Modal.dc.html: the width of a Modal unless told otherwise
    modalWidth: '460px',
    // SPEC, Control sizing: the NavItem's height; NavItem.dc.html: the width
    // and line of its badge and of its corner chip
    navItem: '38px',
    navBadgeMinWidth: '22px',
    navBadgeLine: '20px',
    navChipMinWidth: '16px',
    navChipLine: '15px',
    // SPEC, Control sizing: the Stepper's step; Stepper.dc.html: the square of
    // a step and the bar under the current one
    stepperStep: '44px',
    stepperSquare: '24px',
    stepperBar: '2px',
    // Sparkline.dc.html: the width of its two lines, of the tick at today, and
    // the dashes of the future line
    sparklineLine: '1.5px',
    sparklineTick: '1px',
    sparklineDash: '4px 3px',
    // SPEC, Auto-scroll on expand: the margin kept below an opened block
    revealMargin: '24px',
    // SPEC section 3, YearTable equalColumns: the first column, and the least
    // width of each data column
    yearTableFirstColumn: '230px',
    yearTableColumnMin: '130px',
  },
  shadow: {
    // --shadow-sm and --shadow-md (the graph tooltip)
    sm: '0 0 0 1px color-mix(in srgb, #e9f1fa 5%, transparent), 0 1px 2px rgba(5, 10, 16, 0.4)',
    md: '0 0 0 1px color-mix(in srgb, #e9f1fa 6%, transparent), 0 6px 18px rgba(5, 10, 16, 0.45)',
    // --shadow-lg: the Modal's panel
    lg: '0 0 0 1px color-mix(in srgb, #e9f1fa 8%, transparent), 0 18px 48px rgba(5, 10, 16, 0.55)',
  },
  // SPEC, Loaders: one loop is 1,6 s, the fade-in 200 ms (Loader.dc.html),
  // the breathing under reduced motion 2,4 s
  motion: {
    loaderLoop: '1.6s',
    loaderFadeIn: '200ms',
    loaderBreathe: '2.4s',
    // SPEC, Transitions and Meter.dc.html: the Meter's width, 300 ms
    meterWidth: '300ms',
    // SPEC, Transitions and Accordion.dc.html: the chevron's turn, 160 ms
    accordionTurn: '160ms',
    // SPEC section 5: the streak's fill, 400 ms
    streakFill: '400ms',
  },
  zIndex: {
    // AppShell.dc.html: the sidebar over the content
    sidebar: 20,
    // Modal.dc.html: the backdrop above the page
    modal: 50,
    // SnackbarHost.dc.html: the stack of snackbars
    snackbar: 60,
    // LoadingOverlay.dc.html: the overlay, and the splash above it
    loadingOverlay: 70,
    splash: 80,
  },
};

export type Theme = typeof theme;
