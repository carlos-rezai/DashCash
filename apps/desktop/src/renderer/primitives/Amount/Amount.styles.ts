import { css, styled, type DefaultTheme } from 'styled-components';

export type AmountSize = 'sm' | 'md' | 'lg' | 'xl';
export type AmountColour =
  'ink' | 'positive' | 'negative' | 'warning' | 'danger' | 'accent';

const COLOURS = {
  ink: (theme: DefaultTheme) => theme.color.text,
  positive: (theme: DefaultTheme) => theme.color.positive,
  negative: (theme: DefaultTheme) => theme.color.negative,
  warning: (theme: DefaultTheme) => theme.color.warning,
  danger: (theme: DefaultTheme) => theme.color.danger,
  accent: (theme: DefaultTheme) => theme.color.accent[600],
};

type StyledProps = {
  $size: AmountSize;
  $colour: AmountColour;
  $strong: boolean;
};

// The large two sizes are headings: Barlow Condensed, tightened.
const heading = css`
  font-family: ${({ theme }) => theme.font.heading};
  font-weight: ${({ theme }) => theme.font.headingWeight};
  letter-spacing: ${({ theme }) => theme.font.headingLetterSpacing};
`;

const body = css<{ $strong: boolean }>`
  font-family: ${({ theme }) => theme.font.body};
  font-weight: ${({ $strong, theme }) =>
    $strong ? theme.font.bodyWeightStrong : theme.font.bodyWeight};
`;

export const Figure = styled.span<StyledProps>`
  ${({ $size }) => ($size === 'lg' || $size === 'xl' ? heading : body)}
  font-size: ${({ $size, theme }) => theme.fontSize[$size]};
  color: ${({ $colour, theme }) => COLOURS[$colour](theme)};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  line-height: ${({ theme }) => theme.font.amountLineHeight};
`;
