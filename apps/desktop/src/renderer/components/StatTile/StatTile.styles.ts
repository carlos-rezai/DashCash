import { styled, type DefaultTheme } from 'styled-components';

export type StatTileTone = 'default' | 'accent' | 'warning' | 'danger';

function textColour(theme: DefaultTheme, tone: StatTileTone): string {
  switch (tone) {
    case 'accent':
      return theme.color.accent[600];
    case 'warning':
      return theme.color.warning;
    case 'danger':
      return theme.color.danger;
    default:
      return theme.color.text;
  }
}

// The tile: the card's fill and soft outline, shrinking in a flex row.
export const Frame = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.statTileGap};
  min-width: 0;
  padding: ${({ theme }) => theme.space.space4};
  background: ${({ theme }) => theme.color.cardBg};
  border: ${({ theme }) => theme.size.hairline} solid
    ${({ theme }) => theme.color.cardBorder};
`;

export const Label = styled.span`
  font-size: ${({ theme }) => theme.fontSize.tag};
  letter-spacing: ${({ theme }) => theme.font.kickerLetterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textMuted};
`;

// A text value, in the look of an Amount lg.
export const Value = styled.span<{ $tone: StatTileTone }>`
  font-family: ${({ theme }) => theme.font.heading};
  font-weight: ${({ theme }) => theme.font.headingWeight};
  font-size: ${({ theme }) => theme.fontSize.lg};
  line-height: ${({ theme }) => theme.font.amountLineHeight};
  color: ${({ theme, $tone }) => textColour(theme, $tone)};
  font-variant-numeric: tabular-nums;
`;

export const Hint = styled.span`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.color.textMuted};
  text-wrap: pretty;
`;
