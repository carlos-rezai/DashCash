import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Icon } from '../../primitives/Icon/Icon.tsx';
import { readComputedColour } from '../../test-support/readComputedColour/readComputedColour.ts';
import { readFirstFamily } from '../../test-support/readFirstFamily/readFirstFamily.ts';
import * as components from '../index.ts';
import { Stepper } from './Stepper.tsx';

// The colours a reader sees, written out from dashcash-dark.css and
// Stepper.dc.html, apart from the Theme. The mixes stay color-mix() strings,
// so each colour is compared through what Chromium computes for it.
// --color-text: the label of a done and of the current step
const INK = '#e9f1fa';
// --color-bg: the check on a done step's accent square
const GROUND = '#1b2a39';
// --color-accent: a done step's square, the current step's square border and
// its bottom bar
const ACCENT = '#749dc4';
// --color-accent-100: the current step's fill
const ACCENT_100 = '#22384d';
// --color-accent-700: the current step's number
const ACCENT_700 = '#b5d9fd';
// --color-divider: the frame round the list, the line between two steps and
// a future step's square border
const DIVIDER = 'color-mix(in srgb, #e9f1fa 16%, transparent)';
// --sb-text-faint, raised from 42 to 60 % (design log D1): a future step's
// label and number
const TEXT_FAINT = 'color-mix(in srgb, #e9f1fa 60%, transparent)';
const TRANSPARENT = 'transparent';

// SPEC, Control sizing: the Stepper step 44. Stepper.dc.html: a 1 px frame
// round the list, a 1 px line left of every step but the first, 10 px by
// 14 px padding, 10 px between the square and the label, 14 px text; the
// square 24 px with a 1 px border, its number in the heading font at 600 and
// 13 px, a 13 px check on a done step; the current step's 2 px bottom bar.
const STEP_HEIGHT = 44;
const BORDER = 1;
const PADDING_Y = '10px';
const PADDING_X = 14;
const GAP = 10;
const FONT_SIZE = '14px';
const SQUARE = 24;
const SQUARE_FONT_SIZE = '13px';
const HEADING_FONT = 'Barlow Condensed';
const HEADING_WEIGHT = '600';
const CHECK_SIZE = 13;
const BAR = `inset 0 -2px 0 ${ACCENT}`;

// Stepper.dc.html's preview frame, and an invented one in which the longest
// label does not fit its step.
const WIDTH = 1000;
const NARROW_WIDTH = 600;

// The import wizard's five steps, as the component inventory shows them.
const STEPS = [
  'File',
  'Preview',
  'Categories',
  'Recurring & transfers',
  'Summary',
];
const FIRST = 0;
const MIDDLE = 2;
const LAST = STEPS.length - 1;
const LONG_STEP = 3;

// SPEC section 3: the Stepper's props, and no others, none of them optional.
// Typecheck fails when a prop is missing, one is added, or one becomes
// optional.
type StepperProps = ComponentProps<typeof Stepper>;
type ListedProp = 'steps' | 'current' | 'onStep';
type StepperProp = keyof StepperProps;
type MissingProp = Exclude<ListedProp, StepperProp>;
type UnlistedProp = Exclude<StepperProp, ListedProp>;
type OptionalProp = {
  [Key in StepperProp]-?: object extends Pick<StepperProps, Key> ? Key : never;
}[StepperProp];
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;
const NONE_OPTIONAL: [OptionalProp] extends [never] ? true : false = true;
// SPEC section 3: the steps are strings, the current step a number, and
// onStep takes the index of the step.
type Exactly<Actual, Expected> = [Actual] extends [Expected]
  ? [Expected] extends [Actual]
    ? true
    : false
  : false;
const STEPS_ARE_STRINGS: Exactly<StepperProps['steps'], string[]> = true;
const CURRENT_IS_A_NUMBER: Exactly<StepperProps['current'], number> = true;
const ON_STEP_TAKES_AN_INDEX: Exactly<
  StepperProps['onStep'],
  (index: number) => void
> = true;

// What Chromium computes for a CSS box shadow, read from a probe element.
function computedShadow(css: string): string {
  const probe = document.createElement('span');
  probe.style.boxShadow = css;
  if (probe.style.boxShadow === '') {
    throw new Error(`not a CSS box shadow: ${css}`);
  }
  document.body.append(probe);
  const value = getComputedStyle(probe).boxShadow;
  probe.remove();
  return value;
}

