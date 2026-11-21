import { describe, expect, it } from 'vitest';
import { toCents, type Cents } from '@dashcash/domain/money/cents/cents';
import { computeSparklinePoints } from './Sparkline.tsx';

// Sparkline.dc.html: the series runs from past to future across a box 200
// wide and `height` high; the lowest value sits 2 above the bottom, at
// height - 2, and the highest 2 below the top, at 2. The solid line
// is the past, the dashed line runs from the last past value (today) through
// the future, and the tick stands at today. A flat series lies on the low
// line. The invented series below land on whole points.

function cents(values: readonly number[]): Cents[] {
  return values.map((value) => toCents(value));
}

describe('computeSparklinePoints', () => {
  it('maps a rising series from the bottom left to the top right', () => {
    const points = computeSparklinePoints(
      cents([100_000, 200_000, 300_000]),
      cents([400_000, 500_000]),
      36,
    );

    expect(points.solid).toEqual([
      { x: 0, y: 34 },
      { x: 50, y: 26 },
      { x: 100, y: 18 },
    ]);
    expect(points.dashed).toEqual([
      { x: 100, y: 18 },
      { x: 150, y: 10 },
      { x: 200, y: 2 },
    ]);
    expect(points.todayX).toBe(100);
  });

  it('maps a falling series into the negative from the top left to the bottom right of a taller box', () => {
    const points = computeSparklinePoints(
      cents([20_000, 10_000]),
      cents([0, -10_000, -20_000]),
      60,
    );

    expect(points.solid).toEqual([
      { x: 0, y: 2 },
      { x: 50, y: 16 },
    ]);
    expect(points.dashed).toEqual([
      { x: 50, y: 16 },
      { x: 100, y: 30 },
      { x: 150, y: 44 },
      { x: 200, y: 58 },
    ]);
    expect(points.todayX).toBe(50);
  });

  it('lays a flat series on the low line', () => {
    const points = computeSparklinePoints(
      cents([75_000, 75_000, 75_000]),
      cents([75_000, 75_000]),
      36,
    );

    expect(points.solid).toEqual([
      { x: 0, y: 34 },
      { x: 50, y: 34 },
      { x: 100, y: 34 },
    ]);
    expect(points.dashed).toEqual([
      { x: 100, y: 34 },
      { x: 150, y: 34 },
      { x: 200, y: 34 },
    ]);
    expect(points.todayX).toBe(100);
  });

  it('spreads a past-only series over the whole width, with no dashed line and the tick at the right end', () => {
    const points = computeSparklinePoints(
      cents([100_000, 300_000, 200_000]),
      [],
      36,
    );

    expect(points.solid).toEqual([
      { x: 0, y: 34 },
      { x: 100, y: 2 },
      { x: 200, y: 18 },
    ]);
    expect(points.dashed).toEqual([]);
    expect(points.todayX).toBe(200);
  });
});
