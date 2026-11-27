import { useState, type ComponentProps, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, spyOn, userEvent, waitFor, within } from 'storybook/test';
import { Icon } from '../../primitives/Icon/Icon.tsx';
import { Tag, type TagTone } from '../../primitives/Tag/Tag.tsx';
import * as components from '../index.ts';
import { Accordion } from './Accordion.tsx';

// The colours a reader sees, written out from dashcash-dark.css and
// Accordion.dc.html, apart from the Theme. The mixes stay color-mix()
// strings, so each colour is compared through what Chromium computes for it.
// --color-text: the header's ink
const TEXT = '#e9f1fa';
// --sb-text-muted: the chevron and the meta value
const TEXT_MUTED = 'color-mix(in srgb, #e9f1fa 62%, transparent)';
// --color-divider: the line under each accordion
const DIVIDER = 'color-mix(in srgb, #e9f1fa 16%, transparent)';
// --sb-hover: the header's fill under the pointer
const HOVER = 'color-mix(in srgb, #e9f1fa 6%, transparent)';
// --color-accent: the focus ring
const ACCENT = '#749dc4';
const TRANSPARENT = 'transparent';

// Accordion.dc.html: a 1 px line under the section; the header a full-width
// button, 12 px above and below, 4 px at the sides, its parts centred and
// 10 px apart; the chevron 16 px, turned 90 degrees when open, over 160 ms
// with ease; the title in the heading font at 20 px, weight 600; the meta
// value at the right end, 14 px, tabular figures; the content below the
// header, 30 px in from the left, --space-4 above the line.
const BORDER = 1;
const PADDING_Y = '12px';
const PADDING_X = 4;
const GAP = 10;
const CHEVRON_SIZE = 16;
const TURN = '0.16s';
const HEADING_FONT = 'Barlow Condensed';
const TITLE_SIZE = '20px';
const TITLE_WEIGHT = '600';
const META_SIZE = '14px';
const CONTENT_INSET = 30;
const CONTENT_BOTTOM = 13.6;

// SPEC, Auto-scroll on expand: the margin kept below an opened block.
const REVEAL_MARGIN = 24;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

// Accordion.dc.html's preview width; an invented scroll area that holds the
// closed accordions but not an opened one, with room below them.
const FRAME_WIDTH = 700;
const AREA_HEIGHT = 360;
const AREA_ROOM_BELOW = 48;
const MONTHS_HEIGHT = 120;

// Accordion.dc.html's defaults; the rest is invented.
const TITLE = '2026';
const META = 'Year end 2.859,72 €';
const TAG = 'Actual · projected';
const MILESTONE_TITLE = '2041';
const MILESTONE_TAG = 'Payoff';
const MONTHS = 'January to December';
const YEARS = [
  { title: '2026', meta: 'Year end 2.859,72 €' },
  { title: '2027', meta: 'Year end 9.412,05 €' },
  { title: '2028', meta: 'Year end 16.230,90 €' },
  { title: '2029', meta: 'Year end 23.318,44 €' },
  { title: '2030', meta: 'Year end 30.684,17 €' },
];

// SPEC section 3: the Accordion's props, and no others; title, open,
// onToggle and children alone are required. Typecheck fails when a prop is
// missing, one is added, or one changes between required and optional.
type AccordionProps = ComponentProps<typeof Accordion>;
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type ListedProp =
  'title' | 'open' | 'onToggle' | 'meta' | 'tag' | 'tagTone' | 'children';
type AccordionProp = keyof AccordionProps;
type RequiredProp = {
  [Key in AccordionProp]-?: object extends Pick<AccordionProps, Key>
    ? never
    : Key;
}[AccordionProp];
const EXACTLY_THE_LISTED_PROPS: Equal<AccordionProp, ListedProp> = true;
const ONLY_TITLE_OPEN_ON_TOGGLE_AND_CHILDREN_REQUIRED: Equal<
  RequiredProp,
  'title' | 'open' | 'onToggle' | 'children'
