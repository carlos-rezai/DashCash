import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Icon } from '../Icon/Icon.tsx';
import { Select } from './Select.tsx';

// The colours a reader sees, written out from dashcash-dark.css,
// Select.dc.html and Industry's styles.css (.input), apart from the Theme.
// The mixes stay color-mix() strings, so each colour is compared through what
// Chromium computes for it.
// --sb-input-bg = --color-bg: the input ground (SPEC, Card fill)
const INPUT_GROUND = '#1b2a39';
// --color-text: a chosen option
const INK = '#e9f1fa';
// --sb-text-muted: the placeholder
const TEXT_MUTED = 'color-mix(in srgb, #e9f1fa 62%, transparent)';
// --color-divider: the border at rest
const DIVIDER = 'color-mix(in srgb, #e9f1fa 16%, transparent)';
// --sb-warning: the warning tone's border and placeholder
const WARNING = '#e0b469';
// styles.css, .input:hover: the border under the pointer, the text colour at 45 %
const HOVER_BORDER = 'color-mix(in srgb, #e9f1fa 45%, transparent)';
// --color-accent: the border and the caret while the select is focused
const ACCENT = '#749dc4';
// --sb-cat-1 to --sb-cat-4: the categories of the stories
const CATEGORY_1 = '#f08f87';
const CATEGORY_2 = '#5cc697';
const CATEGORY_3 = '#ba9cef';
const CATEGORY_4 = '#d8a44e';

// Select.dc.html: the chosen option's swatch is an 8 px square.
const SWATCH_SIZE = 8;

// The width of the holder the stories render in: a Select fills it unless
// it is given a width.
const HOLDER_WIDTH = 320;

// Invented categories, in the prototype's words.
const CATEGORIES = [
  { value: 'dining', label: 'Dining out', color: CATEGORY_1 },
  { value: 'groceries', label: 'Groceries', color: CATEGORY_2 },
  { value: 'leisure', label: 'Leisure', color: CATEGORY_3 },
  { value: 'transport', label: 'Transport', color: CATEGORY_4 },
];

// SPEC section 3 plus ariaLabel (design log Q10): the Select's props and no
// others.
type ListedProp =
  | 'value'
  | 'options'
  | 'onChange'
  | 'placeholder'
  | 'showSwatch'
  | 'size'
  | 'width'
  | 'tone'
  | 'ariaLabel';
type SelectProp = keyof ComponentProps<typeof Select>;
// Typecheck fails when a prop is missing or one is added.
type MissingProp = Exclude<ListedProp, SelectProp>;
type UnlistedProp = Exclude<SelectProp, ListedProp>;
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;

// SPEC section 3: the two tones and the two sizes, and no others.
type ListedTone = 'default' | 'warning';
type SelectTone = NonNullable<ComponentProps<typeof Select>['tone']>;
type MissingTone = Exclude<ListedTone, SelectTone>;
type UnlistedTone = Exclude<SelectTone, ListedTone>;
const NO_MISSING_TONE: [MissingTone] extends [never] ? true : false = true;
const NO_UNLISTED_TONE: [UnlistedTone] extends [never] ? true : false = true;
type ListedSize = 'sm' | 'md';
type SelectSize = NonNullable<ComponentProps<typeof Select>['size']>;
type MissingSize = Exclude<ListedSize, SelectSize>;
type UnlistedSize = Exclude<SelectSize, ListedSize>;
const NO_MISSING_SIZE: [MissingSize] extends [never] ? true : false = true;
const NO_UNLISTED_SIZE: [UnlistedSize] extends [never] ? true : false = true;

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

// The border colour the stylesheet gives an element under the pointer: that of
// the :hover rules that select it. A story's synthetic pointer events do not
// make Chromium apply :hover, so the rule is read, not the cascade.
function hoverBorderColours(element: Element): string[] {
  const colours: string[] = [];
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      if (
        rule instanceof CSSStyleRule &&
        rule.selectorText.includes(':hover') &&
        element.matches(rule.selectorText.replaceAll(':hover', '')) &&
        rule.style.borderColor !== ''
      ) {
        colours.push(rule.style.borderColor);
      }
    }
  }
  return colours;
}

// How Chromium serialises a CSS colour set as a border colour.
function serialisedBorderColour(css: string): string {
  const probe = document.createElement('span');
  probe.style.borderColor = css;
  return probe.style.borderColor;
}

