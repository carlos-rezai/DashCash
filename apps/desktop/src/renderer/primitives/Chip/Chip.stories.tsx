import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Chip } from './Chip.tsx';

// The colours a reader sees, written out from dashcash-dark.css and
// Chip.dc.html, apart from the Theme. The mixes stay color-mix() strings, so
// each colour is compared through what Chromium computes for it.
// --color-text: a pressed chip's label
const INK = '#e9f1fa';
// --sb-text-muted: a resting chip's label, and the meta value
const TEXT_MUTED = 'color-mix(in srgb, #e9f1fa 62%, transparent)';
// --color-divider: a resting chip's border
const DIVIDER = 'color-mix(in srgb, #e9f1fa 16%, transparent)';
// --color-accent-100: a pressed chip's fill, and any chip's under the pointer
const ACCENT_100 = '#22384d';
// --color-accent-400: a pressed chip's border
const ACCENT_400 = '#597ea3';
// --color-accent: the focus ring
const ACCENT = '#749dc4';
// A resting chip's fill
const TRANSPARENT = 'transparent';
// --sb-cat-2: the invented account colour of the swatch stories
const SWATCH = '#5cc697';

// Chip.dc.html: the height (SPEC, Control sizing: sm), the side padding, the
// gap between swatch, label and meta, the swatch's width and the height of a
// line swatch, and the opacity of a disabled chip.
const HEIGHT = 28;
const PADDING = '10px';
const GAP = 7;
const SWATCH_SIZE = 10;
const LINE_HEIGHT = 3;
const DISABLED_OPACITY = '0.45';

// An invented account, and how many of its months are picked.
const LABEL = 'Household account';
const META = '14';

// SPEC section 3: the Chip's props and no others.
type ListedProp =
  | 'label'
  | 'active'
  | 'onClick'
  | 'swatch'
  | 'swatchShape'
  | 'meta'
  | 'disabled';
type ChipProp = keyof ComponentProps<typeof Chip>;
// Typecheck fails when a prop is missing or one is added.
type MissingProp = Exclude<ListedProp, ChipProp>;
type UnlistedProp = Exclude<ChipProp, ListedProp>;
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;

// SPEC section 3: the three swatch shapes, and no others.
type ListedShape = 'square' | 'circle' | 'line';
type ChipShape = NonNullable<ComponentProps<typeof Chip>['swatchShape']>;
type MissingShape = Exclude<ListedShape, ChipShape>;
type UnlistedShape = Exclude<ChipShape, ListedShape>;
const NO_MISSING_SHAPE: [MissingShape] extends [never] ? true : false = true;
const NO_UNLISTED_SHAPE: [UnlistedShape] extends [never] ? true : false = true;

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

// The marker that stands in for :hover while a hovered style is read.
const HOVER_MARK = 'data-hover-probe';

// The fill of the element under the pointer. A story's synthetic pointer
// events do not make Chromium apply :hover, so every :hover rule is copied
// right after itself with the marker in its place, and the marker is set on
// the element and its ancestors while the fill is read. The marker weighs as
// much as :hover and each copy follows its rule, so the cascade is that of a
// real hover.
function hoveredFill(element: Element): string {
  const copies: CSSRule[] = [];
  for (const sheet of document.styleSheets) {
    const rules = [...sheet.cssRules];
    for (let index = rules.length - 1; index >= 0; index -= 1) {
      const rule = rules[index];
      if (
        rule instanceof CSSStyleRule &&
        rule.selectorText.includes(':hover')
      ) {
        sheet.insertRule(
          rule.cssText.replaceAll(':hover', `[${HOVER_MARK}]`),
          index + 1,
        );
        const copy = sheet.cssRules.item(index + 1);
        if (copy !== null) {
          copies.push(copy);
        }
      }
    }
  }
  const marked: Element[] = [];
  for (let node: Element | null = element; node; node = node.parentElement) {
    node.setAttribute(HOVER_MARK, '');
    marked.push(node);
  }
  try {
    return getComputedStyle(element).backgroundColor;
  } finally {
    for (const node of marked) {
      node.removeAttribute(HOVER_MARK);
    }
    for (const sheet of document.styleSheets) {
      for (let index = sheet.cssRules.length - 1; index >= 0; index -= 1) {
        const rule = sheet.cssRules.item(index);
        if (rule !== null && copies.includes(rule)) {
          sheet.deleteRule(index);
        }
      }
    }
  }
}

