import { describe, expect, it } from 'vitest';
import { computeRevealScroll } from './useRevealOnExpand.ts';

// SPEC, Auto-scroll on expand, and lib/reveal.js: after a block opens, the
// scroll area scrolls down just far enough to show the whole block with a
// margin below it, but never so far that the clicked row passes the margin
// below the area's top. Nothing happens when the block fits, or on collapse,
// when there is no block. The boxes are viewport boxes, as
// getBoundingClientRect gives them; the result is how far to scroll down, or
// null for no scroll. The invented scroll area below runs from 80 to 680.

const AREA = { top: 80, bottom: 680 };
const MARGIN = 24;

describe('computeRevealScroll', () => {
  it('does not scroll when the block fits inside the area with its margin', () => {
    const head = { top: 200, bottom: 246 };
    const block = { top: 200, bottom: 500 };

    expect(computeRevealScroll(head, block, AREA, MARGIN)).toBeNull();
  });

  it('does not scroll when the block ends exactly at the margin above the bottom', () => {
    const head = { top: 300, bottom: 346 };
    const block = { top: 300, bottom: 656 };

    expect(computeRevealScroll(head, block, AREA, MARGIN)).toBeNull();
  });

  it('scrolls a block that runs past the bottom just far enough to show it with the margin', () => {
    const head = { top: 400, bottom: 446 };
    const block = { top: 400, bottom: 760 };

    expect(computeRevealScroll(head, block, AREA, MARGIN)).toBe(104);
  });

  it('keeps the margin it is given below the block', () => {
    const head = { top: 400, bottom: 446 };
    const block = { top: 400, bottom: 760 };

    expect(computeRevealScroll(head, block, AREA, 40)).toBe(120);
  });

  it('scrolls a block longer than the area only until the clicked row reaches the margin below the top', () => {
    const head = { top: 400, bottom: 446 };
    const block = { top: 400, bottom: 1400 };

    expect(computeRevealScroll(head, block, AREA, MARGIN)).toBe(296);
  });

  it('scrolls a long block under a row near the top only up to the margin below the top', () => {
    const head = { top: 120, bottom: 166 };
    const block = { top: 120, bottom: 900 };

    expect(computeRevealScroll(head, block, AREA, MARGIN)).toBe(16);
  });

  it('does not scroll when the clicked row already sits at the margin below the top', () => {
    const head = { top: 104, bottom: 150 };
    const block = { top: 104, bottom: 900 };

    expect(computeRevealScroll(head, block, AREA, MARGIN)).toBeNull();
  });

  it('does not scroll when the clicked row sits inside the margin below the top', () => {
    const head = { top: 90, bottom: 136 };
    const block = { top: 90, bottom: 900 };

    expect(computeRevealScroll(head, block, AREA, MARGIN)).toBeNull();
  });

  it('does not scroll on collapse, when there is no block, even for a row at the bottom', () => {
    const head = { top: 640, bottom: 686 };

    expect(computeRevealScroll(head, null, AREA, MARGIN)).toBeNull();
  });
});
