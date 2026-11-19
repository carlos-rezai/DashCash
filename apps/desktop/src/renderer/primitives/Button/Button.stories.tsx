import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from './Button.tsx';

// The colours a reader sees, written out from SPEC section 2 and
// Button.dc.html, apart from the Theme: Chromium reports computed colours as
// rgb().
// --color-accent #749dc4: the primary fill
const ACCENT = 'rgb(116, 157, 196)';
// --color-accent-600 #94bce3: the ghost text
const ACCENT_600 = 'rgb(148, 188, 227)';
// --color-bg #1b2a39: the primary text
const GROUND = 'rgb(27, 42, 57)';
// --color-text #e9f1fa: the secondary text
const INK = 'rgb(233, 241, 250)';
// --sb-danger, raised to #ed8c80 (design log D1): the danger text
const DANGER = 'rgb(237, 140, 128)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

// SPEC section 3 plus SPEC, Loaders: the Button's props and no others.
type ListedProp =
  | 'label'
  | 'variant'
  | 'size'
  | 'icon'
  | 'iconRight'
  | 'block'
  | 'disabled'
  | 'title'
  | 'onClick'
  | 'loading'
  | 'loadingLabel'
  | 'loaderVariant';
type ButtonProp = keyof ComponentProps<typeof Button>;
// Typecheck fails when a prop is missing or one is added.
type MissingProp = Exclude<ListedProp, ButtonProp>;
type UnlistedProp = Exclude<ButtonProp, ListedProp>;
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;

// The one button of the story; its name when it has a label or a title.
function theButton(canvasElement: HTMLElement, name?: string): HTMLElement {
  const canvas = within(canvasElement);
  return name === undefined
    ? canvas.getByRole('button')
    : canvas.getByRole('button', { name });
}

function svgsIn(element: Element): SVGSVGElement[] {
  return [...element.querySelectorAll('svg')];
}

// The box around the button's text, whatever element holds it.
function textBox(element: Element): DOMRect {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let first: Node | null = null;
  let last: Node | null = null;
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if ((node.textContent ?? '').trim() !== '') {
      first ??= node;
      last = node;
    }
  }
  if (first === null || last === null) {
    return new DOMRect(NaN, NaN, NaN, NaN);
  }
  range.setStartBefore(first);
  range.setEndAfter(last);
  return range.getBoundingClientRect();
}

async function expectBox(
  element: Element,
  width: number,
  height: number,
  what: string,
): Promise<void> {
  const box = element.getBoundingClientRect();
  await expect(box.width, `${what} width`).toBeCloseTo(width, 1);
  await expect(box.height, `${what} height`).toBeCloseTo(height, 1);
}

async function expectHeight(
  button: HTMLElement,
  height: number,
): Promise<void> {
  await expect(button.getBoundingClientRect().height).toBeCloseTo(height, 1);
}

// One icon in the button, at the given size.
async function expectOneIcon(
  button: HTMLElement,
  size: number,
): Promise<SVGSVGElement> {
  const svgs = svgsIn(button);
  await expect(svgs).toHaveLength(1);
  const [svg] = svgs;
  if (svg === undefined) {
    throw new Error('no icon');
  }
  await expectBox(svg, size, size, 'icon');
  return svg;
}

async function expectColours(
  button: HTMLElement,
  text: string,
  background: string,
): Promise<void> {
  const style = getComputedStyle(button);
  await expect(style.color, 'text').toBe(text);
  await expect(style.backgroundColor, 'fill').toBe(background);
}

// Diagnostic for the CI failure of ticket 12: whether the button is under the
// pointer while its resting colours are measured. Removed with the fix.
function reportHover(story: string, button: HTMLElement): void {
  console.warn(
    `[hover-diagnostic] ${story}: ${String(button.matches(':hover'))}`,
  );
}

