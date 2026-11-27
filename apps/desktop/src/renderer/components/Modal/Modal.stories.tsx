import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '../../primitives/Button/Button.tsx';
import { readFirstFamily } from '../../test-support/readFirstFamily/readFirstFamily.ts';
import * as components from '../index.ts';
import { Modal } from './Modal.tsx';

// The colours and the shadow a reader sees, written out from dashcash-dark.css
// apart from the Theme (SPEC, Card fill).
// --sb-raised-bg = --color-surface: the panel's fill
const RAISED = '#213345';
// --sb-card-border: the text colour at 8 %, the panel's outline
const CARD_BORDER = 'color-mix(in srgb, #e9f1fa 8%, transparent)';
// --sb-text-muted: the subtitle
const TEXT_MUTED = 'color-mix(in srgb, #e9f1fa 62%, transparent)';
// --sb-backdrop: the dark backdrop
const BACKDROP = 'rgba(9, 15, 22, 0.66)';
// --shadow-lg: the panel's large shadow
const SHADOW_LG =
  '0 0 0 1px color-mix(in srgb, #e9f1fa 8%, transparent), 0 18px 48px rgba(5, 10, 16, 0.55)';

// Modal.dc.html and styles.css (.dialog-backdrop, .dialog, .blueprint): the
// backdrop above the page at z-index 50; the panel 460 px wide unless told
// otherwise, with a 1 px outline, --space-6 inside it and --space-4 between
// the header and the content; 2 px between the title and the subtitle,
// --space-3 between the title and the close button; --space-4 between the
// rows of the content.
const Z_INDEX = '50';
const DEFAULT_WIDTH = 460;
const BORDER = 1;
const BORDER_WIDTH = `${String(BORDER)}px`;
const PADDING = 20.4;
const INSET = BORDER + PADDING;
const PANEL_GAP = 13.6;
const TITLE_GAP = 2;
const HEADER_GAP = 10.2;
const CONTENT_GAP = 13.6;

// Modal.dc.html and styles.css (.dialog-title): the title in the heading font
// at 22 px; the subtitle at 13 px; the content at 14 px.
const HEADING_FONT = 'Barlow Condensed';
const HEADING_WEIGHT = '600';
const TITLE_SIZE = '22px';
const SUBTITLE_SIZE = '13px';
const CONTENT_SIZE = '14px';

// The prototype's preview frame. The frame is the containing block of the
// fixed backdrop, so the backdrop covers the frame, not the test's viewport.
const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 420;
// The width of AccountFormModal.dc.html, and the prototype's narrowest
// editor value.
const CUSTOM_WIDTH = 500;
const NARROW_WIDTH = 320;
// A frame narrower than the default panel plus the backdrop's padding on both
// sides (460 + 2 x 13.6 px), and shorter than the panel's height.
const SMALL_FRAME_WIDTH = 400;
const SMALL_FRAME_HEIGHT = 120;
// styles.css (.dialog-backdrop): the backdrop's padding, --space-4.
const BACKDROP_PADDING = 13.6;
// How far inside the frame's corners the backdrop is clicked.
const CORNER = 4;

// The copy of Component Inventory.dc.html; the other titles are
// Modal.dc.html's default and an invented one that wraps in a narrow panel.
const TITLE = 'Modal';
const SUBTITLE = 'title · subtitle · width · onClose · children';
const BODY =
  'Backdrop click and Escape close it. Actions sit at the end of the children.';
const CANCEL = 'Cancel';
const CONFIRM = 'Confirm';
const CLOSE = 'Close';
const EDIT_TITLE = 'Edit account';
const LONG_TITLE = 'Zinsbindung und Sondertilgung des Darlehens bearbeiten';

// SPEC section 3: the Modal's props, without an actions prop (design log
// Q7), and no others; subtitle and width alone are optional. Typecheck fails
// when a prop is missing, one is added, or one changes between required and
// optional.
type ModalProps = ComponentProps<typeof Modal>;
type ListedProp =
  'open' | 'title' | 'subtitle' | 'width' | 'onClose' | 'children';
