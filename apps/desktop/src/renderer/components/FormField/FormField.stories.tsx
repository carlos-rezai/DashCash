import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, within } from 'storybook/test';
import { Input } from '../../primitives/Input/Input.tsx';
import { Select } from '../../primitives/Select/Select.tsx';
import { readComputedColour } from '../../test-support/readComputedColour/readComputedColour.ts';
import * as components from '../index.ts';
import { FormField } from './FormField.tsx';

// The colours a reader sees, written out from dashcash-dark.css and design
// log D1, apart from the Theme.
// --sb-text-muted: the label
const TEXT_MUTED = 'color-mix(in srgb, #e9f1fa 62%, transparent)';
// --sb-text-faint, raised to 60 % (D1): the hint
const TEXT_FAINT = 'color-mix(in srgb, #e9f1fa 60%, transparent)';
// --sb-danger, raised to #ed8c80 (D1): the error
const DANGER = '#ed8c80';

// FormField.dc.html: 5 px between the label, the control and the hint; the
// label at 12 px and 0.04em, the hint and the error at 12 px.
const GAP = 5;
const TEXT_SIZE = 12;
const LABEL_SPACING = 0.04 * TEXT_SIZE;

// The prototype's preview width; a narrow frame and a control wider than it
// for the story that checks the field shrinks.
const FRAME_WIDTH = 320;
const NARROW_FRAME = 200;
const WIDE_CONTROL = '320px';

// The copy of Component Inventory.dc.html and AccountFormModal.dc.html, the
// type hint from lib/store.js; the errors are invented.
const BALANCE = 'Balance today';
const BALANCE_HINT = "A change adds a correction at today's date.";
const BALANCE_ERROR = 'Enter an amount like 1.529,60.';
const TYPE = 'Type';
const TYPE_HINT = 'Recurring items only';
const TYPE_ERROR = 'Choose a type.';
const NAME = 'Name';

const TYPE_OPTIONS = [
  { value: 'income', label: 'Income' },
  { value: 'spending', label: 'Spending' },
  { value: 'savings', label: 'Savings' },
  { value: 'card', label: 'Credit card' },
  { value: 'mortgage', label: 'Mortgage' },
];

// SPEC section 3: the FormField's props and no others; label and children
// are required. Typecheck fails when a prop is missing, one is added, or one
// changes between required and optional.
type FormFieldProps = ComponentProps<typeof FormField>;
type ListedProp = 'label' | 'hint' | 'error' | 'children';
type FormFieldProp = keyof FormFieldProps;
type MissingProp = Exclude<ListedProp, FormFieldProp>;
type UnlistedProp = Exclude<FormFieldProp, ListedProp>;
type RequiredProp = {
  [Key in FormFieldProp]-?: object extends Pick<FormFieldProps, Key>
    ? never
    : Key;
}[FormFieldProp];
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;
const LABEL_AND_CHILDREN_REQUIRED: [RequiredProp] extends ['label' | 'children']
  ? ['label' | 'children'] extends [RequiredProp]
    ? true
    : false
  : false = true;

// Holds the FormField out of the pointer's reach while its resting colours
// are read: Chromium on Linux can apply :hover without pointer movement.
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

// The field: the one element the holder holds.
function theField(canvasElement: HTMLElement): HTMLElement {
  const field = within(canvasElement).getByTestId('holder').firstElementChild;
  if (!(field instanceof HTMLElement)) {
    throw new Error('no field');
  }
  return field;
}

type Look = {
  label: string;
  // The control the field wraps.
  control: HTMLElement;
  // The text below the control, a hint or an error, if any.
  message?: { text: string; colour: string };
};

// The field at rest: the label on top in the muted colour, the control 5 px
// below it, and the message 5 px below the control in its colour; without a
// message the field ends with the control. Read inside the holder;
// afterwards the pointer may reach the field again.
async function expectField(
  canvasElement: HTMLElement,
  look: Look,
): Promise<void> {
  const field = theField(canvasElement);
  const holder = field.closest('[data-resting]');
  if (holder === null) {
    throw new Error('the field is not held at rest');
  }
  await expect(field.matches(':hover'), 'hovered').toBe(false);

  const box = field.getBoundingClientRect();
  const control = look.control.getBoundingClientRect();

  const label = within(canvasElement).getByText(look.label);
  const labelBox = label.getBoundingClientRect();
  const labelStyle = getComputedStyle(label);
  await expect(labelStyle.color, 'label colour').toBe(
    readComputedColour(TEXT_MUTED),
  );
  await expect(labelStyle.fontSize, 'label size').toBe(
    `${String(TEXT_SIZE)}px`,
  );
  await expect(
    Number.parseFloat(labelStyle.letterSpacing),
    'label spacing',
  ).toBeCloseTo(LABEL_SPACING, 2);
  await expect(labelBox.top - box.top, 'label top').toBeCloseTo(0, 1);
  await expect(labelBox.left - box.left, 'label left').toBeCloseTo(0, 1);
  await expect(control.top - labelBox.bottom, 'label gap').toBeCloseTo(GAP, 1);
  await expect(control.left - box.left, 'control left').toBeCloseTo(0, 1);

  if (look.message === undefined) {
    await expect(box.bottom - control.bottom, 'field end').toBeCloseTo(0, 1);
  } else {
    const message = within(canvasElement).getByText(look.message.text);
    const messageBox = message.getBoundingClientRect();
    const messageStyle = getComputedStyle(message);
    await expect(messageStyle.color, 'message colour').toBe(
      readComputedColour(look.message.colour),
    );
    await expect(messageStyle.fontSize, 'message size').toBe(
      `${String(TEXT_SIZE)}px`,
    );
    await expect(
      messageStyle.getPropertyValue('text-wrap-style'),
      'message wrap',
    ).toBe('pretty');
    await expect(messageBox.top - control.bottom, 'message gap').toBeCloseTo(
      GAP,
      1,
    );
    await expect(messageBox.left - box.left, 'message left').toBeCloseTo(0, 1);
    await expect(box.bottom - messageBox.bottom, 'field end').toBeCloseTo(0, 1);
  }

  holder.removeAttribute('data-resting');
}

