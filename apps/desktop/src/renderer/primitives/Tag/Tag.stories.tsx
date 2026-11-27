import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Icon } from '../Icon/Icon.tsx';
import { Tag, type TagTone } from './Tag.tsx';

// The colours a reader sees, written out from SPEC section 3 (Tag fills),
// SPEC section 2 (Milestone), dashcash-dark.css and design log D1, apart from
// the Theme. The tints stay color-mix() strings, so each is compared through
// what Chromium computes for it.
// --color-accent-300 and --color-accent-900: the accent fill
const ACCENT_300 = '#416180';
const ACCENT_900 = '#eef6ff';
// --color-neutral-300 and --color-neutral-900: the neutral fill
const NEUTRAL_300 = '#3f5063';
const NEUTRAL_900 = '#eef2f6';
// --color-accent-600 text and --color-accent-400 border: the outline
const ACCENT_600 = '#94bce3';
const ACCENT_400 = '#597ea3';
// --sb-warning and --sb-warning-tint (14 %)
const WARNING = '#e0b469';
const WARNING_TINT = 'color-mix(in srgb, #e0b469 14%, transparent)';
// --sb-danger, raised to #ed8c80 (D1); --sb-danger-tint keeps #e8877b (D1)
const DANGER = '#ed8c80';
const DANGER_TINT = 'color-mix(in srgb, #e8877b 14%, transparent)';
// --sb-milestone (the positive green) and --sb-milestone-tint (16 %)
const MILESTONE = '#7cc59a';
const MILESTONE_TINT = 'color-mix(in srgb, #7cc59a 16%, transparent)';
// --sb-cat-2: the category colour of the swatch story
const CATEGORY_2 = '#5cc697';
const TRANSPARENT = 'transparent';

// Tag.dc.html and styles.css .tag: 22 px high, 11 px text, a 12 px icon and
// an 8 px swatch.
const TAG_HEIGHT = 22;
const TAG_FONT_SIZE = '11px';
const ICON_SIZE = 12;
const SWATCH_SIZE = 8;
// The side padding, and the gap between the icon or swatch and the label.
const TAG_PADDING = '8px';
const TAG_GAP = 5;
// The label's letter spacing: 0.02em at the tag's font size.
const TAG_LETTER_SPACING = '0.02em';

// SPEC section 1's five tones plus milestone (SPEC section 2, Milestone).
type ListedTone =
  'accent' | 'neutral' | 'outline' | 'warning' | 'danger' | 'milestone';
// Typecheck fails when a tone is missing or one is added.
type MissingTone = Exclude<ListedTone, TagTone>;
type UnlistedTone = Exclude<TagTone, ListedTone>;
const NO_MISSING_TONE: [MissingTone] extends [never] ? true : false = true;
const NO_UNLISTED_TONE: [UnlistedTone] extends [never] ? true : false = true;

// SPEC section 3: the Tag's props and no others.
type ListedProp = 'label' | 'tone' | 'icon' | 'swatch';
type TagProp = keyof ComponentProps<typeof Tag>;
type MissingProp = Exclude<ListedProp, TagProp>;
type UnlistedProp = Exclude<TagProp, ListedProp>;
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;

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

// What Chromium computes as the letter spacing of a probe at the tag's font
// size, for a CSS length such as 0.02em.
function computedLetterSpacing(css: string): string {
  const probe = document.createElement('span');
  probe.style.fontSize = TAG_FONT_SIZE;
  probe.style.letterSpacing = css;
  document.body.append(probe);
  const value = getComputedStyle(probe).letterSpacing;
  probe.remove();
  return value;
}

// The Tag of the story: the one element its holder renders.
function theTag(canvasElement: HTMLElement): HTMLElement {
  const holder = within(canvasElement).getByTestId('tag');
  const [tag, ...rest] = [...holder.children];
  if (!(tag instanceof HTMLElement) || rest.length > 0) {
    throw new Error('the holder does not hold exactly one tag');
  }
  return tag;
}