type ModalProp = keyof ModalProps;
type MissingProp = Exclude<ListedProp, ModalProp>;
type UnlistedProp = Exclude<ModalProp, ListedProp>;
type OptionalProp = {
  [Key in ModalProp]-?: object extends Pick<ModalProps, Key> ? Key : never;
}[ModalProp];
const NO_MISSING_PROP: [MissingProp] extends [never] ? true : false = true;
const NO_UNLISTED_PROP: [UnlistedProp] extends [never] ? true : false = true;
const ONLY_SUBTITLE_AND_WIDTH_OPTIONAL: [OptionalProp] extends [
  'subtitle' | 'width',
]
  ? ['subtitle' | 'width'] extends [OptionalProp]
    ? true
    : false
  : false = true;
// SPEC section 3: width is a number of pixels.
const WIDTH_IS_A_NUMBER: [NonNullable<ModalProps['width']>] extends [number]
  ? [number] extends [NonNullable<ModalProps['width']>]
    ? true
    : false
  : false = true;

// What Chromium computes for a CSS value, read from a probe element.
function computed(property: 'color' | 'boxShadow', css: string): string {
  const probe = document.createElement('span');
  probe.style[property] = css;
  if (probe.style[property] === '') {
    throw new Error(`not a CSS ${property}: ${css}`);
  }
  document.body.append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}

// The preview frame. Its transform makes it the containing block of the
// fixed backdrop. While its resting colours are read, it holds the Modal out
// of the pointer's reach: Chromium on Linux can apply :hover without pointer
// movement.
const Frame = styled.div`
  width: ${FRAME_WIDTH}px;
  height: ${FRAME_HEIGHT}px;
  transform: translate(0);

  &[data-resting] {
    pointer-events: none;
  }
`;

// A frame smaller than the panel plus the backdrop's padding, in both
// directions.
const SmallFrame = styled.div`
  width: ${SMALL_FRAME_WIDTH}px;
  height: ${SMALL_FRAME_HEIGHT}px;
  transform: translate(0);
`;

// The actions row a caller writes as the last row of the content, as
// Component Inventory.dc.html does: right aligned, 8 px apart.
const ActionsRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const CONTENT = (
  <>
    <span>{BODY}</span>
    <ActionsRow>
      <Button variant="secondary" label={CANCEL} />
      <Button variant="primary" icon="check" label={CONFIRM} />
    </ActionsRow>
  </>
);

function theFrame(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByTestId('frame');
}

// The open Modal renders in place, as in the prototype.
function theDialog(canvasElement: HTMLElement, title: string): HTMLElement {
  return within(canvasElement).getByRole('dialog', { name: title });
}

function theText(element: HTMLElement, text: string): HTMLElement {
  return within(element).getByText(text);
}

function theButton(element: HTMLElement, name: string): HTMLElement {
  return within(element).getByRole('button', { name });
}

// Lets the pointer reach the Modal again.
function release(canvasElement: HTMLElement): void {
  theFrame(canvasElement).removeAttribute('data-resting');
}

// What the pointer hits just inside a corner of the frame: the backdrop,
// outside the panel. Read once the pointer may reach the Modal.
async function theBackdropAt(
  canvasElement: HTMLElement,
  dialog: HTMLElement,
  corner: 'top left' | 'bottom right',
): Promise<HTMLElement> {
  const box = theFrame(canvasElement).getBoundingClientRect();
  const [x, y] =
    corner === 'top left'
      ? [box.left + CORNER, box.top + CORNER]
      : [box.right - CORNER, box.bottom - CORNER];
  const hit = document.elementFromPoint(x, y);
  if (!(hit instanceof HTMLElement)) {
    throw new Error('nothing under the pointer');
  }
  await expect(
    theFrame(canvasElement).contains(hit) && hit !== theFrame(canvasElement),
    'the backdrop is part of the Modal',
  ).toBe(true);
  await expect(dialog.contains(hit), 'outside the panel').toBe(false);
  return hit;
}