// The page column the Stepper sits in. While its resting colours are read, it
// holds the Stepper out of the pointer's reach: Chromium on Linux can apply
// :hover without pointer movement.
const Frame = styled.div<{ $width: number }>`
  width: ${({ $width }) => $width}px;

  &[data-resting] {
    pointer-events: none;
  }
`;

function theFrame(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByTestId('frame');
}

// Lets the pointer reach the Stepper again.
function release(canvasElement: HTMLElement): void {
  theFrame(canvasElement).removeAttribute('data-resting');
}

// The steps, one button each, in order.
function theSteps(canvasElement: HTMLElement): HTMLElement[] {
  return within(theFrame(canvasElement)).getAllByRole('button');
}

function theStep(canvasElement: HTMLElement, index: number): HTMLElement {
  const step = theSteps(canvasElement)[index];
  if (step === undefined) {
    throw new Error(`no step ${String(index)}`);
  }
  return step;
}

// A step's square: the first part of the step.
function theSquare(step: HTMLElement): HTMLElement {
  const square = step.firstElementChild;
  if (!(square instanceof HTMLElement)) {
    throw new Error('no square');
  }
  return square;
}

type State = 'done' | 'current' | 'future';

function stateOf(index: number, current: number): State {
  if (index < current) {
    return 'done';
  }
  return index === current ? 'current' : 'future';
}

type Look = {
  fill: string;
  bar: string;
  text: string;
  cursor: string;
  squareBorder: string;
  squareFill: string;
  squareText: string;
};

const LOOKS: Record<State, Look> = {
  done: {
    fill: TRANSPARENT,
    bar: 'none',
    text: INK,
    cursor: 'pointer',
    squareBorder: ACCENT,
    squareFill: ACCENT,
    squareText: GROUND,
  },
  current: {
    fill: ACCENT_100,
    bar: BAR,
    text: INK,
    cursor: 'default',
    squareBorder: ACCENT,
    squareFill: TRANSPARENT,
    squareText: ACCENT_700,
  },
  future: {
    fill: TRANSPARENT,
    bar: 'none',
    text: TEXT_FAINT,
    cursor: 'default',
    squareBorder: DIVIDER,
    squareFill: TRANSPARENT,
    squareText: TEXT_FAINT,
  },
};

// The list: the frame's width, one 1 px divider frame round it, 44 px steps
// inside, no markers.
async function expectList(canvasElement: HTMLElement): Promise<HTMLElement> {
  const frame = theFrame(canvasElement).getBoundingClientRect();
  const list = within(theFrame(canvasElement)).getByRole('list');
  const box = list.getBoundingClientRect();
  await expect(box.left, 'list left').toBeCloseTo(frame.left, 1);
  await expect(box.top, 'list top').toBeCloseTo(frame.top, 1);
  await expect(box.width, 'list width').toBeCloseTo(frame.width, 1);
  await expect(box.height, 'list height').toBeCloseTo(
    STEP_HEIGHT + 2 * BORDER,
    1,
  );
  const style = getComputedStyle(list);
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `list ${side} border`).toBe(
      `${String(BORDER)}px`,
    );
    await expect(style[`border${side}Style`], `list ${side} style`).toBe(
      'solid',
    );
    await expect(style[`border${side}Color`], `list ${side} colour`).toBe(
      readComputedColour(DIVIDER),
    );
  }
  return list;
}

