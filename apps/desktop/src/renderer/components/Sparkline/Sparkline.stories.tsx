import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, within } from 'storybook/test';
import { toCents, type Cents } from '@dashcash/domain/money/cents/cents';
import { readComputedColour } from '../../test-support/readComputedColour/readComputedColour.ts';
import * as components from '../index.ts';
import { computeSparklinePoints, Sparkline } from './Sparkline.tsx';

// The colours a reader sees, written out from dashcash-dark.css, apart from
// the Theme.
// --color-accent-600: the prototype's default line colour, and the savings
// account's colour (--sb-acc-savings)
const SAVINGS = '#94bce3';
// --sb-acc-income: an account colour
const INCOME = '#cdbb8b';
// --color-divider: the tick at today
const DIVIDER = 'color-mix(in srgb, #e9f1fa 16%, transparent)';

// Sparkline.dc.html: a box 200 wide, 36 high unless told otherwise, stretched
// to the width it is given; both lines 1,5 wide and the tick 1 wide whatever
// the stretch; the future dashed 4 3 at 85 %.
const BOX_WIDTH = 200;
const DEFAULT_HEIGHT = 36;
const LINE_WIDTH = '1.5px';
const TICK_WIDTH = '1px';
const DASHES = '4px, 3px';
const FUTURE_OPACITY = '0.85';

// An AccountCard's width (SPEC, Accounts: min 300 px), wider than the box.
const FRAME_WIDTH = 300;

// SPEC, Accounts: 25 months, 12 back, today and 12 ahead. Invented balances.
const PAST = cents([
  120_000, 131_500, 128_000, 142_000, 150_500, 149_000, 163_000, 171_500,
  168_000, 182_000, 190_500, 197_000, 205_000,
]);
const FUTURE = cents([
  230_000, 255_000, 280_000, 305_000, 330_000, 355_000, 380_000, 405_000,
  430_000, 455_000, 480_000, 505_000,
]);
// An income account: a balance that rises and falls with the month.
const INCOME_PAST = cents([
  42_000, 310_000, 95_000, 288_000, 61_000, 305_000, 77_500, 296_000, 58_000,
  312_000, 83_000, 301_500, 66_000,
]);
const INCOME_FUTURE = cents([
  300_000, 70_000, 300_000, 70_000, 300_000, 70_000, 300_000, 70_000, 300_000,
  70_000, 300_000, 70_000,
]);

function cents(values: readonly number[]): Cents[] {
  return values.map((value) => toCents(value));
}

// SPEC section 3: props exactly past, future, color and height; height alone
// is optional; past and future are Cents. Typecheck fails when a prop is
// missing, one is added, or one changes between required and optional.
type SparklineProps = ComponentProps<typeof Sparkline>;
type ListedProp = 'past' | 'future' | 'color' | 'height';
type SparklineProp = keyof SparklineProps;
type MissingProp = Exclude<ListedProp, SparklineProp>;
type UnlistedProp = Exclude<SparklineProp, ListedProp>;
type OptionalProp = {
  [Key in SparklineProp]-?: object extends Pick<SparklineProps, Key>
    ? Key
    : never;
}[SparklineProp];
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;
const ONLY_HEIGHT_OPTIONAL: [OptionalProp] extends ['height']
  ? ['height'] extends [OptionalProp]
    ? true
    : false
  : false = true;
const PAST_IS_CENTS: [SparklineProps['past']] extends [readonly Cents[]]
  ? [Cents[]] extends [SparklineProps['past']]
    ? true
    : false
  : false = true;
const FUTURE_IS_CENTS: [SparklineProps['future']] extends [readonly Cents[]]
  ? [Cents[]] extends [SparklineProps['future']]
    ? true
    : false
  : false = true;

const Frame = styled.div`
  width: ${FRAME_WIDTH}px;
`;

type Point = { x: number; y: number };

// The length of the line through the points in their order.
function lengthThrough(points: readonly Point[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from !== undefined && to !== undefined) {
      length += Math.hypot(to.x - from.x, to.y - from.y);
    }
  }
  return length;
}

