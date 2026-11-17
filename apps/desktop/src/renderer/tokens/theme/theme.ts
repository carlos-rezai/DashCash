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
  },
  font: {
    // --font-heading, --font-heading-weight, --font-body
    heading: '"Barlow Condensed", system-ui, sans-serif',
    headingWeight: 600,
    body: '"Barlow", system-ui, sans-serif',
  },
  fontSize: {},
  space: {},
  size: {
    // styles.css: :focus-visible { outline: 2px solid ...; outline-offset: 2px }
    focusRingWidth: '2px',
    focusRingOffset: '2px',
    // dashcash-dark.css: ::-webkit-scrollbar 10px, its thumb border 3px
    scrollbar: '10px',
    scrollbarThumbBorder: '3px',
  },
  shadow: {},
  motion: {},
  zIndex: {},
};

export type Theme = typeof theme;