// The panel at rest: the raised fill inside a 1 px solid outline in the card
// border, with the large shadow; the title in the heading font at 22 px; the
// content at 14 px. Read inside the resting frame; afterwards the pointer may
// reach the Modal again.
async function expectRestingPanel(
  canvasElement: HTMLElement,
  dialog: HTMLElement,
  title: HTMLElement,
  body: HTMLElement,
): Promise<void> {
  const frame = theFrame(canvasElement);
  await expect(frame.hasAttribute('data-resting'), 'held at rest').toBe(true);
  await expect(dialog.matches(':hover'), 'hovered').toBe(false);

  const style = getComputedStyle(dialog);
  await expect(style.backgroundColor, 'fill').toBe(computed('color', RAISED));
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `${side} border`).toBe(
      BORDER_WIDTH,
    );
    await expect(style[`border${side}Style`], `${side} style`).toBe('solid');
    await expect(style[`border${side}Color`], `${side} colour`).toBe(
      computed('color', CARD_BORDER),
    );
  }
  await expect(style.boxShadow, 'shadow').toBe(
    computed('boxShadow', SHADOW_LG),
  );

  const heading = getComputedStyle(title);
  await expect(readFirstFamily(heading), 'title font').toBe(HEADING_FONT);
  await expect(heading.fontWeight, 'title weight').toBe(HEADING_WEIGHT);
  await expect(heading.fontSize, 'title size').toBe(TITLE_SIZE);

  await expect(getComputedStyle(body).fontSize, 'content size').toBe(
    CONTENT_SIZE,
  );

  release(canvasElement);
}

// The panel is the given width and centred in the frame.
async function expectCentredPanel(
  canvasElement: HTMLElement,
  dialog: HTMLElement,
  width: number,
): Promise<void> {
  const frame = theFrame(canvasElement).getBoundingClientRect();
  const panel = dialog.getBoundingClientRect();
  await expect(panel.width, 'width').toBeCloseTo(width, 1);
  await expect((panel.left + panel.right) / 2, 'horizontal centre').toBeCloseTo(
    (frame.left + frame.right) / 2,
    1,
  );
  await expect((panel.top + panel.bottom) / 2, 'vertical centre').toBeCloseTo(
    (frame.top + frame.bottom) / 2,
    1,
  );
}

// The header: the title at the top left inside the padding, the close button
// at the top right inside it.
async function expectHeader(
  dialog: HTMLElement,
  title: HTMLElement,
): Promise<void> {
  const panel = dialog.getBoundingClientRect();
  const heading = title.getBoundingClientRect();
  const close = theButton(dialog, CLOSE).getBoundingClientRect();
  await expect(heading.left - panel.left, 'title left').toBeCloseTo(INSET, 1);
  await expect(heading.top - panel.top, 'title top').toBeCloseTo(INSET, 1);
  await expect(close.top - panel.top, 'close top').toBeCloseTo(INSET, 1);
  await expect(panel.right - close.right, 'close right').toBeCloseTo(INSET, 1);
}

const meta = {
  title: 'Components/Modal',
  component: Modal,
  render: (args) => (
    <>
      <Frame data-testid="frame" data-resting="">
        <Modal {...args} />
      </Frame>
      {/* Modal.dc.html's close button, for the comparison; never shown. */}
      <div hidden data-testid="reference">
        <Button variant="ghost" size="sm" icon="x" title={CLOSE} />
      </div>
    </>
  ),
  args: {
    open: true,
    title: TITLE,
    subtitle: SUBTITLE,
    onClose: fn(),
    children: CONTENT,
  },
} satisfies Meta<typeof Modal>;

export default meta;

type Story = StoryObj<typeof meta>;

