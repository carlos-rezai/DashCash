import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { readComputedColour } from '../../test-support/readComputedColour/readComputedColour.ts';
import { Swatch } from './Swatch.tsx';

// The colours of the stories, written out from dashcash-dark.css apart from
// the Theme; each is compared through what Chromium computes for it.
// --sb-cat-2: a category (square)
const CATEGORY_2 = '#5cc697';
// --sb-acc-spending: an account marker (circle)
const SPENDING = '#d69c8e';
// --color-accent-600: Swatch.dc.html's default colour, here a series (line)
const ACCENT_600 = '#94bce3';

// SPEC section 3: the Swatch's props and no others.
type ListedProp = 'color' | 'size' | 'shape';
type SwatchProp = keyof ComponentProps<typeof Swatch>;
// Typecheck fails when a prop is missing or one is added.
type MissingProp = Exclude<ListedProp, SwatchProp>;
type UnlistedProp = Exclude<SwatchProp, ListedProp>;
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;

// SPEC section 3: the three shapes and no others.
type ListedShape = 'square' | 'circle' | 'line';
type SwatchShape = NonNullable<ComponentProps<typeof Swatch>['shape']>;
type MissingShape = Exclude<ListedShape, SwatchShape>;
type UnlistedShape = Exclude<SwatchShape, ListedShape>;
const NO_MISSING_SHAPE: [MissingShape] extends [never] ? true : false = true;
const NO_UNLISTED_SHAPE: [UnlistedShape] extends [never] ? true : false = true;

// The Swatch in a holder, so the story finds it: it has no role or text.
function renderSwatch(args: ComponentProps<typeof Swatch>) {
  return (
    <div data-testid="swatch">
      <Swatch {...args} />
    </div>
  );
}

type Look = {
  colour: string;
  width: number;
  height: number;
  borderRadius: string;
};

// The one swatch of the story: its box, colour and corners; a marker only,
// hidden from assistive technology.
async function expectSwatch(
  canvasElement: HTMLElement,
  look: Look,
): Promise<void> {
  const holder = within(canvasElement).getByTestId('swatch');
  const [swatch, ...rest] = [...holder.children];
  await expect(rest, 'more than one swatch').toHaveLength(0);
  if (swatch === undefined) {
    throw new Error('no swatch');
  }
  const box = swatch.getBoundingClientRect();
  const style = getComputedStyle(swatch);

  await expect(box.width, 'width').toBeCloseTo(look.width, 1);
  await expect(box.height, 'height').toBeCloseTo(look.height, 1);
  await expect(style.backgroundColor, 'colour').toBe(
    readComputedColour(look.colour),
  );
  await expect(style.borderRadius, 'corners').toBe(look.borderRadius);
  await expect(swatch.getAttribute('aria-hidden')).toBe('true');
}

const meta = {
  title: 'Primitives/Swatch',
  component: Swatch,
  render: renderSwatch,
} satisfies Meta<typeof Swatch>;

export default meta;

type Story = StoryObj<typeof meta>;

// The default: a 10 px square, a category's marker.
export const Square: Story = {
  args: { color: CATEGORY_2 },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(NO_MISSING_SHAPE).toBe(true);
    await expect(NO_UNLISTED_SHAPE).toBe(true);

    await expectSwatch(canvasElement, {
      colour: CATEGORY_2,
      width: 10,
      height: 10,
      borderRadius: '0px',
    });
  },
};

// A circle: an account's marker.
export const Circle: Story = {
  args: { color: SPENDING, shape: 'circle' },
  play: async ({ canvasElement }) => {
    await expectSwatch(canvasElement, {
      colour: SPENDING,
      width: 10,
      height: 10,
      borderRadius: '50%',
    });
  },
};

// A line: the given size wide, 2 px high.
export const Line: Story = {
  args: { color: ACCENT_600, shape: 'line', size: 14 },
  play: async ({ canvasElement }) => {
    await expectSwatch(canvasElement, {
      colour: ACCENT_600,
      width: 14,
      height: 2,
      borderRadius: '0px',
    });
  },
};

// The category swatches of Component Inventory.dc.html: 14 px squares.
export const Sized: Story = {
  args: { color: CATEGORY_2, shape: 'square', size: 14 },
  play: async ({ canvasElement }) => {
    await expectSwatch(canvasElement, {
      colour: CATEGORY_2,
      width: 14,
      height: 14,
      borderRadius: '0px',
    });
  },
};