// Holds the Select at a fixed width, and out of the pointer's reach while its
// resting colours are read: Chromium on Linux can apply :hover without
// pointer movement.
const Holder = styled.div`
  width: ${HOLDER_WIDTH}px;

  &[data-resting] {
    pointer-events: none;
  }
`;

// The Select in its holder, and a hidden reference chevron to compare its
// drawing with.
function renderSelect(args: ComponentProps<typeof Select>) {
  return (
    <>
      <Holder data-resting="" data-testid="control">
        <Select {...args} />
      </Holder>
      <div data-testid="reference" hidden>
        <Icon glyph="chevronDown" />
      </div>
    </>
  );
}

// The Select as a screen uses it: the value follows what onChange reports.
function ControlledSelect(args: ComponentProps<typeof Select>) {
  const [value, setValue] = useState(args.value);
  return (
    <Holder data-testid="control">
      <Select
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

// The one select of the story, by its name.
function theSelect(
  canvasElement: HTMLElement,
  name: string,
): HTMLSelectElement {
  const select = within(canvasElement).getByRole('combobox', { name });
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error('the combobox is not a select');
  }
  return select;
}

function px(value: string): number {
  return Number.parseFloat(value);
}

// The vertical centre of a box.
function middle(box: DOMRect): number {
  return box.top + box.height / 2;
}

// The text the closed select shows: its selected option's label.
function shownText(select: HTMLSelectElement): string {
  return select.selectedOptions[0]?.textContent ?? '';
}

// The elements of the story's control filled with a colour.
function filledWith(canvasElement: HTMLElement, css: string): Element[] {
  const colour = computedColour(css);
  const control = within(canvasElement).getByTestId('control');
  return [...control.querySelectorAll('*')].filter(
    (element) => getComputedStyle(element).backgroundColor === colour,
  );
}

type Look = {
  height: number;
  fontSize: string;
  text: string;
  border: string;
};

// The select at rest: its height, the input ground, a 1 px border on every
// side, its text colour and size in Barlow. Read inside the holder;
// afterwards the pointer may reach the select again.
async function expectSelect(
  select: HTMLSelectElement,
  look: Look,
): Promise<void> {
  const holder = select.closest('[data-resting]');
  if (holder === null) {
    throw new Error('the select is not held at rest');
  }
  await expect(select.matches(':hover'), 'hovered').toBe(false);
  const style = getComputedStyle(select);

  await expect(select.getBoundingClientRect().height, 'height').toBeCloseTo(
    look.height,
    1,
  );
  await expect(style.backgroundColor, 'fill').toBe(
    computedColour(INPUT_GROUND),
  );
  await expect(style.color, 'text').toBe(computedColour(look.text));
  await expect(style.fontSize, 'font size').toBe(look.fontSize);
  await expect(style.fontFamily.startsWith('Barlow'), 'Barlow').toBe(true);
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `${side} border width`).toBe(
      '1px',
    );
    await expect(style[`border${side}Style`], `${side} border style`).toBe(
      'solid',
    );
    await expect(style[`border${side}Color`], `${side} border colour`).toBe(
      computedColour(look.border),
    );
  }

  holder.removeAttribute('data-resting');
}

// No swatch of any category's colour in the control.
async function expectNoSwatch(canvasElement: HTMLElement): Promise<void> {
  for (const option of CATEGORIES) {
    await expect(
      filledWith(canvasElement, option.color),
      `${option.label} swatch`,
    ).toHaveLength(0);
  }
}

