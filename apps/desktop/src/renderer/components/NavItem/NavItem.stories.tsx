import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Icon, type IconName } from '../../primitives/Icon/Icon.tsx';
import * as components from '../index.ts';
import { NavItem } from './NavItem.tsx';

// The colours a reader sees, written out from dashcash-dark.css and
// NavItem.dc.html, apart from the Theme. The mixes stay color-mix() strings,
// so each colour is compared through what Chromium computes for it.
// --color-text: the label of an active item, and of any item under the pointer
const INK = '#e9f1fa';
// --sb-text-muted: the label and the icon of a resting item
const TEXT_MUTED = 'color-mix(in srgb, #e9f1fa 62%, transparent)';
// --color-accent-100 and --color-accent-300: an active item's fill and border
const ACCENT_100 = '#22384d';
const ACCENT_300 = '#416180';
// --color-accent-600: an active item's icon
const ACCENT_600 = '#94bce3';
// --color-accent: the focus ring
const ACCENT = '#749dc4';
// --color-accent-200 and --color-accent-800: the accent badge
const ACCENT_200 = '#2c455d';
const ACCENT_800 = '#d6ebff';
// --sb-warning-tint and --sb-warning: the warning badge
const WARNING_TINT = 'color-mix(in srgb, #e0b469 14%, transparent)';
const WARNING = '#e0b469';
// --sb-hover: a resting item's fill under the pointer
const HOVER = 'color-mix(in srgb, #e9f1fa 6%, transparent)';
const TRANSPARENT = 'transparent';

// SPEC, Control sizing: NavItem 38, expanded and compact. NavItem.dc.html:
// a 1 px border, 12 px side padding (none when compact), an 18 px icon, 10 px
// between the icon, the label and the badge, 14 px text.
const HEIGHT = 38;
const BORDER = 1;
const PADDING = 12;
const ICON_SIZE = 18;
const GAP = 10;
const FONT_SIZE = '14px';
// NavItem.dc.html: the badge at least 22 px wide, 6 px side padding, 12 px
// text on a 20 px line; compact, the corner chip 3 px inside the top right
// corner, at least 16 px wide, 3 px side padding, 10 px text on a 15 px line.
const BADGE_MIN_WIDTH = 22;
const BADGE_PADDING = '6px';
const BADGE_FONT_SIZE = '12px';
const BADGE_HEIGHT = 20;
const CHIP_INSET = 3;
const CHIP_MIN_WIDTH = 16;
const CHIP_PADDING = '3px';
const CHIP_FONT_SIZE = '10px';
const CHIP_HEIGHT = 15;

// SPEC section 1: the sidebar is 208 px wide; the compact frame is an
// invented rail narrower than the expanded item's padding and icon.
const WIDTH = 208;
const COMPACT_WIDTH = 40;

// The copy of NavItem.dc.html's defaults.
const ICON: IconName = 'inbox';
const LABEL = 'Uncategorised';
const BADGE = 7;

// SPEC section 3 plus compact: the NavItem's props, and no others; active,
// badge, badgeTone and compact alone are optional. Typecheck fails when a
// prop is missing, one is added, or one changes between required and
// optional.
type NavItemProps = ComponentProps<typeof NavItem>;
type ListedProp =
  'icon' | 'label' | 'active' | 'badge' | 'badgeTone' | 'onClick' | 'compact';
type NavItemProp = keyof NavItemProps;
type MissingProp = Exclude<ListedProp, NavItemProp>;
type UnlistedProp = Exclude<NavItemProp, ListedProp>;
type OptionalProp = {
  [Key in NavItemProp]-?: object extends Pick<NavItemProps, Key> ? Key : never;
}[NavItemProp];
type ListedOptional = 'active' | 'badge' | 'badgeTone' | 'compact';
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;
const ONLY_LISTED_OPTIONAL: [OptionalProp] extends [ListedOptional]
  ? [ListedOptional] extends [OptionalProp]
    ? true
    : false
  : false = true;
