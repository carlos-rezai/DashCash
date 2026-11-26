import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Switch } from './Switch.tsx';

// The colours a reader sees, written out from dashcash-dark.css and
// Switch.dc.html, apart from the Theme.
// --color-text: the label
const INK = '#e9f1fa';
// --color-accent: the track's border and fill when on
const ACCENT = '#749dc4';
// --color-neutral-400: the track's border when off
const NEUTRAL_400 = '#5b6a7a';
// --color-neutral-600: the knob when off
const NEUTRAL_600 = '#9aa5b0';
// --color-bg: the knob when on
const GROUND = '#1b2a39';
// The track's fill when off, and the control's own
const TRANSPARENT = 'transparent';

// Switch.dc.html and SPEC, Control sizing: the square 34 x 18 track, its
// 12 px knob 2 px inside its 1 px border, the gap between track and label,
// the label's size and line height, and the opacity of a disabled switch.
const TRACK_WIDTH = 34;
const TRACK_HEIGHT = 18;
const KNOB = 12;
// From the track's outer edge: the 1 px border and the knob's 2 px inset
const KNOB_INSET = 3;
// When on, the knob sits 18 px from the inner left edge, behind the border
const KNOB_ON_LEFT = 19;
const GAP = 10;
const FONT_SIZE = '14px';
const LINE_HEIGHT = '18.2px';
const DISABLED_OPACITY = '0.45';

// The prototype's label, and an invented name for a switch without one.
const LABEL = 'Check for updates automatically';
const ARIA_LABEL = 'Automatic updates';
// Narrower than the label's one line, wider than its longest word
const NARROW_WIDTH = '160px';

// SPEC section 3: the Switch's props and no others. Typecheck fails when a
// prop is missing or one is added.
type ListedProp = 'checked' | 'onChange' | 'label' | 'ariaLabel' | 'disabled';
type SwitchProp = keyof ComponentProps<typeof Switch>;
type MissingProp = Exclude<ListedProp, SwitchProp>;
type UnlistedProp = Exclude<SwitchProp, ListedProp>;
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

// Holds the Switch out of the pointer's reach while its resting colours are
// read: Chromium on Linux can apply :hover without pointer movement.
const Holder = styled.div`
  &[data-resting] {
    pointer-events: none;
  }
`;

// A column too narrow for the label on one line.
const Narrow = styled.div`
  width: ${NARROW_WIDTH};
`;

// The Switch as the settings use it: on follows what onChange reports.
// Render it inside the Holder, with anything that contains it inside the
// Holder too, so nothing around it can be hovered while it is read.
function ControlledSwitch(args: ComponentProps<typeof Switch>) {
  const [checked, setChecked] = useState(args.checked);
  return (
    <Switch
      {...args}
      checked={checked}
      onChange={(next) => {
        setChecked(next);
        args.onChange(next);
      }}
    />
  );
}