> = true;
// SPEC section 3 and Accordion.dc.html: the texts are strings, open a
// boolean, the tag's tone a Tag's tone, onToggle takes nothing and the
// children are any React node.
type PropIs<Key extends AccordionProp, Type> = Equal<
  NonNullable<AccordionProps[Key]>,
  Type
>;
const TEXTS_ARE_STRINGS: [
  PropIs<'title', string>,
  PropIs<'meta', string>,
  PropIs<'tag', string>,
] = [true, true, true];
const OPEN_IS_A_BOOLEAN: PropIs<'open', boolean> = true;
const TAG_TONE_IS_A_TAG_TONE: PropIs<'tagTone', TagTone> = true;
const ON_TOGGLE_TAKES_NOTHING: PropIs<'onToggle', () => void> = true;
const CHILDREN_ARE_NODES: Equal<AccordionProps['children'], ReactNode> = true;

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

// The fill of the element under the pointer. A story's synthetic pointer
// events do not make Chromium apply :hover, so every :hover rule is copied
// right after itself with the marker in its place, and the marker is set on
// the element and its ancestors while the style is read. The marker weighs as
// much as :hover and each copy follows its rule, so the cascade is that of a
// real hover.
function hoveredFill(element: Element): string {
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
    return getComputedStyle(element).backgroundColor;
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

// The turn a computed transform describes, as the matrix Chromium gives for
// it; none is no turn.
function turnOf(transform: string): DOMMatrix {
  return new DOMMatrix(transform === 'none' ? undefined : transform);
}

// The preview frame. While its resting colours are read, it holds the
// Accordion out of the pointer's reach: Chromium on Linux can apply :hover
// without pointer movement.
const Frame = styled.div`
  width: ${String(FRAME_WIDTH)}px;

  &[data-resting] {
    pointer-events: none;
  }
`;

// An invented scroll area, as a page's main area is one, with room below
// its last accordion as a page leaves below its content.
const Area = styled.div`
  width: ${String(FRAME_WIDTH)}px;
  height: ${String(AREA_HEIGHT)}px;
  padding-bottom: ${String(AREA_ROOM_BELOW)}px;
  box-sizing: border-box;
  overflow-y: auto;
`;

// The months a year holds, as a caller passes them: a block of fixed height.
const Months = styled.div`
  height: ${String(MONTHS_HEIGHT)}px;
`;

// The chevron and the tags the Accordion is built from, rendered alone for
// the comparison; never shown.
function References({ tag, tagTone }: { tag?: string; tagTone?: TagTone }) {
  return (
    <div hidden>
      <span data-testid="reference-chevron">
        <Icon glyph="chevronRight" size={CHEVRON_SIZE} />
      </span>
      <span data-testid="reference-tag">
        <Tag label={tag ?? ''} tone={tagTone ?? 'neutral'} />
      </span>
    </div>
  );
}

// The Accordion as a year list uses it: open follows what onToggle reports.
function ControlledAccordion(args: AccordionProps) {
  const [open, setOpen] = useState(args.open);
  return (
    <Accordion
      {...args}
      open={open}
      onToggle={() => {
        setOpen((current) => !current);
        args.onToggle();
      }}
    />
  );
}

function renderAccordion(args: AccordionProps) {
  return (
    <>
      <Frame data-testid="frame" data-resting="">
        <Accordion {...args} />
      </Frame>
      <References tag={args.tag} tagTone={args.tagTone} />
    </>
  );
}

function theFrame(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByTestId('frame');
}

// Lets the pointer reach the Accordion again.
function release(canvasElement: HTMLElement): void {
  theFrame(canvasElement).removeAttribute('data-resting');
}

function theReference(canvasElement: HTMLElement, id: string): string {
  const part = within(canvasElement).getByTestId(id).firstElementChild;
  if (part === null) {
    throw new Error(`no reference ${id}`);
  }
  return part.outerHTML;
}

// The header: the button that holds the title.
function theHeader(element: HTMLElement, title: string): HTMLElement {
  const header = within(element).getByText(title).closest('button');
  if (header === null) {
    throw new Error(`no button around ${title}`);
  }
  return header;
}

// The accordion: the element that holds the header and its content.
function theSection(header: HTMLElement): HTMLElement {
  const section = header.parentElement;
  if (section === null) {
    throw new Error('no element around the header');
  }
  return section;
}

// The chevron: the only svg in the header, and the element that turns it.
function theChevron(header: HTMLElement): {
  svg: SVGSVGElement;
  turner: HTMLElement;
} {
  const svg = header.querySelector('svg');
  const turner = svg?.parentElement ?? null;
  if (
    header.querySelectorAll('svg').length !== 1 ||
    svg === null ||
    turner === null
  ) {
    throw new Error('not one svg in the header');
  }
  return { svg, turner };
}

// The header's own child that holds the element.
function partHolding(header: HTMLElement, element: HTMLElement): HTMLElement {
  let part: HTMLElement | null = element;
  while (part !== null && part.parentElement !== header) {
    part = part.parentElement;
  }
  if (part === null) {
    throw new Error('not inside the header');
  }
  return part;
}

function box(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

function middle(rect: DOMRect): number {
  return rect.top + rect.height / 2;
}

// The accordion at rest, read inside the resting frame: a 1 px divider line
// under it and no other line; the header a full-width button with the text
// ink on no fill and without border, in the font around it, the pointer
// cursor, text aligned left, 12 px above and below and 4 px at the sides;
// open or closed to assistive technology.
async function expectRestingLook(
  canvasElement: HTMLElement,
  header: HTMLElement,
  open: boolean,
): Promise<void> {
  await expect(theFrame(canvasElement).hasAttribute('data-resting')).toBe(true);
  await expect(header.matches(':hover'), 'hovered').toBe(false);
  const section = theSection(header);
  const sectionStyle = getComputedStyle(section);
  await expect(sectionStyle.borderBottomWidth, 'line width').toBe(
    `${String(BORDER)}px`,
  );
  await expect(sectionStyle.borderBottomStyle, 'line style').toBe('solid');
  await expect(sectionStyle.borderBottomColor, 'line colour').toBe(
    computedColour(DIVIDER),
  );
  for (const side of ['Top', 'Right', 'Left'] as const) {
    await expect(sectionStyle[`border${side}Width`], `${side} line`).toBe(
      '0px',
    );
  }

  await expect(header, 'expanded').toHaveAttribute(
    'aria-expanded',
    String(open),
  );
  const style = getComputedStyle(header);
  await expect(style.color, 'ink').toBe(computedColour(TEXT));
  await expect(style.backgroundColor, 'fill').toBe(computedColour(TRANSPARENT));
  await expect(style.cursor, 'cursor').toBe('pointer');
  await expect(style.textAlign, 'text align').toBe('left');
  await expect(firstFamily(style), 'font').toBe(firstFamily(sectionStyle));
  await expect(style.fontSize, 'font size').toBe(sectionStyle.fontSize);
  await expect(style.fontWeight, 'font weight').toBe(sectionStyle.fontWeight);
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `${side} border`).toBe('0px');
  }
  await expect(style.paddingTop, 'top padding').toBe(PADDING_Y);
  await expect(style.paddingBottom, 'bottom padding').toBe(PADDING_Y);
  await expect(style.paddingLeft, 'left padding').toBe(
    `${String(PADDING_X)}px`,
  );
  await expect(style.paddingRight, 'right padding').toBe(
    `${String(PADDING_X)}px`,
  );
  await expect(box(header).width, 'header width').toBeCloseTo(
    box(section).width,
    1,
  );
  await expect(box(section).width, 'section width').toBeCloseTo(FRAME_WIDTH, 1);
  await expect(box(header).top, 'header top').toBeCloseTo(box(section).top, 1);
}