// The Tag in a holder, and, when it names an icon, a hidden reference Icon of
// that glyph at the tag's icon size to compare the drawing with.
function renderTag(args: ComponentProps<typeof Tag>) {
  return (
    <>
      <div data-testid="tag">
        <Tag {...args} />
      </div>
      {args.icon === undefined ? null : (
        <div data-testid="reference" hidden>
          <Icon glyph={args.icon} size={ICON_SIZE} />
        </div>
      )}
    </>
  );
}

type Look = {
  label: string;
  text: string;
  fill: string;
  // The border's colour; none when the tone draws no border.
  border?: string;
};

// The tag's height, fill, border and its label's text and colour.
async function expectTag(
  canvasElement: HTMLElement,
  look: Look,
): Promise<{ tag: HTMLElement; label: HTMLElement }> {
  const tag = theTag(canvasElement);
  const label = within(tag).getByText(look.label);
  const style = getComputedStyle(tag);

  await expect(tag.getBoundingClientRect().height, 'height').toBeCloseTo(
    TAG_HEIGHT,
    1,
  );
  await expect(style.backgroundColor, 'fill').toBe(computedColour(look.fill));
  await expect(getComputedStyle(label).color, 'text').toBe(
    computedColour(look.text),
  );
  await expect(getComputedStyle(label).fontSize, 'font size').toBe(
    TAG_FONT_SIZE,
  );
  await expect(style.paddingLeft, 'padding left').toBe(TAG_PADDING);
  await expect(style.paddingRight, 'padding right').toBe(TAG_PADDING);
  await expect(getComputedStyle(label).letterSpacing, 'letter spacing').toBe(
    computedLetterSpacing(TAG_LETTER_SPACING),
  );

  if (look.border === undefined) {
    const noBorder =
      style.borderTopStyle === 'none' ||
      style.borderTopWidth === '0px' ||
      style.borderTopColor === computedColour(TRANSPARENT);
    await expect(noBorder, 'no visible border').toBe(true);
  } else {
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
  }

  return { tag, label };
}

// One icon in the tag, 12 px, the glyph of the reference Icon, left of the
// label.
async function expectIcon(
  canvasElement: HTMLElement,
  tag: HTMLElement,
  label: HTMLElement,
): Promise<void> {
  const svgs = [...tag.querySelectorAll('svg')];
  await expect(svgs, 'icons').toHaveLength(1);
  const [svg] = svgs;
  if (svg === undefined) {
    throw new Error('no icon');
  }
  const box = svg.getBoundingClientRect();
  await expect(box.width, 'icon width').toBeCloseTo(ICON_SIZE, 1);
  await expect(box.height, 'icon height').toBeCloseTo(ICON_SIZE, 1);

  const reference = within(canvasElement)
    .getByTestId('reference')
    .querySelector('svg');
  await expect(svg.innerHTML, 'glyph').toBe(reference?.innerHTML);

  await expect(
    label.getBoundingClientRect().left - box.right,
    'gap between icon and label',
  ).toBeCloseTo(TAG_GAP, 1);
}

async function expectNoIcon(tag: HTMLElement): Promise<void> {
  await expect(tag.querySelectorAll('svg'), 'icons').toHaveLength(0);
}

const meta = {
  title: 'Primitives/Tag',
  component: Tag,
  render: renderTag,
} satisfies Meta<typeof Tag>;

export default meta;

type Story = StoryObj<typeof meta>;

// The tones. Labels from Component Inventory.dc.html and SPEC sections 2 and
// 4 where they have one, else invented.

export const Accent: Story = {
  args: { label: 'Rule · exact', tone: 'accent' },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_TONE).toBe(true);
    await expect(NO_UNLISTED_TONE).toBe(true);
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);

    const { tag } = await expectTag(canvasElement, {
      label: 'Rule · exact',
      text: ACCENT_900,
      fill: ACCENT_300,
    });
    await expectNoIcon(tag);
  },
};

