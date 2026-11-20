import { Icon } from '../Icon/Icon.tsx';
import { Box, Frame, Label } from './Checkbox.styles.ts';

// The check, 12 px inside the 16 px box.
const CHECK_SIZE = 12;

type CheckboxProps = {
  checked: boolean;
  // Reports the checked state the click asks for.
  onChange: (checked: boolean) => void;
  label?: string;
  // The name of a checkbox no label names.
  ariaLabel?: string;
  disabled?: boolean;
};

// A box that is checked or not, with an optional label.
export function Checkbox({
  checked,
  onChange,
  label,
  ariaLabel,
  disabled = false,
}: CheckboxProps) {
  return (
    <Frame
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label === undefined ? ariaLabel : undefined}
      disabled={disabled}
      onClick={() => {
        onChange(!checked);
      }}
    >
      <Box $checked={checked}>
        {checked ? <Icon glyph="check" size={CHECK_SIZE} /> : null}
      </Box>
      {label === undefined ? null : <Label>{label}</Label>}
    </Frame>
  );
}
