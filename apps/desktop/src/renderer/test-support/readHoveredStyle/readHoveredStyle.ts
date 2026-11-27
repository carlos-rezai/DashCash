// The marker that stands in for :hover while a hovered style is read.
const HOVER_MARK = 'data-hover-probe';

// What `read` returns for the computed style of an element under the pointer.
// A story's synthetic pointer events do not make Chromium apply :hover, so
// every :hover rule is copied right after itself with the marker in its
// place, and the marker is set on the element and its ancestors while `read`
// runs. The marker weighs as much as :hover and each copy follows its rule,
// so the cascade is that of a real hover. The markers and the copies are
// removed again, even when `read` throws. `read` gets a live style, so it
// returns the value it needs, not the style itself.
export function readHoveredStyle<Value>(
  element: Element,
  read: (style: CSSStyleDeclaration) => Value,
): Value {
  const copies: CSSRule[] = [];
  const marked: Element[] = [];
  try {
    for (const sheet of document.styleSheets) {
      const rules = [...sheet.cssRules];
      for (let index = rules.length - 1; index >= 0; index -= 1) {
        const rule = rules[index];
        if (
          rule instanceof CSSStyleRule &&
          rule.selectorText.includes(':hover')
        ) {
          sheet.insertRule(
            rule.cssText.replaceAll(':hover', `[${HOVER_MARK}]`),
            index + 1,
          );
          const copy = sheet.cssRules.item(index + 1);
          if (copy !== null) {
            copies.push(copy);
          }
        }
      }
    }
    for (let node: Element | null = element; node; node = node.parentElement) {
      node.setAttribute(HOVER_MARK, '');
      marked.push(node);
    }
    return read(getComputedStyle(element));
  } finally {
    for (const node of marked) {
      node.removeAttribute(HOVER_MARK);
    }
    for (const sheet of document.styleSheets) {
      for (let index = sheet.cssRules.length - 1; index >= 0; index -= 1) {
        const rule = sheet.cssRules.item(index);
        if (rule !== null && copies.includes(rule)) {
          sheet.deleteRule(index);
        }
      }
    }
  }
}
