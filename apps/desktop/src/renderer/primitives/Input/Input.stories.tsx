import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Icon } from '../Icon/Icon.tsx';
import { Input } from './Input.tsx';

// The colours a reader sees, written out from dashcash-dark.css and Industry's
// styles.css (.input), apart from the Theme. The divider stays a color-mix()
// string, so each colour is compared through what Chromium computes for it.
// --sb-input-bg = --color-bg: the input ground (SPEC, Card fill)
const INPUT_GROUND = '#1b2a39';
// --color-text: the typed text
const INK = '#e9f1fa';
// --color-divider: the border at rest
const DIVIDER = 'color-mix(in srgb, #e9f1fa 16%, transparent)';

// The width of the holder every story renders in: an Input fills it.
const HOLDER_WIDTH = 320;

// SPEC section 3 plus ariaLabel (design log Q10): the Input's props and no
// others.
type ListedProp =
  | 'value'
  | 'onChange'
  | 'placeholder'
  | 'icon'
  | 'suffix'
  | 'align'
  | 'size'
  | 'numeric'
  | 'width'
  | 'ariaLabel';
type InputProp = keyof ComponentProps<typeof Input>;
// Typecheck fails when a prop is missing or one is added.
type MissingProp = Exclude<ListedProp, InputProp>;
type UnlistedProp = Exclude<InputProp, ListedProp>;
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;

// SPEC section 3: the two sizes and the two alignments, and no others.
type ListedSize = 'sm' | 'md';
type InputSize = NonNullable<ComponentProps<typeof Input>['size']>;
type MissingSize = Exclude<ListedSize, InputSize>;
type UnlistedSize = Exclude<InputSize, ListedSize>;
const NO_MISSING_SIZE: [MissingSize] extends [never] ? true : false = true;
const NO_UNLISTED_SIZE: [UnlistedSize] extends [never] ? true : false = true;
type ListedAlign = 'left' | 'right';
type InputAlign = NonNullable<ComponentProps<typeof Input>['align']>;
type MissingAlign = Exclude<ListedAlign, InputAlign>;
type UnlistedAlign = Exclude<InputAlign, ListedAlign>;
const NO_MISSING_ALIGN: [MissingAlign] extends [never] ? true : false = true;
const NO_UNLISTED_ALIGN: [UnlistedAlign] extends [never] ? true : false = true;

