// Reveal an expanded block inside the nearest scroll container. Keeps the header row visible, scrolls only as much as needed.
(function () {
  if (window.SB_reveal) return;
  const scroller = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p; } return document.scrollingElement; };
  window.SB_reveal = function (headEl, blockEl, margin) {
    if (!headEl) return;
    const m = margin ?? 24;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const sc = scroller(headEl), box = sc === document.scrollingElement ? { top: 0, bottom: window.innerHeight } : sc.getBoundingClientRect();
      const head = headEl.getBoundingClientRect(), last = (blockEl || headEl).getBoundingClientRect();
      const overflow = last.bottom + m - box.bottom;
      if (overflow <= 0) return;
      const maxUp = head.top - box.top - m;
      const dy = Math.max(0, Math.min(overflow, maxUp));
      if (dy > 0) sc.scrollBy({ top: dy, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
  };
})();