// Holds the Chip out of the pointer's reach while its resting colours are
// read: Chromium on Linux can apply :hover without pointer movement.
const Holder = styled.div`
  &[data-resting] {
    pointer-events: none;
  }
`;

// The Chip as a legend uses it: pressed follows what onClick reports.
function ControlledChip(args: ComponentProps<typeof Chip>) {
  const [active, setActive] = useState(args.active ?? false);
  return (
    <Holder data-resting="">
      <Chip
        {...args}
        active={active}
        onClick={(next) => {
          setActive(next);
          args.onClick?.(next);
        }}
      />
    </Holder>
  );
}

function theChip(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByRole('button');
}

// The first family of a computed font-family, unquoted as Chromium writes a
// one-word name.
function firstFamily(style: CSSStyleDeclaration): string {
  return style.fontFamily.split(',')[0]?.trim() ?? '';
}

// The vertical centre of a box.
function middle(box: DOMRect): number {
  return box.top + box.height / 2;
}

// The elements inside the chip drawn with the swatch colour.
function swatchesIn(chip: HTMLElement): Element[] {
  const colour = computedColour(SWATCH);
  return [...chip.querySelectorAll('*')].filter((element) => {
    const style = getComputedStyle(element);
    return style.borderTopColor === colour || style.backgroundColor === colour;
  });
}

type Look = {
  pressed: boolean;
};

// The chip at rest: pressed or not to assistive technology, 28 px high, its
// label in Barlow at 13 px, and its fill, text and 1 px border by state (a
// pressed chip on the accent tint with ink, a resting one clear and muted).
// Read inside the holder; afterwards the pointer may reach the chip again.
async function expectChip(chip: HTMLElement, look: Look): Promise<void> {
  const holder = chip.closest('[data-resting]');
  if (holder === null) {
    throw new Error('the chip is not held at rest');
  }
  await expect(chip.matches(':hover'), 'hovered').toBe(false);
  const style = getComputedStyle(chip);

  await expect(chip.tagName, 'a button').toBe('BUTTON');
  await expect(chip, 'pressed').toHaveAttribute(
    'aria-pressed',
    String(look.pressed),
  );
  await expect(within(chip).getByText(LABEL), 'label').toBeVisible();
  await expect(chip.getBoundingClientRect().height, 'height').toBeCloseTo(
    HEIGHT,
    1,
  );
  await expect(style.backgroundColor, 'fill').toBe(
    computedColour(look.pressed ? ACCENT_100 : TRANSPARENT),
  );
  await expect(style.color, 'text').toBe(
    computedColour(look.pressed ? INK : TEXT_MUTED),
  );
  await expect(style.fontSize, 'font size').toBe('13px');
  await expect(firstFamily(style), 'font').toBe('Barlow');
  await expect(style.paddingLeft, 'left padding').toBe(PADDING);
  await expect(style.paddingRight, 'right padding').toBe(PADDING);
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `${side} border width`).toBe(
      '1px',
    );
    await expect(style[`border${side}Style`], `${side} border style`).toBe(
      'solid',
    );
    await expect(style[`border${side}Color`], `${side} border colour`).toBe(
      computedColour(look.pressed ? ACCENT_400 : DIVIDER),
    );
  }

  holder.removeAttribute('data-resting');
}

type SwatchLook = {
  height: number;
  radius: string;
  filled: boolean;
};

