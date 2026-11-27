import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { readFirstFamily } from './readFirstFamily.ts';

// The proof of the shared first family probe: it renders elements with a
// font-family each, and its Play functions read their computed style.

const meta = {
  title: 'Test support/readFirstFamily',
  render: () => (
    <div>
      <p
        data-testid="quoted"
        style={{ fontFamily: '"Barlow Condensed", system-ui' }}
      >
        Quoted
      </p>
      <p data-testid="listed" style={{ fontFamily: 'Barlow, sans-serif' }}>
        Listed
      </p>
      <p data-testid="single" style={{ fontFamily: 'monospace' }}>
        Single
      </p>
    </div>
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const QuotedFamily: Story = {
  play: async ({ canvasElement }) => {
    const element = within(canvasElement).getByTestId('quoted');
    // Chromium quotes a name with a space, and the probe strips the quotes.
    await expect(getComputedStyle(element).fontFamily).toContain(
      '"Barlow Condensed"',
    );
    await expect(readFirstFamily(getComputedStyle(element))).toBe(
      'Barlow Condensed',
    );
  },
};

export const ListedFamily: Story = {
  play: async ({ canvasElement }) => {
    const element = within(canvasElement).getByTestId('listed');
    await expect(readFirstFamily(getComputedStyle(element))).toBe('Barlow');
  },
};

export const SingleFamily: Story = {
  play: async ({ canvasElement }) => {
    const element = within(canvasElement).getByTestId('single');
    await expect(readFirstFamily(getComputedStyle(element))).toBe('monospace');
  },
};

export const SpacedFamily: Story = {
  play: async () => {
    // Chromium normalises what it computes, so a declaration written by hand
    // is the one way to reach the spaces and the single quotes.
    const written = { fontFamily: " 'Barlow Condensed' , system-ui" };
    await expect(readFirstFamily(written as CSSStyleDeclaration)).toBe(
      'Barlow Condensed',
    );
  },
};

export const NoFamily: Story = {
  play: async () => {
    // An element's own style holds no family until one is set.
    const bare = document.createElement('p');
    await expect(bare.style.fontFamily).toBe('');
    await expect(readFirstFamily(bare.style)).toBe('');
  },
};
