import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '../../primitives/Button/Button.tsx';
import { Icon } from '../../primitives/Icon/Icon.tsx';
import { Segmented } from '../../primitives/Segmented/Segmented.tsx';
import { Tag, type TagTone } from '../../primitives/Tag/Tag.tsx';
import * as components from '../index.ts';
import { PageHeader } from './PageHeader.tsx';

// The colours a reader sees, written out from dashcash-dark.css and
// PageHeader.dc.html, apart from the Theme. The mixes stay color-mix()
// strings, so each colour is compared through what Chromium computes for it.
// --color-accent-600 and --color-accent-700: the back link, at rest and under
// the pointer
const ACCENT_600 = '#94bce3';
const ACCENT_700 = '#b5d9fd';
// --color-accent: the focus ring
const ACCENT = '#749dc4';
// --sb-text-muted: the subtitle
const TEXT_MUTED = 'color-mix(in srgb, #e9f1fa 62%, transparent)';
const TRANSPARENT = 'transparent';

// PageHeader.dc.html: the title in the heading font at 34 px, -0.01em, no
// margin; the subtitle at 14 px; the back link at 13 px with a 14 px arrow,
// 4 px between them. 4 px between the back link, the title row and the
// subtitle; --space-3 between the title and the tag; --space-2 between the
// actions; --space-4 between the title column and the actions when they wrap.
const HEADING_FONT = 'Barlow Condensed';
const HEADING_WEIGHT = '600';
const TITLE_SIZE = '34px';
const TITLE_LETTER_SPACING = '-0.34px';
const SUBTITLE_SIZE = '14px';
const BACK_SIZE = '13px';
const BACK_ICON_SIZE = 14;
const BACK_GAP = 4;
const COLUMN_GAP = 4;
const TAG_GAP = 10.2;
const ACTIONS_GAP = 6.8;
const WRAP_GAP = 13.6;

// PageHeader.dc.html's preview frame, and an invented narrow one in which the
// title column and the actions do not fit on one line.
const FRAME_WIDTH = 900;
const NARROW_WIDTH = 320;

// PageHeader.dc.html's defaults; the rest is invented.
const TITLE = 'Dashboard';
const SUBTITLE = 'Today · 26 Oct 2026';
const BACK_LABEL = 'Accounts';
const DEFAULT_BACK_LABEL = 'Back';
const ACCOUNT_TITLE = 'Haushaltskonto';
const ACCOUNT_SUBTITLE = 'Shared checking · last import 12 Oct 2026';
const TAG = 'Joint';
const IMPORT = 'Import CSV';
const RANGES = [
  { value: 'year', label: 'Year' },
  { value: 'all', label: 'All' },
];

// SPEC section 3: the PageHeader's props, and no others; title alone is
// required. The actions are optional too: SPEC's Dashboard header has none.
// Typecheck fails when a prop is missing, one is added, or one changes
// between required and optional.
type PageHeaderProps = ComponentProps<typeof PageHeader>;
type ListedProp =
  | 'title'
  | 'subtitle'
  | 'tag'
  | 'tagTone'
  | 'onBack'
  | 'backLabel'
  | 'children';
type PageHeaderProp = keyof PageHeaderProps;
type MissingProp = Exclude<ListedProp, PageHeaderProp>;
type UnlistedProp = Exclude<PageHeaderProp, ListedProp>;
type OptionalProp = {
  [Key in PageHeaderProp]-?: object extends Pick<PageHeaderProps, Key>
    ? Key
    : never;
}[PageHeaderProp];
type ListedOptional = Exclude<ListedProp, 'title'>;
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;
const ONLY_TITLE_REQUIRED: [OptionalProp] extends [ListedOptional]
  ? [ListedOptional] extends [OptionalProp]
    ? true
    : false
  : false = true;
// SPEC section 3: the tag's tone is a Tag's tone, and onBack takes nothing.
type Exactly<Actual, Expected> = [Actual] extends [Expected]
  ? [Expected] extends [Actual]
    ? true
    : false
  : false;
const TAG_TONE_IS_A_TAG_TONE: Exactly<
  NonNullable<PageHeaderProps['tagTone']>,
  TagTone
> = true;
const ON_BACK_TAKES_NOTHING: Exactly<
  NonNullable<PageHeaderProps['onBack']>,
  () => void
