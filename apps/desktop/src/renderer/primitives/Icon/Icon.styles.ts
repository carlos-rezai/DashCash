import type { LucideIcon } from 'lucide-react';
import { styled } from 'styled-components';

// The prototype's glyph: a block that never shrinks inside a flex row.
export function styleGlyph(glyph: LucideIcon) {
  return styled(glyph)`
    display: block;
    flex: none;
  `;
}
