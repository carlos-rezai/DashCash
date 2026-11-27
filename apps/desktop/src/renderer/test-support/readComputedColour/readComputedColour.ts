// What Chromium computes as the `color` of a probe element for a CSS colour,
// so a colour written as a hex value, a keyword or a color-mix() string can be
// compared with what an element computes. Throws on a string that is no
// colour, and removes the probe again.
export function readComputedColour(css: string): string {
  const probe = document.createElement('span');
  probe.style.color = css;
  if (probe.style.color === '') {
    throw new Error(`not a CSS colour: ${css}`);
  }
  document.body.append(probe);
  try {
    return getComputedStyle(probe).color;
  } finally {
    probe.remove();
  }
}