// Equal cells in one row: every list item as wide as the list's inside
// divided by the number of steps, side by side without a gap, and its step
// filling it.
async function expectCells(canvasElement: HTMLElement): Promise<void> {
  const list = await expectList(canvasElement);
  const outer = list.getBoundingClientRect();
  const items = within(list).getAllByRole('listitem');
  const steps = theSteps(canvasElement);
  await expect(items.length, 'one item per step').toBe(STEPS.length);
  await expect(steps.length, 'one button per step').toBe(STEPS.length);
  const cell = (outer.width - 2 * BORDER) / STEPS.length;
  let left = outer.left + BORDER;
  for (const [index, item] of items.entries()) {
    const at = `step ${String(index)}`;
    await expect(getComputedStyle(item).listStyleType, `${at} marker`).toBe(
      'none',
    );
    const box = item.getBoundingClientRect();
    await expect(box.left, `${at} item left`).toBeCloseTo(left, 1);
    await expect(box.top, `${at} item top`).toBeCloseTo(outer.top + BORDER, 1);
    await expect(box.width, `${at} item width`).toBeCloseTo(cell, 1);
    await expect(box.height, `${at} item height`).toBeCloseTo(STEP_HEIGHT, 1);
    const step = steps[index];
    await expect(
      step !== undefined && item.contains(step),
      `${at} inside`,
    ).toBe(true);
    const button = step?.getBoundingClientRect();
    await expect(button?.left, `${at} left`).toBeCloseTo(box.left, 1);
    await expect(button?.width, `${at} width`).toBeCloseTo(box.width, 1);
    await expect(button?.height, `${at} height`).toBeCloseTo(STEP_HEIGHT, 1);
    left += cell;
  }
}

