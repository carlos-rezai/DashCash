import { useEffect, useRef, type RefObject } from 'react';
import { useTheme } from 'styled-components';

// A viewport box, as getBoundingClientRect gives it.
export type RevealBox = { top: number; bottom: number };

// How far the container scrolls down to show an opened block with the margin
// below it, never so far that the clicked row passes the margin below the
// container's top; null when nothing scrolls: the block fits, the row already
// sits at or inside the top margin, or the block closed (block is null).
export function computeRevealScroll(
  head: RevealBox,
  block: RevealBox | null,
  container: RevealBox,
  margin: number,
): number | null {
  if (block === null) {
    return null;
  }
  const overflow = block.bottom + margin - container.bottom;
  if (overflow <= 0) {
    return null;
  }
  const room = head.top - container.top - margin;
  const distance = Math.min(overflow, room);
  return distance > 0 ? distance : null;
}

// The nearest ancestor that scrolls, else the page.
function scrollerOf(element: HTMLElement): Element {
  for (
    let parent = element.parentElement;
    parent !== null;
    parent = parent.parentElement
  ) {
    const overflow = getComputedStyle(parent).overflowY;
    if (
      (overflow === 'auto' || overflow === 'scroll') &&
      parent.scrollHeight > parent.clientHeight
    ) {
      return parent;
    }
  }
  return document.scrollingElement ?? document.documentElement;
}

function reveal(head: HTMLElement, block: HTMLElement, margin: number): void {
  const scroller = scrollerOf(block);
  const container =
    scroller === document.scrollingElement
      ? { top: 0, bottom: window.innerHeight }
      : scroller.getBoundingClientRect();
  const distance = computeRevealScroll(
    head.getBoundingClientRect(),
    block.getBoundingClientRect(),
    container,
    margin,
  );
  if (distance === null) {
    return;
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  scroller.scrollBy({ top: distance, behavior: reduced ? 'auto' : 'smooth' });
}

// After open turns true, scrolls the nearest scroll container just far enough
// to show the block, with the Theme's reveal margin below it, never so far
// that the head (the clicked row) passes the margin below the container's top.
// The head and the block are separate elements: a year row and the tbody it
// shares with the other years, or an accordion's header and its section.
// Nothing happens on mount or on collapse.
export function useRevealOnExpand(
  headRef: RefObject<HTMLElement | null>,
  blockRef: RefObject<HTMLElement | null>,
  open: boolean,
): void {
  const wasOpen = useRef(open);
  const margin = parseFloat(useTheme().size.revealMargin);

  useEffect(() => {
    const opened = open && !wasOpen.current;
    wasOpen.current = open;
    const head = headRef.current;
    const block = blockRef.current;
    if (!opened || head === null || block === null) {
      return undefined;
    }
    // Two frames, so the content has been laid out.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        reveal(head, block, margin);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [open, margin, headRef, blockRef]);
}
