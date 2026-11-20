import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, within } from 'storybook/test';
import { toCents, type Cents } from '@dashcash/domain/money/cents/cents';
import * as components from '../index.ts';
import { StatTile } from './StatTile.tsx';

// The colours a reader sees, written out from dashcash-dark.css and design
// log D1, apart from the Theme (SPEC, Card fill: stat tiles take the card's
// fill and outline).
// --sb-card-bg = --color-surface: the tile's fill
const SURFACE = '#213345';
// --sb-card-border: the text colour at 8 %, the tile's softened outline
const CARD_BORDER = 'color-mix(in srgb, #e9f1fa 8%, transparent)';
// --sb-text-muted: the label and the hint
const TEXT_MUTED = 'color-mix(in srgb, #e9f1fa 62%, transparent)';
// --color-text: a text value in the default tone
const INK = '#e9f1fa';
// --color-accent-600: the accent tone
const ACCENT_600 = '#94bce3';
// --sb-warning: the warning tone
const WARNING = '#e0b469';
// --sb-danger, raised to #ed8c80 (D1): the danger tone
const DANGER = '#ed8c80';
// --sb-negative, raised to #ed8c80 (D1): a negative amount in the default
// tone, which passes Amount its Polarity colour
const NEGATIVE = '#ed8c80';

// StatTile.dc.html: the padding (--space-4), 6 px between label, value and
// hint, the 1 px outline; the label at 11 px, 0.1em, upper case; the value in
// the heading font at 22 px, 1.15 (Amount lg for money); the hint at 13 px.
const PADDING = 13.6;
const GAP = 6;
const BORDER = 1;
const BORDER_WIDTH = `${String(BORDER)}px`;
const INSET = BORDER + PADDING;
const LABEL_SIZE = 11;
const LABEL_SPACING = 0.1 * LABEL_SIZE;
const VALUE_SIZE = 22;
const VALUE_LINE_HEIGHT = 1.15 * VALUE_SIZE;
const HINT_SIZE = 13;
const HEADING_FONT = 'Barlow Condensed';
const HEADING_WEIGHT = '600';

// The prototype's preview width, and a frame narrower than the amount.
const FRAME_WIDTH = 240;
const NARROW_FRAME = 100;

// The copy of Component Inventory.dc.html; the zero difference is invented.
const ROWS = 'Rows in file';
const ROWS_VALUE = '24';
const ROWS_HINT = '15 Sep – 25 Oct 2026';
const SPENDING = 'Total spending';
const SPENDING_CENTS = toCents(-55785);
// U+2212 and U+00A0, as formatCents writes them.
const SPENDING_TEXT = '−557,85 €';
const SPENDING_HINT = 'Across the new rows';
const DIFFERENCE = 'Difference';
const ZERO_TEXT = '0,00 €';

// SPEC section 3: the StatTile's props and no others; label alone is
// required. Typecheck fails when a prop is missing, one is added, or one
// changes between required and optional.
type StatTileProps = ComponentProps<typeof StatTile>;
type ListedProp = 'label' | 'value' | 'cents' | 'hint' | 'tone';
type StatTileProp = keyof StatTileProps;
type MissingProp = Exclude<ListedProp, StatTileProp>;
type UnlistedProp = Exclude<StatTileProp, ListedProp>;
type RequiredProp = {
  [Key in StatTileProp]-?: object extends Pick<StatTileProps, Key>
    ? never
    : Key;
}[StatTileProp];
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;
const ONLY_LABEL_REQUIRED: [RequiredProp] extends ['label']
  ? ['label'] extends [RequiredProp]
    ? true
    : false
  : false = true;

// SPEC section 3: the four tones, and no others; money as Cents.
type ListedTone = 'default' | 'accent' | 'warning' | 'danger';
type StatTileTone = NonNullable<StatTileProps['tone']>;
type MissingTone = Exclude<ListedTone, StatTileTone>;
type UnlistedTone = Exclude<StatTileTone, ListedTone>;
const NO_MISSING_TONE: [MissingTone] extends [never] ? true : false = true;
const NO_UNLISTED_TONE: [UnlistedTone] extends [never] ? true : false = true;
type StatTileCents = NonNullable<StatTileProps['cents']>;
const CENTS_ARE_CENTS: [StatTileCents] extends [Cents]
  ? [Cents] extends [StatTileCents]
    ? true
    : false
  : false = true;

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

// The first family of a computed font-family, without quotes: Chromium quotes
// only names that contain a space.
function firstFamily(style: CSSStyleDeclaration): string | undefined {
  return style.fontFamily.split(',')[0]?.trim().replaceAll('"', '');
}

// Holds the StatTile out of the pointer's reach while its resting colours are
// read: Chromium on Linux can apply :hover without pointer movement.
const Holder = styled.div`
  width: ${FRAME_WIDTH}px;

  &[data-resting] {
    pointer-events: none;
  }
`;

// A narrow holder whose child is a flex item: a flex item does not shrink
// below its content unless it allows it.
const NarrowFlexHolder = styled(Holder)`
  display: flex;
  width: ${NARROW_FRAME}px;
`;

