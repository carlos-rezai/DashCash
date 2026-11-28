import { hasText } from '../../utils/hasText/hasText.ts';
import { Frame, Knob, Label, Track } from './Switch.styles.ts';

type SwitchProps = {
  checked: boolean;
  // Reports the state the click asks for.
  onChange: (checked: boolean) => void;
  label?: string;
  // The name of a switch no label names.
  ariaLabel?: string;
  disabled?: boolean;
};

// A square on/off switch with an optional label.
export function Switch({
  checked,
  onChange,
  label,
  ariaLabel,
  disabled = false,
}: SwitchProps) {
  return (
    <Frame
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hasText(label) ? undefined : ariaLabel}
      disabled={disabled}
      onClick={() => {
        onChange(!checked);
      }}
    >
      <Track $on={checked}>
        <Knob $on={checked} />
      </Track>
      {hasText(label) ? <Label>{label}</Label> : null}
    </Frame>
  );
}
