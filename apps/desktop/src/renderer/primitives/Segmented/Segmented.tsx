import { Group, Option, type SegmentedSize } from './Segmented.styles.ts';

type SegmentedOption = { value: string; label: string };

type SegmentedProps = {
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  // sm, the default, is 28 px high; md is 36 px for forms and page headers.
  size?: SegmentedSize;
};

// The selected option shows in the accent fill; a click reports its value.
export function Segmented({
  value,
  options,
  onChange,
  size = 'sm',
}: SegmentedProps) {
  return (
    <Group role="radiogroup" $size={size}>
      {options.map((option) => (
        <Option
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          $selected={option.value === value}
          $size={size}
          onClick={() => {
            onChange(option.value);
          }}
        >
          {option.label}
        </Option>
      ))}
    </Group>
  );
}