// The tile: the one element the holder holds.
function theTile(canvasElement: HTMLElement): HTMLElement {
  const tile = within(canvasElement).getByTestId('holder').firstElementChild;
  if (!(tile instanceof HTMLElement)) {
    throw new Error('no tile');
  }
  return tile;
}

// The identity normaliser keeps U+00A0, which the default turns into a space.
function theText(canvasElement: HTMLElement, text: string): HTMLElement {
  return within(canvasElement).getByText(text, {
    normalizer: (content) => content,
  });
}

type Look = {
  label: string;
  // The value's text as the reader sees it, the amount's included.
  value: string;
  valueColour: string;
  hint?: string;
};

// The tile at rest: the card fill inside a 1 px solid outline in the soft
// card border; inside the padding the label in the muted kicker style, the
// value 6 px below it in the heading font at 22 px in its colour, and the
// hint 6 px below the value in the muted colour; without a hint the tile ends
// with the value. Read inside the holder; afterwards the pointer may reach
// the tile again.
async function expectTile(
  canvasElement: HTMLElement,
  look: Look,
): Promise<void> {
  const tile = theTile(canvasElement);
  const holder = tile.closest('[data-resting]');
  if (holder === null) {
    throw new Error('the tile is not held at rest');
  }
  await expect(tile.matches(':hover'), 'hovered').toBe(false);

  const style = getComputedStyle(tile);
  await expect(style.backgroundColor, 'fill').toBe(computedColour(SURFACE));
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `${side} border`).toBe(
      BORDER_WIDTH,
    );
    await expect(style[`border${side}Style`], `${side} style`).toBe('solid');
    await expect(style[`border${side}Color`], `${side} colour`).toBe(
      computedColour(CARD_BORDER),
    );
  }
  const box = tile.getBoundingClientRect();

  const label = theText(canvasElement, look.label);
  const labelBox = label.getBoundingClientRect();
  const labelStyle = getComputedStyle(label);
  await expect(labelStyle.color, 'label colour').toBe(
    computedColour(TEXT_MUTED),
  );
  await expect(labelStyle.fontSize, 'label size').toBe(
    `${String(LABEL_SIZE)}px`,
  );
  await expect(
    Number.parseFloat(labelStyle.letterSpacing),
    'label spacing',
  ).toBeCloseTo(LABEL_SPACING, 2);
  await expect(labelStyle.textTransform, 'label case').toBe('uppercase');
  await expect(labelBox.top - box.top, 'label top').toBeCloseTo(INSET, 1);
  await expect(labelBox.left - box.left, 'label left').toBeCloseTo(INSET, 1);
  await expect(box.right - labelBox.right, 'label right').toBeCloseTo(INSET, 1);

  const value = theText(canvasElement, look.value);
  const valueBox = value.getBoundingClientRect();
  const valueStyle = getComputedStyle(value);
  await expect(valueStyle.color, 'value colour').toBe(
    computedColour(look.valueColour),
  );
  await expect(firstFamily(valueStyle), 'value font').toBe(HEADING_FONT);
  await expect(valueStyle.fontWeight, 'value weight').toBe(HEADING_WEIGHT);
  await expect(valueStyle.fontSize, 'value size').toBe(
    `${String(VALUE_SIZE)}px`,
  );
  await expect(
    Number.parseFloat(valueStyle.lineHeight),
    'value line height',
  ).toBeCloseTo(VALUE_LINE_HEIGHT, 1);
  await expect(valueStyle.fontVariantNumeric, 'value figures').toBe(
    'tabular-nums',
  );
  await expect(valueBox.top - labelBox.bottom, 'value gap').toBeCloseTo(GAP, 1);
  await expect(valueBox.left - box.left, 'value left').toBeCloseTo(INSET, 1);

  if (look.hint === undefined) {
    await expect(box.bottom - valueBox.bottom, 'tile end').toBeCloseTo(
      INSET,
      1,
    );
  } else {
    const hint = theText(canvasElement, look.hint);
    const hintBox = hint.getBoundingClientRect();
    const hintStyle = getComputedStyle(hint);
    await expect(hintStyle.color, 'hint colour').toBe(
      computedColour(TEXT_MUTED),
    );
    await expect(hintStyle.fontSize, 'hint size').toBe(
      `${String(HINT_SIZE)}px`,
    );
    await expect(
      hintStyle.getPropertyValue('text-wrap-style'),
      'hint wrap',
    ).toBe('pretty');
    await expect(hintBox.top - valueBox.bottom, 'hint gap').toBeCloseTo(GAP, 1);
    await expect(hintBox.left - box.left, 'hint left').toBeCloseTo(INSET, 1);
    await expect(box.bottom - hintBox.bottom, 'tile end').toBeCloseTo(INSET, 1);
  }

  holder.removeAttribute('data-resting');
}

const meta = {
  title: 'Components/StatTile',
  component: StatTile,
  render: (args) => (
    <Holder data-testid="holder" data-resting="">
      <StatTile {...args} />
    </Holder>
  ),
  args: { label: ROWS },
} satisfies Meta<typeof StatTile>;

