import { createGlobalStyle } from 'styled-components';

// The element-level rules of dashcash-dark.css over Industry's styles.css:
// the ground, the ink and the fonts, links, the focus ring, the selection,
// the scrollbars and the disabled cursor. Every value comes from the Theme.
export const GlobalStyle = createGlobalStyle`
  html,
  body {
    margin: 0;
    height: 100%;
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
  }

  body {
    font-family: ${({ theme }) => theme.font.body};
    -webkit-font-smoothing: antialiased;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: ${({ theme }) => theme.font.heading};
    font-weight: ${({ theme }) => theme.font.headingWeight};
  }

  a {
    color: ${({ theme }) => theme.color.accent[600]};
  }

  a:hover {
    color: ${({ theme }) => theme.color.accent[700]};
  }

  :focus-visible {
    outline: ${({ theme }) => theme.size.focusRingWidth} solid
      ${({ theme }) => theme.color.accent[500]};
    outline-offset: ${({ theme }) => theme.size.focusRingOffset};
  }

  ::selection {
    background: ${({ theme }) => theme.color.selection};
  }

  ::-webkit-scrollbar {
    width: ${({ theme }) => theme.size.scrollbar};
    height: ${({ theme }) => theme.size.scrollbar};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.neutral[300]};
    border: ${({ theme }) => theme.size.scrollbarThumbBorder} solid
      ${({ theme }) => theme.color.bg};
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  button:disabled {
    cursor: not-allowed;
  }
`;