// The path runs from the first point through every point to the last.
async function expectLineThrough(
  path: SVGPathElement,
  points: readonly Point[],
  name: string,
): Promise<void> {
  const first = points[0];
  const last = points.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error(`no points for the ${name} line`);
  }
  const total = path.getTotalLength();
  const start = path.getPointAtLength(0);
  const end = path.getPointAtLength(total);
  await expect(start.x, `${name} start x`).toBeCloseTo(first.x, 1);
  await expect(start.y, `${name} start y`).toBeCloseTo(first.y, 1);
  await expect(end.x, `${name} end x`).toBeCloseTo(last.x, 1);
  await expect(end.y, `${name} end y`).toBeCloseTo(last.y, 1);
  await expect(total, `${name} length`).toBeCloseTo(lengthThrough(points), 0);
}

type Look = {
  past: readonly Cents[];
  future: readonly Cents[];
  colour: string;
  height: number;
};

// The box stretched to the frame's width at its height; the past solid and
// the future dashed in the line colour through their points; the tick at
// today from top to bottom in the divider colour.
async function expectSparkline(
  canvasElement: HTMLElement,
  look: Look,
): Promise<void> {
  const frame = within(canvasElement).getByTestId('frame');
  const svg = frame.querySelector('svg');
  if (svg === null) {
    throw new Error('no svg');
  }
  const svgStyle = getComputedStyle(svg);
  const box = svg.getBoundingClientRect();
  await expect(box.width, 'width').toBeCloseTo(FRAME_WIDTH, 1);
  await expect(box.height, 'height').toBeCloseTo(look.height, 1);
  await expect(
    frame.getBoundingClientRect().height,
    'nothing below the box',
  ).toBeCloseTo(look.height, 1);
  await expect(svgStyle.overflow, 'lines may reach past the box').toBe(
    'visible',
  );

  // The box's corners land on the frame's corners: stretched, not scaled.
  const toScreen = svg.getScreenCTM();
  if (toScreen === null) {
    throw new Error('no screen transform');
  }
  const topLeft = new DOMPoint(0, 0).matrixTransform(toScreen);
  const bottomRight = new DOMPoint(BOX_WIDTH, look.height).matrixTransform(
    toScreen,
  );
  await expect(topLeft.x, 'box left').toBeCloseTo(box.left, 1);
  await expect(topLeft.y, 'box top').toBeCloseTo(box.top, 1);
  await expect(bottomRight.x, 'box right').toBeCloseTo(box.right, 1);
  await expect(bottomRight.y, 'box bottom').toBeCloseTo(box.bottom, 1);

  const points = computeSparklinePoints(look.past, look.future, look.height);
  const paths = [...svg.querySelectorAll('path')];
  for (const path of paths) {
    const style = getComputedStyle(path);
    await expect(style.stroke, 'line colour').toBe(
      readComputedColour(look.colour),
    );
    await expect(style.strokeWidth, 'line width').toBe(LINE_WIDTH);
    await expect(style.fill, 'line fill').toBe('none');
    await expect(style.vectorEffect, 'line width kept').toBe(
      'non-scaling-stroke',
    );
  }
  const solid = paths.filter(
    (path) => getComputedStyle(path).strokeDasharray === 'none',
  );
  const dashed = paths.filter(
    (path) => getComputedStyle(path).strokeDasharray !== 'none',
  );
  await expect(solid.length, 'one solid line').toBe(1);
  const [solidLine] = solid;
  if (solidLine === undefined) {
    throw new Error('no solid line');
  }
  await expect(getComputedStyle(solidLine).opacity, 'past opacity').toBe('1');
  await expectLineThrough(solidLine, points.solid, 'solid');

  const drawnDashed = dashed.filter((path) => path.getTotalLength() > 0);
  if (points.dashed.length === 0) {
    await expect(drawnDashed.length, 'no dashed line').toBe(0);
  } else {
    await expect(drawnDashed.length, 'one dashed line').toBe(1);
    const [dashedLine] = drawnDashed;
    if (dashedLine === undefined) {
      throw new Error('no dashed line');
    }
    const dashedStyle = getComputedStyle(dashedLine);
    await expect(dashedStyle.strokeDasharray, 'dashes').toBe(DASHES);
    await expect(dashedStyle.opacity, 'future opacity').toBe(FUTURE_OPACITY);
    await expectLineThrough(dashedLine, points.dashed, 'dashed');
  }

  const tick = svg.querySelector('line');
  if (tick === null || points.todayX === null) {
    throw new Error('no tick');
  }
  const tickStyle = getComputedStyle(tick);
  await expect(tick.x1.baseVal.value, 'tick x').toBeCloseTo(points.todayX, 1);
  await expect(tick.x2.baseVal.value, 'tick upright').toBeCloseTo(
    points.todayX,
    1,
  );
  await expect(tick.y1.baseVal.value, 'tick top').toBe(0);
  await expect(tick.y2.baseVal.value, 'tick bottom').toBe(look.height);
  await expect(tickStyle.stroke, 'tick colour').toBe(
    readComputedColour(DIVIDER),
  );
  await expect(tickStyle.strokeWidth, 'tick width').toBe(TICK_WIDTH);
  await expect(tickStyle.vectorEffect, 'tick width kept').toBe(
    'non-scaling-stroke',
  );
}