export default meta;

type Story = StoryObj<typeof meta>;

// The inventory's text tile in the default tone: the value in ink.
export const Text: Story = {
  args: { label: ROWS, value: ROWS_VALUE, hint: ROWS_HINT },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(ONLY_LABEL_REQUIRED).toBe(true);
    await expect(NO_MISSING_TONE).toBe(true);
    await expect(NO_UNLISTED_TONE).toBe(true);
    await expect(CENTS_ARE_CENTS).toBe(true);
    await expect(
      components.StatTile === StatTile,
      'exported by the barrel',
    ).toBe(true);

    await expectTile(canvasElement, {
      label: ROWS,
      value: ROWS_VALUE,
      valueColour: INK,
      hint: ROWS_HINT,
    });
  },
};

// A text value in the accent tone.
export const TextAccent: Story = {
  args: { label: ROWS, value: ROWS_VALUE, hint: ROWS_HINT, tone: 'accent' },
  play: async ({ canvasElement }) => {
    await expectTile(canvasElement, {
      label: ROWS,
      value: ROWS_VALUE,
      valueColour: ACCENT_600,
      hint: ROWS_HINT,
    });
  },
};

// A text value in the warning tone.
export const TextWarning: Story = {
  args: { label: ROWS, value: ROWS_VALUE, hint: ROWS_HINT, tone: 'warning' },
  play: async ({ canvasElement }) => {
    await expectTile(canvasElement, {
      label: ROWS,
      value: ROWS_VALUE,
      valueColour: WARNING,
      hint: ROWS_HINT,
    });
  },
};

// A text value in the danger tone.
export const TextDanger: Story = {
  args: { label: ROWS, value: ROWS_VALUE, hint: ROWS_HINT, tone: 'danger' },
  play: async ({ canvasElement }) => {
    await expectTile(canvasElement, {
      label: ROWS,
      value: ROWS_VALUE,
      valueColour: DANGER,
      hint: ROWS_HINT,
    });
  },
};

// The inventory's money tile in the default tone: the Amount in its Polarity
// colour, red for spending.
export const Money: Story = {
  args: { label: SPENDING, cents: SPENDING_CENTS, hint: SPENDING_HINT },
  play: async ({ canvasElement }) => {
    await expectTile(canvasElement, {
      label: SPENDING,
      value: SPENDING_TEXT,
      valueColour: NEGATIVE,
      hint: SPENDING_HINT,
    });
  },
};

// Money in the accent tone: the tile passes its tone to the Amount.
export const MoneyAccent: Story = {
  args: {
    label: SPENDING,
    cents: SPENDING_CENTS,
    hint: SPENDING_HINT,
    tone: 'accent',
  },
  play: async ({ canvasElement }) => {
    await expectTile(canvasElement, {
      label: SPENDING,
      value: SPENDING_TEXT,
      valueColour: ACCENT_600,
      hint: SPENDING_HINT,
    });
  },
};

// Money in the warning tone.
export const MoneyWarning: Story = {
  args: {
    label: SPENDING,
    cents: SPENDING_CENTS,
    hint: SPENDING_HINT,
    tone: 'warning',
  },
  play: async ({ canvasElement }) => {
    await expectTile(canvasElement, {
      label: SPENDING,
      value: SPENDING_TEXT,
      valueColour: WARNING,
      hint: SPENDING_HINT,
    });
  },
};

// Money in the danger tone.
export const MoneyDanger: Story = {
  args: {
    label: SPENDING,
    cents: SPENDING_CENTS,
    hint: SPENDING_HINT,
    tone: 'danger',
  },
  play: async ({ canvasElement }) => {
    await expectTile(canvasElement, {
      label: SPENDING,
      value: SPENDING_TEXT,
      valueColour: DANGER,
      hint: SPENDING_HINT,
    });
  },
};

// Zero cents are money too: the Amount "0,00 €" in ink, not a text value.
export const MoneyZero: Story = {
  args: { label: DIFFERENCE, cents: toCents(0) },
  play: async ({ canvasElement }) => {
    await expectTile(canvasElement, {
      label: DIFFERENCE,
      value: ZERO_TEXT,
      valueColour: INK,
    });
  },
};

// No hint: the tile ends with the value.
export const WithoutHint: Story = {
  args: { label: ROWS, value: ROWS_VALUE },
  play: async ({ canvasElement }) => {
    await expectTile(canvasElement, {
      label: ROWS,
      value: ROWS_VALUE,
      valueColour: INK,
    });
  },
};

// A flex item narrower than its amount: the tile shrinks to the width it is
// given.
export const ShrinksInFlexRow: Story = {
  args: { label: SPENDING, cents: SPENDING_CENTS, hint: SPENDING_HINT },
  render: (args) => (
    <NarrowFlexHolder data-testid="holder" data-resting="">
      <StatTile {...args} />
    </NarrowFlexHolder>
  ),
  play: async ({ canvasElement }) => {
    await expect(
      theTile(canvasElement).getBoundingClientRect().width,
      'tile width',
    ).toBeCloseTo(NARROW_FRAME, 1);
  },
};