// SPEC section 3: the icon is one of the Icon's names, the badge a number,
// its tone accent or warning, and onClick takes nothing.
type Exactly<Actual, Expected> = [Actual] extends [Expected]
  ? [Expected] extends [Actual]
    ? true
    : false
  : false;
const ICON_IS_AN_ICON_NAME: Exactly<NavItemProps['icon'], IconName> = true;
const BADGE_IS_A_NUMBER: Exactly<
  NonNullable<NavItemProps['badge']>,
  number
> = true;
const BADGE_TONES: Exactly<
  NonNullable<NavItemProps['badgeTone']>,
  'accent' | 'warning'
> = true;
const ON_CLICK_TAKES_NOTHING: Exactly<NavItemProps['onClick'], () => void> =
  true;

// What Chromium computes for a CSS colour, read from a probe element.
function computedColour(css: string): string {
  const probe = document.createElement('span');
  probe.style.color = css;
  if (probe.style.color === '') {
    throw new Error(`not a CSS colour: ${css}`);
  }
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

// The first family of a computed font-family, without quotes: Chromium quotes
// only names that contain a space.
function firstFamily(style: CSSStyleDeclaration): string | undefined {
  return style.fontFamily.split(',')[0]?.trim().replaceAll('"', '');
}

// The marker that stands in for :hover while a hovered style is read.
const HOVER_MARK = 'data-hover-probe';

// What the element looks like under the pointer. A story's synthetic pointer
// events do not make Chromium apply :hover, so every :hover rule is copied
// right after itself with the marker in its place, and the marker is set on
// the element and its ancestors while the style is read. The marker weighs as
// much as :hover and each copy follows its rule, so the cascade is that of a
// real hover.
function hoveredStyle(element: Element): {
  backgroundColor: string;
  color: string;
} {
  const copies: CSSRule[] = [];
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
  const marked: Element[] = [];
  for (let node: Element | null = element; node; node = node.parentElement) {
    node.setAttribute(HOVER_MARK, '');
    marked.push(node);
  }
  try {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, color: style.color };
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

// The sidebar's column, or the compact rail. While its resting colours are
// read, it holds the NavItem out of the pointer's reach: Chromium on Linux can
// apply :hover without pointer movement.
const Frame = styled.div<{ $width: number }>`
  width: ${({ $width }) => $width}px;

  &[data-resting] {
    pointer-events: none;
  }
`;

function theFrame(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByTestId('frame');
}

// The one button the story renders.
function theItem(canvasElement: HTMLElement): HTMLElement {
  return within(theFrame(canvasElement)).getByRole('button');
}

function theIcon(item: HTMLElement): SVGElement {
  const icon = item.querySelector('svg');
  if (icon === null) {
    throw new Error('no icon');
  }
  return icon;
}

// Lets the pointer reach the NavItem again.
function release(canvasElement: HTMLElement): void {
  theFrame(canvasElement).removeAttribute('data-resting');
}

type Look = {
  fill: string;
  border: string;
  text: string;
  icon: string;
};

const RESTING: Look = {
  fill: TRANSPARENT,
  border: TRANSPARENT,
  text: TEXT_MUTED,
  icon: TEXT_MUTED,
};

const ACTIVE: Look = {
  fill: ACCENT_100,
  border: ACCENT_300,
  text: INK,
  icon: ACCENT_600,
};

// The item at rest: its fill, a 1 px solid border, the text colour and the
// icon's colour; 14 px Barlow, the pointer cursor. Read inside the resting
// frame; afterwards the pointer may reach the item again.
async function expectLook(
  canvasElement: HTMLElement,
  look: Look,
): Promise<void> {
  const frame = theFrame(canvasElement);
  const item = theItem(canvasElement);
  await expect(frame.hasAttribute('data-resting'), 'held at rest').toBe(true);
  await expect(item.matches(':hover'), 'hovered').toBe(false);

  const style = getComputedStyle(item);
  await expect(style.backgroundColor, 'fill').toBe(computedColour(look.fill));
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `${side} border`).toBe(
      `${String(BORDER)}px`,
    );
    await expect(style[`border${side}Style`], `${side} style`).toBe('solid');
    await expect(style[`border${side}Color`], `${side} colour`).toBe(
      computedColour(look.border),
    );
  }
  await expect(style.color, 'text').toBe(computedColour(look.text));
  await expect(getComputedStyle(theIcon(item)).color, 'icon').toBe(
    computedColour(look.icon),
  );
  await expect(style.fontSize, 'font size').toBe(FONT_SIZE);
  await expect(firstFamily(style), 'font').toBe('Barlow');
  await expect(style.cursor, 'cursor').toBe('pointer');

  release(canvasElement);
}

