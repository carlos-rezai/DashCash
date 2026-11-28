import { styled, type DefaultTheme } from 'styled-components';

export type TagTone =
  'accent' | 'neutral' | 'outline' | 'warning' | 'danger' | 'milestone';

type Look = { fill: string; text: string; border: string };

// SPEC section 3, Tag fills.
function look(tone: TagTone, theme: DefaultTheme): Look {
  const { color } = theme;
  const none = 'transparent';
  switch (tone) {
    case 'accent':
      return { fill: color.accent[300], text: color.accent[900], border: none };
    case 'outline':
      return {
        fill: none,
        text: color.accent[600],
        border: color.accent[400],
      };
    case 'warning':
      return { fill: color.warningTint, text: color.warning, border: none };
    case 'danger':
      return { fill: color.dangerTint, text: color.danger, border: none };
    case 'milestone':
      return {
        fill: color.milestoneTint,
        text: color.milestone,
        border: none,
      };
    default:
      return {
        fill: color.neutral[300],
        text: color.neutral[900],
        border: none,
      };
  }
}

export const Frame = styled.span<{ $tone: TagTone }>`
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.tagGap};
  height: ${({ theme }) => theme.size.tagHeight};
  padding: 0 ${({ theme }) => theme.space.tagPadding};
  font-size: ${({ theme }) => theme.fontSize.tag};
  letter-spacing: ${({ theme }) => theme.font.tagLetterSpacing};
  line-height: 1;
  white-space: nowrap;
  background: ${({ $tone, theme }) => look($tone, theme).fill};
  color: ${({ $tone, theme }) => look($tone, theme).text};
  border: ${({ theme }) => theme.size.hairline} solid
    ${({ $tone, theme }) => look($tone, theme).border};
  border-radius: ${({ theme }) => theme.size.radius};
`;
