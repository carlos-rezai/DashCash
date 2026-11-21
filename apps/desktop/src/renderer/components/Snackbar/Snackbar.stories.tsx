import type { ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, within } from 'storybook/test';
import { Button } from '../../primitives/Button/Button.tsx';
import { Icon, type IconName } from '../../primitives/Icon/Icon.tsx';
import { Loader } from '../../primitives/Loader/Loader.tsx';
import * as components from '../index.ts';
import { Snackbar } from './Snackbar.tsx';

type Tone = 'success' | 'error' | 'info' | 'warning';

// The colours and the shadow a reader sees, written out from dashcash-dark.css
// and design log D1, apart from the Theme (SPEC, Card fill: the Snackbar on
// the raised fill).
// --sb-raised-bg = --color-surface: the ground under the tone's tint
const RAISED = '#213345';
// --sb-text-muted: the message
const TEXT_MUTED = 'color-mix(in srgb, #e9f1fa 62%, transparent)';
// --shadow-lg: the large shadow
const SHADOW_LG =
  '0 0 0 1px color-mix(in srgb, #e9f1fa 8%, transparent), 0 18px 48px rgba(5, 10, 16, 0.55)';

// Snackbar.dc.html, per tone: the colour of the icon and of the hairline
// (--sb-positive; --sb-danger, raised to #ed8c80 by D1; --color-accent-600;
// --sb-warning), the tint over the raised fill (the 14 % tints, the danger
// tint on the base #e8877b as D1 keeps it; --color-accent-100 for info), the
// default icon, the role and its liveness, and the primary action's Button
// variant (SPEC section 3).
type Look = {
  colour: string;
  tint: string;
  glyph: IconName;
  role: 'status' | 'alert';
  live: 'polite' | 'assertive';
  action: 'primary' | 'secondary';
};

const TONES: Record<Tone, Look> = {
  success: {
    colour: '#7cc59a',
    tint: 'color-mix(in srgb, #7cc59a 14%, transparent)',
    glyph: 'circleCheck',
    role: 'status',
    live: 'polite',
    action: 'primary',
  },
  error: {
    colour: '#ed8c80',
    tint: 'color-mix(in srgb, #e8877b 14%, transparent)',
    glyph: 'circleX',
    role: 'alert',
    live: 'assertive',
    action: 'secondary',
  },
  info: {
    colour: '#94bce3',
    tint: '#22384d',
    glyph: 'info',
    role: 'status',
    live: 'polite',
    action: 'primary',
  },
  warning: {
    colour: '#e0b469',
    tint: 'color-mix(in srgb, #e0b469 14%, transparent)',
    glyph: 'alert',
    role: 'alert',
    live: 'polite',
    action: 'secondary',
  },
};

// Snackbar.dc.html: the hairline is the tone's colour at 55 %.
function hairline(tone: Tone): string {
  return `color-mix(in srgb, ${TONES[tone].colour} 55%, transparent)`;
}

// Snackbar.dc.html: a 1 px outline; 14 px padding above, right and below,
// 16 px on the left; the icon 18 px, 1 px lower than the text; 12 px between
// the icon, the text and the close button; 4 px between the title and the
// message; the actions 6 px further down, --space-2 apart; the close button
// pulled 6 px up and right.
const BORDER = 1;
const BORDER_WIDTH = `${String(BORDER)}px`;
const PADDING_TOP = 14;
const PADDING_RIGHT = 14;
const PADDING_BOTTOM = 14;
const PADDING_LEFT = 16;
const ICON_SIZE = 18;
const ICON_NUDGE = 1;
const GAP = 12;
const TEXT_GAP = 4;
const ACTIONS_PADDING = 6;
const ACTIONS_GAP = 6.8;
const CLOSE_PULL = 6;

// Snackbar.dc.html: the title at 14 px, weight 500; the message at 13 px;
// both wrap pretty.
const TITLE_SIZE = '14px';
const TITLE_WEIGHT = '500';
const MESSAGE_SIZE = '13px';

// Snackbar.dc.html's preview width, which the Snackbar fills; a frame too
// narrow for both actions on one line.
const FRAME_WIDTH = 420;
const NARROW_WIDTH = 260;

