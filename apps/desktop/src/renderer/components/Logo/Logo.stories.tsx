import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, within } from 'storybook/test';
import { readComputedColour } from '../../test-support/readComputedColour/readComputedColour.ts';
import { readFirstFamily } from '../../test-support/readFirstFamily/readFirstFamily.ts';
import * as components from '../index.ts';
import { Logo } from './Logo.tsx';

// The colours a reader sees, written out from SPEC, Name and logo and
// Logo.dc.html, apart from the Theme.
// --color-accent-600: the mark on dark
const MARK_DARK = '#94bce3';
// Logo.dc.html: the mark on light
const MARK_LIGHT = '#416180';
// --color-text: the wordmark on dark
const INK_DARK = '#e9f1fa';
// Logo.dc.html: the wordmark on light
const INK_LIGHT = '#1d1f20';
// Logo.dc.html: the light ground the light logo sits on
const GROUND_LIGHT = '#f2f2f3';

// SPEC, Name and logo: the wordmark in Barlow Condensed 600 at 0.78 × size,
// letter-spacing 0.02em, line-height 1, 0.32 × size after the mark, both
// rounded to whole pixels as Logo.dc.html does; viewBox 0 0 32 32.
const NAME = 'DashCash';
const HEADING_FONT = 'Barlow Condensed';
const HEADING_WEIGHT = '600';
const VIEW_BOX = 32;

// SPEC: the three dashes on the 45° line from the centre to the C's top end,
// with u = 13/9: gaps 0…u, 3u…4u and 6u…7u, dashes u…3u, 4u…6u and from 7u
// to the outer edge of the C.
const CENTRE = 16;
const DIAGONAL = Math.SQRT1_2;
const UNIT = 13 / 9;

// SPEC, Name and logo: props exactly variant, size and theme, all optional.
// Typecheck fails when a prop is missing, one is added, or one becomes
// required.
type LogoProps = ComponentProps<typeof Logo>;
type ListedProp = 'variant' | 'size' | 'theme';
type LogoProp = keyof LogoProps;
type MissingProp = Exclude<ListedProp, LogoProp>;
type UnlistedProp = Exclude<LogoProp, ListedProp>;
type RequiredProp = {
  [Key in LogoProp]-?: object extends Pick<LogoProps, Key> ? never : Key;
}[LogoProp];
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;
const NONE_REQUIRED: [RequiredProp] extends [never] ? true : false = true;

// The two variants, the two themes and a numeric size, and no others.
type ListedVariant = 'full' | 'mark';
type LogoVariant = NonNullable<LogoProps['variant']>;
const VARIANTS_EXACT: [LogoVariant] extends [ListedVariant]
  ? [ListedVariant] extends [LogoVariant]
    ? true
    : false
  : false = true;
type ListedTheme = 'dark' | 'light';
type LogoTheme = NonNullable<LogoProps['theme']>;
const THEMES_EXACT: [LogoTheme] extends [ListedTheme]
  ? [ListedTheme] extends [LogoTheme]
    ? true
    : false
  : false = true;
type LogoSize = NonNullable<LogoProps['size']>;
const SIZE_IS_NUMBER: [LogoSize] extends [number]
  ? [number] extends [LogoSize]
    ? true
    : false
  : false = true;

// The light logo sits on the light ground it is drawn for.
const LightGround = styled.div`
  display: inline-block;
  padding: 8px;
  background: ${GROUND_LIGHT};
`;

// A frame narrower than the logo, whose own box may shrink below its content.
const Narrow = styled.div`
  & > span {
    width: 20px;
    min-width: 0;
  }
`;

// The mark: the drawing labelled with the name.
function theMark(canvasElement: HTMLElement): SVGSVGElement {
  const mark = within(canvasElement).getByLabelText(NAME);
  if (!(mark instanceof SVGSVGElement)) {
    throw new Error('the mark is no svg');
  }
  return mark;
}

// The paths the mark draws, without the outline of its clip.
function drawnPaths(mark: SVGSVGElement): SVGPathElement[] {
  return [...mark.querySelectorAll('path')].filter(
    (path) => path.closest('clipPath') === null,
  );
}

// Whether the mark paints the point (x, y) of its 32 × 32 view box.
function paints(mark: SVGSVGElement, x: number, y: number): boolean {
  const box = mark.getBoundingClientRect();
  const hit = document.elementFromPoint(
    box.left + (x / VIEW_BOX) * box.width,
    box.top + (y / VIEW_BOX) * box.height,
  );
  return hit instanceof SVGGeometryElement && mark.contains(hit);
}

