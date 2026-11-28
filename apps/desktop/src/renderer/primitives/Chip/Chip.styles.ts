import { styled } from 'styled-components';

export type ChipSwatchShape = 'square' | 'circle' | 'line';

// Chip.dc.html: a toggle button, on the accent tint with ink while pressed,
// clear and muted at rest; the accent tint answers the pointer unless the chip
// is disabled.
export const Frame = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.chipGap};
  box-sizing: border-box;
  height: ${({ theme }) => theme.size.chipHeight};
  padding: 0 ${({ theme }) => theme.space.chipPadding};
  font-family: ${({ theme }) => theme.font.body};
  font-size: ${({ theme }) => theme.fontSize.sm};
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
  color: ${({ $active, theme }) =>
    $active ? theme.color.text : theme.color.textMuted};
  background: ${({ $active, theme }) =>
    $active ? theme.color.accent[100] : 'transparent'};
  border: ${({ theme }) => theme.size.hairline} solid
    ${({ $active, theme }) =>
      $active ? theme.color.accent[400] : theme.color.divider};
  border-radius: ${({ theme }) => theme.size.radius};

  &:hover:enabled {
    background: ${({ theme }) => theme.color.accent[100]};
  }

  &:disabled {
    opacity: ${({ theme }) => theme.color.opacity.disabled};
  }
`;

type MarkProps = { $color: string; $shape: ChipSwatchShape; $filled: boolean };

// The swatch: outlined in its colour, filled while the chip is pressed.
export const Mark = styled.span<MarkProps>`
  box-sizing: border-box;
  flex: none;
  width: ${({ theme }) => theme.size.chipSwatch};
  height: ${({ $shape, theme }) =>
    $shape === 'line' ? theme.size.chipSwatchLine : theme.size.chipSwatch};
  background: ${({ $color, $filled }) => ($filled ? $color : 'transparent')};
  border: ${({ theme }) => theme.size.hairline} solid ${({ $color }) => $color};
  border-radius: ${({ $shape, theme }) =>
    $shape === 'circle' ? '50%' : theme.size.radius};
`;

// The meta value, muted, with tabular figures.
export const Meta = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
  font-variant-numeric: tabular-nums;
`;
