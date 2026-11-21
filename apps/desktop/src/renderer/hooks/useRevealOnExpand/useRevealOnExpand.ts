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

function reveal(section: HTMLElement, margin: number): void {
  const header = section.firstElementChild;
  if (header === null) {
    return;
  }
  const scroller = scrollerOf(section);
  const container =
    scroller === document.scrollingElement
      ? { top: 0, bottom: window.innerHeight }
      : scroller.getBoundingClientRect();
  const distance = computeRevealScroll(
    header.getBoundingClientRect(),
    section.getBoundingClientRect(),
    container,
    margin,
  );
  if (distance === null) {
    return;
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  scroller.scrollBy({ top: distance, behavior: reduced ? 'auto' : 'smooth' });
}

// After the block this ref is put on opens, scrolls its nearest scroll
// container just far enough to show it, with the Theme's reveal margin below
// it. The block's first child is the clicked row. Nothing happens on mount or
// on collapse.
export function useRevealOnExpand(
  open: boolean,
): RefObject<HTMLElement | null> {
  const section = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(open);
  const margin = parseFloat(useTheme().size.revealMargin);

  useEffect(() => {
    const opened = open && !wasOpen.current;
    wasOpen.current = open;
    const element = section.current;
    if (!opened || element === null) {
      return undefined;
    }
    // Two frames, so the content has been laid out.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        reveal(element, margin);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [open, margin]);

  return section;
}
