import { Mark, type SwatchShape } from './Swatch.styles.ts';

type SwatchProps = {
  color: string;
  size?: number;
  shape?: SwatchShape;
};

const DEFAULT_SIZE = 10;

// A colour marker, hidden from assistive technology.
export function Swatch({
  color,
  size = DEFAULT_SIZE,
  shape = 'square',
}: SwatchProps) {
  return <Mark aria-hidden="true" $color={color} $size={size} $shape={shape} />;
}
