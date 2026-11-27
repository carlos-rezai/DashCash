// The first family of a style's `font-family`, trimmed and without quotes, as
// `docs/conventions.md` asks a font check to compare it: Chromium quotes only
// a name that contains a space. `''` when the style names no family.
export function readFirstFamily(style: CSSStyleDeclaration): string {
  const first = style.fontFamily.split(',')[0] ?? '';
  return first.trim().replace(/^(["'])(.*)\1$/, '$2');
}
