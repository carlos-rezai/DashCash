import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, within } from 'storybook/test';
import { readComputedColour } from '../../test-support/readComputedColour/readComputedColour.ts';
import { Meter } from './Meter.tsx';

// The colours a reader sees, written out from dashcash-dark.css, Meter.dc.html
// and design log D1, apart from the Theme.
// --color-accent: the neutral tone
const ACCENT = '#749dc4';
// --sb-warning: the warning tone
const WARNING = '#e0b469';
// --sb-danger, raised to #ed8c80 (D1): the danger tone
const DANGER = '#ed8c80';
// --sb-ground-sunken: the meter's ground
const SUNKEN = '#16222f';
// --color-divider: the meter's border
const DIVIDER = 'color-mix(in srgb, #e9f1fa 16%, transparent)';
const TRANSPARENT = 'transparent';

const TONE_FILL = {
  neutral: ACCENT,
  warning: WARNING,
  danger: DANGER,
} as const;

type Tone = keyof typeof TONE_FILL;

// Meter.dc.html and SPEC section 5: the 1 px border, the default height of
// 6 px, the projection's opacity and the 300 ms ease of the value's width.
const BORDER = 1;
const BORDER_WIDTH = `${String(BORDER)}px`;
const DEFAULT_HEIGHT = 6;
const TALL_HEIGHT = 12;
const PROJECTION_OPACITY = '0.8';
const WIDTH_TRANSITION = { property: 'width', duration: '0.3s', ease: 'ease' };

// The prototype's preview width; the meter fills the width it is given.
const FRAME_WIDTH = 260;

// Invented names for the meters no label names.
const HEADROOM = 'Spending headroom';
const GOAL = 'Savings goal';

// SPEC section 3: the Meter's props plus ariaLabel (design log Q10), and no
// others; value alone is required. Typecheck fails when a prop is missing,
// one is added, or one changes between required and optional.
type MeterProps = ComponentProps<typeof Meter>;
type ListedProp = 'value' | 'projected' | 'tone' | 'height' | 'ariaLabel';
type MeterProp = keyof MeterProps;
type MissingProp = Exclude<ListedProp, MeterProp>;
type UnlistedProp = Exclude<MeterProp, ListedProp>;
type RequiredProp = {
  [Key in MeterProp]-?: object extends Pick<MeterProps, Key> ? never : Key;
}[MeterProp];
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;
const ONLY_VALUE_REQUIRED: [RequiredProp] extends ['value']
  ? ['value'] extends [RequiredProp]
    ? true
    : false
  : false = true;

// Holds the Meter out of the pointer's reach while its resting colours are
// read: Chromium on Linux can apply :hover without pointer movement.
const Holder = styled.div`
  width: ${FRAME_WIDTH}px;

  &[data-resting] {
    pointer-events: none;
  }
`;

// A holder whose child is a flex item: a box with no width of its own shrinks
// to its content there, so only the meter's own width keeps it across the
// holder.
const FlexHolder = styled(Holder)`
  display: flex;
`;

// A holder that reads right to left: an absolutely positioned box with no
// left offset sits at the right edge there, so only the meter's own left
// offsets keep the bar and the outline at the inner left edge.
const RightToLeftHolder = styled(Holder)`
  direction: rtl;
`;

function theMeter(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByRole('meter');
}

// The solid bar: the one element inside the meter with a fill.
async function theBar(meter: HTMLElement): Promise<Element> {
  const transparent = readComputedColour(TRANSPARENT);
  const bars = [...meter.querySelectorAll('*')].filter(
    (element) => getComputedStyle(element).backgroundColor !== transparent,
  );
  await expect(bars, 'bars').toHaveLength(1);
  const [bar] = bars;
  if (bar === undefined) {
    throw new Error('no bar');
  }
  return bar;
}

// The dashed outlines inside the meter.
function theOutlines(meter: HTMLElement): Element[] {
  return [...meter.querySelectorAll('*')].filter((element) => {
    const style = getComputedStyle(element);
    return (
      style.borderTopStyle === 'dashed' || style.borderRightStyle === 'dashed'
    );
  });
}

type Look = {
  value: number;
  tone: Tone;
  height?: number;
  projected?: number;
};