// The copy of Component Inventory.dc.html, store.js's update and
// Loader Options.dc.html's installing snackbar; the backup copy and the long
// file name are invented.
const CLOSE = 'Dismiss';
const SUCCESS_TITLE = 'Imported 20 rows into Sparkasse Giro';
const SUCCESS_MESSAGE = '9 rules matched, 5 duplicates skipped.';
const SUCCESS_ACTION = 'View account';
const ERROR_TITLE = 'Couldn’t read Kontoauszug_Oktober.pdf';
const ERROR_MESSAGE =
  'This isn’t a CSV export. Download the CSV from your bank’s online banking and try again.';
const ERROR_ACTION = 'Choose another file';
const INFO_TITLE = 'DashCash 2.1.0 is available';
const INFO_MESSAGE =
  'You have 2.0.0. The update installs on restart; your data stays as it is.';
const INFO_ACTION = 'Restart and update';
const WARNING_TITLE = 'Time for a fresh import';
const WARNING_MESSAGE =
  'Visa Card (12 days) and Sparkasse Giro (9 days) haven’t been imported for a while. Balances and headroom don’t include purchases since then.';
const WARNING_ACTION = 'Import CSV';
const LATER = 'Later';
const INSTALLING_TITLE = 'Installing 2.1.0…';
const INSTALLING_MESSAGE = 'DashCash restarts in a moment.';
const UPDATED_TITLE = 'Updated to 2.1.0';
const UPDATED_MESSAGE = 'See what’s new in the release notes.';
const BACKUP_TITLE = 'Backup saved';
const BACKUP_ACTION = 'Show file';
const LONG_FILE_TITLE =
  'Couldn’t read Umsaetze_Girokonto_2026-10-01_bis_2026-10-31.pdf';

// SPEC section 3: the Snackbar's props plus loading (SPEC, Loaders), and no
// others; tone and title alone are required. Typecheck fails when a prop is
// missing, one is added, or one changes between required and optional.
type SnackbarProps = ComponentProps<typeof Snackbar>;
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type ListedProp =
  | 'tone'
  | 'title'
  | 'message'
  | 'icon'
  | 'actionLabel'
  | 'actionIcon'
  | 'onAction'
  | 'secondaryLabel'
  | 'onSecondary'
  | 'onClose'
  | 'loading';
type SnackbarProp = keyof SnackbarProps;
type RequiredProp = {
  [Key in SnackbarProp]-?: object extends Pick<SnackbarProps, Key>
    ? never
    : Key;
}[SnackbarProp];
const EXACTLY_THE_LISTED_PROPS: Equal<SnackbarProp, ListedProp> = true;
const ONLY_TONE_AND_TITLE_REQUIRED: Equal<RequiredProp, 'tone' | 'title'> =
  true;
// SPEC section 3: the four tones; the icons are IconNames; each callback
// takes nothing.
const TONE_IS_THE_FOUR: Equal<SnackbarProps['tone'], Tone> = true;
type PropIs<Key extends SnackbarProp, Type> = Equal<
  NonNullable<SnackbarProps[Key]>,
  Type
>;
const ICONS_ARE_ICON_NAMES: [
  PropIs<'icon', IconName>,
  PropIs<'actionIcon', IconName>,
] = [true, true];
const CALLBACKS_TAKE_NOTHING: [
  PropIs<'onAction', () => void>,
  PropIs<'onSecondary', () => void>,
  PropIs<'onClose', () => void>,
] = [true, true, true];
const TEXTS_ARE_STRINGS: [
  PropIs<'title', string>,
  PropIs<'message', string>,
  PropIs<'actionLabel', string>,
  PropIs<'secondaryLabel', string>,
] = [true, true, true, true];
const LOADING_IS_A_BOOLEAN: PropIs<'loading', boolean> = true;