// The item fills its frame's width at 38 px high, with the given icon at
// 18 px, vertically centred.
async function expectBox(canvasElement: HTMLElement): Promise<void> {
  const frame = theFrame(canvasElement).getBoundingClientRect();
  const item = theItem(canvasElement);
  const box = item.getBoundingClientRect();
  await expect(box.width, 'width').toBeCloseTo(frame.width, 1);
  await expect(box.height, 'height').toBeCloseTo(HEIGHT, 1);

  const icon = theIcon(item).getBoundingClientRect();
  await expect(icon.width, 'icon width').toBeCloseTo(ICON_SIZE, 1);
  await expect(icon.height, 'icon height').toBeCloseTo(ICON_SIZE, 1);
  await expect((icon.top + icon.bottom) / 2, 'icon middle').toBeCloseTo(
    (box.top + box.bottom) / 2,
    1,
  );

  // The Icon primitive with the item's glyph at 18 px.
  const reference =
    within(canvasElement).getByTestId('reference').firstElementChild;
  await expect(
    theIcon(item).outerHTML === reference?.outerHTML,
    'the icon',
  ).toBe(true);
}

// Expanded: the icon 12 px inside the border, the label 10 px after it and
// running to the badge or the padding, on one line.
async function expectExpandedRow(
  item: HTMLElement,
  badge: HTMLElement | null,
): Promise<void> {
  const box = item.getBoundingClientRect();
  const icon = theIcon(item).getBoundingClientRect();
  const label = within(item).getByText(LABEL);
  const text = label.getBoundingClientRect();
  await expect(icon.left - box.left, 'icon left').toBeCloseTo(
    BORDER + PADDING,
    1,
  );
  await expect(text.left - icon.right, 'icon to label').toBeCloseTo(GAP, 1);
  await expect(getComputedStyle(label).whiteSpace, 'one line').toBe('nowrap');
  if (badge === null) {
    await expect(box.right - text.right, 'label right').toBeCloseTo(
      BORDER + PADDING,
      1,
    );
    return;
  }
  const chip = badge.getBoundingClientRect();
  await expect(chip.left - text.right, 'label to badge').toBeCloseTo(GAP, 1);
  await expect(box.right - chip.right, 'badge right').toBeCloseTo(
    BORDER + PADDING,
    1,
  );
}

type BadgeLook = { fill: string; text: string };

const ACCENT_BADGE: BadgeLook = { fill: ACCENT_200, text: ACCENT_800 };
const WARNING_BADGE: BadgeLook = { fill: WARNING_TINT, text: WARNING };

// The expanded badge: the count in tabular figures, centred, 12 px on a 20 px
// line, at least 22 px wide with 6 px side padding, vertically centred, in
// its tone's colours.
async function expectBadge(
  item: HTMLElement,
  badge: HTMLElement,
  look: BadgeLook,
): Promise<void> {
  const style = getComputedStyle(badge);
  await expect(style.backgroundColor, 'badge fill').toBe(
    computedColour(look.fill),
  );
  await expect(style.color, 'badge text').toBe(computedColour(look.text));
  await expect(style.fontSize, 'badge font size').toBe(BADGE_FONT_SIZE);
  await expect(style.fontVariantNumeric, 'badge figures').toBe('tabular-nums');
  await expect(style.textAlign, 'badge centred').toBe('center');
  await expect(style.paddingLeft, 'badge left padding').toBe(BADGE_PADDING);
  await expect(style.paddingRight, 'badge right padding').toBe(BADGE_PADDING);
  const box = item.getBoundingClientRect();
  const chip = badge.getBoundingClientRect();
  await expect(chip.width, 'badge width').toBeCloseTo(BADGE_MIN_WIDTH, 1);
  await expect(chip.height, 'badge height').toBeCloseTo(BADGE_HEIGHT, 1);
  await expect((chip.top + chip.bottom) / 2, 'badge middle').toBeCloseTo(
    (box.top + box.bottom) / 2,
    1,
  );
}

