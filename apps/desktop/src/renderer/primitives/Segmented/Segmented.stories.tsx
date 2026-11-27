import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { readComputedColour } from '../../test-support/readComputedColour/readComputedColour.ts';
import { readFirstFamily } from '../../test-support/readFirstFamily/readFirstFamily.ts';
import { readHoveredStyle } from '../../test-support/readHoveredStyle/readHoveredStyle.ts';
import { Segmented } from './Segmented.tsx';

// The colours a reader sees, written out from dashcash-dark.css and
// Segmented.dc.html, apart from the Theme. The mixes stay color-mix() strings,
// so each colour is compared through what Chromium computes for it.
// --color-accent: the selected option's fill, and the focus ring
const ACCENT = '#749dc4';
// --color-accent-600: the selected option's fill under the pointer
const ACCENT_600 = '#94bce3';
// --color-bg: the selected option's text
const GROUND = '#1b2a39';
// --color-text: an option's text while not selected
const INK = '#e9f1fa';
// --color-divider: the border round the group and between the options
const DIVIDER = 'color-mix(in srgb, #e9f1fa 16%, transparent)';
// --sb-hover: an option's fill under the pointer while not selected
const HOVER = 'color-mix(in srgb, #e9f1fa 6%, transparent)';
// An option's fill while not selected
const TRANSPARENT = 'transparent';

// Segmented.dc.html: the side padding of an option.
const OPTION_PADDING = '12px';

// Invented ranges, as a chart toolbar offers them.
const RANGES = [
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
];

// SPEC section 3 plus size (SPEC, Control sizing: Segmented `size="md"`):
// the Segmented's props and no others.
type ListedProp = 'value' | 'options' | 'onChange' | 'size';
type SegmentedProp = keyof ComponentProps<typeof Segmented>;
// Typecheck fails when a prop is missing or one is added.
type MissingProp = Exclude<ListedProp, SegmentedProp>;
type UnlistedProp = Exclude<SegmentedProp, ListedProp>;
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;

// SPEC, Control sizing: the two sizes, and no others.
type ListedSize = 'sm' | 'md';
type SegmentedSize = NonNullable<ComponentProps<typeof Segmented>['size']>;
type MissingSize = Exclude<ListedSize, SegmentedSize>;
type UnlistedSize = Exclude<SegmentedSize, ListedSize>;
const NO_MISSING_SIZE: [MissingSize] extends [never] ? true : false = true;
const NO_UNLISTED_SIZE: [UnlistedSize] extends [never] ? true : false = true;

// What the element looks like under the pointer: its fill and its text.
function hoveredStyle(element: Element): {
  backgroundColor: string;
  color: string;
} {
  return readHoveredStyle(element, (style) => ({
    backgroundColor: style.backgroundColor,
    color: style.color,
  }));
}

// Holds the Segmented out of the pointer's reach while its resting colours
// are read: Chromium on Linux can apply :hover without pointer movement.
const Holder = styled.div`
  &[data-resting] {
    pointer-events: none;
  }
`;

function renderSegmented(args: ComponentProps<typeof Segmented>) {
  return (
    <Holder data-resting="">
      <Segmented {...args} />
    </Holder>
  );
}

// The Segmented as a screen uses it: the value follows what onChange reports.
function ControlledSegmented(args: ComponentProps<typeof Segmented>) {
  const [value, setValue] = useState(args.value);
  return (
    <Holder>
      <Segmented
        {...args}
        value={value}
        onChange={(next) => {
          setValue(next);
          args.onChange(next);
        }}
      />
    </Holder>
  );
}

function theGroup(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByRole('radiogroup');
}

function theOption(canvasElement: HTMLElement, name: string): HTMLElement {
  return within(canvasElement).getByRole('radio', { name });
}

type Look = {
  selected: string;
  height: number;
  fontSize: string;
};

// The group at rest: the options in order, only the selected one checked and
// filled with the accent, the others clear with ink; its height, a 1 px
// divider border round it and between the options, the font size in Barlow.
// Read inside the holder; afterwards the pointer may reach the group again.
async function expectGroup(
  canvasElement: HTMLElement,
  look: Look,
): Promise<void> {
  const group = theGroup(canvasElement);
  const holder = group.closest('[data-resting]');
  if (holder === null) {
    throw new Error('the group is not held at rest');
  }
  const options = within(group).getAllByRole('radio');
  await expect(
    options.map((option) => option.textContent),
    'options',
  ).toEqual(RANGES.map((range) => range.label));

  const box = group.getBoundingClientRect();
  await expect(box.height, 'height').toBeCloseTo(look.height, 1);
  const groupStyle = getComputedStyle(group);
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(groupStyle[`border${side}Width`], `${side} border`).toBe(
      '1px',
    );
    await expect(groupStyle[`border${side}Style`], `${side} border`).toBe(
      'solid',
    );
    await expect(groupStyle[`border${side}Color`], `${side} border`).toBe(
      readComputedColour(DIVIDER),
    );
  }

  for (const [index, option] of options.entries()) {
    const label = option.textContent;
    const selected = label === look.selected;
    await expect(option.matches(':hover'), `${label} hovered`).toBe(false);
    const style = getComputedStyle(option);
    await expect(option, `${label} checked`).toHaveAttribute(
      'aria-checked',
      String(selected),
    );
    await expect(style.backgroundColor, `${label} fill`).toBe(
      readComputedColour(selected ? ACCENT : TRANSPARENT),
    );
    await expect(style.color, `${label} text`).toBe(
      readComputedColour(selected ? GROUND : INK),
    );
    await expect(style.fontSize, `${label} font size`).toBe(look.fontSize);
    await expect(readFirstFamily(style), `${label} font`).toBe('Barlow');
    await expect(style.paddingLeft, `${label} left padding`).toBe(
      OPTION_PADDING,
    );
    await expect(style.paddingRight, `${label} right padding`).toBe(
      OPTION_PADDING,
    );
    // Each option fills the group's height inside its border.
    await expect(
      option.getBoundingClientRect().height,
      `${label} height`,
    ).toBeCloseTo(look.height - 2, 1);
    // A divider before every option but the first.
    if (index === 0) {
      await expect(style.borderLeftWidth, `${label} divider`).toBe('0px');
    } else {
      await expect(style.borderLeftWidth, `${label} divider`).toBe('1px');
      await expect(style.borderLeftStyle, `${label} divider`).toBe('solid');
      await expect(style.borderLeftColor, `${label} divider`).toBe(
        readComputedColour(DIVIDER),
      );
    }
  }

  holder.removeAttribute('data-resting');
}

