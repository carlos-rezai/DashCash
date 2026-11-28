import { Icon } from '../Icon/Icon.tsx';
import { hasText } from '../../utils/hasText/hasText.ts';
import { Box, Frame, Label } from './Checkbox.styles.ts';

// The check, 12 px inside the 16 px box.
const CHECK_SIZE = 12;

type CheckboxProps = {
  checked: boolean;
  // Reports the checked state the click asks for.
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
};

// A box that is checked or not, with an optional label.
export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: CheckboxProps) {
  return (
    <Frame
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        onChange(!checked);
      }}
    >
      <Box $checked={checked}>
        {checked ? <Icon glyph="check" size={CHECK_SIZE} /> : null}
      </Box>
      {hasText(label) ? <Label>{label}</Label> : null}
    </Frame>
  );
}
