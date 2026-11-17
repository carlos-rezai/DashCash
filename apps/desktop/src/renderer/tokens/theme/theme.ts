// The Theme: every Token a style may use, in the dark values of
// docs/design/prototype/tokens/dashcash-dark.css over Industry's styles.css.
// Keys follow SPEC section 2's bracketed names, else the CSS variable's name
// in camelCase without its --color- or --sb- prefix. A phase adds the Tokens
// its pieces use; none is invented here.
export const theme = {
  color: {
    bg: '#1b2a39',
    text: '#e9f1fa',
    accent: {
      600: '#94bce3',
    },
  },
  font: {
    heading: '"Barlow Condensed", system-ui, sans-serif',
    body: '"Barlow", system-ui, sans-serif',
  },
  fontSize: {
    body: '15px',
  },
  space: {
    1: '3.4px',
    2: '6.8px',
  },
  size: {
    sidebarWidth: '208px',
  },
  shadow: {
    sm: '0 0 0 1px color-mix(in srgb, #e9f1fa 5%, transparent), 0 1px 2px rgba(5, 10, 16, 0.4)',
  },
  motion: {
    chevron: '160ms',
  },
  zIndex: {},
};

export type Theme = typeof theme;