const meta = {
  title: 'Components/FormField',
  component: FormField,
  render: (args) => (
    <Holder data-testid="holder" data-resting="">
      <FormField {...args} />
    </Holder>
  ),
  args: {
    label: BALANCE,
    children: (
      <Input value="1.529,60" suffix="€" align="right" onChange={fn()} />
    ),
  },
} satisfies Meta<typeof FormField>;

export default meta;

type Story = StoryObj<typeof meta>;

// The inventory's field: an Input with its hint, named by the label.
export const InputWithHint: Story = {
  args: { hint: BALANCE_HINT },
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(LABEL_AND_CHILDREN_REQUIRED).toBe(true);
    await expect(
      components.FormField === FormField,
      'exported by the barrel',
    ).toBe(true);

    const control = within(canvasElement).getByRole('textbox');
    await expect(control).toHaveAccessibleName(BALANCE);
    await expectField(canvasElement, {
      label: BALANCE,
      control,
      message: { text: BALANCE_HINT, colour: TEXT_FAINT },
    });
  },
};

// An error replaces the hint, in the danger colour.
export const InputWithError: Story = {
  args: { hint: BALANCE_HINT, error: BALANCE_ERROR },
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole('textbox');
    await expect(control).toHaveAccessibleName(BALANCE);
    await expect(
      within(canvasElement).queryByText(BALANCE_HINT),
      'hint replaced',
    ).toBeNull();
    await expectField(canvasElement, {
      label: BALANCE,
      control,
      message: { text: BALANCE_ERROR, colour: DANGER },
    });
  },
};

// A Select with its hint, named by the label.
export const SelectWithHint: Story = {
  args: {
    label: TYPE,
    hint: TYPE_HINT,
    children: <Select value="income" options={TYPE_OPTIONS} onChange={fn()} />,
  },
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole('combobox');
    await expect(control).toHaveAccessibleName(TYPE);
    await expectField(canvasElement, {
      label: TYPE,
      control,
      message: { text: TYPE_HINT, colour: TEXT_FAINT },
    });
  },
};

// A Select with an error and no hint: the error alone, in the danger colour.
export const SelectWithError: Story = {
  args: {
    label: TYPE,
    error: TYPE_ERROR,
    children: (
      <Select
        value=""
        placeholder="Choose a type"
        options={TYPE_OPTIONS}
        onChange={fn()}
      />
    ),
  },
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole('combobox');
    await expect(control).toHaveAccessibleName(TYPE);
    await expectField(canvasElement, {
      label: TYPE,
      control,
      message: { text: TYPE_ERROR, colour: DANGER },
    });
  },
};

// Neither hint nor error: the field ends with the control.
export const WithoutHint: Story = {
  args: {
    label: NAME,
    children: (
      <Input value="" placeholder="e.g. Sparkasse Giro" onChange={fn()} />
    ),
  },
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole('textbox');
    await expect(control).toHaveAccessibleName(NAME);
    await expectField(canvasElement, { label: NAME, control });
  },
};

// An empty error is no error (the prototype shows `error || hint`): the hint
// stays, in its own colour.
export const EmptyErrorKeepsHint: Story = {
  args: { hint: BALANCE_HINT, error: '' },
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole('textbox');
    await expect(control).toHaveAccessibleName(BALANCE);
    await expectField(canvasElement, {
      label: BALANCE,
      control,
      message: { text: BALANCE_HINT, colour: TEXT_FAINT },
    });
  },
};

// An empty hint shows nothing, as no hint does: the field ends with the
// control.
export const EmptyHint: Story = {
  args: { hint: '' },
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole('textbox');
    await expect(control).toHaveAccessibleName(BALANCE);
    await expectField(canvasElement, { label: BALANCE, control });
  },
};

// A flex item with a control wider than its holder: the field shrinks to the
// width it is given, so the label takes that width.
export const ShrinksInFlexRow: Story = {
  args: {
    hint: BALANCE_HINT,
    children: (
      <Input
        value="1.529,60"
        suffix="€"
        align="right"
        width={WIDE_CONTROL}
        onChange={fn()}
      />
    ),
  },
  render: (args) => (
    <NarrowFlexHolder data-testid="holder" data-resting="">
      <FormField {...args} />
    </NarrowFlexHolder>
  ),
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole('textbox');
    await expect(control).toHaveAccessibleName(BALANCE);
    await expect(
      theField(canvasElement).getBoundingClientRect().width,
      'field width',
    ).toBeCloseTo(NARROW_FRAME, 1);
  },
};