const meta = {
  title: 'Primitives/Segmented',
  component: Segmented,
  render: renderSegmented,
  args: { value: 'month', options: RANGES, onChange: fn() },
} satisfies Meta<typeof Segmented>;

export default meta;

type Story = StoryObj<typeof meta>;

// The first option selected, at the default size: 28 px high with 13 px text
// (SPEC, Control sizing; Segmented.dc.html).
export const MonthSelected: Story = {
  args: { value: 'month' },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(NO_MISSING_SIZE).toBe(true);
    await expect(NO_UNLISTED_SIZE).toBe(true);

    await expectGroup(canvasElement, {
      selected: 'Month',
      height: 28,
      fontSize: '13px',
    });
  },
};

// The middle option selected.
export const QuarterSelected: Story = {
  args: { value: 'quarter' },
  play: async ({ canvasElement }) => {
    await expectGroup(canvasElement, {
      selected: 'Quarter',
      height: 28,
      fontSize: '13px',
    });
  },
};

// The last option selected.
export const YearSelected: Story = {
  args: { value: 'year' },
  play: async ({ canvasElement }) => {
    await expectGroup(canvasElement, {
      selected: 'Year',
      height: 28,
      fontSize: '13px',
    });
  },
};

// The small size named: the same 28 px as the default.
export const Small: Story = {
  args: { value: 'quarter', size: 'sm' },
  play: async ({ canvasElement }) => {
    await expectGroup(canvasElement, {
      selected: 'Quarter',
      height: 28,
      fontSize: '13px',
    });
  },
};

// md: 36 px high with 14 px text (SPEC, Control sizing; Segmented.dc.html).
export const Medium: Story = {
  args: { value: 'quarter', size: 'md' },
  play: async ({ canvasElement }) => {
    await expectGroup(canvasElement, {
      selected: 'Quarter',
      height: 36,
      fontSize: '14px',
    });
  },
};

// A click on an option reports its value once, and the option is checked.
export const Selecting: Story = {
  args: { value: 'month', onChange: fn() },
  render: (args) => <ControlledSegmented {...args} />,
  play: async ({ args, canvasElement }) => {
    await userEvent.click(theOption(canvasElement, 'Year'));
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith('year');
    await expect(theOption(canvasElement, 'Year')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(theOption(canvasElement, 'Month')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  },
};

// Segmented.dc.html: under the pointer an option not selected takes the hover
// tint and the selected one the darker accent, each keeping its text colour;
// SPEC, Focus/hover: focused from the keyboard an option shows the 2 px accent
// ring, offset 2.
export const HoverAndFocus: Story = {
  args: { value: 'month' },
  render: (args) => <ControlledSegmented {...args} />,
  play: async ({ canvasElement }) => {
    const selected = hoveredStyle(theOption(canvasElement, 'Month'));
    await expect(selected.backgroundColor, 'selected hover fill').toBe(
      readComputedColour(ACCENT_600),
    );
    await expect(selected.color, 'selected hover text').toBe(
      readComputedColour(GROUND),
    );
    const other = hoveredStyle(theOption(canvasElement, 'Quarter'));
    await expect(other.backgroundColor, 'hover fill').toBe(
      readComputedColour(HOVER),
    );
    await expect(other.color, 'hover text').toBe(readComputedColour(INK));

    await userEvent.tab();
    const focused = document.activeElement;
    if (!(focused instanceof HTMLElement)) {
      throw new Error('nothing has focus');
    }
    await expect(focused, 'focused option').toHaveAttribute('role', 'radio');
    await expect(focused.matches(':focus-visible'), 'focus-visible').toBe(true);
    const style = getComputedStyle(focused);
    await expect(style.outlineStyle, 'outline style').toBe('solid');
    await expect(style.outlineWidth, 'outline width').toBe('2px');
    await expect(style.outlineColor, 'outline colour').toBe(
      readComputedColour(ACCENT),
    );
    await expect(style.outlineOffset, 'outline offset').toBe('2px');
  },
};
