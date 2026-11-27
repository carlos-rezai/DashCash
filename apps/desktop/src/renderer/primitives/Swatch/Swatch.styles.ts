import { styled } from 'styled-components';

export type SwatchShape = 'square' | 'circle' | 'line';

type StyledProps = {
  $color: string;
  $size: number;
  $shape: SwatchShape;
};

// Swatch.dc.html: a line is the given size wide and a fixed height high.
export const Mark = styled.span<StyledProps>`
  display: inline-block;
  flex: none;
  width: ${({ $size }) => $size}px;
  height: ${({ $shape, $size, theme }) =>
    $shape === 'line' ? theme.size.swatchLine : `${String($size)}px`};
  background: ${({ $color }) => $color};
  border-radius: ${({ $shape, theme }) =>
    $shape === 'circle' ? '50%' : theme.size.radius};
`;