const meta = {
  title: 'Primitives/Select',
  component: Select,
  render: renderSelect,
  args: { value: '', options: CATEGORIES, onChange: fn() },
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

// Empty: md, its placeholder is the empty option and shows muted; no swatch
// while nothing is chosen; the chevron on the right.
export const Empty: Story = {
  args: {
    value: '',
    placeholder: 'Uncategorised',
    showSwatch: true,
    ariaLabel: 'Category',
  },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(NO_MISSING_TONE).toBe(true);
    await expect(NO_UNLISTED_TONE).toBe(true);
    await expect(NO_MISSING_SIZE).toBe(true);
    await expect(NO_UNLISTED_SIZE).toBe(true);

    const select = theSelect(canvasElement, 'Category');
    await expect(select.value).toBe('');
    await expect(shownText(select)).toBe('Uncategorised');
    await expect(
      [...select.options].map((option) => [option.value, option.text]),
      'options',
    ).toEqual([
      ['', 'Uncategorised'],
      ['dining', 'Dining out'],
      ['groceries', 'Groceries'],
      ['leisure', 'Leisure'],
      ['transport', 'Transport'],
    ]);
    const svgs = [
      ...within(canvasElement).getByTestId('control').querySelectorAll('svg'),
    ];
    await expect(svgs, 'icons').toHaveLength(1);
    const [svg] = svgs;
    if (svg === undefined) {
      throw new Error('no chevron');
    }
    // The chevron is muted, read while the holder keeps the pointer off.
    await expect(select.matches(':hover'), 'hovered').toBe(false);
    await expect(getComputedStyle(svg).color, 'chevron colour').toBe(
      computedColour(TEXT_MUTED),
    );
    await expectSelect(select, {
      height: 36,
      fontSize: '14px',
      text: TEXT_MUTED,
      border: DIVIDER,
    });
    await expect(select.getBoundingClientRect().width, 'width').toBeCloseTo(
      HOLDER_WIDTH,
      1,
    );
    await expectNoSwatch(canvasElement);

    // One chevron, the reference glyph, inside the select on its right and
    // centred on its height.
    const reference = within(canvasElement)
      .getByTestId('reference')
      .querySelector('svg');
    await expect(svg.innerHTML, 'glyph').toBe(reference?.innerHTML);
    const chevron = svg.getBoundingClientRect();
    const box = select.getBoundingClientRect();
    await expect(chevron.left, 'chevron after text').toBeGreaterThanOrEqual(
      box.right - px(getComputedStyle(select).paddingRight),
    );
    await expect(chevron.right, 'chevron inside').toBeLessThan(box.right);
    await expect(middle(chevron), 'chevron centred').toBeCloseTo(
      middle(box),
      0,
    );
  },
};

// An empty placeholder is absent, as in Select.dc.html (sc-if): no empty
// option, only the categories.
export const EmptyPlaceholder: Story = {
  args: { value: 'groceries', placeholder: '', ariaLabel: 'Category' },
  play: async ({ canvasElement }) => {
    const select = theSelect(canvasElement, 'Category');
    await expect(
      [...select.options].map((option) => [option.value, option.text]),
      'options',
    ).toEqual([
      ['dining', 'Dining out'],
      ['groceries', 'Groceries'],
      ['leisure', 'Leisure'],
      ['transport', 'Transport'],
    ]);
  },
};

// Chosen: the option's label in ink, at the given width, without a swatch.
export const Chosen: Story = {
  args: {
    value: 'groceries',
    placeholder: 'Uncategorised',
    width: '220px',
    ariaLabel: 'Category',
  },
  play: async ({ canvasElement }) => {
    const select = theSelect(canvasElement, 'Category');
    await expect(select.value).toBe('groceries');
    await expect(shownText(select)).toBe('Groceries');
    await expectSelect(select, {
      height: 36,
      fontSize: '14px',
      text: INK,
      border: DIVIDER,
    });
    await expect(select.getBoundingClientRect().width, 'width').toBeCloseTo(
      220,
      1,
    );
    await expectNoSwatch(canvasElement);
  },
};

// sm: 28 px high (SPEC, Control sizing; Select.dc.html) with 13 px text.
export const Small: Story = {
  args: {
    value: 'groceries',
    placeholder: 'Uncategorised',
    size: 'sm',
    ariaLabel: 'Category',
  },
  play: async ({ canvasElement }) => {
    const select = theSelect(canvasElement, 'Category');
    await expectSelect(select, {
      height: 28,
      fontSize: '13px',
      text: INK,
      border: DIVIDER,
    });
  },
};