// The point t along the 45° line from the centre to the C's top end.
function onDiagonal(t: number): [number, number] {
  return [CENTRE + DIAGONAL * t, CENTRE - DIAGONAL * t];
}

type Look = {
  size: number;
  strokeWidth: number;
  // Dash 3's tip, SPEC: 16 ± 0.7071 · (13 + stroke/2).
  dashEnd: { x: number; y: number };
  markColour: string;
  // The wordmark's colour, or none for the mark alone.
  inkColour?: string;
};

// The mark size × size, every line in its colour at its stroke width, no
// fill, and dash 3 ending flush with the C; the full logo also shows the
// wordmark beside it, centred on the mark.
async function expectLogo(
  canvasElement: HTMLElement,
  look: Look,
): Promise<void> {
  const mark = theMark(canvasElement);
  const box = mark.getBoundingClientRect();
  await expect(box.width, 'mark width').toBeCloseTo(look.size, 1);
  await expect(box.height, 'mark height').toBeCloseTo(look.size, 1);

  const paths = drawnPaths(mark);
  await expect(paths.length, 'drawn paths').toBeGreaterThan(0);
  for (const path of paths) {
    const style = getComputedStyle(path);
    await expect(style.stroke, 'stroke colour').toBe(
      readComputedColour(look.markColour),
    );
    await expect(Number.parseFloat(style.strokeWidth), 'stroke width').toBe(
      look.strokeWidth,
    );
    await expect(style.fill, 'fill').toBe('none');
  }

  const ends = paths.flatMap((path) => [
    path.getPointAtLength(0),
    path.getPointAtLength(path.getTotalLength()),
  ]);
  await expect(
    ends.some(
      (end) =>
        Math.abs(end.x - look.dashEnd.x) < 0.005 &&
        Math.abs(end.y - look.dashEnd.y) < 0.005,
    ),
    'dash 3 ends flush with the C',
  ).toBe(true);

  const word = within(canvasElement).queryByText(NAME);
  if (look.inkColour === undefined) {
    await expect(word, 'wordmark').toBeNull();
    return;
  }
  if (word === null) {
    throw new Error('no wordmark');
  }
  const fontSize = Math.round(0.78 * look.size);
  const gap = Math.round(0.32 * look.size);
  const style = getComputedStyle(word);
  const wordBox = word.getBoundingClientRect();
  await expect(style.color, 'wordmark colour').toBe(
    readComputedColour(look.inkColour),
  );
  await expect(readFirstFamily(style), 'wordmark font').toBe(HEADING_FONT);
  await expect(style.fontWeight, 'wordmark weight').toBe(HEADING_WEIGHT);
  await expect(style.fontSize, 'wordmark size').toBe(`${String(fontSize)}px`);
  await expect(
    Number.parseFloat(style.letterSpacing),
    'wordmark spacing',
  ).toBeCloseTo(0.02 * fontSize, 2);
  await expect(
    Number.parseFloat(style.lineHeight),
    'wordmark line height',
  ).toBeCloseTo(fontSize, 1);
  await expect(wordBox.left - box.right, 'gap after the mark').toBeCloseTo(
    gap,
    1,
  );
  await expect(
    (wordBox.top + wordBox.bottom) / 2,
    'wordmark centred on the mark',
  ).toBeCloseTo((box.top + box.bottom) / 2, 0);
  // Its own height, not stretched to the mark's: a stretched box has the same
  // centre but its text sits at the top.
  await expect(wordBox.height, 'wordmark as high as its text').toBeCloseTo(
    fontSize,
    0,
  );
}

const meta = {
  title: 'Components/Logo',
  component: Logo,
} satisfies Meta<typeof Logo>;

export default meta;

type Story = StoryObj<typeof meta>;

// No props: the full logo, 28 px, dark.
export const Full: Story = {
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(NONE_REQUIRED).toBe(true);
    await expect(VARIANTS_EXACT).toBe(true);
    await expect(THEMES_EXACT).toBe(true);
    await expect(SIZE_IS_NUMBER).toBe(true);
    await expect(components.Logo === Logo, 'exported by the barrel').toBe(true);

    await expectLogo(canvasElement, {
      size: 28,
      strokeWidth: 2.6,
      dashEnd: { x: 26.112, y: 5.888 },
      markColour: MARK_DARK,
      inkColour: INK_DARK,
    });
  },
};