// One swatch before the label: 10 px wide, its height and corners by shape,
// a 1 px border of its colour, filled while the chip is pressed, centred on
// the chip's height, 7 px before the label.
async function expectSwatch(
  chip: HTMLElement,
  look: SwatchLook,
): Promise<void> {
  const swatches = swatchesIn(chip);
  await expect(swatches, 'swatches').toHaveLength(1);
  const [swatch] = swatches;
  if (swatch === undefined) {
    throw new Error('no swatch');
  }
  const style = getComputedStyle(swatch);
  const mark = swatch.getBoundingClientRect();
  await expect(mark.width, 'swatch width').toBeCloseTo(SWATCH_SIZE, 1);
  await expect(mark.height, 'swatch height').toBeCloseTo(look.height, 1);
  await expect(style.borderTopLeftRadius, 'swatch corners').toBe(look.radius);
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `swatch ${side} border`).toBe(
      '1px',
    );
    await expect(style[`border${side}Color`], `swatch ${side} border`).toBe(
      computedColour(SWATCH),
    );
  }
  await expect(style.backgroundColor, 'swatch fill').toBe(
    computedColour(look.filled ? SWATCH : TRANSPARENT),
  );
  await expect(middle(mark), 'swatch centred').toBeCloseTo(
    middle(chip.getBoundingClientRect()),
    0,
  );
  const label = within(chip).getByText(LABEL).getBoundingClientRect();
  await expect(label.left - mark.right, 'gap to label').toBeCloseTo(GAP, 0);
}

const meta = {
  title: 'Primitives/Chip',
  component: Chip,
  render: (args) => <ControlledChip {...args} />,
  args: { label: LABEL, onClick: fn() },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

// Resting: not pressed, clear with a muted label and a divider border; no
// swatch and no meta.
export const Resting: Story = {
  args: { active: false },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(NO_MISSING_SHAPE).toBe(true);
    await expect(NO_UNLISTED_SHAPE).toBe(true);

    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: false });
    await expect(chip).toBeEnabled();
    await expect(chip.textContent, 'text').toBe(LABEL);
  },
};

// Pressed: on the accent tint with an ink label and the accent border.
export const Pressed: Story = {
  args: { active: true },
  play: async ({ canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: true });
    await expect(chip.textContent, 'text').toBe(LABEL);
  },
};

// A square swatch, the category marker, filled while pressed.
export const SquareSwatch: Story = {
  args: { active: true, swatch: SWATCH, swatchShape: 'square' },
  play: async ({ canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: true });
    await expectSwatch(chip, {
      height: SWATCH_SIZE,
      radius: '0px',
      filled: true,
    });
  },
};

// A circle swatch, the account marker.
export const CircleSwatch: Story = {
  args: { active: true, swatch: SWATCH, swatchShape: 'circle' },
  play: async ({ canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: true });
    await expectSwatch(chip, {
      height: SWATCH_SIZE,
      radius: '50%',
      filled: true,
    });
  },
};

// A line swatch, a chart series: 10 px by 3 px.
export const LineSwatch: Story = {
  args: { active: true, swatch: SWATCH, swatchShape: 'line' },
  play: async ({ canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: true });
    await expectSwatch(chip, {
      height: LINE_HEIGHT,
      radius: '0px',
      filled: true,
    });
  },
};

// A resting chip's swatch is its outline only.
export const RestingSwatch: Story = {
  args: { active: false, swatch: SWATCH, swatchShape: 'square' },
  play: async ({ canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: false });
    await expectSwatch(chip, {
      height: SWATCH_SIZE,
      radius: '0px',
      filled: false,
    });
  },
};

// An empty swatch is absent, as in Chip.dc.html (sc-if): no swatch element,
// only the label in the chip.
export const EmptySwatch: Story = {
  args: { active: true, swatch: '' },
  play: async ({ canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: true });
    await expect(chip.children, 'children of the chip').toHaveLength(1);
    await expect(chip.textContent, 'text').toBe(LABEL);
  },
};