// The inventory's Modal, open with its actions: a modal dialog named by its
// title, 460 px wide in the middle of the dark backdrop, the title and the
// subtitle above the content, the actions as the content's last row, right
// aligned.
export const Default: Story = {
  play: async ({ args, canvasElement }) => {
    await expect(NO_MISSING_PROP).toBe(true);
    await expect(NO_UNLISTED_PROP).toBe(true);
    await expect(ONLY_SUBTITLE_AND_WIDTH_OPTIONAL).toBe(true);
    await expect(WIDTH_IS_A_NUMBER).toBe(true);
    await expect(components.Modal === Modal, 'exported by the barrel').toBe(
      true,
    );

    const dialog = theDialog(canvasElement, TITLE);
    const title = theText(dialog, TITLE);
    const subtitle = theText(dialog, SUBTITLE);
    const body = theText(dialog, BODY);
    await expect(
      within(canvasElement).getAllByRole('dialog').length,
      'one dialog',
    ).toBe(1);
    await expect(dialog.getAttribute('aria-modal'), 'modal').toBe('true');
    const labelledBy = dialog.getAttribute('aria-labelledby') ?? '';
    await expect(
      document.getElementById(labelledBy) === title,
      'labelled by its title',
    ).toBe(true);

    await expect(getComputedStyle(subtitle).fontSize, 'subtitle size').toBe(
      SUBTITLE_SIZE,
    );
    await expect(getComputedStyle(subtitle).color, 'subtitle colour').toBe(
      computed('color', TEXT_MUTED),
    );
    await expectRestingPanel(canvasElement, dialog, title, body);

    await expectCentredPanel(canvasElement, dialog, DEFAULT_WIDTH);
    await expectHeader(dialog, title);

    const panel = dialog.getBoundingClientRect();
    const actions = theButton(dialog, CONFIRM).getBoundingClientRect();
    await expect(
      subtitle.getBoundingClientRect().top -
        title.getBoundingClientRect().bottom,
      'title gap',
    ).toBeCloseTo(TITLE_GAP, 1);
    await expect(
      body.getBoundingClientRect().top -
        subtitle.getBoundingClientRect().bottom,
      'header gap',
    ).toBeCloseTo(PANEL_GAP, 1);
    await expect(
      actions.top - body.getBoundingClientRect().bottom,
      'content gap',
    ).toBeCloseTo(CONTENT_GAP, 1);
    await expect(panel.right - actions.right, 'actions right').toBeCloseTo(
      INSET,
      1,
    );
    await expect(panel.bottom - actions.bottom, 'actions bottom').toBeCloseTo(
      INSET,
      1,
    );

    const backdrop = await theBackdropAt(canvasElement, dialog, 'top left');
    const cover = backdrop.getBoundingClientRect();
    const frame = theFrame(canvasElement).getBoundingClientRect();
    await expect(backdrop.contains(dialog), 'the panel on the backdrop').toBe(
      true,
    );
    await expect(getComputedStyle(backdrop).backgroundColor, 'backdrop').toBe(
      computed('color', BACKDROP),
    );
    await expect(getComputedStyle(backdrop).zIndex, 'above the page').toBe(
      Z_INDEX,
    );
    await expect(cover.left, 'backdrop left').toBeCloseTo(frame.left, 1);
    await expect(cover.top, 'backdrop top').toBeCloseTo(frame.top, 1);
    await expect(cover.width, 'backdrop width').toBeCloseTo(frame.width, 1);
    await expect(cover.height, 'backdrop height').toBeCloseTo(frame.height, 1);

    // Modal.dc.html: a ghost sm Button with the x icon, titled Close.
    const reference =
      within(canvasElement).getByTestId('reference').firstElementChild;
    await expect(
      theButton(dialog, CLOSE).outerHTML === reference?.outerHTML,
      'the close button',
    ).toBe(true);

    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

// A custom width, the 500 px of AccountFormModal.dc.html, without a subtitle.
export const CustomWidth: Story = {
  args: { title: EDIT_TITLE, subtitle: undefined, width: CUSTOM_WIDTH },
  play: async ({ canvasElement }) => {
    const dialog = theDialog(canvasElement, EDIT_TITLE);
    release(canvasElement);
    await expectCentredPanel(canvasElement, dialog, CUSTOM_WIDTH);
    await expectHeader(dialog, theText(dialog, EDIT_TITLE));
  },
};

// A title that wraps in the narrowest panel, without a subtitle: the title
// stops the header gap short of the close button, and the content follows
// the title after the panel gap.
export const LongTitle: Story = {
  args: { title: LONG_TITLE, subtitle: undefined, width: NARROW_WIDTH },
  play: async ({ canvasElement }) => {
    const dialog = theDialog(canvasElement, LONG_TITLE);
    release(canvasElement);
    const title = theText(dialog, LONG_TITLE).getBoundingClientRect();
    const close = theButton(dialog, CLOSE).getBoundingClientRect();
    await expect(title.height > close.height, 'the title wraps').toBe(true);
    await expect(close.left - title.right, 'title to close').toBeCloseTo(
      HEADER_GAP,
      1,
    );
    await expect(
      theText(dialog, BODY).getBoundingClientRect().top - title.bottom,
      'header gap',
    ).toBeCloseTo(PANEL_GAP, 1);
  },
};

// An empty subtitle is no subtitle, as in the prototype: the content follows
// the title after the panel gap alone.
export const EmptySubtitle: Story = {
  args: { title: LONG_TITLE, subtitle: '', width: NARROW_WIDTH },
  play: async ({ canvasElement }) => {
    const dialog = theDialog(canvasElement, LONG_TITLE);
    release(canvasElement);
    const title = theText(dialog, LONG_TITLE).getBoundingClientRect();
    await expect(
      theText(dialog, BODY).getBoundingClientRect().top - title.bottom,
      'header gap',
    ).toBeCloseTo(PANEL_GAP, 1);
  },
};

// A backdrop smaller than the panel plus its padding, as in a small window:
// the backdrop's padding keeps the panel a --space-4 gap inside the backdrop's
// left and top edges instead of flush against them.
export const SmallBackdrop: Story = {
  render: (args) => (
    <SmallFrame data-testid="frame">
      <Modal {...args} />
    </SmallFrame>
  ),
  play: async ({ canvasElement }) => {
    const dialog = theDialog(canvasElement, TITLE);
    const frame = theFrame(canvasElement).getBoundingClientRect();
    const panel = dialog.getBoundingClientRect();
    await expect(
      panel.width + 2 * BACKDROP_PADDING > frame.width,
      'the frame is smaller than the panel and its padding',
    ).toBe(true);
    await expect(
      panel.height + 2 * BACKDROP_PADDING > frame.height,
      'the frame is shorter than the panel and its padding',
    ).toBe(true);
    await expect(panel.left - frame.left, 'panel left').toBeCloseTo(
      BACKDROP_PADDING,
      1,
    );
    await expect(panel.top - frame.top, 'panel top').toBeCloseTo(
      BACKDROP_PADDING,
      1,
    );
  },
};

// Esc on the window calls onClose, wherever the focus is; another key does
// not.
export const ClosesOnEscape: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = theDialog(canvasElement, TITLE);
    release(canvasElement);

    await userEvent.keyboard('{Enter}');
    await expect(args.onClose).not.toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledTimes(1);

    await userEvent.click(theButton(dialog, CANCEL));
    await expect(
      dialog.contains(document.activeElement),
      'focus in the panel',
    ).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalledTimes(2);
  },
};