// The meter at rest: a meter from 0 to 100 that carries its value in per
// cent, the width it is given and its height, square, on the sunken ground
// inside a 1 px divider border; the solid bar in the tone's colour from the
// inner left edge across the value's share of the inner width, the full
// inner height, its width easing over 300 ms. With a projection: one outline
// across the projection's share, dashed in the tone's colour on its top,
// right and bottom, open on its left, at 0.8 opacity; without one, no dashed
// element exists at all. Read inside the holder; afterwards the pointer may
// reach the meter again.
async function expectMeter(meter: HTMLElement, look: Look): Promise<void> {
  const holder = meter.closest('[data-resting]');
  if (holder === null) {
    throw new Error('the meter is not held at rest');
  }
  await expect(meter.matches(':hover'), 'hovered').toBe(false);
  const fill = readComputedColour(TONE_FILL[look.tone]);
  const height = look.height ?? DEFAULT_HEIGHT;

  await expect(meter, 'minimum').toHaveAttribute('aria-valuemin', '0');
  await expect(meter, 'maximum').toHaveAttribute('aria-valuemax', '100');
  await expect(meter, 'value').toHaveAttribute(
    'aria-valuenow',
    String(Math.round(look.value * 100)),
  );

  const style = getComputedStyle(meter);
  const box = meter.getBoundingClientRect();
  await expect(box.width, 'meter width').toBeCloseTo(FRAME_WIDTH, 1);
  await expect(box.height, 'meter height').toBeCloseTo(height, 1);
  await expect(style.borderTopLeftRadius, 'square meter').toBe('0px');
  await expect(style.backgroundColor, 'ground').toBe(
    readComputedColour(SUNKEN),
  );
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `meter ${side} border`).toBe(
      BORDER_WIDTH,
    );
    await expect(style[`border${side}Style`], `meter ${side} style`).toBe(
      'solid',
    );
    await expect(style[`border${side}Color`], `meter ${side} colour`).toBe(
      readComputedColour(DIVIDER),
    );
  }

  const innerWidth = box.width - 2 * BORDER;
  const innerHeight = box.height - 2 * BORDER;

  const bar = await theBar(meter);
  const barStyle = getComputedStyle(bar);
  const solid = bar.getBoundingClientRect();
  await expect(barStyle.backgroundColor, 'bar fill').toBe(fill);
  await expect(solid.left - box.left, 'bar left').toBeCloseTo(BORDER, 1);
  await expect(solid.top - box.top, 'bar top').toBeCloseTo(BORDER, 1);
  await expect(solid.height, 'bar height').toBeCloseTo(innerHeight, 1);
  await expect(solid.width, 'bar width').toBeCloseTo(
    look.value * innerWidth,
    1,
  );
  await expect(barStyle.transitionProperty, 'bar transition').toBe(
    WIDTH_TRANSITION.property,
  );
  await expect(barStyle.transitionDuration, 'bar duration').toBe(
    WIDTH_TRANSITION.duration,
  );
  await expect(barStyle.transitionTimingFunction, 'bar ease').toBe(
    WIDTH_TRANSITION.ease,
  );

  const outlines = theOutlines(meter);
  if (look.projected === undefined) {
    await expect(outlines, 'no outline element').toHaveLength(0);
  } else {
    await expect(outlines, 'outlines').toHaveLength(1);
    const [outline] = outlines;
    if (outline === undefined) {
      throw new Error('no outline');
    }
    const outlineStyle = getComputedStyle(outline);
    const dashed = outline.getBoundingClientRect();
    await expect(dashed.left - box.left, 'outline left').toBeCloseTo(BORDER, 1);
    await expect(dashed.top - box.top, 'outline top').toBeCloseTo(BORDER, 1);
    await expect(dashed.height, 'outline height').toBeCloseTo(innerHeight, 1);
    await expect(dashed.width, 'outline width').toBeCloseTo(
      look.projected * innerWidth,
      1,
    );
    await expect(outlineStyle.backgroundColor, 'outline fill').toBe(
      readComputedColour(TRANSPARENT),
    );
    await expect(outlineStyle.opacity, 'outline opacity').toBe(
      PROJECTION_OPACITY,
    );
    for (const side of ['Top', 'Right', 'Bottom'] as const) {
      await expect(
        outlineStyle[`border${side}Width`],
        `outline ${side} border`,
      ).toBe(BORDER_WIDTH);
      await expect(
        outlineStyle[`border${side}Style`],
        `outline ${side} style`,
      ).toBe('dashed');
      await expect(
        outlineStyle[`border${side}Color`],
        `outline ${side} colour`,
      ).toBe(fill);
    }
    await expect(outlineStyle.borderLeftWidth, 'outline open left').toBe('0px');
  }

  holder.removeAttribute('data-resting');
}

// The solid bar lies over the dashed outline where both reach.
async function expectBarOnTop(meter: HTMLElement): Promise<void> {
  const bar = await theBar(meter);
  const solid = bar.getBoundingClientRect();
  const hit = document.elementFromPoint(
    solid.left + solid.width / 2,
    solid.top + solid.height / 2,
  );
  await expect(hit, 'bar on top').toBe(bar);
}

const meta = {
  title: 'Primitives/Meter',
  component: Meter,
  render: (args) => (
    <Holder data-resting="">
      <Meter {...args} />
    </Holder>
  ),
  args: { value: 0.82, ariaLabel: HEADROOM },
} satisfies Meta<typeof Meter>;

export default meta;