function theSwitch(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByRole('switch');
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

// The bordered track inside the control.
async function theTrack(control: HTMLElement): Promise<Element> {
  const tracks = [...control.querySelectorAll('*')].filter(
    (element) => getComputedStyle(element).borderTopStyle === 'solid',
  );
  await expect(tracks, 'tracks').toHaveLength(1);
  const [track] = tracks;
  if (track === undefined) {
    throw new Error('no track');
  }
  return track;
}

// The knob, the one element inside the track.
async function theKnob(track: Element): Promise<Element> {
  const knobs = track.querySelectorAll('*');
  await expect(knobs, 'knobs').toHaveLength(1);
  const [knob] = knobs;
  if (knob === undefined) {
    throw new Error('no knob');
  }
  return knob;
}

type Look = {
  on: boolean;
  disabled?: boolean;
};

// The switch at rest: a button with the switch role, on or off to assistive
// technology; no fill, border or padding of its own, the text colour in
// Barlow at 14 px, faded when disabled; its square 34 x 18 track with a 1 px
// border, accent and filled when on, the neutral border and clear when off;
// the 12 px knob in the ground colour on the right when on, in the neutral
// grey on the left when off. Read inside the holder; afterwards the pointer
// may reach the switch again.
async function expectSwitch(control: HTMLElement, look: Look): Promise<void> {
  const holder = control.closest('[data-resting]');
  if (holder === null) {
    throw new Error('the switch is not held at rest');
  }
  await expect(control.matches(':hover'), 'hovered').toBe(false);
  const style = getComputedStyle(control);

  await expect(control.tagName, 'a button').toBe('BUTTON');
  await expect(control, 'type').toHaveAttribute('type', 'button');
  await expect(control, 'on').toHaveAttribute('aria-checked', String(look.on));
  await expect(style.display, 'display').toBe('inline-flex');
  await expect(style.backgroundColor, 'control fill').toBe(
    computedColour(TRANSPARENT),
  );
  await expect(style.color, 'text').toBe(computedColour(INK));
  await expect(style.fontSize, 'font size').toBe(FONT_SIZE);
  await expect(firstFamily(style), 'font').toBe('Barlow');
  await expect(style.cursor, 'cursor').toBe(
    look.disabled === true ? 'not-allowed' : 'pointer',
  );
  await expect(style.opacity, 'opacity').toBe(
    look.disabled === true ? DISABLED_OPACITY : '1',
  );
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `control ${side} border`).toBe(
      '0px',
    );
    await expect(style[`padding${side}`], `control ${side} padding`).toBe(
      '0px',
    );
  }

  const track = await theTrack(control);
  const trackStyle = getComputedStyle(track);
  const rail = track.getBoundingClientRect();
  await expect(rail.width, 'track width').toBeCloseTo(TRACK_WIDTH, 1);
  await expect(rail.height, 'track height').toBeCloseTo(TRACK_HEIGHT, 1);
  await expect(trackStyle.borderTopLeftRadius, 'square track').toBe('0px');
  await expect(trackStyle.backgroundColor, 'track fill').toBe(
    computedColour(look.on ? ACCENT : TRANSPARENT),
  );
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(trackStyle[`border${side}Width`], `track ${side} border`).toBe(
      '1px',
    );
    await expect(trackStyle[`border${side}Style`], `track ${side} style`).toBe(
      'solid',
    );
    await expect(trackStyle[`border${side}Color`], `track ${side} colour`).toBe(
      computedColour(look.on ? ACCENT : NEUTRAL_400),
    );
  }

  const knob = await theKnob(track);
  const knobStyle = getComputedStyle(knob);
  const dot = knob.getBoundingClientRect();
  await expect(dot.width, 'knob width').toBeCloseTo(KNOB, 1);
  await expect(dot.height, 'knob height').toBeCloseTo(KNOB, 1);
  await expect(knobStyle.borderTopLeftRadius, 'square knob').toBe('0px');
  await expect(knobStyle.backgroundColor, 'knob fill').toBe(
    computedColour(look.on ? GROUND : NEUTRAL_600),
  );
  await expect(dot.top - rail.top, 'knob top').toBeCloseTo(KNOB_INSET, 1);
  await expect(dot.left - rail.left, 'knob left').toBeCloseTo(
    look.on ? KNOB_ON_LEFT : KNOB_INSET,
    1,
  );

  holder.removeAttribute('data-resting');
}

// The label right of the track: 10 px after it, centred on it, at a line
// height of 1.3.
async function expectLabel(control: HTMLElement): Promise<void> {
  const label = within(control).getByText(LABEL);
  await expect(label, 'label').toBeVisible();
  await expect(getComputedStyle(label).lineHeight, 'line height').toBe(
    LINE_HEIGHT,
  );
  const rail = (await theTrack(control)).getBoundingClientRect();
  const text = label.getBoundingClientRect();
  await expect(text.left - rail.right, 'gap to label').toBeCloseTo(GAP, 0);
  await expect(middle(text), 'label centred').toBeCloseTo(middle(rail), 0);
}

const meta = {
  title: 'Primitives/Switch',
  component: Switch,
  render: (args) => (
    <Holder data-resting="">
      <ControlledSwitch {...args} />
    </Holder>
  ),
  args: { checked: false, onChange: fn() },
} satisfies Meta<typeof Switch>;

export default meta;

type Story = StoryObj<typeof meta>;

// On, with the prototype's label: the accent track, the knob on the right,
// named by its label.
export const On: Story = {
  args: { checked: true, label: LABEL },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);

    const control = theSwitch(canvasElement);
    await expectSwitch(control, { on: true });
    await expect(control).toBeEnabled();
    await expect(control).toHaveAccessibleName(LABEL);
    await expectLabel(control);
  },
};