// A click on the backdrop, outside the panel, calls onClose.
export const ClosesOnBackdropClick: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = theDialog(canvasElement, TITLE);
    release(canvasElement);

    await userEvent.click(
      await theBackdropAt(canvasElement, dialog, 'top left'),
    );
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(
      await theBackdropAt(canvasElement, dialog, 'bottom right'),
    );
    await expect(args.onClose).toHaveBeenCalledTimes(2);
  },
};

// The close button calls onClose.
export const ClosesOnCloseButton: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = theDialog(canvasElement, TITLE);
    release(canvasElement);

    await userEvent.click(theButton(dialog, CLOSE));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
  },
};

// A click inside the panel does not call onClose: on the panel itself, its
// title, its subtitle, its content and its actions.
export const StaysOpenOnPanelClick: Story = {
  play: async ({ args, canvasElement }) => {
    const dialog = theDialog(canvasElement, TITLE);
    release(canvasElement);

    for (const target of [
      dialog,
      theText(dialog, TITLE),
      theText(dialog, SUBTITLE),
      theText(dialog, BODY),
      theButton(dialog, CANCEL),
      theButton(dialog, CONFIRM),
    ]) {
      await userEvent.click(target);
    }
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(theDialog(canvasElement, TITLE) === dialog, 'still open').toBe(
      true,
    );
  },
};

// Closed, the Modal renders nothing, and Esc does not call onClose.
export const Closed: Story = {
  args: { open: false },
  play: async ({ args, canvasElement }) => {
    const frame = theFrame(canvasElement);
    await expect(
      within(canvasElement).queryByRole('dialog'),
      'no dialog',
    ).toBeNull();
    await expect(frame.childElementCount, 'nothing rendered').toBe(0);
    await expect(frame.textContent, 'no text').toBe('');

    release(canvasElement);
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