> = true;

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
function hoveredColour(element: Element): string {
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
    return getComputedStyle(element).color;
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

// The page's top. While its resting colours are read, it holds the
// PageHeader out of the pointer's reach: Chromium on Linux can apply :hover
// without pointer movement.
const Frame = styled.div<{ $width: number }>`
  width: ${({ $width }) => $width}px;

  &[data-resting] {
    pointer-events: none;
  }
`;

// The actions a caller passes, as an account page has them: a range switch
// and the primary action, of different heights.
const ACTIONS = (
  <>
    <Segmented value="year" options={RANGES} onChange={fn()} />
    <Button variant="primary" icon="upload" label={IMPORT} />
  </>
);

function renderHeader(args: PageHeaderProps, width: number) {
  return (
    <>
      <Frame data-testid="frame" data-resting="" $width={width}>
        <PageHeader {...args} />
      </Frame>
      {/* PageHeader.dc.html's arrow and its tag, accent unless told
          otherwise, for the comparison; never shown. */}
      <div hidden data-testid="reference-icon">
        <Icon glyph="arrowLeft" size={BACK_ICON_SIZE} />
      </div>
      <div hidden data-testid="reference-tag">
        <Tag label={args.tag ?? ''} tone={args.tagTone ?? 'accent'} />
      </div>
    </>
  );
}

function theFrame(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByTestId('frame');
}

function theTitle(canvasElement: HTMLElement, name: string): HTMLElement {
  return within(theFrame(canvasElement)).getByRole('heading', {
    level: 1,
    name,
  });
}

function theBack(canvasElement: HTMLElement, name: string): HTMLElement {
  return within(theFrame(canvasElement)).getByRole('button', { name });
}

function theReference(canvasElement: HTMLElement, id: string): Element | null {
  return within(canvasElement).getByTestId(id).firstElementChild;
}

// Lets the pointer reach the PageHeader again.
function release(canvasElement: HTMLElement): void {
  theFrame(canvasElement).removeAttribute('data-resting');
}

function box(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

// The title: a level-1 heading in the heading font at 34 px, -0.01em, with no
// margin, at the frame's left edge.
async function expectTitle(
  canvasElement: HTMLElement,
  title: HTMLElement,
): Promise<void> {
  const style = getComputedStyle(title);
  await expect(firstFamily(style), 'title font').toBe(HEADING_FONT);
  await expect(style.fontWeight, 'title weight').toBe(HEADING_WEIGHT);
  await expect(style.fontSize, 'title size').toBe(TITLE_SIZE);
  await expect(style.letterSpacing, 'title letter-spacing').toBe(
    TITLE_LETTER_SPACING,
  );
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`margin${side}`], `title ${side} margin`).toBe('0px');
  }
  await expect(box(title).left, 'title left').toBeCloseTo(
    box(theFrame(canvasElement)).left,
    1,
  );
}

// The subtitle: 14 px in the muted text colour, 4 px below the title.
// Read inside the resting frame.
async function expectSubtitle(
  canvasElement: HTMLElement,
  title: HTMLElement,
  text: string,
): Promise<HTMLElement> {
  const subtitle = within(theFrame(canvasElement)).getByText(text);
  await expect(theFrame(canvasElement).hasAttribute('data-resting')).toBe(true);
  await expect(subtitle.matches(':hover'), 'subtitle hovered').toBe(false);
  const style = getComputedStyle(subtitle);
  await expect(style.fontSize, 'subtitle size').toBe(SUBTITLE_SIZE);
  await expect(style.color, 'subtitle colour').toBe(computedColour(TEXT_MUTED));
  await expect(
    box(subtitle).top - box(title).bottom,
    'subtitle gap',
  ).toBeCloseTo(COLUMN_GAP, 1);
  await expect(box(subtitle).left, 'subtitle left').toBeCloseTo(
    box(title).left,
    1,
  );
  return subtitle;
}

// The back link at rest, read inside the resting frame: a bare button in the
// accent-600 colour at 13 px Barlow, without fill, border or padding, the
// 14 px arrow 4 px before its label, both vertically centred; as wide as its
// content, at the top left, 4 px above the title.
async function expectBack(
  canvasElement: HTMLElement,
  back: HTMLElement,
  label: string,
  title: HTMLElement,
): Promise<void> {
  await expect(theFrame(canvasElement).hasAttribute('data-resting')).toBe(true);
  await expect(back.matches(':hover'), 'back hovered').toBe(false);
  const style = getComputedStyle(back);
  await expect(style.color, 'back colour').toBe(computedColour(ACCENT_600));
  await expect(style.backgroundColor, 'back fill').toBe(
    computedColour(TRANSPARENT),
  );
  await expect(style.fontSize, 'back size').toBe(BACK_SIZE);
  await expect(firstFamily(style), 'back font').toBe('Barlow');
  await expect(style.cursor, 'back cursor').toBe('pointer');
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `back ${side} border`).toBe(
      '0px',
    );
    await expect(style[`padding${side}`], `back ${side} padding`).toBe('0px');
  }

  const icon = back.querySelector('svg');
  await expect(
    icon !== null &&
      icon.outerHTML ===
        theReference(canvasElement, 'reference-icon')?.outerHTML,
    'the arrow',
  ).toBe(true);
  if (icon === null) {
    return;
  }
  const text = within(back).getByText(label);
  await expect(box(text).left - box(icon).right, 'arrow to label').toBeCloseTo(
    BACK_GAP,
    1,
  );
  await expect(
    (box(icon).top + box(icon).bottom) / 2,
    'arrow middle',
  ).toBeCloseTo((box(text).top + box(text).bottom) / 2, 1);

  const frame = box(theFrame(canvasElement));
  await expect(box(back).left, 'back left').toBeCloseTo(frame.left, 1);
  await expect(box(back).top, 'back top').toBeCloseTo(frame.top, 1);
  await expect(box(back).left, 'hugs the arrow').toBeCloseTo(box(icon).left, 1);
  await expect(box(back).right, 'hugs the label').toBeCloseTo(
    box(text).right,
    1,
  );
  await expect(box(title).top - box(back).bottom, 'back gap').toBeCloseTo(
    COLUMN_GAP,
    1,
  );
}

