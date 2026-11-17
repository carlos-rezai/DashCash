import type { Theme } from '../../tokens/tokens.ts';

// styled-components' DefaultTheme is the Theme's own type, group by group, so
// a style that reads a key the Theme lacks fails the typecheck.
declare module 'styled-components' {
  export interface DefaultTheme {
    color: Theme['color'];
    font: Theme['font'];
    fontSize: Theme['fontSize'];
    space: Theme['space'];
    size: Theme['size'];
    shadow: Theme['shadow'];
    motion: Theme['motion'];
    zIndex: Theme['zIndex'];
  }
}
