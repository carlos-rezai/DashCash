import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, within } from 'storybook/test';
import * as components from '../index.ts';
import { Card } from './Card.tsx';

// The colours a reader sees, written out from dashcash-dark.css apart from the
// Theme (SPEC, Card fill).
// --sb-card-bg = --color-surface: the card's fill
const SURFACE = '#213345';
// --sb-card-border: the text colour at 8 %, the card's softened outline
const CARD_BORDER = 'color-mix(in srgb, #e9f1fa 8%, transparent)';
// --color-accent-600: the kicker
const ACCENT_600 = '#94bce3';

// Card.dc.html: the padding of none, sm, md and lg (--space-3, -4, -6), the
// gap between the header and the content (--space-3), the 2 px between the
// kicker and the title, and the 1 px outline.
const PADDING = { none: 0, sm: 10.2, md: 13.6, lg: 20.4 } as const;
const HEADER_GAP = 10.2;
const KICKER_GAP = 2;
const BORDER = 1;
const BORDER_WIDTH = `${String(BORDER)}px`;

// Card.dc.html and styles.css (.card-kicker, .card-title): the kicker at
// 10 px, 0.1em, upper case; the title in the heading font at 19 px, 1.2.
const KICKER_SIZE = 10;
const KICKER_SPACING = 0.1 * KICKER_SIZE;
const TITLE_SIZE = 19;
const TITLE_LINE_HEIGHT = 1.2 * TITLE_SIZE;
const HEADING_FONT = 'Barlow Condensed';
const HEADING_WEIGHT = '600';

// The prototype's preview width and height.
const FRAME_WIDTH = 360;
const FRAME_HEIGHT = 200;
// A content wider than the frame, and a frame narrower than the card's
// content, for the stories that check the card shrinks.
const WIDE_CONTENT = 400;
const NARROW_FRAME = 200;

// The copy of Component Inventory.dc.html.
const KICKER = 'Card';
const TITLE = 'Blueprint card';
const BODY =
  'Transparent, hairline-bordered, square. padding: none · sm · md · lg.';
// An invented title without a break opportunity, wider than a narrow card.
const LONG_TITLE = 'Sondertilgungsvereinbarungsübersicht';

// SPEC section 3: the Card's props, without the actions slot (design log Q7),
// and no others; children alone is required. Typecheck fails when a prop is
// missing, one is added, or one changes between required and optional.
type CardProps = ComponentProps<typeof Card>;
type ListedProp = 'kicker' | 'title' | 'padding' | 'children';
type CardProp = keyof CardProps;
type MissingProp = Exclude<ListedProp, CardProp>;
type UnlistedProp = Exclude<CardProp, ListedProp>;
type RequiredProp = {
  [Key in CardProp]-?: object extends Pick<CardProps, Key> ? never : Key;
}[CardProp];
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;
const ONLY_CHILDREN_REQUIRED: [RequiredProp] extends ['children']
  ? ['children'] extends [RequiredProp]
    ? true
    : false
  : false = true;

// SPEC section 3: the four paddings, and no others.
type ListedPadding = 'none' | 'sm' | 'md' | 'lg';
type CardPadding = NonNullable<CardProps['padding']>;
type MissingPadding = Exclude<ListedPadding, CardPadding>;
type UnlistedPadding = Exclude<CardPadding, ListedPadding>;
const NO_MISSING_PADDING: [MissingPadding] extends [never] ? true : false =
  true;
const NO_UNLISTED_PADDING: [UnlistedPadding] extends [never] ? true : false =
  true;

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

// Holds the Card out of the pointer's reach while its resting colours are
// read: Chromium on Linux can apply :hover without pointer movement.
const Holder = styled.div`
  width: ${FRAME_WIDTH}px;

  &[data-resting] {
    pointer-events: none;
  }
`;

// A holder with a height of its own: the card fills it.
const TallHolder = styled(Holder)`
  height: ${FRAME_HEIGHT}px;
`;

// A narrow holder whose child is a flex item: a flex item does not shrink
// below its content unless it allows it.
const NarrowFlexHolder = styled(Holder)`
  display: flex;
  width: ${NARROW_FRAME}px;
`;

// A narrow holder: the card takes its width.
const NarrowHolder = styled(Holder)`
  width: ${NARROW_FRAME}px;
`;

const WideContent = styled.div`
  width: ${WIDE_CONTENT}px;
`;

// The card: the one element the holder holds.
function theCard(canvasElement: HTMLElement): HTMLElement {
  const card = within(canvasElement).getByTestId('holder').firstElementChild;
  if (!(card instanceof HTMLElement)) {
    throw new Error('no card');
  }
  return card;
}