const meta = {
  title: 'Primitives/Button',
  component: Button,
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

// The four variants, md, as Component Inventory.dc.html shows them. Each one
// calls onClick when clicked.

// Primary: the solid accent, the one solid object.
export const Primary: Story = {
  args: {
    variant: 'primary',
    label: 'Import CSV',
    icon: 'upload',
    onClick: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const button = theButton(canvasElement, 'Import CSV');
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expectColours(button, GROUND, ACCENT);

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

// Secondary is the default variant: transparent, in ink.
export const Secondary: Story = {
  args: { label: 'Cancel', onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const button = theButton(canvasElement, 'Cancel');
    reportHover('Secondary', button);
    await expectColours(button, INK, TRANSPARENT);

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Ghost: Story = {
  args: { variant: 'ghost', label: 'Show all', onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const button = theButton(canvasElement, 'Show all');
    reportHover('Ghost', button);
    await expectColours(button, ACCENT_600, TRANSPARENT);

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Danger: Story = {
  args: { variant: 'danger', label: 'Delete', icon: 'trash', onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const button = theButton(canvasElement, 'Delete');
    reportHover('Danger', button);
    await expectColours(button, DANGER, TRANSPARENT);

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

// The two Control heights (SPEC, Control sizing).

// md is the default: 36 px high, 16 px icons, 14 px Barlow Condensed 600.
export const Medium: Story = {
  args: { label: 'Import CSV', icon: 'upload' },
  play: async ({ canvasElement }) => {
    const button = theButton(canvasElement, 'Import CSV');
    await expectHeight(button, 36);
    await expectOneIcon(button, 16);

    const style = getComputedStyle(button);
    await expect(style.fontSize).toBe('14px');
    await expect(style.fontWeight).toBe('600');
    await expect(style.fontFamily.startsWith('"Barlow Condensed"')).toBe(true);
  },
};

// sm: 28 px high, 14 px icons, 13 px text.
export const Small: Story = {
  args: { size: 'sm', label: 'Import CSV', icon: 'upload' },
  play: async ({ canvasElement }) => {
    const button = theButton(canvasElement, 'Import CSV');
    await expectHeight(button, 28);
    await expectOneIcon(button, 14);
    await expect(getComputedStyle(button).fontSize).toBe('13px');
  },
};

// The icon stands left of the label.
export const LeftIcon: Story = {
  args: { label: 'New account', icon: 'plus' },
  play: async ({ canvasElement }) => {
    const button = theButton(canvasElement, 'New account');
    const icon = await expectOneIcon(button, 16);
    await expect(icon.getBoundingClientRect().right).toBeLessThanOrEqual(
      textBox(button).left,
    );
  },
};

// The right icon stands right of the label.
export const RightIcon: Story = {
  args: { variant: 'primary', label: 'Next', iconRight: 'arrowRight' },
  play: async ({ canvasElement }) => {
    const button = theButton(canvasElement, 'Next');
    const icon = await expectOneIcon(button, 16);
    await expect(icon.getBoundingClientRect().left).toBeGreaterThanOrEqual(
      textBox(button).right,
    );
  },
};

// Without a label: a square named by its title.
export const IconOnly: Story = {
  args: { icon: 'trash', title: 'Delete account', onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const button = theButton(canvasElement, 'Delete account');
    await expectBox(button, 36, 36, 'button');
    await expectOneIcon(button, 16);
    await expect(button.textContent.trim()).toBe('');

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const IconOnlySmall: Story = {
  args: { size: 'sm', icon: 'pencil', title: 'Rename account' },
  play: async ({ canvasElement }) => {
    const button = theButton(canvasElement, 'Rename account');
    await expectBox(button, 28, 28, 'button');
    await expectOneIcon(button, 14);
  },
};

// block fills the width of what holds it.
const Holder = styled.div`
  width: 320px;
`;

export const Block: Story = {
  args: { variant: 'primary', label: 'Save', block: true },
  render: (args) => (
    <Holder>
      <Button {...args} />
    </Holder>
  ),
  play: async ({ canvasElement }) => {
    const button = theButton(canvasElement, 'Save');
    await expect(button.getBoundingClientRect().width).toBeCloseTo(320, 1);
    await expectHeight(button, 36);
  },
};

// Disabled: 45 % opacity, and a click does nothing.
export const Disabled: Story = {
  args: {
    variant: 'primary',
    label: 'Import CSV',
    icon: 'upload',
    disabled: true,
    onClick: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const button = theButton(canvasElement, 'Import CSV');
    await expect(button).toBeDisabled();
    await expect(getComputedStyle(button).opacity).toBe('0.45');

    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

// Loading ("Importing…"): a Loader at icon size in the text's colour replaces
// the icon, the -ing label replaces the label; busy, at full strength, and a
// click does nothing.
export const Loading: Story = {
  args: {
    variant: 'primary',
    label: 'Import CSV',
    loadingLabel: 'Importing…',
    icon: 'upload',
    loading: true,
    onClick: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const button = theButton(canvasElement);
    await expect(button.textContent.trim()).toBe('Importing…');
    await expect(button.getAttribute('aria-busy')).toBe('true');
    await expect(button).toBeDisabled();
    await expect(getComputedStyle(button).opacity).toBe('1');
    await expectHeight(button, 36);

    // The Loader's mark is the only drawing in the button.
    const loader = within(button).getByRole('status');
    const mark = await expectOneIcon(button, 16);
    await expect(loader.contains(mark)).toBe(true);
    const strokes = [...mark.querySelectorAll('path')];
    await expect(strokes.length).toBeGreaterThan(0);
    for (const stroke of strokes) {
      await expect(getComputedStyle(stroke).stroke).toBe(GROUND);
    }

    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

// A Button in a hidden container is hidden whole: its icon, its Loader and its
// label are neither seen nor in the accessibility tree. (The shown face must
// not set an explicit `visibility: visible`, which would override the
// container's.)
export const InHiddenContainer: Story = {
  args: {},
  render: () => (
    <div style={{ visibility: 'hidden' }}>
      <Button label="Import CSV" icon="upload" />
      <Button
        label="Export CSV"
        loadingLabel="Exporting…"
        icon="upload"
        loading
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = [...canvasElement.querySelectorAll('button')];
    await expect(buttons).toHaveLength(2);

    // Nothing is in the accessibility tree: no button, no Loader.
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
    await expect(canvas.queryAllByRole('status')).toHaveLength(0);

    // Nothing is drawn: every icon, the Loader's mark and each label.
    const marks = svgsIn(canvasElement);
    await expect(marks).toHaveLength(2);
    for (const mark of marks) {
      await expect(getComputedStyle(mark).visibility).toBe('hidden');
    }
    for (const text of ['Import CSV', 'Exporting…']) {
      const label = canvas.getByText(text);
      await expect(getComputedStyle(label).visibility).toBe('hidden');
    }
    for (const button of buttons) {
      await expect(getComputedStyle(button).visibility).toBe('hidden');
    }
  },
};

// A button with an icon and one without, neither loading yet, and a plain
// control that starts both.
function StartsLoading(args: ComponentProps<typeof Button>) {
  const [loading, setLoading] = useState(false);
  return (
    <>
      <Button {...args} loading={loading} />
      <Button
        variant="secondary"
        label="Export CSV"
        loadingLabel="Exporting…"
        loading={loading}
      />
      <button
        type="button"
        onClick={() => {
          setLoading(true);
        }}
      >
        Start loading
      </button>
    </>
  );
}

// "Import CSV" becomes "Importing…" (wider) and the width does not jump, with
// an icon or without one (the Loader takes the icon's place, or adds to the
// width where there was no icon).
export const LoadingKeepsWidth: Story = {
  args: {
    variant: 'primary',
    label: 'Import CSV',
    loadingLabel: 'Importing…',
    icon: 'upload',
  },
  render: (args) => <StartsLoading {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const withIcon = canvas.getByRole('button', { name: 'Import CSV' });
    const withoutIcon = canvas.getByRole('button', { name: 'Export CSV' });
    await expect(withIcon).toHaveAttribute('aria-busy', 'false');
    await expect(withoutIcon).toHaveAttribute('aria-busy', 'false');
    const widthWithIcon = withIcon.getBoundingClientRect().width;
    const widthWithoutIcon = withoutIcon.getBoundingClientRect().width;

    await userEvent.click(
      canvas.getByRole('button', { name: 'Start loading' }),
    );
    await expect(withIcon).toHaveAttribute('aria-busy', 'true');
    await expect(withoutIcon).toHaveAttribute('aria-busy', 'true');
    // The hidden idle content does not name the button: the name is the
    // Loader's own "Loading" and the -ing label, nothing more.
    await expect(
      canvas.getByRole('button', { name: 'Loading Importing…' }),
    ).toBe(withIcon);
    await expect(
      canvas.getByRole('button', { name: 'Loading Exporting…' }),
    ).toBe(withoutIcon);
    await expect(withIcon.getBoundingClientRect().width).toBeCloseTo(
      widthWithIcon,
      1,
    );
    await expect(withoutIcon.getBoundingClientRect().width).toBeCloseTo(
      widthWithoutIcon,
      1,
    );
  },
};