// The chevron: the 16 px chevronRight in the muted colour, at the header's
// left inside its padding, centred on the header, turned by 90 degrees when
// open and not at all when closed, the turn taking 160 ms with ease.
async function expectChevron(
  canvasElement: HTMLElement,
  header: HTMLElement,
  open: boolean,
): Promise<void> {
  const { svg, turner } = theChevron(header);
  await expect(
    svg.outerHTML === theReference(canvasElement, 'reference-chevron'),
    'the 16 px chevronRight',
  ).toBe(true);
  await expect(getComputedStyle(svg).color, 'chevron colour').toBe(
    computedColour(TEXT_MUTED),
  );
  await expect(box(turner).left - box(header).left, 'chevron left').toBeCloseTo(
    PADDING_X,
    1,
  );
  await expect(middle(box(turner)), 'chevron centred').toBeCloseTo(
    middle(box(header)),
    1,
  );

  const style = getComputedStyle(turner);
  // The holder is a flex box around its one icon, not a block that lays the icon
  // on a text line.
  await expect(style.display, 'chevron display').toBe('flex');
  const turn = turnOf(style.transform);
  if (open) {
    await expect(
      [turn.a, turn.b, turn.c, turn.d].map((value) => Math.round(value)),
      'turned 90 degrees',
    ).toEqual([0, 1, -1, 0]);
  } else {
    await expect(turn.isIdentity, 'not turned').toBe(true);
  }
  await expect(style.transitionProperty, 'turn property').toBe('transform');
  await expect(style.transitionDuration, 'turn duration').toBe(TURN);
  await expect(style.transitionTimingFunction, 'turn easing').toBe('ease');
}