// The tag: the Tag primitive in the expected tone, --space-3 after the title,
// vertically centred on it.
async function expectTag(
  canvasElement: HTMLElement,
  title: HTMLElement,
): Promise<void> {
  const tag = title.nextElementSibling;
  await expect(
    tag !== null &&
      tag.outerHTML === theReference(canvasElement, 'reference-tag')?.outerHTML,
    'the tag',
  ).toBe(true);
  if (tag === null) {
    return;
  }
  await expect(box(tag).left - box(title).right, 'tag gap').toBeCloseTo(
    TAG_GAP,
    1,
  );
  await expect((box(tag).top + box(tag).bottom) / 2, 'tag middle').toBeCloseTo(
    (box(title).top + box(title).bottom) / 2,
    1,
  );
}

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
  render: (args) => renderHeader(args, FRAME_WIDTH),
  args: { title: TITLE, subtitle: SUBTITLE },
} satisfies Meta<typeof PageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

// PageHeader.dc.html's defaults: the title and the subtitle, without a back
// link, a tag or actions.
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(ONLY_TITLE_REQUIRED).toBe(true);
    await expect(TAG_TONE_IS_A_TAG_TONE).toBe(true);
    await expect(ON_BACK_TAKES_NOTHING).toBe(true);
    await expect(
      components.PageHeader === PageHeader,
      'exported by the barrel',
    ).toBe(true);

    const title = theTitle(canvasElement, TITLE);
    await expectSubtitle(canvasElement, title, SUBTITLE);
    release(canvasElement);
    await expectTitle(canvasElement, title);
    await expect(box(title).top, 'title top').toBeCloseTo(
      box(theFrame(canvasElement)).top,
      1,
    );
    await expect(
      within(theFrame(canvasElement)).queryAllByRole('button'),
      'no back link, no actions',
    ).toHaveLength(0);
    await expect(title.nextElementSibling, 'no tag').toBeNull();
  },
};

// An empty subtitle and an empty tag are none, as in the prototype: the
// header is the title alone.
export const TitleOnly: Story = {
  args: { subtitle: '', tag: '' },
  play: async ({ canvasElement }) => {
    release(canvasElement);
    const title = theTitle(canvasElement, TITLE);
    await expectTitle(canvasElement, title);
    await expect(title.nextElementSibling, 'no tag').toBeNull();
    const header = theFrame(canvasElement).firstElementChild;
    if (header === null) {
      throw new Error('nothing rendered');
    }
    await expect(box(header).height, 'the title alone').toBeCloseTo(
      box(title).height,
      1,
    );
  },
};

// An account page's header: the back link above the title, a tag beside the
// title, the subtitle below; the actions at the right, --space-2 apart,
// vertically centred on each other and level with the bottom of the column.
export const WithBackTagAndActions: Story = {
  args: {
    title: ACCOUNT_TITLE,
    subtitle: ACCOUNT_SUBTITLE,
    tag: TAG,
    tagTone: 'neutral',
    onBack: fn(),
    backLabel: BACK_LABEL,
    children: ACTIONS,
  },
  play: async ({ args, canvasElement }) => {
    const title = theTitle(canvasElement, ACCOUNT_TITLE);
    const back = theBack(canvasElement, BACK_LABEL);
    const subtitle = await expectSubtitle(
      canvasElement,
      title,
      ACCOUNT_SUBTITLE,
    );
    await expectBack(canvasElement, back, BACK_LABEL, title);
    release(canvasElement);
    await expectTitle(canvasElement, title);
    await expectTag(canvasElement, title);

    const frame = theFrame(canvasElement);
    const range = box(within(frame).getByRole('radiogroup'));
    const action = box(within(frame).getByRole('button', { name: IMPORT }));
    await expect(action.left - range.right, 'actions gap').toBeCloseTo(
      ACTIONS_GAP,
      1,
    );
    await expect(action.right, 'actions right').toBeCloseTo(
      box(frame).right,
      1,
    );
    await expect((range.top + range.bottom) / 2, 'actions middle').toBeCloseTo(
      (action.top + action.bottom) / 2,
      1,
    );
    await expect(action.bottom, 'actions bottom').toBeCloseTo(
      box(subtitle).bottom,
      1,
    );
    await expect(args.onBack).not.toHaveBeenCalled();
  },
};