type Story = StoryObj<typeof meta>;

// The inventory's first meter, value only, in the neutral tone: the accent
// bar across 82 %, named by its ariaLabel.
export const Neutral: Story = {
  args: { value: 0.82, tone: 'neutral', ariaLabel: HEADROOM },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(ONLY_VALUE_REQUIRED).toBe(true);

    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(HEADROOM);
    await expectMeter(meter, { value: 0.82, tone: 'neutral' });
  },
};

// Warning: the warning bar across 15 %.
export const Warning: Story = {
  args: { value: 0.15, tone: 'warning', ariaLabel: HEADROOM },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(HEADROOM);
    await expectMeter(meter, { value: 0.15, tone: 'warning' });
  },
};

// Danger at nothing left: the danger bar, empty.
export const Danger: Story = {
  args: { value: 0, tone: 'danger', ariaLabel: HEADROOM },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(HEADROOM);
    await expectMeter(meter, { value: 0, tone: 'danger' });
  },
};

// A value with its projection, in the default tone: the solid bar across
// 4 %, the dashed outline on to 100 %, the bar over the outline.
export const Projected: Story = {
  args: { value: 0.04, projected: 1, ariaLabel: GOAL },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expectMeter(meter, { value: 0.04, projected: 1, tone: 'neutral' });
    await expectBarOnTop(meter);
  },
};

// The projection in the warning tone: the dashed outline takes the tone's
// colour, not the default one.
export const ProjectedWarning: Story = {
  args: { value: 0.15, projected: 0.6, tone: 'warning', ariaLabel: GOAL },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expectMeter(meter, { value: 0.15, projected: 0.6, tone: 'warning' });
    await expectBarOnTop(meter);
  },
};

// A projection short of the value: nothing beyond the bar, so no outline.
export const ProjectedBelowValue: Story = {
  args: { value: 0.6, projected: 0.3, ariaLabel: GOAL },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expectMeter(meter, { value: 0.6, tone: 'neutral' });
  },
};

// A projection level with the value: nothing beyond the bar, so no outline.
export const ProjectedAtValue: Story = {
  args: { value: 0.5, projected: 0.5, ariaLabel: GOAL },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expectMeter(meter, { value: 0.5, tone: 'neutral' });
  },
};

// A value above 1 is held at full.
export const ValueAboveFull: Story = {
  args: { value: 1.4, ariaLabel: GOAL },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expectMeter(meter, { value: 1, tone: 'neutral' });
  },
};

// A value below 0 is held at empty.
export const ValueBelowEmpty: Story = {
  args: { value: -0.3, ariaLabel: GOAL },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expectMeter(meter, { value: 0, tone: 'neutral' });
  },
};

// A projection above 1 is held at full.
export const ProjectedAboveFull: Story = {
  args: { value: 0.4, projected: 1.7, ariaLabel: GOAL },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expectMeter(meter, { value: 0.4, projected: 1, tone: 'neutral' });
  },
};

// A value that is not a whole per cent: the meter's value rounds to the
// nearest whole per cent, 66.6 to 67.
export const RoundedValue: Story = {
  args: { value: 0.666, ariaLabel: GOAL },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expect(meter, 'rounded value').toHaveAttribute('aria-valuenow', '67');
    await expectMeter(meter, { value: 0.666, tone: 'neutral' });
  },
};

// In a flex row: the meter still fills the width it is given.
export const InFlexRow: Story = {
  args: { value: 0.4, projected: 0.8, ariaLabel: GOAL },
  render: (args) => (
    <FlexHolder data-resting="">
      <Meter {...args} />
    </FlexHolder>
  ),
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expectMeter(meter, { value: 0.4, projected: 0.8, tone: 'neutral' });
  },
};

// Read right to left: the bar and the outline still start at the inner left
// edge.
export const RightToLeft: Story = {
  args: { value: 0.4, projected: 0.8, ariaLabel: GOAL },
  render: (args) => (
    <RightToLeftHolder data-resting="">
      <Meter {...args} />
    </RightToLeftHolder>
  ),
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expectMeter(meter, { value: 0.4, projected: 0.8, tone: 'neutral' });
  },
};

// Full: the bar across the whole inner width.
export const Full: Story = {
  args: { value: 1, ariaLabel: GOAL },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(GOAL);
    await expectMeter(meter, { value: 1, tone: 'neutral' });
  },
};

// A taller meter: the height it is given, the bar filling it inside the
// border.
export const Tall: Story = {
  args: { value: 0.82, height: TALL_HEIGHT, ariaLabel: HEADROOM },
  play: async ({ canvasElement }) => {
    const meter = theMeter(canvasElement);
    await expect(meter).toHaveAccessibleName(HEADROOM);
    await expectMeter(meter, {
      value: 0.82,
      tone: 'neutral',
      height: TALL_HEIGHT,
    });
  },
};
