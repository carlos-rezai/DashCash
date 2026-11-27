import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { toCents } from '@dashcash/domain/money/cents/cents';
import { readFirstFamily } from '../../test-support/readFirstFamily/readFirstFamily.ts';
import { Amount } from './Amount.tsx';

// The colours a reader sees, written out from SPEC section 2 and design
// log D1, apart from the Theme: Chromium reports computed colours as rgb().
// --color-text #e9f1fa
const INK = 'rgb(233, 241, 250)';
// --sb-positive #7cc59a
const GREEN = 'rgb(124, 197, 154)';
// --sb-negative and --sb-danger, raised by D1 to #ed8c80
const RED = 'rgb(237, 140, 128)';
// --sb-warning #e0b469
const AMBER = 'rgb(224, 180, 105)';
// --color-accent-600 #94bce3
const ACCENT = 'rgb(148, 188, 227)';

const BODY_FONT = 'Barlow';
const HEADING_FONT = 'Barlow Condensed';

type Look = {
  // The formatted text, U+2212 and U+00A0 included.
  text: string;
  color: string;
  fontSize: string;
  font: string;
  fontWeight: string;
};

// The look of a body-sized amount: md, Barlow 400.
const BODY: Omit<Look, 'text' | 'color'> = {
  fontSize: '14px',
  font: BODY_FONT,
  fontWeight: '400',
};

async function expectAmount(
  canvasElement: HTMLElement,
  look: Look,
): Promise<void> {
  // The identity normaliser keeps U+00A0, which the default turns into a space.
  const amount = within(canvasElement).getByText(look.text, {
    normalizer: (text) => text,
  });
  const style = getComputedStyle(amount);

  await expect(style.color).toBe(look.color);
  await expect(style.fontSize).toBe(look.fontSize);
  await expect(readFirstFamily(style)).toBe(look.font);
  await expect(style.fontWeight).toBe(look.fontWeight);
  await expect(style.fontVariantNumeric).toBe('tabular-nums');

  // Full strength: nothing between the amount and the canvas fades it (D1).
  for (
    let element: HTMLElement | null = amount;
    element !== null && element !== canvasElement;
    element = element.parentElement
  ) {
    await expect(getComputedStyle(element).opacity).toBe('1');
  }
}

const meta = {
  title: 'Primitives/Amount',
  component: Amount,
} satisfies Meta<typeof Amount>;

export default meta;

type Story = StoryObj<typeof meta>;

// Tones. Values from Component Inventory.dc.html where it has one, else
// invented.

export const Auto: Story = {
  args: { cents: toCents(50000), sign: 'always', tone: 'auto' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '+500,00 €',
      color: GREEN,
      ...BODY,
    });
  },
};

// A projected value: the Polarity colour like auto, at full opacity (D1).
export const Muted: Story = {
  args: { cents: toCents(3000000), whole: true, tone: 'muted', size: 'sm' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '30.000 €',
      color: GREEN,
      ...BODY,
      fontSize: '13px',
    });
  },
};

// Neutral opts out of Polarity: a negative amount in ink.
export const Neutral: Story = {
  args: { cents: toCents(-8640), tone: 'neutral' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '−86,40 €',
      color: INK,
      ...BODY,
    });
  },
};

export const Positive: Story = {
  args: { cents: toCents(123456), tone: 'positive' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '1.234,56 €',
      color: GREEN,
      ...BODY,
    });
  },
};

// The mortgage's remaining debt: stored positive, shown red (SPEC section 2).
export const Negative: Story = {
  args: { cents: toCents(1952960), tone: 'negative' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '19.529,60 €',
      color: RED,
      ...BODY,
    });
  },
};

export const Warning: Story = {
  args: { cents: toCents(6760), tone: 'warning' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '67,60 €',
      color: AMBER,
      ...BODY,
    });
  },
};

export const Danger: Story = {
  args: { cents: toCents(-2000), tone: 'danger' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '−20,00 €',
      color: RED,
      ...BODY,
    });
  },
};

export const Accent: Story = {
  args: { cents: toCents(250000), tone: 'accent' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '2.500,00 €',
      color: ACCENT,
      ...BODY,
    });
  },
};

// Sizes: sm 13, md 14, lg 22, xl 34; lg and xl in Barlow Condensed 600.

export const Small: Story = {
  args: { cents: toCents(4218), size: 'sm' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '42,18 €',
      color: GREEN,
      ...BODY,
      fontSize: '13px',
    });
  },
};

export const Medium: Story = {
  args: { cents: toCents(-4218), size: 'md' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '−42,18 €',
      color: RED,
      ...BODY,
    });
  },
};

export const Large: Story = {
  args: { cents: toCents(123456), size: 'lg' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '1.234,56 €',
      color: GREEN,
      fontSize: '22px',
      font: HEADING_FONT,
      fontWeight: '600',
    });
  },
};

export const ExtraLarge: Story = {
  args: { cents: toCents(1952960), size: 'xl' },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '19.529,60 €',
      color: GREEN,
      fontSize: '34px',
      font: HEADING_FONT,
      fontWeight: '600',
    });
  },
};

export const Strong: Story = {
  args: { cents: toCents(6760), tone: 'warning', strong: true },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '67,60 €',
      color: AMBER,
      ...BODY,
      fontWeight: '500',
    });
  },
};

// Zero has no sign and no Polarity colour: ink.
export const Zero: Story = {
  args: { cents: toCents(0) },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '0,00 €',
      color: INK,
      ...BODY,
    });
  },
};

// No amount yet: "-" in ink.
export const Empty: Story = {
  args: { cents: null },
  play: async ({ canvasElement }) => {
    await expectAmount(canvasElement, {
      text: '-',
      color: INK,
      ...BODY,
    });
  },
};