// Without a tone, the tag is an accent Tag.
export const DefaultTagTone: Story = {
  args: { tag: TAG },
  play: async ({ canvasElement }) => {
    release(canvasElement);
    await expectTag(canvasElement, theTitle(canvasElement, TITLE));
  },
};

// A tag in the warning tone.
export const WarningTag: Story = {
  args: { tag: TAG, tagTone: 'warning' },
  play: async ({ canvasElement }) => {
    release(canvasElement);
    await expectTag(canvasElement, theTitle(canvasElement, TITLE));
  },
};

// A click on the back link calls onBack once; a click on the title does not.
export const GoingBack: Story = {
  args: { onBack: fn(), backLabel: BACK_LABEL },
  play: async ({ args, canvasElement }) => {
    release(canvasElement);
    await userEvent.click(theTitle(canvasElement, TITLE));
    await expect(args.onBack).not.toHaveBeenCalled();
    await userEvent.click(theBack(canvasElement, BACK_LABEL));
    await expect(args.onBack).toHaveBeenCalledTimes(1);
  },
};

// Without a label, the back link reads Back.
export const DefaultBackLabel: Story = {
  args: { onBack: fn() },
  play: async ({ args, canvasElement }) => {
    const title = theTitle(canvasElement, TITLE);
    const back = theBack(canvasElement, DEFAULT_BACK_LABEL);
    await expectBack(canvasElement, back, DEFAULT_BACK_LABEL, title);
    release(canvasElement);
    await userEvent.click(back);
    await expect(args.onBack).toHaveBeenCalledTimes(1);
  },
};

// A label without onBack shows no back link.
export const BackLabelWithoutOnBack: Story = {
  args: { backLabel: BACK_LABEL },
  play: async ({ canvasElement }) => {
    const frame = theFrame(canvasElement);
    await expect(
      within(frame).queryAllByRole('button'),
      'no back link',
    ).toHaveLength(0);
    await expect(within(frame).queryByText(BACK_LABEL), 'no label').toBeNull();
  },
};

// In a frame too narrow for both, the actions wrap below the title column,
// --space-4 below it, at the left.
export const Wrapping: Story = {
  args: { title: ACCOUNT_TITLE, subtitle: ACCOUNT_SUBTITLE, children: ACTIONS },
  render: (args) => renderHeader(args, NARROW_WIDTH),
  play: async ({ canvasElement }) => {
    release(canvasElement);
    const frame = theFrame(canvasElement);
    const subtitle = box(within(frame).getByText(ACCOUNT_SUBTITLE));
    const range = box(within(frame).getByRole('radiogroup'));
    const action = box(within(frame).getByRole('button', { name: IMPORT }));
    await expect(action.top >= subtitle.bottom, 'the actions wrap').toBe(true);
    await expect(range.left, 'actions left').toBeCloseTo(box(frame).left, 1);
    await expect(action.top - subtitle.bottom, 'wrap gap').toBeCloseTo(
      WRAP_GAP,
      1,
    );
  },
};

// PageHeader.dc.html: under the pointer the back link turns accent-700; SPEC,
// Focus/hover: focused from the keyboard it shows the 2 px accent ring,
// offset 2.
export const BackHoverAndFocus: Story = {
  args: { onBack: fn(), backLabel: BACK_LABEL },
  play: async ({ canvasElement }) => {
    release(canvasElement);
    const back = theBack(canvasElement, BACK_LABEL);
    await expect(hoveredColour(back), 'hover colour').toBe(
      computedColour(ACCENT_700),
    );

    await userEvent.tab();
    await expect(document.activeElement === back, 'focused').toBe(true);
    await expect(back.matches(':focus-visible'), 'focus-visible').toBe(true);
    const style = getComputedStyle(back);
    await expect(style.outlineStyle, 'outline style').toBe('solid');
    await expect(style.outlineWidth, 'outline width').toBe('2px');
    await expect(style.outlineColor, 'outline colour').toBe(
      computedColour(ACCENT),
    );
    await expect(style.outlineOffset, 'outline offset').toBe('2px');
  },
};
