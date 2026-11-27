import { createGlobalStyle } from 'styled-components';

// The element-level rules of dashcash-dark.css over Industry's styles.css:
// the ground, the ink and the fonts, links, the focus ring, the selection,
// the scrollbars and the disabled cursor, the box model, the dark colour
// scheme, the body text, the headings, paragraphs, images and figures.
// Every value comes from the Theme.
export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  :root {
    color-scheme: dark;
  }

  html,
  body {
    margin: 0;
    height: 100%;
    background: ${({ theme }) => theme.color.bg};
    color: ${({ theme }) => theme.color.text};
  }

  body {
    font-family: ${({ theme }) => theme.font.body};
    font-size: ${({ theme }) => theme.fontSize.body};
    line-height: ${({ theme }) => theme.font.bodyLineHeight};
    font-weight: ${({ theme }) => theme.font.bodyWeight};
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
    line-height: ${({ theme }) => theme.font.headingLineHeight};
    letter-spacing: ${({ theme }) => theme.font.headingElementLetterSpacing};
    margin: 0 0 ${({ theme }) => theme.space.space2};
  }

  h1 {
    font-size: ${({ theme }) => theme.fontSize.heading1};
  }

  h2 {
    font-size: ${({ theme }) => theme.fontSize.heading2};
  }

  h3 {
    font-size: ${({ theme }) => theme.fontSize.heading3};
  }

  h4 {
    font-size: ${({ theme }) => theme.fontSize.heading4};
  }

  h5 {
    font-size: ${({ theme }) => theme.fontSize.heading5};
  }

  h6 {
    font-size: ${({ theme }) => theme.fontSize.heading6};
    letter-spacing: ${({ theme }) => theme.font.headingSmallLetterSpacing};
    text-transform: uppercase;
  }

  p {
    margin: 0 0 ${({ theme }) => theme.space.space3};
  }

  img {
    display: block;
    max-width: 100%;
  }

  figure {
    margin: 0;
  }

  a {
    color: ${({ theme }) => theme.color.accent[600]};
    text-underline-offset: ${({ theme }) => theme.size.underlineOffset};
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