// One step in its state: what it says and how it answers, its colours, its
// type, its padding and the line before it; its square with the check or the
// number, centred; its label after the square, on one line.
async function expectStep(
  canvasElement: HTMLElement,
  index: number,
  current: number,
): Promise<void> {
  const state = stateOf(index, current);
  const look = LOOKS[state];
  const at = `step ${String(index)}, ${state}`;
  const step = theStep(canvasElement, index);
  const label = STEPS[index] ?? '';
  const number = String(index + 1);

  await expect(
    step.textContent,
    `${at}: the check or the number, then the label`,
  ).toBe(state === 'done' ? label : `${number}${label}`);
  if (state === 'current') {
    await expect(step, `${at}: the current step`).toHaveAttribute(
      'aria-current',
      'step',
    );
  } else {
    await expect(step, `${at}: not the current step`).not.toHaveAttribute(
      'aria-current',
    );
  }
  if (state === 'future') {
    await expect(step, `${at}: disabled`).toBeDisabled();
  } else {
    await expect(step, `${at}: enabled`).toBeEnabled();
  }

  const style = getComputedStyle(step);
  await expect(style.backgroundColor, `${at}: fill`).toBe(
    readComputedColour(look.fill),
  );
  await expect(style.boxShadow, `${at}: bottom bar`).toBe(
    look.bar === 'none' ? 'none' : computedShadow(look.bar),
  );
  await expect(style.color, `${at}: text`).toBe(readComputedColour(look.text));
  await expect(style.cursor, `${at}: cursor`).toBe(look.cursor);
  await expect(style.fontSize, `${at}: font size`).toBe(FONT_SIZE);
  await expect(readFirstFamily(style), `${at}: font`).toBe('Barlow');
  await expect(style.textAlign, `${at}: text align`).toBe('left');
  await expect(style.paddingTop, `${at}: top padding`).toBe(PADDING_Y);
  await expect(style.paddingBottom, `${at}: bottom padding`).toBe(PADDING_Y);
  await expect(style.paddingLeft, `${at}: left padding`).toBe(
    `${String(PADDING_X)}px`,
  );
  await expect(style.paddingRight, `${at}: right padding`).toBe(
    `${String(PADDING_X)}px`,
  );
  for (const side of ['Top', 'Right', 'Bottom'] as const) {
    await expect(style[`border${side}Width`], `${at}: ${side} border`).toBe(
      '0px',
    );
  }
  const line = index === 0 ? 0 : BORDER;
  await expect(style.borderLeftWidth, `${at}: line before`).toBe(
    `${String(line)}px`,
  );
  if (line > 0) {
    await expect(style.borderLeftStyle, `${at}: line style`).toBe('solid');
    await expect(style.borderLeftColor, `${at}: line colour`).toBe(
      readComputedColour(DIVIDER),
    );
  }

  const square = theSquare(step);
  const squareStyle = getComputedStyle(square);
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(
      squareStyle[`border${side}Width`],
      `${at}: square ${side} border`,
    ).toBe(`${String(BORDER)}px`);
    await expect(
      squareStyle[`border${side}Style`],
      `${at}: square ${side} style`,
    ).toBe('solid');
    await expect(
      squareStyle[`border${side}Color`],
      `${at}: square ${side} colour`,
    ).toBe(readComputedColour(look.squareBorder));
  }
  await expect(squareStyle.backgroundColor, `${at}: square fill`).toBe(
    readComputedColour(look.squareFill),
  );
  await expect(readFirstFamily(squareStyle), `${at}: square font`).toBe(
    HEADING_FONT,
  );
  await expect(squareStyle.fontWeight, `${at}: square weight`).toBe(
    HEADING_WEIGHT,
  );
  await expect(squareStyle.fontSize, `${at}: square font size`).toBe(
    SQUARE_FONT_SIZE,
  );

  const box = step.getBoundingClientRect();
  const frame = square.getBoundingClientRect();
  await expect(frame.width, `${at}: square width`).toBeCloseTo(SQUARE, 1);
  await expect(frame.height, `${at}: square height`).toBeCloseTo(SQUARE, 1);
  await expect(frame.left - box.left, `${at}: square left`).toBeCloseTo(
    line + PADDING_X,
    1,
  );
  await expect(
    (frame.top + frame.bottom) / 2,
    `${at}: square middle`,
  ).toBeCloseTo((box.top + box.bottom) / 2, 1);

  // The check on a done step, the number on any other, centred in the square.
  const icon = step.querySelector('svg');
  let mark: DOMRect;
  if (state === 'done') {
    await expect(icon !== null && square.contains(icon), `${at}: check`).toBe(
      true,
    );
    const reference =
      within(canvasElement).getByTestId('reference').firstElementChild;
    await expect(
      icon?.outerHTML === reference?.outerHTML,
      `${at}: the check`,
    ).toBe(true);
    await expect(
      icon === null ? undefined : getComputedStyle(icon).color,
      `${at}: check colour`,
    ).toBe(readComputedColour(look.squareText));
    mark = icon?.getBoundingClientRect() ?? new DOMRect();
    await expect(mark.width, `${at}: check width`).toBeCloseTo(CHECK_SIZE, 1);
    await expect(mark.height, `${at}: check height`).toBeCloseTo(CHECK_SIZE, 1);
  } else {
    await expect(icon, `${at}: no check`).toBeNull();
    const digits = within(step).getByText(number);
    await expect(square.contains(digits), `${at}: number in the square`).toBe(
      true,
    );
    await expect(getComputedStyle(digits).color, `${at}: number colour`).toBe(
      readComputedColour(look.squareText),
    );
    const glyphs = document.createRange();
    glyphs.selectNodeContents(digits);
    mark = glyphs.getBoundingClientRect();
  }
  await expect((mark.left + mark.right) / 2, `${at}: mark centre`).toBeCloseTo(
    (frame.left + frame.right) / 2,
    0,
  );
  await expect((mark.top + mark.bottom) / 2, `${at}: mark middle`).toBeCloseTo(
    (frame.top + frame.bottom) / 2,
    0,
  );

  const name = within(step).getByText(label);
  const text = name.getBoundingClientRect();
  await expect(text.left - frame.right, `${at}: square to label`).toBeCloseTo(
    GAP,
    1,
  );
  await expect(
    text.right <= box.right - PADDING_X + 0.05,
    `${at}: label inside the padding`,
  ).toBe(true);
  // The label's text sits in the middle of the step: the label's own box
  // would sit there even if it were stretched, so the glyphs are measured.
  const letters = document.createRange();
  letters.selectNodeContents(name);
  const lettering = letters.getBoundingClientRect();
  await expect(
    (lettering.top + lettering.bottom) / 2,
    `${at}: label middle`,
  ).toBeCloseTo((box.top + box.bottom) / 2, 0);
  const nameStyle = getComputedStyle(name);
  await expect(nameStyle.whiteSpace, `${at}: one line`).toBe('nowrap');
  await expect(nameStyle.overflowX, `${at}: label clipped`).toBe('hidden');
  await expect(nameStyle.textOverflow, `${at}: ellipsis`).toBe('ellipsis');
}

