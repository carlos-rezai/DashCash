import { styled } from 'styled-components';

// Sparkline.dc.html: stretched to the width it is given, its lines free to
// reach past the box.
export const Box = styled.svg`
  display: block;
  width: 100%;
  overflow: visible;
`;

// A line of the series: no fill, its width kept whatever the stretch.
export const Line = styled.path<{ $color: string; $future: boolean }>`
  fill: none;
  stroke: ${({ $color }) => $color};
  stroke-width: ${({ theme }) => theme.size.sparklineLine};
  vector-effect: non-scaling-stroke;
  ${({ theme, $future }) =>
    $future
      ? `
    stroke-dasharray: ${theme.size.sparklineDash};
    opacity: ${String(theme.color.opacity.future)};
  `
      : ''}
`;

// The hairline tick at today.
export const Tick = styled.line`
  stroke: ${({ theme }) => theme.color.divider};
  stroke-width: ${({ theme }) => theme.size.sparklineTick};
  vector-effect: non-scaling-stroke;
`;
