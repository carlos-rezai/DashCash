import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Checkbox } from './Checkbox.tsx';

// The colours a reader sees, written out from dashcash-dark.css and
// Checkbox.dc.html, apart from the Theme.
// --color-text: the label
const INK = '#e9f1fa';
// --color-accent: a checked box's border and fill
const ACCENT = '#749dc4';
// --color-neutral-400: an unchecked box's border
const NEUTRAL_400 = '#5b6a7a';
// --color-bg: the check on the accent fill
const GROUND = '#1b2a39';
// An unchecked box's fill, and the control's own
const TRANSPARENT = 'transparent';

// Checkbox.dc.html and SPEC, Control sizing: the 16 px box, the 12 px check,
// the gap between box and label, the label's size and line height.
const BOX = 16;
const CHECK = 12;
const GAP = 8;
const FONT_SIZE = '14px';
const LINE_HEIGHT = '18.2px';

// The prototype's label, and an invented name for a checkbox without one.
const LABEL = 'Mark as recurring';
const ARIA_LABEL = 'Recurring';

// SPEC section 3: checked, onChange and label; the ticket adds disabled, and
// design log Q10 an ariaLabel for a checkbox no label names, as the Switch
// has. Typecheck fails when a prop is missing or one is added.
type ListedProp = 'checked' | 'onChange' | 'label' | 'ariaLabel' | 'disabled';
type CheckboxProp = keyof ComponentProps<typeof Checkbox>;
type MissingProp = Exclude<ListedProp, CheckboxProp>;
type UnlistedProp = Exclude<CheckboxProp, ListedProp>;
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

// Holds the Checkbox out of the pointer's reach while its resting colours are
// read: Chromium on Linux can apply :hover without pointer movement.
const Holder = styled.div`
  &[data-resting] {
    pointer-events: none;
  }
`;

// The Checkbox as a form uses it: checked follows what onChange reports.
function ControlledCheckbox(args: ComponentProps<typeof Checkbox>) {
  const [checked, setChecked] = useState(args.checked);
  return (
    <Holder data-resting="">
      <Checkbox
        {...args}
        checked={checked}
        onChange={(next) => {
          setChecked(next);
          args.onChange(next);
        }}
      />
    </Holder>
  );
}

function theCheckbox(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByRole('checkbox');
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

// The horizontal centre of a box.
function centre(box: DOMRect): number {
  return box.left + box.width / 2;
}

// The bordered square inside the control.
async function theBox(control: HTMLElement): Promise<Element> {
  const boxes = [...control.querySelectorAll('*')].filter(
    (element) => getComputedStyle(element).borderTopStyle === 'solid',
  );
  await expect(boxes, 'boxes').toHaveLength(1);
  const [box] = boxes;
  if (box === undefined) {
    throw new Error('no box');
  }
  return box;
}

type Look = {
  checked: boolean;
  disabled?: boolean;
};

// The checkbox at rest: a button with the checkbox role, checked or not to
// assistive technology; no fill, border or padding of its own, the text
// colour in Barlow at 14 px, the not-allowed cursor of the global style when
// disabled; its 16 px box with a 1 px border, accent and
// filled with a 12 px check in the ground colour when checked, the neutral
// border and clear when not. Read inside the holder; afterwards the pointer
// may reach the checkbox again.
async function expectCheckbox(control: HTMLElement, look: Look): Promise<void> {
  const holder = control.closest('[data-resting]');
  if (holder === null) {
    throw new Error('the checkbox is not held at rest');
  }
  await expect(control.matches(':hover'), 'hovered').toBe(false);
  const style = getComputedStyle(control);

  await expect(control.tagName, 'a button').toBe('BUTTON');
  await expect(control, 'type').toHaveAttribute('type', 'button');
  await expect(control, 'checked').toHaveAttribute(
    'aria-checked',
    String(look.checked),
  );
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
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `control ${side} border`).toBe(
      '0px',
    );
    await expect(style[`padding${side}`], `control ${side} padding`).toBe(
      '0px',
    );
  }

  const box = await theBox(control);
  const boxStyle = getComputedStyle(box);
  const square = box.getBoundingClientRect();
  await expect(square.width, 'box width').toBeCloseTo(BOX, 1);
  await expect(square.height, 'box height').toBeCloseTo(BOX, 1);
  await expect(boxStyle.backgroundColor, 'box fill').toBe(
    computedColour(look.checked ? ACCENT : TRANSPARENT),
  );
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(boxStyle[`border${side}Width`], `box ${side} border`).toBe(
      '1px',
    );
    await expect(boxStyle[`border${side}Style`], `box ${side} style`).toBe(
      'solid',
    );
    await expect(boxStyle[`border${side}Color`], `box ${side} colour`).toBe(
      computedColour(look.checked ? ACCENT : NEUTRAL_400),
    );
  }

  const checks = box.querySelectorAll('svg');
  await expect(checks, 'checks').toHaveLength(look.checked ? 1 : 0);
  const [check] = checks;
  if (check !== undefined) {
    const mark = check.getBoundingClientRect();
    await expect(mark.width, 'check width').toBeCloseTo(CHECK, 1);
    await expect(mark.height, 'check height').toBeCloseTo(CHECK, 1);
    await expect(getComputedStyle(check).color, 'check colour').toBe(
      computedColour(GROUND),
    );
    await expect(centre(mark), 'check centred across').toBeCloseTo(
      centre(square),
      0,
    );
    await expect(middle(mark), 'check centred down').toBeCloseTo(
      middle(square),
      0,
    );
  }

  holder.removeAttribute('data-resting');
}