const meta = {
  title: 'Components/Sparkline',
  component: Sparkline,
  render: (args) => (
    <Frame data-testid="frame">
      <Sparkline {...args} />
    </Frame>
  ),
  args: { past: PAST, future: FUTURE, color: SAVINGS },
} satisfies Meta<typeof Sparkline>;

export default meta;

type Story = StoryObj<typeof meta>;

// 25 months: the past solid up to today, the future dashed, 36 px high.
export const PastAndFuture: Story = {
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(ONLY_HEIGHT_OPTIONAL).toBe(true);
    await expect(PAST_IS_CENTS).toBe(true);
    await expect(FUTURE_IS_CENTS).toBe(true);
    await expect(
      components.Sparkline === Sparkline,
      'exported by the barrel',
    ).toBe(true);

    await expectSparkline(canvasElement, {
      past: PAST,
      future: FUTURE,
      colour: SAVINGS,
      height: DEFAULT_HEIGHT,
    });
  },
};

// No projection: the past spans the whole width, no dashed line, the tick at
// the right end.
export const PastOnly: Story = {
  args: { past: PAST, future: [] },
  play: async ({ canvasElement }) => {
    await expectSparkline(canvasElement, {
      past: PAST,
      future: [],
      colour: SAVINGS,
      height: DEFAULT_HEIGHT,
    });
  },
};

// In an account's colour: both lines take it, the tick stays the divider.
export const AccountColour: Story = {
  args: { past: INCOME_PAST, future: INCOME_FUTURE, color: INCOME },
  play: async ({ canvasElement }) => {
    await expectSparkline(canvasElement, {
      past: INCOME_PAST,
      future: INCOME_FUTURE,
      colour: INCOME,
      height: DEFAULT_HEIGHT,
    });
  },
};

// Nothing to draw: the box keeps its size, but no solid line, no dashed line
// and no tick (D11; Sparkline.dc.html puts a tick at x = -10 here).
export const Empty: Story = {
  args: { past: [], future: [] },
  play: async ({ canvasElement }) => {
    const frame = within(canvasElement).getByTestId('frame');
    const svg = frame.querySelector('svg');
    if (svg === null) {
      throw new Error('no svg');
    }
    await expect(svg.getBoundingClientRect().height, 'height').toBeCloseTo(
      DEFAULT_HEIGHT,
      1,
    );
    const drawn = [...svg.querySelectorAll('path')].filter(
      (path) => path.getTotalLength() > 0,
    );
    await expect(drawn.length, 'no line drawn').toBe(0);
    await expect(svg.querySelectorAll('line').length, 'no tick').toBe(0);
  },
};

// A taller box: the points and the tick follow the height.
export const Tall: Story = {
  args: { height: 60 },
  play: async ({ canvasElement }) => {
    await expectSparkline(canvasElement, {
      past: PAST,
      future: FUTURE,
      colour: SAVINGS,
      height: 60,
    });
  },
};