// Compact: the icon alone, centred, the label as the accessible name and the
// tooltip; no padding.
async function expectCompact(
  canvasElement: HTMLElement,
  name: string,
): Promise<HTMLElement> {
  const item = within(theFrame(canvasElement)).getByRole('button', { name });
  await expect(item, 'tooltip').toHaveAttribute('title', LABEL);
  await expect(within(item).queryByText(LABEL), 'no label shown').toBeNull();
  const style = getComputedStyle(item);
  await expect(style.paddingLeft, 'left padding').toBe('0px');
  await expect(style.paddingRight, 'right padding').toBe('0px');
  const box = item.getBoundingClientRect();
  const icon = theIcon(item).getBoundingClientRect();
  await expect((icon.left + icon.right) / 2, 'icon centre').toBeCloseTo(
    (box.left + box.right) / 2,
    1,
  );
  return item;
}

// The compact corner chip: 3 px inside the top right corner, within the
// border; at least 16 px wide with 3 px side padding, 10 px text on a 15 px
// line, in tabular figures, centred, in its tone's colours.
async function expectChip(
  item: HTMLElement,
  chip: HTMLElement,
  look: BadgeLook,
): Promise<void> {
  const style = getComputedStyle(chip);
  await expect(style.backgroundColor, 'chip fill').toBe(
    computedColour(look.fill),
  );
  await expect(style.color, 'chip text').toBe(computedColour(look.text));
  await expect(style.fontSize, 'chip font size').toBe(CHIP_FONT_SIZE);
  await expect(style.fontVariantNumeric, 'chip figures').toBe('tabular-nums');
  await expect(style.textAlign, 'chip centred').toBe('center');
  await expect(style.paddingLeft, 'chip left padding').toBe(CHIP_PADDING);
  await expect(style.paddingRight, 'chip right padding').toBe(CHIP_PADDING);
  const box = item.getBoundingClientRect();
  const corner = chip.getBoundingClientRect();
  await expect(corner.width, 'chip width').toBeCloseTo(CHIP_MIN_WIDTH, 1);
  await expect(corner.height, 'chip height').toBeCloseTo(CHIP_HEIGHT, 1);
  await expect(corner.top - box.top, 'chip top').toBeCloseTo(
    BORDER + CHIP_INSET,
    1,
  );
  await expect(box.right - corner.right, 'chip right').toBeCloseTo(
    BORDER + CHIP_INSET,
    1,
  );
}

// A keyboard focus shows the 2 px accent ring, offset 2 (SPEC, Focus/hover).
async function expectFocusRing(canvasElement: HTMLElement): Promise<void> {
  await userEvent.tab();
  await expect(
    document.activeElement === theItem(canvasElement),
    'focused',
  ).toBe(true);
  const item = theItem(canvasElement);
  await expect(item.matches(':focus-visible'), 'focus-visible').toBe(true);
  const style = getComputedStyle(item);
  await expect(style.outlineStyle, 'outline style').toBe('solid');
  await expect(style.outlineWidth, 'outline width').toBe('2px');
  await expect(style.outlineColor, 'outline colour').toBe(
    computedColour(ACCENT),
  );
  await expect(style.outlineOffset, 'outline offset').toBe('2px');
}

const meta = {
  title: 'Components/NavItem',
  component: NavItem,
  render: (args) => (
    <>
      <Frame
        data-testid="frame"
        data-resting=""
        $width={args.compact === true ? COMPACT_WIDTH : WIDTH}
      >
        <NavItem {...args} />
      </Frame>
      {/* The icon NavItem.dc.html draws, for the comparison; never shown. */}
      <div hidden data-testid="reference">
        <Icon glyph={args.icon} size={ICON_SIZE} />
      </div>
    </>
  ),
  args: { icon: ICON, label: LABEL, onClick: fn() },
} satisfies Meta<typeof NavItem>;

