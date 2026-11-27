import { styled, type DefaultTheme } from 'styled-components';

export type MeterTone = 'neutral' | 'warning' | 'danger';

// Meter.dc.html: the neutral tone is the accent, the others the warning and
// the danger colour.
function fill(theme: DefaultTheme, tone: MeterTone): string {
  if (tone === 'warning') {
    return theme.color.warning;
  }
  return tone === 'danger' ? theme.color.danger : theme.color.accent[500];
}

// The meter: square, on the sunken ground inside a divider border.
export const Frame = styled.div<{ $height: number }>`
  box-sizing: border-box;
  position: relative;
  width: 100%;
  height: ${({ $height }) => String($height)}px;
  background: ${({ theme }) => theme.color.sunken};
  border: 1px solid ${({ theme }) => theme.color.divider};
`;

// The projection: a dashed outline, open on its left, under the bar.
export const Projection = styled.div<{ $tone: MeterTone; $share: number }>`
  box-sizing: border-box;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: ${({ $share }) => String($share * 100)}%;
  border: 1px dashed ${({ theme, $tone }) => fill(theme, $tone)};
  border-left: 0;
  opacity: ${({ theme }) => theme.color.opacity.projection};
`;

// The value: a solid bar whose width eases.
export const Bar = styled.div<{ $tone: MeterTone; $share: number }>`
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: ${({ $share }) => String($share * 100)}%;
  background: ${({ theme, $tone }) => fill(theme, $tone)};
  transition: width ${({ theme }) => theme.motion.meterWidth} ease;
`;