// The full logo at 16 px: the thickest stroke.
export const FullSmall: Story = {
  args: { variant: 'full', size: 16, theme: 'dark' },
  play: async ({ canvasElement }) => {
    await expectLogo(canvasElement, {
      size: 16,
      strokeWidth: 3.2,
      dashEnd: { x: 26.324, y: 5.676 },
      markColour: MARK_DARK,
      inkColour: INK_DARK,
    });
  },
};

// The full logo at 40 px: the thinnest stroke.
export const FullLarge: Story = {
  args: { size: 40 },
  play: async ({ canvasElement }) => {
    await expectLogo(canvasElement, {
      size: 40,
      strokeWidth: 2.2,
      dashEnd: { x: 25.97, y: 6.03 },
      markColour: MARK_DARK,
      inkColour: INK_DARK,
    });
  },
};

// The full logo on light: the mark and the wordmark in their light colours.
export const FullLight: Story = {
  args: { theme: 'light' },
  render: (args) => (
    <LightGround>
      <Logo {...args} />
    </LightGround>
  ),
  play: async ({ canvasElement }) => {
    await expectLogo(canvasElement, {
      size: 28,
      strokeWidth: 2.6,
      dashEnd: { x: 26.112, y: 5.888 },
      markColour: MARK_LIGHT,
      inkColour: INK_LIGHT,
    });
  },
};

// The mark alone, 28 px: no wordmark.
export const Mark: Story = {
  args: { variant: 'mark' },
  play: async ({ canvasElement }) => {
    await expectLogo(canvasElement, {
      size: 28,
      strokeWidth: 2.6,
      dashEnd: { x: 26.112, y: 5.888 },
      markColour: MARK_DARK,
    });
  },
};

// The mark at 20 px, the largest size with the thickest stroke.
export const MarkSmall: Story = {
  args: { variant: 'mark', size: 20 },
  play: async ({ canvasElement }) => {
    await expectLogo(canvasElement, {
      size: 20,
      strokeWidth: 3.2,
      dashEnd: { x: 26.324, y: 5.676 },
      markColour: MARK_DARK,
    });
  },
};

// The mark at 256 px: the C cut parallel to the dashes, and the three dashes
// with their gaps, as painted.
export const MarkLarge: Story = {
  args: { variant: 'mark', size: 256 },
  play: async ({ canvasElement }) => {
    await expectLogo(canvasElement, {
      size: 256,
      strokeWidth: 2.2,
      dashEnd: { x: 25.97, y: 6.03 },
      markColour: MARK_DARK,
    });

    const mark = theMark(canvasElement);
    // On the circle 10° below the horizontal the C is cut away; at 35° it is
    // still drawn (the cut runs along x + y = 48.66).
    const circle = (degrees: number): [number, number] => {
      const angle = (degrees * Math.PI) / 180;
      return [CENTRE + 13 * Math.cos(angle), CENTRE + 13 * Math.sin(angle)];
    };
    await expect(paints(mark, ...circle(10)), 'C cut at 10°').toBe(false);
    await expect(paints(mark, ...circle(35)), 'C drawn at 35°').toBe(true);

    for (const t of [0.5, 3.5, 6.5]) {
      await expect(
        paints(mark, ...onDiagonal(t * UNIT)),
        `gap at ${String(t)}u`,
      ).toBe(false);
    }
    for (const t of [2, 5, 8]) {
      await expect(
        paints(mark, ...onDiagonal(t * UNIT)),
        `dash at ${String(t)}u`,
      ).toBe(true);
    }
  },
};

// A frame narrower than the logo: the mark keeps its size and does not shrink.
export const NarrowFrame: Story = {
  render: (args) => (
    <Narrow>
      <Logo {...args} />
    </Narrow>
  ),
  play: async ({ canvasElement }) => {
    const box = theMark(canvasElement).getBoundingClientRect();
    await expect(box.width, 'mark width').toBeCloseTo(28, 1);
    await expect(box.height, 'mark height').toBeCloseTo(28, 1);
  },
};

// The mark on light, 64 px.
export const MarkLight: Story = {
  args: { variant: 'mark', size: 64, theme: 'light' },
  render: (args) => (
    <LightGround>
      <Logo {...args} />
    </LightGround>
  ),
  play: async ({ canvasElement }) => {
    await expectLogo(canvasElement, {
      size: 64,
      strokeWidth: 2.2,
      dashEnd: { x: 25.97, y: 6.03 },
      markColour: MARK_LIGHT,
    });
  },
};