// What Chromium computes for a CSS value, read from a probe element.
function computed(
  property: 'color' | 'boxShadow' | 'backgroundImage',
  css: string,
): string {
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

// The preview frame. While its resting colours are read, it holds the
// Snackbar out of the pointer's reach: Chromium on Linux can apply :hover
// without pointer movement.
const Frame = styled.div<{ $width: number }>`
  width: ${({ $width }) => String($width)}px;

  &[data-resting] {
    pointer-events: none;
  }
`;

// A frame that lays its children out in a row, where a Snackbar left to its
// content would shrink to it instead of filling the frame.
const RowFrame = styled.div<{ $width: number }>`
  display: flex;
  width: ${({ $width }) => String($width)}px;
`;

// The parts the Snackbar is built from, rendered alone for the comparison;
// never shown.
function References({ args }: { args: SnackbarProps }) {
  const glyphs = new Set<IconName>(
    Object.values(TONES).map((look) => look.glyph),
  );
  if (args.icon !== undefined) {
    glyphs.add(args.icon);
  }
  return (
    <div hidden data-testid="reference">
      {[...glyphs].map((glyph) => (
        <span key={glyph} data-testid={`icon-${glyph}`}>
          <Icon glyph={glyph} size={ICON_SIZE} />
        </span>
      ))}
      <span data-testid="loader">
        <Loader size={ICON_SIZE} delay={0} color="currentColor" />
      </span>
      <span data-testid="action">
        <Button
          variant={TONES[args.tone].action}
          size="sm"
          icon={args.actionIcon}
          label={args.actionLabel}
        />
      </span>
      <span data-testid="secondary">
        <Button variant="ghost" size="sm" label={args.secondaryLabel} />
      </span>
      <span data-testid="close">
        <Button variant="ghost" size="sm" icon="x" title={CLOSE} />
      </span>
    </div>
  );
}

function theReference(canvasElement: HTMLElement, id: string): string {
  const part = within(canvasElement).getByTestId(id).firstElementChild;
  if (part === null) {
    throw new Error(`no reference ${id}`);
  }
  return part.outerHTML;
}

function theFrame(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByTestId('frame');
}

// Lets the pointer reach the Snackbar again.
function release(canvasElement: HTMLElement): void {
  theFrame(canvasElement).removeAttribute('data-resting');
}

// The Snackbar that holds a title: the nearest status or alert around it.
function theSnackbar(canvasElement: HTMLElement, title: string): HTMLElement {
  const snackbar = within(theFrame(canvasElement))
    .getByText(title)
    .closest<HTMLElement>('[role="status"], [role="alert"]');
  if (snackbar === null) {
    throw new Error(`no status or alert around ${title}`);
  }
  return snackbar;
}

function theButton(element: HTMLElement, name: string): HTMLElement {
  return within(element).getByRole('button', { name });
}

function box(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

// The svgs the Snackbar draws outside its buttons: its icon, or the Loader's.
function ownSvgs(snackbar: HTMLElement): SVGSVGElement[] {
  return [...snackbar.querySelectorAll('svg')].filter(
    (svg) => svg.closest('button') === null,
  );
}

// The tone's role and liveness: an alert for error and warning, a status for
// the others, and no other status or alert in the frame.
async function expectRole(
  canvasElement: HTMLElement,
  snackbar: HTMLElement,
  tone: Tone,
): Promise<void> {
  const look = TONES[tone];
  const other = look.role === 'alert' ? 'status' : 'alert';
  await expect(snackbar.getAttribute('role'), 'role').toBe(look.role);
  await expect(snackbar.getAttribute('aria-live'), 'live').toBe(look.live);
  await expect(
    within(theFrame(canvasElement)).getAllByRole(look.role)[0] === snackbar,
    `the ${look.role}`,
  ).toBe(true);
  await expect(
    within(theFrame(canvasElement)).queryByRole(other),
    `no ${other}`,
  ).toBeNull();
}

// The Snackbar at rest: the tone's tint over the raised fill, inside a 1 px
// solid hairline in the tone's colour at 55 %, with the large shadow. Read
// inside the resting frame; afterwards the pointer may reach it again.
async function expectRestingLook(
  canvasElement: HTMLElement,
  snackbar: HTMLElement,
  tone: Tone,
): Promise<void> {
  const frame = theFrame(canvasElement);
  await expect(frame.hasAttribute('data-resting'), 'held at rest').toBe(true);
  await expect(snackbar.matches(':hover'), 'hovered').toBe(false);

  const style = getComputedStyle(snackbar);
  await expect(style.backgroundColor, 'fill').toBe(computed('color', RAISED));
  await expect(style.backgroundImage, 'tint').toBe(
    computed(
      'backgroundImage',
      `linear-gradient(${TONES[tone].tint}, ${TONES[tone].tint})`,
    ),
  );
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(style[`border${side}Width`], `${side} border`).toBe(
      BORDER_WIDTH,
    );
    await expect(style[`border${side}Style`], `${side} style`).toBe('solid');
    await expect(style[`border${side}Color`], `${side} colour`).toBe(
      computed('color', hairline(tone)),
    );
  }
  await expect(style.boxShadow, 'shadow').toBe(
    computed('boxShadow', SHADOW_LG),
  );

  release(canvasElement);
}

// The icon: the given glyph or the tone's, 18 px in the tone's colour, at the
// top left inside the padding, 1 px lower; the only svg outside the buttons.
async function expectIcon(
  canvasElement: HTMLElement,
  snackbar: HTMLElement,
  tone: Tone,
  glyph: IconName,
): Promise<void> {
  const svgs = ownSvgs(snackbar);
  await expect(svgs.length, 'one icon').toBe(1);
  const [icon] = svgs;
  if (icon === undefined) {
    throw new Error('no icon');
  }
  await expect(
    icon.outerHTML === theReference(canvasElement, `icon-${glyph}`),
    `the ${glyph} icon at 18 px`,
  ).toBe(true);
  await expect(getComputedStyle(icon).color, 'icon colour').toBe(
    computed('color', TONES[tone].colour),
  );
  const outer = box(snackbar);
  await expect(box(icon).left - outer.left, 'icon left').toBeCloseTo(
    BORDER + PADDING_LEFT,
    1,
  );
  await expect(box(icon).top - outer.top, 'icon top').toBeCloseTo(
    BORDER + PADDING_TOP + ICON_NUDGE,
    1,
  );
}

// The text: the title at 14 px, weight 500, 12 px right of the icon at the
// top inside the padding, as wide as the room up to the close button or the
// padding; the message 4 px below it, 13 px and muted; both wrap pretty.
async function expectText(
  snackbar: HTMLElement,
  title: string,
  message: string | undefined,
  hasClose: boolean,
): Promise<void> {
  const outer = box(snackbar);
  const [icon] = ownSvgs(snackbar);
  const heading = within(snackbar).getByText(title);
  const headingStyle = getComputedStyle(heading);
  await expect(headingStyle.fontSize, 'title size').toBe(TITLE_SIZE);
  await expect(headingStyle.fontWeight, 'title weight').toBe(TITLE_WEIGHT);
  await expect(
    headingStyle.getPropertyValue('text-wrap-style'),
    'title wrap',
  ).toBe('pretty');
  await expect(box(heading).top - outer.top, 'title top').toBeCloseTo(
    BORDER + PADDING_TOP,
    1,
  );
  if (icon !== undefined) {
    await expect(box(heading).left - box(icon).right, 'icon gap').toBeCloseTo(
      GAP,
      1,
    );
  }
  const end = hasClose
    ? box(theButton(snackbar, CLOSE)).left - GAP
    : outer.right - BORDER - PADDING_RIGHT;
  await expect(box(heading).right, 'title end').toBeCloseTo(end, 1);

  if (message !== undefined) {
    const body = within(snackbar).getByText(message);
    const bodyStyle = getComputedStyle(body);
    await expect(bodyStyle.fontSize, 'message size').toBe(MESSAGE_SIZE);
    await expect(bodyStyle.color, 'message colour').toBe(
      computed('color', TEXT_MUTED),
    );
    await expect(
      bodyStyle.getPropertyValue('text-wrap-style'),
      'message wrap',
    ).toBe('pretty');
    await expect(box(body).top - box(heading).bottom, 'title gap').toBeCloseTo(
      TEXT_GAP,
      1,
    );
    await expect(box(body).left, 'message left').toBeCloseTo(
      box(heading).left,
      1,
    );
  }
}

// The close button: Snackbar.dc.html's ghost sm Button with the x icon,
// titled Dismiss, pulled 6 px up and right out of the padding's corner.
async function expectClose(
  canvasElement: HTMLElement,
  snackbar: HTMLElement,
): Promise<void> {
  const close = theButton(snackbar, CLOSE);
  await expect(
    close.outerHTML === theReference(canvasElement, 'close'),
    'the close button',
  ).toBe(true);
  const outer = box(snackbar);
  await expect(box(close).top - outer.top, 'close top').toBeCloseTo(
    BORDER + PADDING_TOP - CLOSE_PULL,
    1,
  );
  await expect(outer.right - box(close).right, 'close right').toBeCloseTo(
    BORDER + PADDING_RIGHT - CLOSE_PULL,
    1,
  );
}

// The actions below the text, 4 + 6 px under it: the primary action, the
// tone's Button variant at sm with the given icon; the secondary one a ghost
// sm Button --space-2 to its right; the last thing in the Snackbar before the
// bottom padding.
async function expectActions(
  canvasElement: HTMLElement,
  snackbar: HTMLElement,
  above: string,
  action: string,
  secondary: string | undefined,
): Promise<void> {
  const primary = theButton(snackbar, action);
  await expect(
    primary.outerHTML === theReference(canvasElement, 'action'),
    'the primary action',
  ).toBe(true);
  const text = within(snackbar).getByText(above);
  await expect(box(primary).top - box(text).bottom, 'actions gap').toBeCloseTo(
    TEXT_GAP + ACTIONS_PADDING,
    1,
  );
  await expect(box(primary).left, 'actions left').toBeCloseTo(
    box(text).left,
    1,
  );
  let last = primary;
  if (secondary !== undefined) {
    const second = theButton(snackbar, secondary);
    await expect(
      second.outerHTML === theReference(canvasElement, 'secondary'),
      'the secondary action',
    ).toBe(true);
    await expect(
      box(second).left - box(primary).right,
      'between the actions',
    ).toBeCloseTo(ACTIONS_GAP, 1);
    await expect(box(second).top, 'one row').toBeCloseTo(box(primary).top, 1);
    last = second;
  }
  await expect(
    box(snackbar).bottom - box(last).bottom,
    'bottom padding',
  ).toBeCloseTo(BORDER + PADDING_BOTTOM, 1);
}

// The Snackbar fills its frame.
async function expectWidth(
  canvasElement: HTMLElement,
  snackbar: HTMLElement,
): Promise<void> {
  await expect(box(snackbar).width, 'width').toBeCloseTo(
    box(theFrame(canvasElement)).width,
    1,
  );
  await expect(box(snackbar).left, 'left').toBeCloseTo(
    box(theFrame(canvasElement)).left,
    1,
  );
}

// No callback is called before a click.
async function expectNoCallback(args: SnackbarProps): Promise<void> {
  for (const callback of [args.onAction, args.onSecondary, args.onClose]) {
    if (callback !== undefined) {
      await expect(callback).not.toHaveBeenCalled();
    }
  }
}

const meta = {
  title: 'Components/Snackbar',
  component: Snackbar,
  render: (args) => (
    <>
      <Frame $width={FRAME_WIDTH} data-testid="frame" data-resting="">
        <Snackbar {...args} />
      </Frame>
      <References args={args} />
    </>
  ),
  args: {
    tone: 'success',
    title: SUCCESS_TITLE,
    message: SUCCESS_MESSAGE,
    actionLabel: SUCCESS_ACTION,
    onAction: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof Snackbar>;

export default meta;

type Story = StoryObj<typeof meta>;

// The inventory's success: a status with the circleCheck icon in green on the
// green tint, a primary action without an icon, and the close button.
export const SuccessTone: Story = {
  play: async ({ args, canvasElement }) => {
    await expect(EXACTLY_THE_LISTED_PROPS).toBe(true);
    await expect(ONLY_TONE_AND_TITLE_REQUIRED).toBe(true);
    await expect(TONE_IS_THE_FOUR).toBe(true);
    await expect(ICONS_ARE_ICON_NAMES).toEqual([true, true]);
    await expect(CALLBACKS_TAKE_NOTHING).toEqual([true, true, true]);
    await expect(TEXTS_ARE_STRINGS).toEqual([true, true, true, true]);
    await expect(LOADING_IS_A_BOOLEAN).toBe(true);
    await expect(
      components.Snackbar === Snackbar,
      'exported by the barrel',
    ).toBe(true);

    const snackbar = theSnackbar(canvasElement, SUCCESS_TITLE);
    await expectRestingLook(canvasElement, snackbar, 'success');
    await expectRole(canvasElement, snackbar, 'success');
    await expectWidth(canvasElement, snackbar);
    await expectIcon(canvasElement, snackbar, 'success', 'circleCheck');
    await expectText(snackbar, SUCCESS_TITLE, SUCCESS_MESSAGE, true);
    await expectActions(
      canvasElement,
      snackbar,
      SUCCESS_MESSAGE,
      SUCCESS_ACTION,
      undefined,
    );
    await expectClose(canvasElement, snackbar);
    await expect(
      within(snackbar).getAllByRole('button').length,
      'two buttons',
    ).toBe(2);
    await expectNoCallback(args);
  },
};

// The inventory's error: an assertive alert with the circleX icon in red on
// the red tint, a secondary action with the upload icon, and the close button.
export const ErrorTone: Story = {
  args: {
    tone: 'error',
    title: ERROR_TITLE,
    message: ERROR_MESSAGE,
    actionLabel: ERROR_ACTION,
    actionIcon: 'upload',
  },
  play: async ({ args, canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, ERROR_TITLE);
    await expectRestingLook(canvasElement, snackbar, 'error');
    await expectRole(canvasElement, snackbar, 'error');
    await expectWidth(canvasElement, snackbar);
    await expectIcon(canvasElement, snackbar, 'error', 'circleX');
    await expectText(snackbar, ERROR_TITLE, ERROR_MESSAGE, true);
    await expectActions(
      canvasElement,
      snackbar,
      ERROR_MESSAGE,
      ERROR_ACTION,
      undefined,
    );
    await expectClose(canvasElement, snackbar);
    await expectNoCallback(args);
  },
};

// The inventory's update: a status on the accent tint with a custom icon,
// download, in place of info; a primary action with the refresh icon, a
// secondary action and the close button.
export const InfoTone: Story = {
  args: {
    tone: 'info',
    icon: 'download',
    title: INFO_TITLE,
    message: INFO_MESSAGE,
    actionLabel: INFO_ACTION,
    actionIcon: 'refresh',
    secondaryLabel: LATER,
    onSecondary: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, INFO_TITLE);
    await expectRestingLook(canvasElement, snackbar, 'info');
    await expectRole(canvasElement, snackbar, 'info');
    await expectWidth(canvasElement, snackbar);
    await expectIcon(canvasElement, snackbar, 'info', 'download');
    await expectText(snackbar, INFO_TITLE, INFO_MESSAGE, true);
    await expectActions(
      canvasElement,
      snackbar,
      INFO_MESSAGE,
      INFO_ACTION,
      LATER,
    );
    await expectClose(canvasElement, snackbar);
    await expectNoCallback(args);
  },
};

// The inventory's import reminder: a polite alert on the warning tint with a
// custom icon, calendar; a secondary action with the upload icon, a ghost
// secondary action and the close button.
export const WarningTone: Story = {
  args: {
    tone: 'warning',
    icon: 'calendar',
    title: WARNING_TITLE,
    message: WARNING_MESSAGE,
    actionLabel: WARNING_ACTION,
    actionIcon: 'upload',
    secondaryLabel: LATER,
    onSecondary: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, WARNING_TITLE);
    await expectRestingLook(canvasElement, snackbar, 'warning');
    await expectRole(canvasElement, snackbar, 'warning');
    await expectWidth(canvasElement, snackbar);
    await expectIcon(canvasElement, snackbar, 'warning', 'calendar');
    await expectText(snackbar, WARNING_TITLE, WARNING_MESSAGE, true);
    await expectActions(
      canvasElement,
      snackbar,
      WARNING_MESSAGE,
      WARNING_ACTION,
      LATER,
    );
    await expectClose(canvasElement, snackbar);
    await expectNoCallback(args);
  },
};

const DEFAULT_TITLES: Record<Tone, string> = {
  success: UPDATED_TITLE,
  error: ERROR_TITLE,
  info: INFO_TITLE,
  warning: WARNING_TITLE,
};

// Without an icon, each tone shows its own: circleCheck, circleX, info and
// alert, in the tone's colour.
export const DefaultIcons: Story = {
  render: (args) => (
    <>
      <Frame $width={FRAME_WIDTH} data-testid="frame" data-resting="">
        {(Object.keys(DEFAULT_TITLES) as Tone[]).map((tone) => (
          <Snackbar key={tone} tone={tone} title={DEFAULT_TITLES[tone]} />
        ))}
      </Frame>
      <References args={args} />
    </>
  ),
  play: async ({ canvasElement }) => {
    release(canvasElement);
    for (const tone of Object.keys(DEFAULT_TITLES) as Tone[]) {
      const snackbar = theSnackbar(canvasElement, DEFAULT_TITLES[tone]);
      await expect(snackbar.getAttribute('role'), `${tone} role`).toBe(
        TONES[tone].role,
      );
      await expectIcon(canvasElement, snackbar, tone, TONES[tone].glyph);
      await expect(
        within(snackbar).queryAllByRole('button').length,
        `${tone} without buttons`,
      ).toBe(0);
    }
  },
};

// store.js's installing update: loading, an 18 px Loader in the tone's
// colour replaces the icon, refresh here; no actions and no close button.
export const Loading: Story = {
  args: {
    tone: 'info',
    icon: 'refresh',
    title: INSTALLING_TITLE,
    message: INSTALLING_MESSAGE,
    loading: true,
    actionLabel: undefined,
    onAction: undefined,
    onClose: undefined,
  },
  play: async ({ canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, INSTALLING_TITLE);
    await expectRestingLook(canvasElement, snackbar, 'info');
    await expect(snackbar.getAttribute('role'), 'role').toBe('status');

    const loader = within(snackbar).getByRole('status', { name: 'Loading' });
    await expect(
      loader.outerHTML === theReference(canvasElement, 'loader'),
      'the 18 px Loader, at once, in the current colour',
    ).toBe(true);
    await expect(getComputedStyle(loader).color, 'loader colour').toBe(
      computed('color', TONES.info.colour),
    );
    const svgs = ownSvgs(snackbar);
    await expect(svgs.length, 'no icon beside the Loader').toBe(1);
    await expect(
      svgs[0] !== undefined && loader.contains(svgs[0]),
      'the Loader in place of the icon',
    ).toBe(true);
    const outer = box(snackbar);
    await expect(box(loader).left - outer.left, 'loader left').toBeCloseTo(
      BORDER + PADDING_LEFT,
      1,
    );
    await expect(box(loader).top - outer.top, 'loader top').toBeCloseTo(
      BORDER + PADDING_TOP + ICON_NUDGE,
      1,
    );
    await expect(
      box(within(snackbar).getByText(INSTALLING_TITLE)).left -
        box(loader).right,
      'loader gap',
    ).toBeCloseTo(GAP, 1);
    await expectText(snackbar, INSTALLING_TITLE, INSTALLING_MESSAGE, false);
    await expect(
      within(snackbar).queryAllByRole('button').length,
      'no buttons',
    ).toBe(0);
  },
};

// store.js's finished update: a success without actions or close button ends
// with its message, before the bottom padding.
export const WithoutActions: Story = {
  args: {
    title: UPDATED_TITLE,
    message: UPDATED_MESSAGE,
    actionLabel: undefined,
    onAction: undefined,
    onClose: undefined,
  },
  play: async ({ canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, UPDATED_TITLE);
    release(canvasElement);
    await expect(
      within(snackbar).queryAllByRole('button').length,
      'no buttons',
    ).toBe(0);
    await expectText(snackbar, UPDATED_TITLE, UPDATED_MESSAGE, false);
    await expect(
      box(snackbar).bottom -
        box(within(snackbar).getByText(UPDATED_MESSAGE)).bottom,
      'bottom padding',
    ).toBeCloseTo(BORDER + PADDING_BOTTOM, 1);
  },
};

// An empty message is no message, as in the prototype: the action follows
// the title directly.
export const WithoutMessage: Story = {
  args: {
    title: BACKUP_TITLE,
    message: '',
    actionLabel: BACKUP_ACTION,
  },
  play: async ({ canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, BACKUP_TITLE);
    release(canvasElement);
    await expectText(snackbar, BACKUP_TITLE, undefined, true);
    await expectActions(
      canvasElement,
      snackbar,
      BACKUP_TITLE,
      BACKUP_ACTION,
      undefined,
    );
  },
};

// An empty action label and an empty secondary label are absent, as in the
// prototype: no buttons and no actions row, so the text ends before the bottom
// padding as without actions.
export const EmptyActionLabels: Story = {
  args: {
    title: UPDATED_TITLE,
    message: UPDATED_MESSAGE,
    actionLabel: '',
    onAction: undefined,
    secondaryLabel: '',
    onSecondary: undefined,
    onClose: undefined,
  },
  play: async ({ canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, UPDATED_TITLE);
    release(canvasElement);
    await expect(
      within(snackbar).queryAllByRole('button').length,
      'no buttons',
    ).toBe(0);
    await expectText(snackbar, UPDATED_TITLE, UPDATED_MESSAGE, false);
    await expect(
      box(snackbar).bottom -
        box(within(snackbar).getByText(UPDATED_MESSAGE)).bottom,
      'bottom padding',
    ).toBeCloseTo(BORDER + PADDING_BOTTOM, 1);
  },
};

// A secondary action without a primary one stands alone at the start of the
// actions row.
export const SecondaryOnly: Story = {
  args: {
    tone: 'warning',
    icon: 'calendar',
    title: WARNING_TITLE,
    message: WARNING_MESSAGE,
    actionLabel: undefined,
    onAction: undefined,
    secondaryLabel: LATER,
    onSecondary: fn(),
  },
  play: async ({ canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, WARNING_TITLE);
    release(canvasElement);
    const later = theButton(snackbar, LATER);
    const message = within(snackbar).getByText(WARNING_MESSAGE);
    await expect(
      later.outerHTML === theReference(canvasElement, 'secondary'),
      'the secondary action',
    ).toBe(true);
    await expect(
      within(snackbar).getAllByRole('button').length,
      'Later and close',
    ).toBe(2);
    await expect(box(later).left, 'at the start').toBeCloseTo(
      box(message).left,
      1,
    );
    await expect(
      box(later).top - box(message).bottom,
      'actions gap',
    ).toBeCloseTo(TEXT_GAP + ACTIONS_PADDING, 1);
  },
};

// The primary action calls onAction, the secondary one onSecondary, the
// close button onClose; each only its own.
export const CallsBack: Story = {
  args: InfoTone.args,
  play: async ({ args, canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, INFO_TITLE);
    release(canvasElement);

    await userEvent.click(theButton(snackbar, INFO_ACTION));
    await expect(args.onAction).toHaveBeenCalledTimes(1);
    await expect(args.onSecondary).not.toHaveBeenCalled();
    await expect(args.onClose).not.toHaveBeenCalled();

    await userEvent.click(theButton(snackbar, LATER));
    await expect(args.onSecondary).toHaveBeenCalledTimes(1);
    await expect(args.onAction).toHaveBeenCalledTimes(1);
    await expect(args.onClose).not.toHaveBeenCalled();

    await userEvent.click(theButton(snackbar, CLOSE));
    await expect(args.onClose).toHaveBeenCalledTimes(1);
    await expect(args.onAction).toHaveBeenCalledTimes(1);
    await expect(args.onSecondary).toHaveBeenCalledTimes(1);
  },
};

// A frame too narrow for both actions on one line: the secondary action wraps
// below the primary one, --space-2 under it, at the start of the row.
export const NarrowActions: Story = {
  args: InfoTone.args,
  render: (args) => (
    <>
      <Frame $width={NARROW_WIDTH} data-testid="frame">
        <Snackbar {...args} />
      </Frame>
      <References args={args} />
    </>
  ),
  play: async ({ canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, INFO_TITLE);
    const primary = box(theButton(snackbar, INFO_ACTION));
    const later = box(theButton(snackbar, LATER));
    const message = box(within(snackbar).getByText(INFO_MESSAGE));
    await expect(primary.right <= message.right, 'the action fits').toBe(true);
    await expect(later.left, 'wrapped to the start').toBeCloseTo(
      primary.left,
      1,
    );
    await expect(later.top - primary.bottom, 'row gap').toBeCloseTo(
      ACTIONS_GAP,
      1,
    );
  },
};

// A short Snackbar in a frame that lays its children out in a row still spans
// the whole frame, rather than shrinking to its content.
export const FillsARowFrame: Story = {
  args: {
    title: BACKUP_TITLE,
    message: undefined,
    actionLabel: undefined,
    onAction: undefined,
    onClose: undefined,
  },
  render: (args) => (
    <>
      <RowFrame $width={FRAME_WIDTH} data-testid="frame">
        <Snackbar {...args} />
      </RowFrame>
      <References args={args} />
    </>
  ),
  play: async ({ canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, BACKUP_TITLE);
    await expectWidth(canvasElement, snackbar);
  },
};

// A title with a file name longer than the room in a narrow frame: the text
// keeps to its room, so the close button stays in its corner and the
// Snackbar in its frame.
export const LongFileName: Story = {
  args: {
    ...ErrorTone.args,
    title: LONG_FILE_TITLE,
  },
  render: (args) => (
    <>
      <Frame $width={NARROW_WIDTH} data-testid="frame">
        <Snackbar {...args} />
      </Frame>
      <References args={args} />
    </>
  ),
  play: async ({ canvasElement }) => {
    const snackbar = theSnackbar(canvasElement, LONG_FILE_TITLE);
    await expectWidth(canvasElement, snackbar);
    await expectClose(canvasElement, snackbar);
  },
};