// The category picker of Component Inventory.dc.html: an 8 px square of the
// chosen category's colour on the left, and the text after it.
export const WithSwatch: Story = {
  args: {
    value: 'groceries',
    placeholder: 'Uncategorised',
    showSwatch: true,
    ariaLabel: 'Category',
  },
  play: async ({ canvasElement }) => {
    const select = theSelect(canvasElement, 'Category');
    await expect(shownText(select)).toBe('Groceries');
    await expectSelect(select, {
      height: 36,
      fontSize: '14px',
      text: INK,
      border: DIVIDER,
    });

    // Only the chosen category's swatch, once.
    const swatches = filledWith(canvasElement, CATEGORY_2);
    await expect(swatches, 'swatches').toHaveLength(1);
    for (const option of CATEGORIES.filter((o) => o.value !== 'groceries')) {
      await expect(
        filledWith(canvasElement, option.color),
        `${option.label} swatch`,
      ).toHaveLength(0);
    }
    const [swatch] = swatches;
    if (swatch === undefined) {
      throw new Error('no swatch');
    }
    const mark = swatch.getBoundingClientRect();
    const box = select.getBoundingClientRect();
    await expect(mark.width, 'swatch width').toBeCloseTo(SWATCH_SIZE, 1);
    await expect(mark.height, 'swatch height').toBeCloseTo(SWATCH_SIZE, 1);
    await expect(getComputedStyle(swatch).borderRadius).toBe('0px');
    await expect(mark.left, 'swatch inside').toBeGreaterThan(box.left);
    await expect(mark.right, 'text after swatch').toBeLessThanOrEqual(
      box.left + px(getComputedStyle(select).paddingLeft),
    );
    await expect(middle(mark), 'swatch centred').toBeCloseTo(middle(box), 0);
  },
};

// The warning tone (SPEC section 4, Uncategorised): "Pick a category" and the
// border in the warning colour, drawing the eye without blocking.
export const Warning: Story = {
  args: {
    value: '',
    placeholder: 'Pick a category',
    tone: 'warning',
    ariaLabel: 'Category',
  },
  play: async ({ canvasElement }) => {
    const select = theSelect(canvasElement, 'Category');
    await expect(shownText(select)).toBe('Pick a category');
    await expect(select).toBeEnabled();
    await expectSelect(select, {
      height: 36,
      fontSize: '14px',
      text: WARNING,
      border: WARNING,
    });
  },
};

// styles.css, .input: under the pointer the border turns to the text colour at
// 45 % (the :hover rule); focused from the keyboard it turns to the accent, the ring sits on the
// border (offset 0) and the caret is the accent.
export const HoverAndFocus: Story = {
  args: { value: 'groceries', ariaLabel: 'Category' },
  render: (args) => <ControlledSelect {...args} />,
  play: async ({ canvasElement }) => {
    const select = theSelect(canvasElement, 'Category');
    await expect(getComputedStyle(select).caretColor, 'caret').toBe(
      computedColour(ACCENT),
    );

    await expect(hoverBorderColours(select), 'hover border').toEqual([
      serialisedBorderColour(HOVER_BORDER),
    ]);

    await userEvent.tab();
    await expect(select).toHaveFocus();
    await expect(select.matches(':focus-visible'), 'focus-visible').toBe(true);
    const style = getComputedStyle(select);
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      await expect(style[`border${side}Color`], `${side} focus border`).toBe(
        computedColour(ACCENT),
      );
    }
    await expect(style.outlineOffset, 'outline offset').toBe('0px');
    await expect(style.outlineStyle, 'outline style').toBe('solid');
  },
};

// The warning border is set inline in Select.dc.html, so it survives the
// pointer and the keyboard: amber on hover and on focus.
export const WarningHoverAndFocus: Story = {
  args: {
    value: '',
    placeholder: 'Pick a category',
    tone: 'warning',
    ariaLabel: 'Category',
  },
  render: (args) => <ControlledSelect {...args} />,
  play: async ({ canvasElement }) => {
    const select = theSelect(canvasElement, 'Category');

    // No :hover rule recolours the border, so the resting amber stays.
    await expect(hoverBorderColours(select), 'hover border').toEqual([]);
    await expect(getComputedStyle(select).borderTopColor, 'border').toBe(
      computedColour(WARNING),
    );

    await userEvent.tab();
    await expect(select).toHaveFocus();
    await expect(select.matches(':focus-visible'), 'focus-visible').toBe(true);
    const style = getComputedStyle(select);
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      await expect(style[`border${side}Color`], `${side} focus border`).toBe(
        computedColour(WARNING),
      );
    }
    await expect(style.outlineOffset, 'outline offset').toBe('0px');
  },
};

// Choosing an option reports its value, and the select shows its label.
export const Choosing: Story = {
  args: {
    value: '',
    placeholder: 'Pick a category',
    tone: 'warning',
    ariaLabel: 'Category',
    onChange: fn(),
  },
  render: (args) => <ControlledSelect {...args} />,
  play: async ({ args, canvasElement }) => {
    const select = theSelect(canvasElement, 'Category');

    await userEvent.selectOptions(select, 'Transport');
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith('transport');
    await expect(select.value).toBe('transport');
    await expect(shownText(select)).toBe('Transport');
  },
};
