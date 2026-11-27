import { describe, expect, it } from 'vitest';
import { computeLogoDashEnd, computeLogoStrokeWidth } from './Logo.tsx';

// SPEC, Name and logo: the optical stroke width by size, 3.2 up to 20 px, 2.6
// up to 32 px and 2.2 above; dash 3 ends on the 45° line from the centre
// (16,16) to the C's top end, 13 + stroke/2 from the centre, so its tip is
// flush with the outer edge of the C.

const CENTRE = 16;
const RADIUS = 13;

describe('computeLogoStrokeWidth', () => {
  it.each([
    { size: 16, expected: 3.2 },
    { size: 19, expected: 3.2 },
    { size: 20, expected: 3.2 },
    { size: 20.5, expected: 2.6 },
    { size: 21, expected: 2.6 },
    { size: 28, expected: 2.6 },
    { size: 31, expected: 2.6 },
    { size: 32, expected: 2.6 },
    { size: 32.5, expected: 2.2 },
    { size: 33, expected: 2.2 },
    { size: 256, expected: 2.2 },
  ])(
    'draws a $size px logo with a stroke of $expected',
    ({ size, expected }) => {
      expect(computeLogoStrokeWidth(size)).toBe(expected);
    },
  );
});

describe('computeLogoDashEnd', () => {
  // SPEC: 16 ± 0.7071 · (13 + stroke/2), to the prototype's three decimals.
  it.each([
    { strokeWidth: 3.2, x: 26.324, y: 5.676 },
    { strokeWidth: 2.6, x: 26.112, y: 5.888 },
    { strokeWidth: 2.2, x: 25.97, y: 6.03 },
  ])(
    'ends dash 3 at ($x, $y) for a stroke of $strokeWidth',
    ({ strokeWidth, x, y }) => {
      const end = computeLogoDashEnd(strokeWidth);
      expect(end.x).toBeCloseTo(x, 3);
      expect(end.y).toBeCloseTo(y, 3);
    },
  );

  it.each([3.2, 2.6, 2.2])(
    'puts the tip on the 45° line, flush with the outer edge of the C, for a stroke of %s',
    (strokeWidth) => {
      const end = computeLogoDashEnd(strokeWidth);
      expect(end.x - CENTRE).toBeCloseTo(CENTRE - end.y, 6);
      expect(end.x).toBeGreaterThan(CENTRE);
      expect(Math.hypot(end.x - CENTRE, end.y - CENTRE)).toBeCloseTo(
        RADIUS + strokeWidth / 2,
        6,
      );
    },
  );
});
