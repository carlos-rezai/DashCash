import { styled } from 'styled-components';

export type LogoTheme = 'dark' | 'light';

// Logo.dc.html: the mark and the wordmark in a row, the wordmark in the ink
// colour of the theme, a gap after the mark.
export const Frame = styled.span<{ $theme: LogoTheme; $gap: number }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $gap }) => String($gap)}px;
  color: ${({ theme, $theme }) =>
    $theme === 'light' ? theme.color.logoInkLight : theme.color.text};
`;

// The mark: one colour, no fill, butt caps and miter joins as drawn, and it
// keeps its size when the frame is narrower than the logo.
export const Mark = styled.svg<{ $theme: LogoTheme }>`
  flex: none;
  fill: none;
  stroke: ${({ theme, $theme }) =>
    $theme === 'light' ? theme.color.logoMarkLight : theme.color.accent[600]};
`;

export const Wordmark = styled.span<{ $fontSize: number }>`
  font-family: ${({ theme }) => theme.font.heading};
  font-weight: ${({ theme }) => theme.font.headingWeight};
  font-size: ${({ $fontSize }) => String($fontSize)}px;
  letter-spacing: ${({ theme }) => theme.font.logoLetterSpacing};
  line-height: 1;
`;
