import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { readHoveredStyle } from './readHoveredStyle.ts';

// The proof of the shared hover probe: it renders a box with a :hover fill and
// a child coloured by its parent's :hover, and its Play functions read them.

// Invented colours, as the rgb() form Chromium computes.
const REST_FILL = 'rgb(233, 241, 250)';
const HOVER_FILL = 'rgb(250, 233, 241)';
const REST_TEXT = 'rgb(220, 230, 240)';
const HOVER_TEXT = 'rgb(240, 230, 220)';
const MARK = 'data-hover-probe';

const SHEET = `
  .hover-probe-box { background-color: ${REST_FILL}; color: rgb(10, 20, 30); }
  .hover-probe-box:hover { background-color: ${HOVER_FILL}; }
  .hover-probe-child { color: ${REST_TEXT}; }
  .hover-probe-parent:hover .hover-probe-child { color: ${HOVER_TEXT}; }
`;

const meta = {
  title: 'Test support/readHoveredStyle',
  // The pointer-events container keeps the real pointer off the elements, so
  // their resting values are read: Chromium on Linux can apply :hover without
  // pointer movement.
  render: () => (
    <div style={{ pointerEvents: 'none' }} data-testid="holder">
      <style>{SHEET}</style>
      <div className="hover-probe-box" data-testid="box">
        Box
      </div>
      <div className="hover-probe-parent" data-testid="parent">
        <p className="hover-probe-child" data-testid="child">
          Child
        </p>
      </div>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function readFill(style: CSSStyleDeclaration): string {
  return style.backgroundColor;
}

function readText(style: CSSStyleDeclaration): string {
  return style.color;
}

function countRules(): number {
  let total = 0;
  for (const sheet of document.styleSheets) {
    total += sheet.cssRules.length;
  }
  return total;
}

export const HoveredFill: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByTestId('box');
    await expect(box.matches(':hover')).toBe(false);

    await expect(readHoveredStyle(box, readFill)).toBe(HOVER_FILL);
    // The resting value is back once the probe is done.
    await expect(readFill(getComputedStyle(box))).toBe(REST_FILL);
  },
};

export const HoveredChildColour: Story = {
  play: async ({ canvasElement }) => {
    const child = within(canvasElement).getByTestId('child');
    await expect(child.matches(':hover')).toBe(false);

    // The rule is the parent's :hover, so the probe marks the ancestors too.
    await expect(readHoveredStyle(child, readText)).toBe(HOVER_TEXT);
    await expect(readText(getComputedStyle(child))).toBe(REST_TEXT);
  },
};

export const MarksTheElementAndItsAncestors: Story = {
  play: async ({ canvasElement }) => {
    const child = within(canvasElement).getByTestId('child');
    const parent = within(canvasElement).getByTestId('parent');
    const box = within(canvasElement).getByTestId('box');

    const marked = readHoveredStyle(child, () => ({
      child: child.hasAttribute(MARK),
      parent: parent.hasAttribute(MARK),
      body: document.body.hasAttribute(MARK),
      sibling: box.hasAttribute(MARK),
    }));
    await expect(marked).toEqual({
      child: true,
      parent: true,
      body: true,
      sibling: false,
    });
  },
};

export const CopiesTheHoverRulesWhileReading: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByTestId('box');
    const rulesBefore = countRules();

    // The sheet's two :hover rules each stand beside a copy while the read
    // runs, at least: the page may hold :hover rules of its own.
    await expect(readHoveredStyle(box, countRules)).toBeGreaterThanOrEqual(
      rulesBefore + 2,
    );
  },
};

export const RemovesItsCopies: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByTestId('box');
    const rulesBefore = countRules();

    readHoveredStyle(box, readFill);
    await expect(countRules()).toBe(rulesBefore);
  },
};

export const RemovesItsMarkers: Story = {
  play: async ({ canvasElement }) => {
    const child = within(canvasElement).getByTestId('child');

    readHoveredStyle(child, readText);
    await expect(document.querySelector(`[${MARK}]`)).toBeNull();
  },
};

export const KeepsNoCopiesWhenReadThrows: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByTestId('box');
    const rulesBefore = countRules();

    await expect(() =>
      readHoveredStyle(box, () => {
        throw new Error('read failed');
      }),
    ).toThrow('read failed');
    await expect(countRules()).toBe(rulesBefore);
  },
};

export const KeepsNoMarkersWhenReadThrows: Story = {
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByTestId('box');

    await expect(() =>
      readHoveredStyle(box, () => {
        throw new Error('read failed');
      }),
    ).toThrow('read failed');
    await expect(document.querySelector(`[${MARK}]`)).toBeNull();
  },
};
