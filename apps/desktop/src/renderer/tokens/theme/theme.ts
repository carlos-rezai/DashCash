// The Theme: every Token a style may use, in the dark values of
// docs/design/prototype/tokens/dashcash-dark.css over Industry's styles.css.
// Keys follow SPEC section 2's bracketed names, else the CSS variable's name
// in camelCase without its --color- or --sb- prefix. A phase adds the Tokens
// its pieces use; none is invented here.
export const theme = {
  color: {},
  font: {},
  fontSize: {},
  space: {},
  size: {},
  shadow: {},
  motion: {},
  zIndex: {},
};

export type Theme = typeof theme;
