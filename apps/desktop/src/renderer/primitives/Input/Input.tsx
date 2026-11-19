import { Icon, type IconName } from '../Icon/Icon.tsx';
import {
  Field,
  Frame,
  IconSlot,
  SuffixSlot,
  type InputAlign,
  type InputSize,
} from './Input.styles.ts';

type InputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // Drawn inside the field on its left.
  icon?: IconName;
  // Drawn inside the field on its right, such as "€".
  suffix?: string;
  align?: InputAlign;
  size?: InputSize;
  // Asks for a decimal keypad.
  numeric?: boolean;
  // Any CSS width; the field fills what holds it by default.
  width?: string;
  // The name for a field no FormField labels.
  ariaLabel?: string;
};

const ICON_SIZE = 15;

export function Input({
  value,
  onChange,
  placeholder,
  icon,
  suffix,
  align = 'left',
  size = 'md',
  numeric = false,
  width = '100%',
  ariaLabel,
}: InputProps) {
  return (
    <Frame $width={width}>
      {icon === undefined ? null : (
        <IconSlot>
          <Icon glyph={icon} size={ICON_SIZE} />
        </IconSlot>
      )}
      <Field
        type="text"
        value={value}
        placeholder={placeholder}
        inputMode={numeric ? 'decimal' : 'text'}
        aria-label={ariaLabel}
        $size={size}
        $align={align}
        $icon={icon !== undefined}
        $suffix={suffix !== undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      {suffix === undefined ? null : (
        <SuffixSlot $size={size}>{suffix}</SuffixSlot>
      )}
    </Frame>
  );
}