export default meta;

type Story = StoryObj<typeof meta>;

// The resting item: the icon and the label in the muted text colour on no
// fill, not the current page, no tooltip, no badge.
export const Resting: Story = {
  play: async ({ args, canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(ONLY_LISTED_OPTIONAL).toBe(true);
    await expect(ICON_IS_AN_ICON_NAME).toBe(true);
    await expect(BADGE_IS_A_NUMBER).toBe(true);
    await expect(BADGE_TONES).toBe(true);
    await expect(ON_CLICK_TAKES_NOTHING).toBe(true);
    await expect(components.NavItem === NavItem, 'exported by the barrel').toBe(
      true,
    );

    const item = within(theFrame(canvasElement)).getByRole('button', {
      name: LABEL,
    });
    await expect(item, 'not the current page').not.toHaveAttribute(
      'aria-current',
    );
    await expect(item, 'no tooltip').not.toHaveAttribute('title');
    await expect(item.textContent, 'the label alone').toBe(LABEL);
    await expectLook(canvasElement, RESTING);
    await expectBox(canvasElement);
    await expectExpandedRow(item, null);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

// The active item: the current page, on the accent-100 fill inside the
// accent-300 border, the label in the text colour and the icon in accent-600.
export const Active: Story = {
  args: { active: true },
  play: async ({ canvasElement }) => {
    const item = theItem(canvasElement);
    await expect(item, 'the current page').toHaveAttribute(
      'aria-current',
      'page',
    );
    await expectLook(canvasElement, ACTIVE);
    await expectBox(canvasElement);
    await expectExpandedRow(item, null);
  },
};

// A count in the accent tone, at the right end of the item.
export const AccentBadge: Story = {
  args: { badge: BADGE, badgeTone: 'accent' },
  play: async ({ canvasElement }) => {
    const item = theItem(canvasElement);
    const badge = within(item).getByText(String(BADGE));
    await expectLook(canvasElement, RESTING);
    await expectBox(canvasElement);
    await expectExpandedRow(item, badge);
    await expectBadge(item, badge, ACCENT_BADGE);
  },
};

// Without a tone, the count takes the accent tone.
export const DefaultBadgeTone: Story = {
  args: { badge: BADGE },
  play: async ({ canvasElement }) => {
    const item = theItem(canvasElement);
    const badge = within(item).getByText(String(BADGE));
    await expectBadge(item, badge, ACCENT_BADGE);
  },
};

// A count in the warning tone, as the sidebar's Uncategorised shows it.
export const WarningBadge: Story = {
  args: { badge: BADGE, badgeTone: 'warning' },
  play: async ({ canvasElement }) => {
    const item = theItem(canvasElement);
    const badge = within(item).getByText(String(BADGE));
    await expectExpandedRow(item, badge);
    await expectBadge(item, badge, WARNING_BADGE);
  },
};

// A badge on an active item keeps its tone's colours.
export const ActiveWithBadge: Story = {
  args: { active: true, badge: BADGE, badgeTone: 'warning' },
  play: async ({ canvasElement }) => {
    const item = theItem(canvasElement);
    const badge = within(item).getByText(String(BADGE));
    await expectLook(canvasElement, ACTIVE);
    await expectExpandedRow(item, badge);
    await expectBadge(item, badge, WARNING_BADGE);
  },
};

// A count of 0 shows no badge: the label runs to the padding.
export const BadgeAtZero: Story = {
  args: { badge: 0, badgeTone: 'warning' },
  play: async ({ canvasElement }) => {
    const item = within(theFrame(canvasElement)).getByRole('button', {
      name: LABEL,
    });
    await expect(within(item).queryByText('0'), 'no badge').toBeNull();
    await expect(item.textContent, 'the label alone').toBe(LABEL);
    await expectExpandedRow(item, null);
  },
};

// Compact: only the centred icon, named and titled by the label.
export const Compact: Story = {
  args: { compact: true },
  play: async ({ canvasElement }) => {
    const item = await expectCompact(canvasElement, LABEL);
    await expect(item.textContent, 'no text').toBe('');
    await expect(item, 'not the current page').not.toHaveAttribute(
      'aria-current',
    );
    await expectLook(canvasElement, RESTING);
    await expectBox(canvasElement);
  },
};

// Compact and active: the active colours on the icon alone.
export const CompactActive: Story = {
  args: { compact: true, active: true },
  play: async ({ canvasElement }) => {
    const item = await expectCompact(canvasElement, LABEL);
    await expect(item, 'the current page').toHaveAttribute(
      'aria-current',
      'page',
    );
    await expectLook(canvasElement, ACTIVE);
    await expectBox(canvasElement);
  },
};

// Compact with a count: the count as a corner chip, and in the accessible
// name after the label; the tooltip stays the label.
export const CompactWithBadge: Story = {
  args: { compact: true, badge: BADGE, badgeTone: 'warning' },
  play: async ({ canvasElement }) => {
    const item = await expectCompact(
      canvasElement,
      `${LABEL}, ${String(BADGE)}`,
    );
    await expect(item.textContent, 'the count alone').toBe(String(BADGE));
    await expectChip(
      item,
      within(item).getByText(String(BADGE)),
      WARNING_BADGE,
    );
    await expectLook(canvasElement, RESTING);
    await expectBox(canvasElement);
  },
};

// Compact with an accent count: the chip in the accent tone.
export const CompactAccentBadge: Story = {
  args: { compact: true, badge: BADGE, badgeTone: 'accent' },
  play: async ({ canvasElement }) => {
    const item = await expectCompact(
      canvasElement,
      `${LABEL}, ${String(BADGE)}`,
    );
    await expectChip(item, within(item).getByText(String(BADGE)), ACCENT_BADGE);
  },
};

// Compact with a count of 0: no chip, and the name is the label alone.
export const CompactBadgeAtZero: Story = {
  args: { compact: true, badge: 0, badgeTone: 'warning' },
  play: async ({ canvasElement }) => {
    const item = await expectCompact(canvasElement, LABEL);
    await expect(within(item).queryByText('0'), 'no chip').toBeNull();
    await expect(item.textContent, 'no text').toBe('');
  },
};

// A click calls onClick once.
export const Clicking: Story = {
  play: async ({ args, canvasElement }) => {
    release(canvasElement);
    await userEvent.click(theItem(canvasElement));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

// A click on the active item calls onClick too.
export const ClickingActive: Story = {
  args: { active: true },
  play: async ({ args, canvasElement }) => {
    release(canvasElement);
    await userEvent.click(theItem(canvasElement));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

// A click on the compact item, on its icon, calls onClick once.
export const ClickingCompact: Story = {
  args: { compact: true, badge: BADGE, badgeTone: 'warning' },
  play: async ({ args, canvasElement }) => {
    release(canvasElement);
    await userEvent.click(theIcon(theItem(canvasElement)));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

// NavItem.dc.html: under the pointer a resting item takes the hover tint and
// the text colour; SPEC, Focus/hover: the keyboard focus ring.
export const HoverAndFocus: Story = {
  play: async ({ canvasElement }) => {
    release(canvasElement);
    const hovered = hoveredStyle(theItem(canvasElement));
    await expect(hovered.backgroundColor, 'hover fill').toBe(
      computedColour(HOVER),
    );
    await expect(hovered.color, 'hover text').toBe(computedColour(INK));
    await expectFocusRing(canvasElement);
  },
};

// Under the pointer an active item keeps its accent-100 fill and the text
// colour.
export const ActiveHoverAndFocus: Story = {
  args: { active: true },
  play: async ({ canvasElement }) => {
    release(canvasElement);
    const hovered = hoveredStyle(theItem(canvasElement));
    await expect(hovered.backgroundColor, 'hover fill').toBe(
      computedColour(ACCENT_100),
    );
    await expect(hovered.color, 'hover text').toBe(computedColour(INK));
    await expectFocusRing(canvasElement);
  },
};