// Neutral is the default tone.
export const Neutral: Story = {
  args: { label: 'New' },
  play: async ({ canvasElement }) => {
    const { tag } = await expectTag(canvasElement, {
      label: 'New',
      text: NEUTRAL_900,
      fill: NEUTRAL_300,
    });
    await expectNoIcon(tag);
  },
};

// Outline: no fill, accent-600 text and a 1 px accent-400 border, still 22 px
// high.
export const Outline: Story = {
  args: { label: 'Manual', tone: 'outline' },
  play: async ({ canvasElement }) => {
    await expectTag(canvasElement, {
      label: 'Manual',
      text: ACCENT_600,
      fill: TRANSPARENT,
      border: ACCENT_400,
    });
  },
};

export const Warning: Story = {
  args: { label: 'New bank format', tone: 'warning' },
  play: async ({ canvasElement }) => {
    const { tag } = await expectTag(canvasElement, {
      label: 'New bank format',
      text: WARNING,
      fill: WARNING_TINT,
    });
    await expectNoIcon(tag);
  },
};

export const Danger: Story = {
  args: { label: 'Import failed', tone: 'danger' },
  play: async ({ canvasElement }) => {
    await expectTag(canvasElement, {
      label: 'Import failed',
      text: DANGER,
      fill: DANGER_TINT,
    });
  },
};

// The Milestone tone: the mortgage payoff's year tag, in the positive green.
export const Milestone: Story = {
  args: { label: 'Payoff Mar 2031', tone: 'milestone' },
  play: async ({ canvasElement }) => {
    await expectTag(canvasElement, {
      label: 'Payoff Mar 2031',
      text: MILESTONE,
      fill: MILESTONE_TINT,
    });
  },
};

// The detected profile of an unknown file (SPEC section 4, import step 1),
// with its info icon.
export const WithIcon: Story = {
  args: { label: 'New bank format', tone: 'warning', icon: 'info' },
  play: async ({ canvasElement }) => {
    const { tag, label } = await expectTag(canvasElement, {
      label: 'New bank format',
      text: WARNING,
      fill: WARNING_TINT,
    });
    await expectIcon(canvasElement, tag, label);
  },
};

// "Paid off" is the Milestone tone with its flag, never accent (design log
// Q24).
export const PaidOff: Story = {
  args: { label: 'Paid off', tone: 'milestone', icon: 'flag' },
  play: async ({ canvasElement }) => {
    const { tag, label } = await expectTag(canvasElement, {
      label: 'Paid off',
      text: MILESTONE,
      fill: MILESTONE_TINT,
    });
    await expectIcon(canvasElement, tag, label);
  },
};

// A category tag: an 8 px square of the colour, left of the label, and no
// icon.
export const WithSwatch: Story = {
  args: { label: 'Groceries', tone: 'neutral', swatch: CATEGORY_2 },
  play: async ({ canvasElement }) => {
    const { tag, label } = await expectTag(canvasElement, {
      label: 'Groceries',
      text: NEUTRAL_900,
      fill: NEUTRAL_300,
    });
    await expectNoIcon(tag);

    const colour = computedColour(CATEGORY_2);
    const swatches = [...tag.querySelectorAll('*')].filter(
      (element) => getComputedStyle(element).backgroundColor === colour,
    );
    await expect(swatches, 'swatches').toHaveLength(1);
    const [swatch] = swatches;
    if (swatch === undefined) {
      throw new Error('no swatch');
    }
    const box = swatch.getBoundingClientRect();
    await expect(box.width, 'swatch width').toBeCloseTo(SWATCH_SIZE, 1);
    await expect(box.height, 'swatch height').toBeCloseTo(SWATCH_SIZE, 1);
    await expect(getComputedStyle(swatch).borderRadius).toBe('0px');
    await expect(
      label.getBoundingClientRect().left - box.right,
      'gap between swatch and label',
    ).toBeCloseTo(TAG_GAP, 1);
  },
};
