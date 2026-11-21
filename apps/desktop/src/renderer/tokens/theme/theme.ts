// The Theme: every Token a style may use, in the dark values of
// docs/design/prototype/tokens/dashcash-dark.css over Industry's styles.css.
// Keys follow SPEC section 2's bracketed names, else the CSS variable's name
// in camelCase without its --color- or --sb- prefix. A phase adds the Tokens
// its pieces use; none is invented here.
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
    // The neutral ramp, inverted the same way.
    neutral: {
      300: '#3f5063',
      400: '#5b6a7a',
      600: '#9aa5b0',
      900: '#eef2f6',
    },
    // styles.css: ::selection, the accent at 30 %
    selection: 'color-mix(in srgb, #749dc4 30%, transparent)',
    // --sb-text-muted
    textMuted: 'color-mix(in srgb, #e9f1fa 62%, transparent)',
    // --sb-text-faint
    textFaint: 'color-mix(in srgb, #e9f1fa 60%, transparent)',
    // --color-surface: the fill of a Card and a StatTile (--sb-card-bg)
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
  },
  // SPEC section 2's type scale: sm 13, md 14, lg 22, xl 34
  fontSize: {
    sm: '13px',
    md: '14px',
    lg: '22px',
    xl: '34px',
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
  },
  space: {
    // SPEC section 2: --space-2, -3, -4 and -6 (0.85x density), the Card's
    // paddings sm, md and lg, the gaps inside a Card and a StatTile
    space2: '6.8px',
    space3: '10.2px',
    space4: '13.6px',
    space6: '20.4px',
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
  },
  size: {
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
  },
  shadow: {
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
  },
  zIndex: {
    // Modal.dc.html: the backdrop above the page
    modal: 50,
  },
};

export type Theme = typeof theme;