// What Chromium computes for a CSS colour, read from a probe element.
function computedColour(css: string): string {
  const probe = document.createElement('span');
  probe.style.color = css;
  if (probe.style.color === '') {
    throw new Error(`not a CSS colour: ${css}`);
  }
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

// Holds the Input at a fixed width, and out of the pointer's reach while its
// resting colours are read: Chromium on Linux can apply :hover without
// pointer movement.
const Holder = styled.div`
  width: ${HOLDER_WIDTH}px;

  &[data-resting] {
    pointer-events: none;
  }
`;

// The Input in its holder, and, when it names an icon, a hidden reference Icon
// of that glyph to compare the drawing with.
function renderInput(args: ComponentProps<typeof Input>) {
  return (
    <>
      <Holder data-resting="" data-testid="control">
        <Input {...args} />
      </Holder>
      {args.icon === undefined ? null : (
        <div data-testid="reference" hidden>
          <Icon glyph={args.icon} />
        </div>
      )}
    </>
  );
}

// The Input as a screen uses it: the value follows what onChange reports.
function ControlledInput(args: ComponentProps<typeof Input>) {
  const [value, setValue] = useState(args.value);
  return (
    <Holder data-testid="control">
      <Input
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

// The one text field of the story, by its name when one is given.
function theField(canvasElement: HTMLElement, name?: string): HTMLInputElement {
  const canvas = within(canvasElement);
  const field =
    name === undefined
      ? canvas.getByRole('textbox')
      : canvas.getByRole('textbox', { name });
  if (!(field instanceof HTMLInputElement)) {
    throw new Error('the text field is not an input');
  }
  return field;
}

function px(value: string): number {
  return Number.parseFloat(value);
}

type Look = {
  height: number;
  fontSize: string;
};

// The field at rest: its height, the input ground, a 1 px divider border on
// every side, ink in Barlow at the size's font size. Read inside the holder;
// afterwards the pointer may reach the field again.
async function expectField(field: HTMLInputElement, look: Look): Promise<void> {
  const holder = field.closest('[data-resting]');
  if (holder === null) {
    throw new Error('the field is not held at rest');
  }
  await expect(field.matches(':hover'), 'hovered').toBe(false);
  const style = getComputedStyle(field);

  await expect(field.getBoundingClientRect().height, 'height').toBeCloseTo(
    look.height,
    1,
  );
  await expect(style.backgroundColor, 'fill').toBe(
    computedColour(INPUT_GROUND),
  );
  await expect(style.color, 'text').toBe(computedColour(INK));
  await expect(style.fontSize, 'font size').toBe(look.fontSize);
  await expect(style.fontFamily.startsWith('"Barlow"'), 'Barlow').toBe(true);
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `${side} border width`).toBe(
      '1px',
    );
    await expect(style[`border${side}Style`], `${side} border style`).toBe(
      'solid',
    );
    await expect(style[`border${side}Color`], `${side} border colour`).toBe(
      computedColour(DIVIDER),
    );
  }

  holder.removeAttribute('data-resting');
}

// The vertical centre of a box.
function middle(box: DOMRect): number {
  return box.top + box.height / 2;
}

const meta = {
  title: 'Primitives/Input',
  component: Input,
  render: renderInput,
  args: { value: '', onChange: fn() },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

// md is the default: 36 px on the input ground, 14 px text, left aligned, a
// plain text field as wide as what holds it.
export const Medium: Story = {
  args: { value: 'Rewe', ariaLabel: 'Merchant' },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(NO_MISSING_SIZE).toBe(true);
    await expect(NO_UNLISTED_SIZE).toBe(true);
    await expect(NO_MISSING_ALIGN).toBe(true);
    await expect(NO_UNLISTED_ALIGN).toBe(true);

    const field = theField(canvasElement, 'Merchant');
    await expect(field.value).toBe('Rewe');
    await expectField(field, { height: 36, fontSize: '14px' });
    await expect(field.getBoundingClientRect().width, 'width').toBeCloseTo(
      HOLDER_WIDTH,
      1,
    );
    await expect(getComputedStyle(field).textAlign, 'alignment').toBe('left');
    await expect(field.inputMode, 'input mode').not.toBe('decimal');
    await expect(
      within(canvasElement).getByTestId('control').querySelectorAll('svg'),
      'icons',
    ).toHaveLength(0);
  },
};

// sm: 30 px high (SPEC section 3, the ticket) with 13 px text.
export const Small: Story = {
  args: { value: 'Rewe', size: 'sm', ariaLabel: 'Merchant' },
  play: async ({ canvasElement }) => {
    const field = theField(canvasElement, 'Merchant');
    await expectField(field, { height: 30, fontSize: '13px' });
  },
};

// The rules search of Component Inventory.dc.html: the search icon on the
// left, its placeholder, and the text starting right of the icon.
export const LeftIcon: Story = {
  args: {
    value: '',
    icon: 'search',
    placeholder: 'Search rules',
    ariaLabel: 'Search rules',
  },
  play: async ({ canvasElement }) => {
    const field = theField(canvasElement, 'Search rules');
    await expect(field.placeholder).toBe('Search rules');
    await expectField(field, { height: 36, fontSize: '14px' });

    const svgs = [
      ...within(canvasElement).getByTestId('control').querySelectorAll('svg'),
    ];
    await expect(svgs, 'icons').toHaveLength(1);
    const [svg] = svgs;
    if (svg === undefined) {
      throw new Error('no icon');
    }
    const reference = within(canvasElement)
      .getByTestId('reference')
      .querySelector('svg');
    await expect(svg.innerHTML, 'glyph').toBe(reference?.innerHTML);

    // Inside the field, on its left, centred on its height, and the text
    // area begins after it.
    const icon = svg.getBoundingClientRect();
    const box = field.getBoundingClientRect();
    const textStart = box.left + px(getComputedStyle(field).paddingLeft);
    await expect(icon.left, 'icon inside').toBeGreaterThan(box.left);
    await expect(icon.right, 'text after icon').toBeLessThanOrEqual(textStart);
    await expect(middle(icon), 'icon centred').toBeCloseTo(middle(box), 0);
  },
};

// The money field of Component Inventory.dc.html: "1.529,60 €", right aligned
// in tabular figures, the "€" suffix inside the field on its right, numeric
// mode, named by its ariaLabel alone.
export const MoneyField: Story = {
  args: {
    value: '1.529,60',
    suffix: '€',
    align: 'right',
    numeric: true,
    ariaLabel: 'Balance today',
  },
  play: async ({ canvasElement }) => {
    const field = theField(canvasElement, 'Balance today');
    await expect(field.value).toBe('1.529,60');
    await expectField(field, { height: 36, fontSize: '14px' });

    const style = getComputedStyle(field);
    await expect(style.textAlign, 'alignment').toBe('right');
    await expect(style.fontVariantNumeric, 'figures').toBe('tabular-nums');
    await expect(field.inputMode, 'input mode').toBe('decimal');

    // The suffix sits inside the field, right of where the text ends, centred
    // on the field's height, at the field's font size.
    const suffix = within(canvasElement).getByText('€');
    const mark = suffix.getBoundingClientRect();
    const box = field.getBoundingClientRect();
    const textEnd = box.right - px(style.paddingRight);
    await expect(mark.left, 'suffix after text').toBeGreaterThanOrEqual(
      textEnd,
    );
    await expect(mark.right, 'suffix inside').toBeLessThan(box.right);
    await expect(middle(mark), 'suffix centred').toBeCloseTo(middle(box), 0);
    await expect(getComputedStyle(suffix).fontSize, 'suffix size').toBe('14px');
  },
};

// Typing reports the new text after every key, and the field shows it.
export const Typing: Story = {
  args: {
    value: '',
    icon: 'search',
    ariaLabel: 'Search rules',
    onChange: fn(),
  },
  render: (args) => <ControlledInput {...args} />,
  play: async ({ args, canvasElement }) => {
    const field = theField(canvasElement, 'Search rules');

    await userEvent.type(field, 'Rewe');
    await expect(args.onChange).toHaveBeenCalledTimes(4);
    await expect(args.onChange).toHaveBeenNthCalledWith(1, 'R');
    await expect(args.onChange).toHaveBeenNthCalledWith(2, 'Re');
    await expect(args.onChange).toHaveBeenNthCalledWith(3, 'Rew');
    await expect(args.onChange).toHaveBeenNthCalledWith(4, 'Rewe');
    await expect(field.value).toBe('Rewe');
  },
};