// The label right of the box: 8 px after it, centred on it, at a line height
// of 1.3.
async function expectLabel(control: HTMLElement): Promise<void> {
  const label = within(control).getByText(LABEL);
  await expect(label, 'label').toBeVisible();
  await expect(getComputedStyle(label).lineHeight, 'line height').toBe(
    LINE_HEIGHT,
  );
  const square = (await theBox(control)).getBoundingClientRect();
  const text = label.getBoundingClientRect();
  await expect(text.left - square.right, 'gap to label').toBeCloseTo(GAP, 0);
  await expect(middle(text), 'label centred').toBeCloseTo(middle(square), 0);
}

const meta = {
  title: 'Primitives/Checkbox',
  component: Checkbox,
  render: (args) => <ControlledCheckbox {...args} />,
  args: { checked: false, onChange: fn() },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

// Checked, with the prototype's label: the accent box with its check.
export const Checked: Story = {
  args: { checked: true, label: LABEL },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);

    const control = theCheckbox(canvasElement);
    await expectCheckbox(control, { checked: true });
    await expect(control).toBeEnabled();
    await expect(control).toHaveAccessibleName(LABEL);
    await expectLabel(control);
  },
};

// Unchecked, with the label: a clear box with the neutral border, no check.
export const Unchecked: Story = {
  args: { checked: false, label: LABEL },
  play: async ({ canvasElement }) => {
    const control = theCheckbox(canvasElement);
    await expectCheckbox(control, { checked: false });
    await expect(control).toHaveAccessibleName(LABEL);
    await expectLabel(control);
  },
};

// Without a label: the box alone, named by its ariaLabel.
export const Unlabelled: Story = {
  args: { checked: true, ariaLabel: ARIA_LABEL },
  play: async ({ canvasElement }) => {
    const control = theCheckbox(canvasElement);
    await expectCheckbox(control, { checked: true });
    await expect(control).toHaveAccessibleName(ARIA_LABEL);
    await expect(control.textContent, 'no text').toBe('');
    await expect(control.getBoundingClientRect().width, 'width').toBeCloseTo(
      BOX,
      1,
    );
  },
};

// A click checks and reports true, and the box shows it; a second click
// unchecks and reports false.
export const Toggling: Story = {
  args: { checked: false, label: LABEL, onChange: fn() },
  play: async ({ args, canvasElement }) => {
    const control = theCheckbox(canvasElement);
    await expectCheckbox(control, { checked: false });

    await userEvent.click(control);
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenLastCalledWith(true);
    await expect(theCheckbox(canvasElement)).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(
      theCheckbox(canvasElement).querySelectorAll('svg'),
      'check shown',
    ).toHaveLength(1);

    await userEvent.click(theCheckbox(canvasElement));
    await expect(args.onChange).toHaveBeenCalledTimes(2);
    await expect(args.onChange).toHaveBeenLastCalledWith(false);
    await expect(theCheckbox(canvasElement)).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(
      theCheckbox(canvasElement).querySelectorAll('svg'),
      'check gone',
    ).toHaveLength(0);
  },
};

// Disabled: a click reports nothing and changes nothing.
export const Disabled: Story = {
  args: { checked: true, label: LABEL, disabled: true, onChange: fn() },
  play: async ({ args, canvasElement }) => {
    const control = theCheckbox(canvasElement);
    await expectCheckbox(control, { checked: true, disabled: true });
    await expect(control).toBeDisabled();

    await userEvent.click(control);
    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(theCheckbox(canvasElement)).toHaveAttribute(
      'aria-checked',
      'true',
    );
  },
};