// The title: the heading font at 20 px, weight 600, 10 px right of the
// chevron, centred on the header.
async function expectTitle(header: HTMLElement, title: string): Promise<void> {
  const text = within(header).getByText(title);
  const style = getComputedStyle(text);
  await expect(firstFamily(style), 'title font').toBe(HEADING_FONT);
  await expect(style.fontSize, 'title size').toBe(TITLE_SIZE);
  await expect(style.fontWeight, 'title weight').toBe(TITLE_WEIGHT);
  await expect(
    box(text).left - box(theChevron(header).turner).right,
    'chevron gap',
  ).toBeCloseTo(GAP, 1);
  await expect(middle(box(text)), 'title centred').toBeCloseTo(
    middle(box(header)),
    1,
  );
}

// The tag: a Tag of the given tone, 10 px right of the title, centred on the
// header.
async function expectTag(
  canvasElement: HTMLElement,
  header: HTMLElement,
  title: string,
  tag: string,
): Promise<void> {
  const frame = partHolding(header, within(header).getByText(tag));
  await expect(
    frame.outerHTML === theReference(canvasElement, 'reference-tag'),
    'the Tag',
  ).toBe(true);
  await expect(
    box(frame).left - box(within(header).getByText(title)).right,
    'tag gap',
  ).toBeCloseTo(GAP, 1);
  await expect(middle(box(frame)), 'tag centred').toBeCloseTo(
    middle(box(header)),
    1,
  );
}

// The meta value: 14 px, muted, tabular figures, at the right end of the
// header inside its padding, centred on it.
async function expectMeta(header: HTMLElement, meta: string): Promise<void> {
  const text = within(header).getByText(meta);
  const style = getComputedStyle(text);
  await expect(style.fontSize, 'meta size').toBe(META_SIZE);
  await expect(style.color, 'meta colour').toBe(computedColour(TEXT_MUTED));
  await expect(style.fontVariantNumeric, 'meta figures').toBe('tabular-nums');
  await expect(box(header).right - box(text).right, 'meta right').toBeCloseTo(
    PADDING_X,
    1,
  );
  await expect(middle(box(text)), 'meta centred').toBeCloseTo(
    middle(box(header)),
    1,
  );
}