// The meta value: muted, with tabular figures, right of the label.
export const WithMeta: Story = {
  args: { active: true, meta: META },
  play: async ({ canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: true });
    const value = within(chip).getByText(META);
    const style = getComputedStyle(value);
    await expect(style.color, 'meta colour').toBe(computedColour(TEXT_MUTED));
    await expect(style.fontVariantNumeric, 'tabular figures').toBe(
      'tabular-nums',
    );
    const label = within(chip).getByText(LABEL).getBoundingClientRect();
    const box = value.getBoundingClientRect();
    await expect(box.left - label.right, 'gap to meta').toBeCloseTo(GAP, 0);
    await expect(box.right, 'meta inside').toBeLessThan(
      chip.getBoundingClientRect().right,
    );
  },
};

// An empty meta is absent, as in Chip.dc.html (sc-if): no meta element, only
// the label in the chip.
export const EmptyMeta: Story = {
  args: { active: true, meta: '' },
  play: async ({ canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: true });
    await expect(chip.children, 'children of the chip').toHaveLength(1);
    await expect(chip.textContent, 'text').toBe(LABEL);
  },
};

// A click reports the new pressed state, and the chip shows it; a second
// click releases it.
export const Toggling: Story = {
  args: { active: false, onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const chip = theChip(canvasElement);
    const holder = chip.closest('[data-resting]');
    holder?.removeAttribute('data-resting');

    await userEvent.click(chip);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
    await expect(args.onClick).toHaveBeenLastCalledWith(true);
    await expect(theChip(canvasElement)).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(theChip(canvasElement));
    await expect(args.onClick).toHaveBeenCalledTimes(2);
    await expect(args.onClick).toHaveBeenLastCalledWith(false);
    await expect(theChip(canvasElement)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
};

// Chip.dc.html: under the pointer a chip takes the accent tint, pressed or
// not; SPEC, Focus/hover: focused from the keyboard it shows the 2 px accent
// ring, offset 2.
export const HoverAndFocus: Story = {
  args: { active: false },
  play: async ({ canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: false });
    await expect(hoveredFill(chip), 'hover fill').toBe(
      computedColour(ACCENT_100),
    );

    await userEvent.tab();
    await expect(chip).toHaveFocus();
    await expect(chip.matches(':focus-visible'), 'focus-visible').toBe(true);
    const style = getComputedStyle(chip);
    await expect(style.outlineStyle, 'outline style').toBe('solid');
    await expect(style.outlineWidth, 'outline width').toBe('2px');
    await expect(style.outlineColor, 'outline colour').toBe(
      computedColour(ACCENT),
    );
    await expect(style.outlineOffset, 'outline offset').toBe('2px');
  },
};

// A pressed chip keeps its fill under the pointer.
export const PressedHover: Story = {
  args: { active: true },
  play: async ({ canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: true });
    await expect(hoveredFill(chip), 'hover fill').toBe(
      computedColour(ACCENT_100),
    );
  },
};

// Disabled and pressed: faded, still pressed, its resting fill kept under the
// pointer; a click reports nothing and changes nothing.
export const Disabled: Story = {
  args: { active: true, disabled: true, onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: true });
    await expect(chip).toBeDisabled();
    await expect(getComputedStyle(chip).opacity, 'opacity').toBe(
      DISABLED_OPACITY,
    );
    await expect(hoveredFill(chip), 'hover fill').toBe(
      computedColour(ACCENT_100),
    );

    await userEvent.click(chip);
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(theChip(canvasElement)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  },
};

// Disabled and not pressed: faded and clear, clear under the pointer too; a
// click reports nothing and changes nothing.
export const DisabledResting: Story = {
  args: { active: false, disabled: true, onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const chip = theChip(canvasElement);
    await expectChip(chip, { pressed: false });
    await expect(chip).toBeDisabled();
    await expect(getComputedStyle(chip).opacity, 'opacity').toBe(
      DISABLED_OPACITY,
    );
    await expect(hoveredFill(chip), 'hover fill').toBe(
      computedColour(TRANSPARENT),
    );

    await userEvent.click(chip);
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(theChip(canvasElement)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  },
};
