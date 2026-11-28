import { hasText } from '../../utils/hasText/hasText.ts';
import { Icon } from '../Icon/Icon.tsx';
import { Swatch } from '../Swatch/Swatch.tsx';
import {
  ChevronSlot,
  Control,
  Frame,
  SwatchSlot,
  type SelectSize,
  type SelectTone,
} from './Select.styles.ts';

type SelectOption = { value: string; label: string; color?: string };

type SelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  // The empty option.
  placeholder?: string;
  // Shows the chosen option's colour as a square left of its label.
  showSwatch?: boolean;
  size?: SelectSize;
  // Any CSS width; the select fills what holds it by default.
  width?: string;
  // Warning draws the eye to a field that needs attention, without blocking.
  tone?: SelectTone;
  // The name for a select no FormField labels.
  ariaLabel?: string;
};

const CHEVRON_SIZE = 14;
const SWATCH_SIZE = 8;

export function Select({
  value,
  options,
  onChange,
  placeholder,
  showSwatch = false,
  size = 'md',
  width = '100%',
  tone = 'default',
  ariaLabel,
}: SelectProps) {
  const swatch = showSwatch
    ? options.find((option) => option.value === value)?.color
    : undefined;
  return (
    <Frame $width={width}>
      {swatch === undefined ? null : (
        <SwatchSlot>
          <Swatch color={swatch} size={SWATCH_SIZE} />
        </SwatchSlot>
      )}
      <Control
        value={value}
        aria-label={ariaLabel}
        $size={size}
        $tone={tone}
        $chosen={value !== ''}
        $swatch={swatch !== undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {hasText(placeholder) ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Control>
      <ChevronSlot>
        <Icon glyph="chevronDown" size={CHEVRON_SIZE} />
      </ChevronSlot>
    </Frame>
  );
}
