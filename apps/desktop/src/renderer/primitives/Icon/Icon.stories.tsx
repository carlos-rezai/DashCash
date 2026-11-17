import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Icon, type IconName } from './Icon.tsx';

// The 41 keys of docs/design/prototype/lib/icons.js, in its order.
const ICON_NAMES = [
  'dashboard',
  'wallet',
  'upload',
  'columns',
  'tags',
  'plus',
  'pencil',
  'trash',
  'chevronDown',
  'chevronRight',
  'chevronLeft',
  'check',
  'x',
  'arrowLeft',
  'arrowRight',
  'arrowUp',
  'arrowDown',
  'file',
  'alert',
  'repeat',
  'transfer',
  'inbox',
  'search',
  'merge',
  'flag',
  'info',
  'link',
  'layers',
  'target',
  'loaderCircle',
  'settings',
  'download',
  'undo',
  'refresh',
  'database',
  'circleX',
  'circleCheck',
  'bell',
  'panelClose',
  'folder',
  'calendar',
] as const satisfies readonly IconName[];

// IconName holds no name beyond the 41 above: typecheck fails otherwise.
type UnlistedIconName = Exclude<IconName, (typeof ICON_NAMES)[number]>;
const NO_UNLISTED_ICON_NAME: [UnlistedIconName] extends [never] ? true : false =
  true;

const meta = {
  title: 'Primitives/Icon',
  component: Icon,
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllIcons: Story = {
  args: { glyph: 'dashboard' },
  render: () => (
    <ul aria-label="Icons">
      {ICON_NAMES.map((name) => (
        <li key={name}>
          <Icon glyph={name} />
          <span>{name}</span>
        </li>
      ))}
    </ul>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const items = within(
      canvas.getByRole('list', { name: 'Icons' }),
    ).getAllByRole('listitem');

    await expect(NO_UNLISTED_ICON_NAME).toBe(true);
    await expect(items).toHaveLength(41);
    await expect(items.map((item) => item.textContent)).toEqual([
      ...ICON_NAMES,
    ]);

    const glyphs = items.map((item) => {
      const svgs = item.querySelectorAll('svg');
      return svgs.length === 1 ? svgs.item(0) : null;
    });
    for (const [index, svg] of glyphs.entries()) {
      const name = ICON_NAMES[index];
      await expect(svg, name).not.toBeNull();
      await expect(svg?.getAttribute('aria-hidden'), name).toBe('true');
      await expect(svg?.getAttribute('width'), name).toBe('16');
      await expect(svg?.getAttribute('height'), name).toBe('16');
      await expect(svg?.getAttribute('stroke-width'), name).toBe('1.5');
      await expect(svg?.getAttribute('stroke'), name).toBe('currentColor');
    }

    // Each name draws a glyph of its own.
    await expect(new Set(glyphs.map((svg) => svg?.innerHTML)).size).toBe(41);
  },
};