function theText(canvasElement: HTMLElement, text: string): HTMLElement {
  return within(canvasElement).getByText(text);
}

type Look = {
  padding: number;
  kicker?: HTMLElement;
  title?: HTMLElement;
  // The content the card holds.
  body: HTMLElement;
};

// The card at rest: the surface fill inside a 1 px solid outline in the soft
// card border; the content inset by the padding on every side. With a
// header, the header starts at the padding and the content follows it after
// the header gap; without one, the content starts at the padding. Read
// inside the holder; afterwards the pointer may reach the card again.
async function expectCard(card: HTMLElement, look: Look): Promise<void> {
  const holder = card.closest('[data-resting]');
  if (holder === null) {
    throw new Error('the card is not held at rest');
  }
  await expect(card.matches(':hover'), 'hovered').toBe(false);

  const style = getComputedStyle(card);
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

  const inset = BORDER + look.padding;
  const box = card.getBoundingClientRect();
  const body = look.body.getBoundingClientRect();
  await expect(body.left - box.left, 'content left').toBeCloseTo(inset, 1);
  await expect(box.right - body.right, 'content right').toBeCloseTo(inset, 1);
  await expect(box.bottom - body.bottom, 'content bottom').toBeCloseTo(
    inset,
    1,
  );

  const header = [look.kicker, look.title].filter(
    (element) => element !== undefined,
  );
  const [first] = header;
  const last = header.at(-1);
  if (first === undefined || last === undefined) {
    await expect(body.top - box.top, 'content top').toBeCloseTo(inset, 1);
  } else {
    const top = first.getBoundingClientRect();
    await expect(top.top - box.top, 'header top').toBeCloseTo(inset, 1);
    await expect(
      body.top - last.getBoundingClientRect().bottom,
      'header gap',
    ).toBeCloseTo(HEADER_GAP, 1);
    for (const element of header) {
      await expect(
        element.getBoundingClientRect().left - box.left,
        'header left',
      ).toBeCloseTo(inset, 1);
    }
  }

  if (look.kicker !== undefined && look.title !== undefined) {
    await expect(
      look.title.getBoundingClientRect().top -
        look.kicker.getBoundingClientRect().bottom,
      'kicker gap',
    ).toBeCloseTo(KICKER_GAP, 1);
  }

  if (look.kicker !== undefined) {
    const kicker = getComputedStyle(look.kicker);
    await expect(kicker.color, 'kicker colour').toBe(
      computedColour(ACCENT_600),
    );
    await expect(kicker.fontSize, 'kicker size').toBe(
      `${String(KICKER_SIZE)}px`,
    );
    await expect(
      Number.parseFloat(kicker.letterSpacing),
      'kicker spacing',
    ).toBeCloseTo(KICKER_SPACING, 2);
    await expect(kicker.textTransform, 'kicker case').toBe('uppercase');
  }

  if (look.title !== undefined) {
    const title = getComputedStyle(look.title);
    await expect(firstFamily(title), 'title font').toBe(HEADING_FONT);
    await expect(title.fontWeight, 'title weight').toBe(HEADING_WEIGHT);
    await expect(title.fontSize, 'title size').toBe(`${String(TITLE_SIZE)}px`);
    await expect(
      Number.parseFloat(title.lineHeight),
      'title line height',
    ).toBeCloseTo(TITLE_LINE_HEIGHT, 1);
  }

  holder.removeAttribute('data-resting');
}

const meta = {
  title: 'Components/Card',
  component: Card,
  render: (args) => (
    <Holder data-testid="holder" data-resting="">
      <Card {...args} />
    </Holder>
  ),
  args: { children: <span>{BODY}</span> },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

// The inventory's card: kicker and title, the default padding md.
export const Default: Story = {
  args: { kicker: KICKER, title: TITLE },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(ONLY_CHILDREN_REQUIRED).toBe(true);
    await expect(NO_MISSING_PADDING).toBe(true);
    await expect(NO_UNLISTED_PADDING).toBe(true);
    await expect(components.Card, 'exported by the barrel').toBe(Card);

    await expectCard(theCard(canvasElement), {
      padding: PADDING.md,
      kicker: theText(canvasElement, KICKER),
      title: theText(canvasElement, TITLE),
      body: theText(canvasElement, BODY),
    });
  },
};

// Padding none, with kicker and title: the content and the header touch the
// outline.
export const PaddingNone: Story = {
  args: { kicker: KICKER, title: TITLE, padding: 'none' },
  play: async ({ canvasElement }) => {
    await expectCard(theCard(canvasElement), {
      padding: PADDING.none,
      kicker: theText(canvasElement, KICKER),
      title: theText(canvasElement, TITLE),
      body: theText(canvasElement, BODY),
    });
  },
};

