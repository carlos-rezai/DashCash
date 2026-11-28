// SPEC, Name and logo: the geometry in the 32 by 32 view box, the circle's
// centre and radius, and the 45 degree line the three dashes lie on.
export const LOGO_CENTRE = 16;
export const LOGO_RADIUS = 13;
export const LOGO_DIAGONAL = 0.70710678;
export const LOGO_UNIT = LOGO_RADIUS / 9;
export const LOGO_C_PATH = 'M25.2 6.8 A13 13 0 1 0 29 16';
export const LOGO_C_CUT =
  'M-2 -2 H34 V34 H-2 Z M16 16 L32.66 16 L23.46 25.2 L16 25.2 Z';
export const LOGO_LINE_PATH = 'M3.3 19 L8.5 16.5 L12.5 19.5 L16 16';

// The optical stroke width by size: 3.2 up to 20 px, 2.6 up to 32, 2.2 above.
export function computeLogoStrokeWidth(size: number): number {
  if (size <= 20) {
    return 3.2;
  }
  return size <= 32 ? 2.6 : 2.2;
}

// Where dash 3 ends: on the 45 degree line, 13 + stroke / 2 from the centre,
// so its tip is flush with the outer edge of the C.
export function computeLogoDashEnd(strokeWidth: number): {
  x: number;
  y: number;
} {
  const reach = LOGO_DIAGONAL * (LOGO_RADIUS + strokeWidth / 2);
  return { x: LOGO_CENTRE + reach, y: LOGO_CENTRE - reach };
}
