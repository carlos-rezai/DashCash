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
      500: '#749dc4',
      600: '#94bce3',
      700: '#b5d9fd',
    },
    // The neutral ramp, inverted the same way.
    neutral: {
      300: '#3f5063',
    },
    // styles.css: ::selection, the accent at 30 %
    selection: 'color-mix(in srgb, #749dc4 30%, transparent)',
    // --sb-text-muted
    textMuted: 'color-mix(in srgb, #e9f1fa 62%, transparent)',
    // --sb-positive
    positive: '#7cc59a',
    // --sb-negative, raised from #e8877b to pass contrast (design log D1)
    negative: '#ed8c80',
    // --sb-warning
    warning: '#e0b469',
    // --sb-danger, raised from #e8877b to pass contrast (design log D1)
    danger: '#ed8c80',
    // --color-divider
    divider: 'color-mix(in srgb, #e9f1fa 16%, transparent)',
    // styles.css, .btn-secondary:hover and :active: the text colour at 7 and 14 %
    secondaryHover: 'color-mix(in srgb, #e9f1fa 7%, transparent)',
    secondaryPressed: 'color-mix(in srgb, #e9f1fa 14%, transparent)',
    // styles.css, .btn-ghost:hover and :active: the accent at 10 and 18 %
    ghostHover: 'color-mix(in srgb, #749dc4 10%, transparent)',
    ghostPressed: 'color-mix(in srgb, #749dc4 18%, transparent)',
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
  },
  // SPEC section 2's type scale: sm 13, md 14, lg 22, xl 34
  fontSize: {
    sm: '13px',
    md: '14px',
    lg: '22px',
    xl: '34px',
    // Loader.dc.html: the label beside a Loader of 48 px or more
    loaderLabelLarge: '15px',
  },
  space: {
    // Loader.dc.html: the gap between a Loader and its label, below 48 px
    // and from 48 px up
    loaderGap: '8px',
    loaderGapLarge: '14px',
    // Button.dc.html: the side padding of a labelled Button, md and sm
    buttonPaddingMd: '14px',
    buttonPaddingSm: '10px',
    // Control sizing: the gap between a Button's icon and its label
    buttonGap: '6px',
  },
  // SPEC, Control sizing: the two Control heights
  controlHeight: {
    md: '36px',
    sm: '28px',
  },
  // styles.css: .btn:disabled
  opacity: {
    disabled: 0.45,
  },
  size: {
    // styles.css: :focus-visible { outline: 2px solid ...; outline-offset: 2px }
    focusRingWidth: '2px',
    focusRingOffset: '2px',
    // dashcash-dark.css: ::-webkit-scrollbar 10px, its thumb border 3px
    scrollbar: '10px',
    scrollbarThumbBorder: '3px',
  },
  shadow: {},
  // SPEC, Loaders: one loop is 1,6 s, the fade-in 200 ms (Loader.dc.html),
  // the breathing under reduced motion 2,4 s
  motion: {
    loaderLoop: '1.6s',
    loaderFadeIn: '200ms',
    loaderBreathe: '2.4s',
  },
  zIndex: {},
};

export type Theme = typeof theme;
