import { Frame, Mark, Meta, type ChipSwatchShape } from './Chip.styles.ts';

type ChipProps = {
  label: string;
  // Pressed: the chip is on.
  active?: boolean;
  // Reports the pressed state the click asks for.
  onClick?: (active: boolean) => void;
  // The colour of the marker before the label.
  swatch?: string;
  swatchShape?: ChipSwatchShape;
  // A muted value right of the label.
  meta?: string;
  disabled?: boolean;
};

// A toggle button for legends and month picking.
export function Chip({
  label,
  active = false,
  onClick,
  swatch,
  swatchShape = 'square',
  meta,
  disabled = false,
}: ChipProps) {
  return (
    <Frame
      type="button"
      aria-pressed={active}
      disabled={disabled}
      $active={active}
      onClick={() => {
        onClick?.(!active);
      }}
    >
      {swatch === undefined ? null : (
        <Mark
          aria-hidden="true"
          $color={swatch}
          $shape={swatchShape}
          $filled={active}
        />
      )}
      <span>{label}</span>
      {meta === undefined ? null : <Meta>{meta}</Meta>}
    </Frame>
  );
}