const meta = {
  title: 'Components/Accordion',
  component: Accordion,
  render: renderAccordion,
  args: {
    title: TITLE,
    open: false,
    onToggle: fn(),
    children: <Months data-testid="months">{MONTHS}</Months>,
  },
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

// Closed: the header alone, the chevron pointing right, no content below it,
// no tag; onToggle is not called before a click.
export const Closed: Story = {
  play: async ({ args, canvasElement }) => {
    await expect(EXACTLY_THE_LISTED_PROPS).toBe(true);
    await expect(ONLY_TITLE_OPEN_ON_TOGGLE_AND_CHILDREN_REQUIRED).toBe(true);
    await expect(TEXTS_ARE_STRINGS).toEqual([true, true, true]);
    await expect(OPEN_IS_A_BOOLEAN).toBe(true);
    await expect(TAG_TONE_IS_A_TAG_TONE).toBe(true);
    await expect(ON_TOGGLE_TAKES_NOTHING).toBe(true);
    await expect(CHILDREN_ARE_NODES).toBe(true);
    await expect(
      components.Accordion === Accordion,
      'exported by the barrel',
    ).toBe(true);

    const frame = theFrame(canvasElement);
    const header = theHeader(frame, TITLE);
    await expectRestingLook(canvasElement, header, false);
    await expectChevron(canvasElement, header, false);
    await expectTitle(header, TITLE);
    await expect(within(frame).queryByText(MONTHS), 'no content').toBeNull();
    await expect(
      box(theSection(header)).bottom - box(header).bottom,
      'only the line below the header',
    ).toBeCloseTo(BORDER, 1);
    const emptyTag = theReference(canvasElement, 'reference-tag');
    await expect(
      [...header.children].some((part) => part.outerHTML === emptyTag),
      'no tag',
    ).toBe(false);
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
};

// Open: the chevron turned down and the content below the header, 30 px in
// from the left, reaching the right edge, --space-4 above the line.
export const Open: Story = {
  args: { open: true },
  play: async ({ args, canvasElement }) => {
    const frame = theFrame(canvasElement);
    const header = theHeader(frame, TITLE);
    await expectRestingLook(canvasElement, header, true);
    await expectChevron(canvasElement, header, true);
    await expectTitle(header, TITLE);

    const section = theSection(header);
    const months = within(frame).getByTestId('months');
    await expect(box(months).top, 'content top').toBeCloseTo(
      box(header).bottom,
      1,
    );
    await expect(box(months).left - box(section).left, 'inset').toBeCloseTo(
      CONTENT_INSET,
      1,
    );
    await expect(box(months).right, 'content right').toBeCloseTo(
      box(section).right,
      1,
    );
    await expect(
      box(section).bottom - box(months).bottom,
      'space above the line',
    ).toBeCloseTo(CONTENT_BOTTOM + BORDER, 1);
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
};

// With meta and tag: the tag after the title, neutral when no tone is given,
// and the meta value at the right end.
export const WithMetaAndTag: Story = {
  args: { meta: META, tag: TAG },
  play: async ({ canvasElement }) => {
    const frame = theFrame(canvasElement);
    const header = theHeader(frame, TITLE);
    await expectRestingLook(canvasElement, header, false);
    await expectTitle(header, TITLE);
    await expectTag(canvasElement, header, TITLE, TAG);
    await expectMeta(header, META);
  },
};

// An empty tag and an empty meta are absent, as in Accordion.dc.html (sc-if):
// the header holds the chevron and the title only, with no Tag and no meta
// element.
export const EmptyTagAndMeta: Story = {
  args: { meta: '', tag: '' },
  play: async ({ canvasElement }) => {
    const header = theHeader(theFrame(canvasElement), TITLE);
    await expectRestingLook(canvasElement, header, false);
    await expect(header.children, 'children of the header').toHaveLength(2);
    await expect(header.children[0], 'the chevron first').toBe(
      theChevron(header).turner,
    );
    await expect(header.children[1]?.textContent, 'the title second').toBe(
      TITLE,
    );
    await expect(header.textContent, 'text').toBe(TITLE);
    const emptyTag = theReference(canvasElement, 'reference-tag');
    await expect(
      [...header.children].some((part) => part.outerHTML === emptyTag),
      'no tag',
    ).toBe(false);
  },
};

// A tag of another tone: the Tag of that tone.
export const MilestoneTag: Story = {
  args: {
    title: MILESTONE_TITLE,
    meta: META,
    tag: MILESTONE_TAG,
    tagTone: 'milestone',
  },
  play: async ({ canvasElement }) => {
    const header = theHeader(theFrame(canvasElement), MILESTONE_TITLE);
    await expectTag(canvasElement, header, MILESTONE_TITLE, MILESTONE_TAG);
  },
};

// Accordion.dc.html: under the pointer the header takes the hover fill; SPEC,
// Focus/hover: focused from the keyboard it shows the 2 px accent ring,
// offset 2.
export const HoverAndFocus: Story = {
  play: async ({ canvasElement }) => {
    release(canvasElement);
    const header = theHeader(theFrame(canvasElement), TITLE);
    await expect(hoveredFill(header), 'hover fill').toBe(computedColour(HOVER));

    await userEvent.tab();
    await expect(document.activeElement === header, 'focused').toBe(true);
    await expect(header.matches(':focus-visible'), 'focus-visible').toBe(true);
    const style = getComputedStyle(header);
    await expect(style.outlineStyle, 'outline style').toBe('solid');
    await expect(style.outlineWidth, 'outline width').toBe('2px');
    await expect(style.outlineColor, 'outline colour').toBe(
      computedColour(ACCENT),
    );
    await expect(style.outlineOffset, 'outline offset').toBe('2px');
  },
};

// A click on the header reports onToggle once; the caller opens the
// accordion, and the content shows below the header. A second click reports
// it again, and the caller closes it.
export const Toggles: Story = {
  render: (args) => (
    <>
      <Frame data-testid="frame">
        <ControlledAccordion {...args} />
      </Frame>
      <References />
    </>
  ),
  play: async ({ args, canvasElement }) => {
    const frame = theFrame(canvasElement);
    const header = theHeader(frame, TITLE);
    await expect(header, 'closed').toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(header);
    await expect(args.onToggle).toHaveBeenCalledTimes(1);
    await expect(header, 'opened').toHaveAttribute('aria-expanded', 'true');
    await expect(
      within(frame).getByText(MONTHS),
      'content shown',
    ).toBeInTheDocument();

    await userEvent.click(header);
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(header, 'closed again').toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(within(frame).queryByText(MONTHS), 'content gone').toBeNull();
  },
};

function renderScrollArea(args: AccordionProps) {
  return (
    <>
      <Frame data-testid="frame">
        <Area data-testid="area">
          {YEARS.map((year) => (
            <ControlledAccordion
              key={year.title}
              {...args}
              title={year.title}
              meta={year.meta}
            >
              <Months>{`${MONTHS} ${year.title}`}</Months>
            </ControlledAccordion>
          ))}
        </Area>
      </Frame>
      <References />
    </>
  );
}

function theLastYear(): { title: string } {
  const last = YEARS[YEARS.length - 1];
  if (last === undefined) {
    throw new Error('no years');
  }
  return last;
}

// The one scrollBy call the reveal makes on the area: its options, and the
// scroll the area has reached once it settles (it starts at the top, so the
// distance asked for and the scroll reached are the same number).
async function expectOneScroll(
  scrollBy: { mock: { calls: unknown[][] } },
  area: HTMLElement,
  behavior: ScrollBehavior,
): Promise<void> {
  await expect(scrollBy.mock.calls, 'one scroll').toHaveLength(1);
  const options = scrollBy.mock.calls[0]?.[0];
  await expect(options, 'scroll options').toEqual({
    top: expect.any(Number) as number,
    behavior,
  });
  const top = (options as ScrollToOptions).top ?? 0;
  await expect(top > 0, 'scrolled down').toBe(true);
  await waitFor(
    async () => {
      await expect(area.scrollTop, 'scroll reached').toBeCloseTo(top, 0);
    },
    { timeout: 2000 },
  );
}

// Several accordions in a scroll area that holds them closed. Opening the
// last one runs its block past the area's bottom: the area scrolls just far
// enough to show the whole block with the 24 px margin below it, smoothly,
// and the clicked row stays inside the area.
export const InAScrollArea: Story = {
  render: renderScrollArea,
  play: async ({ args, canvasElement }) => {
    const area = within(canvasElement).getByTestId('area');
    await expect(
      area.scrollHeight <= area.clientHeight,
      'the closed accordions fit',
    ).toBe(true);
    await expect(area.scrollTop, 'not scrolled').toBe(0);

    const last = theLastYear();
    const header = theHeader(area, last.title);
    const scrollBy = spyOn(area, 'scrollBy');
    try {
      await userEvent.click(header);
      await expect(args.onToggle).toHaveBeenCalledTimes(1);
      await expect(
        within(area).getByText(`${MONTHS} ${last.title}`),
        'opened',
      ).toBeInTheDocument();

      const section = theSection(header);
      await waitFor(
        async () => {
          await expect(
            Math.abs(box(area).bottom - box(section).bottom - REVEAL_MARGIN) <=
              1,
            'the block shown with the margin below it',
          ).toBe(true);
        },
        { timeout: 2000 },
      );
      await expectOneScroll(scrollBy, area, 'smooth');
    } finally {
      scrollBy.mockRestore();
    }
    await expect(area.scrollTop > 0, 'scrolled').toBe(true);
    await expect(
      box(header).top >= box(area).top + REVEAL_MARGIN - 1,
      'the clicked row below the top margin',
    ).toBe(true);
    await expect(
      box(header).bottom <= box(area).bottom,
      'the clicked row inside the area',
    ).toBe(true);
  },
};

// The same scroll area for a reader who prefers reduced motion: the area
// jumps to the same place in one call, with no smooth scroll.
export const InAScrollAreaReducedMotion: Story = {
  render: renderScrollArea,
  play: async ({ args, canvasElement }) => {
    const area = within(canvasElement).getByTestId('area');
    const last = theLastYear();
    const header = theHeader(area, last.title);
    const original = window.matchMedia.bind(window);
    const media = spyOn(window, 'matchMedia').mockImplementation((query) => {
      const list = original(query);
      return query === REDUCED_MOTION
        ? Object.defineProperty(list, 'matches', { value: true })
        : list;
    });
    const scrollBy = spyOn(area, 'scrollBy');
    try {
      await expect(
        window.matchMedia(REDUCED_MOTION).matches,
        'reduced motion preferred',
      ).toBe(true);
      await expect(
        window.matchMedia('(min-width: 1px)').matches,
        'other queries pass through',
      ).toBe(true);
      await userEvent.click(header);
      await expect(args.onToggle).toHaveBeenCalledTimes(1);
      await waitFor(
        async () => {
          await expect(scrollBy.mock.calls, 'scrolled').toHaveLength(1);
        },
        { timeout: 2000 },
      );
      await expectOneScroll(scrollBy, area, 'auto');
      await expect(
        Math.abs(
          box(area).bottom - box(theSection(header)).bottom - REVEAL_MARGIN,
        ) <= 1,
        'the block shown with the margin below it',
      ).toBe(true);
    } finally {
      scrollBy.mockRestore();
      media.mockRestore();
    }
  },
};