// Padding sm, with kicker and title.
export const PaddingSmall: Story = {
  args: { kicker: KICKER, title: TITLE, padding: 'sm' },
  play: async ({ canvasElement }) => {
    await expectCard(theCard(canvasElement), {
      padding: PADDING.sm,
      kicker: theText(canvasElement, KICKER),
      title: theText(canvasElement, TITLE),
      body: theText(canvasElement, BODY),
    });
  },
};

// Padding lg, with kicker and title.
export const PaddingLarge: Story = {
  args: { kicker: KICKER, title: TITLE, padding: 'lg' },
  play: async ({ canvasElement }) => {
    await expectCard(theCard(canvasElement), {
      padding: PADDING.lg,
      kicker: theText(canvasElement, KICKER),
      title: theText(canvasElement, TITLE),
      body: theText(canvasElement, BODY),
    });
  },
};

// Padding none without kicker and title: no header, the content alone.
export const PaddingNoneWithoutHeader: Story = {
  args: { padding: 'none' },
  play: async ({ canvasElement }) => {
    await expectCard(theCard(canvasElement), {
      padding: PADDING.none,
      body: theText(canvasElement, BODY),
    });
  },
};

// Padding sm without kicker and title.
export const PaddingSmallWithoutHeader: Story = {
  args: { padding: 'sm' },
  play: async ({ canvasElement }) => {
    await expectCard(theCard(canvasElement), {
      padding: PADDING.sm,
      body: theText(canvasElement, BODY),
    });
  },
};

// Padding md, given, without kicker and title.
export const PaddingMediumWithoutHeader: Story = {
  args: { padding: 'md' },
  play: async ({ canvasElement }) => {
    await expectCard(theCard(canvasElement), {
      padding: PADDING.md,
      body: theText(canvasElement, BODY),
    });
  },
};

// Padding lg without kicker and title.
export const PaddingLargeWithoutHeader: Story = {
  args: { padding: 'lg' },
  play: async ({ canvasElement }) => {
    await expectCard(theCard(canvasElement), {
      padding: PADDING.lg,
      body: theText(canvasElement, BODY),
    });
  },
};

// A kicker without a title: the content follows the kicker after the header
// gap.
export const KickerOnly: Story = {
  args: { kicker: KICKER },
  play: async ({ canvasElement }) => {
    await expectCard(theCard(canvasElement), {
      padding: PADDING.md,
      kicker: theText(canvasElement, KICKER),
      body: theText(canvasElement, BODY),
    });
  },
};

// A title without a kicker: the title starts at the padding.
export const TitleOnly: Story = {
  args: { title: TITLE },
  play: async ({ canvasElement }) => {
    await expectCard(theCard(canvasElement), {
      padding: PADDING.md,
      title: theText(canvasElement, TITLE),
      body: theText(canvasElement, BODY),
    });
  },
};

// In a holder with a height: the card fills it.
export const FillsHeight: Story = {
  args: { kicker: KICKER, title: TITLE },
  render: (args) => (
    <TallHolder data-testid="holder" data-resting="">
      <Card {...args} />
    </TallHolder>
  ),
  play: async ({ canvasElement }) => {
    const card = theCard(canvasElement);
    await expect(card.getBoundingClientRect().height, 'height').toBeCloseTo(
      FRAME_HEIGHT,
      1,
    );
  },
};

// A flex item narrower than its content: the card shrinks to the width it
// is given.
export const ShrinksInFlexRow: Story = {
  args: { kicker: KICKER, title: TITLE, children: <WideContent /> },
  render: (args) => (
    <NarrowFlexHolder data-testid="holder" data-resting="">
      <Card {...args} />
    </NarrowFlexHolder>
  ),
  play: async ({ canvasElement }) => {
    const card = theCard(canvasElement);
    await expect(card.getBoundingClientRect().width, 'width').toBeCloseTo(
      NARROW_FRAME,
      1,
    );
  },
};

// A title wider than the card: the header shrinks to the card's inner width,
// so the title does not widen it.
export const LongTitle: Story = {
  args: { kicker: KICKER, title: LONG_TITLE },
  render: (args) => (
    <NarrowHolder data-testid="holder" data-resting="">
      <Card {...args} />
    </NarrowHolder>
  ),
  play: async ({ canvasElement }) => {
    const title = theText(canvasElement, LONG_TITLE);
    await expect(
      title.getBoundingClientRect().width,
      'title width',
    ).toBeCloseTo(NARROW_FRAME - 2 * (BORDER + PADDING.md), 1);
  },
};