// Off, with the label: a clear track, the grey knob on the left.
export const Off: Story = {
  args: { checked: false, label: LABEL },
  play: async ({ canvasElement }) => {
    const control = theSwitch(canvasElement);
    await expectSwitch(control, { on: false });
    await expect(control).toHaveAccessibleName(LABEL);
    await expectLabel(control);
  },
};

// Without a label: the track alone, named by its ariaLabel.
export const WithAriaLabel: Story = {
  args: { checked: true, ariaLabel: ARIA_LABEL },
  play: async ({ canvasElement }) => {
    const control = theSwitch(canvasElement);
    await expectSwitch(control, { on: true });
    await expect(control).toHaveAccessibleName(ARIA_LABEL);
    await expect(control.textContent, 'no text').toBe('');
    await expect(control.getBoundingClientRect().width, 'width').toBeCloseTo(
      TRACK_WIDTH,
      1,
    );
  },
};

// With both a label and an ariaLabel: the label names the switch.
export const LabelOverAriaLabel: Story = {
  args: { checked: true, label: LABEL, ariaLabel: ARIA_LABEL },
  play: async ({ canvasElement }) => {
    await expect(theSwitch(canvasElement)).toHaveAccessibleName(LABEL);
  },
};

// An empty label is absent, as in Switch.dc.html (sc-if, and
// `p.label ? undefined : p.ariaLabel`): no label element, no gap, and the
// ariaLabel still names the switch.
export const EmptyLabel: Story = {
  args: { checked: true, label: '', ariaLabel: ARIA_LABEL },
  play: async ({ canvasElement }) => {
    const control = theSwitch(canvasElement);
    await expectSwitch(control, { on: true });
    await expect(control).toHaveAccessibleName(ARIA_LABEL);
    await expect(control.children, 'children of the control').toHaveLength(1);
    await expect(control.getBoundingClientRect().width, 'width').toBeCloseTo(
      TRACK_WIDTH,
      1,
    );
  },
};

// A label that wraps onto several lines: the track keeps its 34 x 18 and
// stays centred on the label.
export const WrappedLabel: Story = {
  args: { checked: true, label: LABEL },
  render: (args) => (
    <Holder data-resting="">
      <Narrow>
        <ControlledSwitch {...args} />
      </Narrow>
    </Holder>
  ),
  play: async ({ canvasElement }) => {
    const control = theSwitch(canvasElement);
    await expectSwitch(control, { on: true });
    await expect(
      within(control).getByText(LABEL).getBoundingClientRect().height,
      'label wraps',
    ).toBeGreaterThan(parseFloat(LINE_HEIGHT) * 1.5);
    await expectLabel(control);
  },
};

// A click switches on and reports true, and the knob moves right; a second
// click switches off and reports false.
export const Toggling: Story = {
  args: { checked: false, label: LABEL, onChange: fn() },
  play: async ({ args, canvasElement }) => {
    const control = theSwitch(canvasElement);
    await expectSwitch(control, { on: false });

    await userEvent.click(control);
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenLastCalledWith(true);
    await expect(theSwitch(canvasElement)).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const track = await theTrack(theSwitch(canvasElement));
    const knob = await theKnob(track);
    await expect(
      knob.getBoundingClientRect().left - track.getBoundingClientRect().left,
      'knob moved right',
    ).toBeCloseTo(KNOB_ON_LEFT, 1);

    await userEvent.click(theSwitch(canvasElement));
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await expect(args.onChange).toHaveBeenLastCalledWith(false);
    await expect(theSwitch(canvasElement)).toHaveAttribute(
      'aria-checked',
      'false',
    );
  },
};

// Disabled: faded; a click reports nothing and changes nothing.
export const Disabled: Story = {
  args: { checked: true, label: LABEL, disabled: true, onChange: fn() },
  play: async ({ args, canvasElement }) => {
    const control = theSwitch(canvasElement);
    await expectSwitch(control, { on: true, disabled: true });
    await expect(control).toBeDisabled();

    await userEvent.click(control);
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(theSwitch(canvasElement)).toHaveAttribute(
      'aria-checked',
      'true',
    );
  },
};
