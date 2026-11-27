import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { readComputedColour } from './readComputedColour.ts';

// The proof of the shared colour probe: it renders nothing, and its Play
// functions call it.

// An invented colour, as a hex value and as the rgb() form Chromium computes.
const HEX = '#e9f1fa';
const HEX_COMPUTED = 'rgb(233, 241, 250)';
// A colour mixed with transparent, as the stories' expected values write them.
const MIX = 'color-mix(in srgb, #e9f1fa 62%, transparent)';

const meta = {
  title: 'Test support/readComputedColour',
  render: () => <div />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const HexColour: Story = {
  play: async () => {
    await expect(readComputedColour(HEX)).toBe(HEX_COMPUTED);
  },
};

export const MixedColour: Story = {
  play: async () => {
    // What an element styled with the mix computes, read without the probe.
    const reference = document.createElement('p');
    reference.style.color = MIX;
    document.body.append(reference);
    const expected = getComputedStyle(reference).color;
    reference.remove();

    await expect(expected).not.toBe('');
    await expect(readComputedColour(MIX)).toBe(expected);
  },
};

export const NotAColour: Story = {
  play: async () => {
    await expect(() => readComputedColour('not a colour')).toThrow(
      'not a CSS colour: not a colour',
    );
  },
};

export const LeavesNoProbe: Story = {
  play: async () => {
    const before = document.body.innerHTML;

    readComputedColour(HEX);
    await expect(document.body.innerHTML).toBe(before);

    await expect(() => readComputedColour('not a colour')).toThrow();
    await expect(document.body.innerHTML).toBe(before);
  },
};
