import { styled } from 'styled-components';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

// The Theme's space for each padding but none.
const PADDING = {
  sm: 'space3',
  md: 'space4',
  lg: 'space6',
} as const;

// The card: the surface fill inside the soft card border, square, filling the
// height it is given and shrinking in a flex row.
export const Frame = styled.div<{ $padding: CardPadding }>`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.space3};
  height: 100%;
  min-width: 0;
  padding: ${({ theme, $padding }) =>
    $padding === 'none' ? '0' : theme.space[PADDING[$padding]]};
  background: ${({ theme }) => theme.color.cardBg};
  border: ${({ theme }) => theme.size.hairline} solid
    ${({ theme }) => theme.color.cardBorder};
`;

// The kicker and the title, one above the other.
export const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.cardKickerGap};
`;

export const Kicker = styled.span`
  font-size: ${({ theme }) => theme.fontSize.cardKicker};
  letter-spacing: ${({ theme }) => theme.font.kickerLetterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.accent[600]};
`;

export const Title = styled.span`
  font-family: ${({ theme }) => theme.font.heading};
  font-weight: ${({ theme }) => theme.font.headingWeight};
  font-size: ${({ theme }) => theme.fontSize.cardTitle};
  line-height: ${({ theme }) => theme.font.cardTitleLineHeight};
`;