// The whole Stepper at rest: the list, its equal cells and every step in its
// state. Read inside the resting frame; afterwards the pointer may reach the
// Stepper again.
async function expectStepper(
  canvasElement: HTMLElement,
  current: number,
): Promise<void> {
  const frame = theFrame(canvasElement);
  await expect(frame.hasAttribute('data-resting'), 'held at rest').toBe(true);
  for (const step of theSteps(canvasElement)) {
    await expect(step.matches(':hover'), 'hovered').toBe(false);
  }
  await expectCells(canvasElement);
  for (const index of STEPS.keys()) {
    await expectStep(canvasElement, index, current);
  }
  release(canvasElement);
}

function renderStepper(args: StepperProps, width: number) {
  return (
    <>
      <Frame data-testid="frame" data-resting="" $width={width}>
        <Stepper {...args} />
      </Frame>
      {/* The check Stepper.dc.html draws, for the comparison; never shown. */}
      <div hidden data-testid="reference">
        <Icon glyph="check" size={CHECK_SIZE} />
      </div>
    </>
  );
}

const meta = {
  title: 'Components/Stepper',
  component: Stepper,
  render: (args) => renderStepper(args, WIDTH),
  args: { steps: STEPS, current: MIDDLE, onStep: fn() },
} satisfies Meta<typeof Stepper>;

export default meta;

type Story = StoryObj<typeof meta>;

// At the first step: the first step current, every other one future; no step
// is done.
export const FirstStep: Story = {
  args: { current: FIRST },
  play: async ({ args, canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(NONE_OPTIONAL).toBe(true);
    await expect(STEPS_ARE_STRINGS).toBe(true);
    await expect(CURRENT_IS_A_NUMBER).toBe(true);
    await expect(ON_STEP_TAKES_AN_INDEX).toBe(true);
    await expect(components.Stepper === Stepper, 'exported by the barrel').toBe(
      true,
    );

    await expectStepper(canvasElement, FIRST);
    await expect(args.onStep).not.toHaveBeenCalled();
  },
};

// At a middle step: the steps before it done, the ones after it future.
export const MiddleStep: Story = {
  args: { current: MIDDLE },
  play: async ({ args, canvasElement }) => {
    await expectStepper(canvasElement, MIDDLE);
    await expect(args.onStep).not.toHaveBeenCalled();
  },
};

// At the last step: every step before it done, none future.
export const LastStep: Story = {
  args: { current: LAST },
  play: async ({ args, canvasElement }) => {
    await expectStepper(canvasElement, LAST);
    await expect(args.onStep).not.toHaveBeenCalled();
  },
};

// In a frame where the longest label does not fit its step, the cells stay
// equal and the label is cut inside the padding.
export const Narrow: Story = {
  args: { current: LONG_STEP },
  render: (args) => renderStepper(args, NARROW_WIDTH),
  play: async ({ canvasElement }) => {
    const label = within(theStep(canvasElement, LONG_STEP)).getByText(
      STEPS[LONG_STEP] ?? '',
    );
    await expect(
      label.scrollWidth > label.getBoundingClientRect().width,
      'the label is wider than its box',
    ).toBe(true);
    await expectStepper(canvasElement, LONG_STEP);
  },
};

// A click on a done step reports its index, once per click; a click on the
// current step reports nothing.
export const ClickingDoneStep: Story = {
  args: { current: MIDDLE },
  play: async ({ args, canvasElement }) => {
    release(canvasElement);
    await userEvent.click(theStep(canvasElement, MIDDLE));
    await expect(args.onStep, 'the current step').not.toHaveBeenCalled();

    await userEvent.click(theStep(canvasElement, 0));
    await expect(args.onStep).toHaveBeenCalledTimes(1);
    await expect(args.onStep).toHaveBeenLastCalledWith(0);

    await userEvent.click(theStep(canvasElement, 1));
    await expect(args.onStep).toHaveBeenCalledTimes(2);
    await expect(args.onStep).toHaveBeenLastCalledWith(1);
  },
};

// A future step is disabled, and a click on it reports nothing.
export const ClickingFutureStep: Story = {
  args: { current: MIDDLE },
  play: async ({ args, canvasElement }) => {
    release(canvasElement);
    for (const index of [MIDDLE + 1, LAST]) {
      const step = theStep(canvasElement, index);
      await expect(step, `step ${String(index)}`).toBeDisabled();
      await userEvent.click(step);
    }
    await expect(args.onStep).not.toHaveBeenCalled();
  },
};
