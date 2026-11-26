import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, within } from 'storybook/test';
import { theme, type Theme } from './theme.ts';

// The token sheet as living documentation (design log Q26): the Tokens
// section of docs/design/prototype/Component Inventory.dc.html, verbatim.
// Every value it shows is read from the Theme by its path, so a Token missing
// from the Theme renders an empty swatch, a line at the wrong size or a bar
// without a width, and the play function fails on it.

// Every dotted path to a single value of the Theme: 'color.bg',
// 'color.accent.600', 'space.space2'.
type TokenPath<T> = {
  [K in keyof T & (string | number)]: T[K] extends string | number
    ? `${K}`
    : `${K}.${TokenPath<T[K]>}`;
}[keyof T & (string | number)];

function readToken(path: TokenPath<Theme>): string | undefined {
  let value: unknown = theme;
  for (const key of path.split('.')) {
    value =
      typeof value === 'object' && value !== null && key in value
        ? (value as Record<string, unknown>)[key]
        : undefined;
  }
  return typeof value === 'string' ? value : undefined;
}

// Component Inventory.dc.html, colors: each tile's variable, its role, and
// the Theme path of its value.
const COLOUR_TILES: readonly {
  name: string;
  role: string;
  path: TokenPath<Theme>;
}[] = [
  { name: '--color-bg', role: 'Ground', path: 'color.bg' },
  { name: '--sb-ground-sunken', role: 'Sidebar, wells', path: 'color.sunken' },
  { name: '--color-surface', role: 'Surface', path: 'color.surface' },
  { name: '--color-text', role: 'Ink / paper', path: 'color.text' },
  {
    name: '--color-accent',
    role: 'Accent (primary, fills)',
    path: 'color.accent.500',
  },
  {
    name: '--color-accent-600',
    role: 'Accent text, hover',
    path: 'color.accent.600',
  },
  {
    name: '--color-accent-100',
    role: 'Selected tint',
    path: 'color.accent.100',
  },
  {
    name: '--color-accent-200',
    role: 'Highlight cell',
    path: 'color.accent.200',
  },
  { name: '--sb-warning', role: 'Headroom warning', path: 'color.warning' },
  { name: '--sb-danger', role: 'Headroom ≤ 0, delete', path: 'color.danger' },
  {
    name: '--sb-acc-income',
    role: 'Account · Income',
    path: 'color.account.income',
  },
  {
    name: '--sb-acc-spending',
    role: 'Account · Spending',
    path: 'color.account.spending',
  },
  {
    name: '--sb-acc-savings',
    role: 'Account · Savings',
    path: 'color.account.savings',
  },
  {
    name: '--sb-acc-card',
    role: 'Account · Credit card',
    path: 'color.account.card',
  },
  {
    name: '--sb-acc-mortgage',
    role: 'Account · Mortgage',
    path: 'color.account.mortgage',
  },
];

// Component Inventory.dc.html, the type panel: each line's text and the size
// it is set in, with the Theme path of that size (SPEC section 2's scale).
type TypeLook = 'label' | 'heading' | 'body' | 'caption' | 'kicker';

const TYPE_LINES: readonly {
  text: string;
  size: string;
  path: TokenPath<Theme>;
  look: TypeLook;
  tight?: boolean;
}[] = [
  {
    text: 'Type · Barlow Condensed / Barlow',
    size: '11px',
    path: 'fontSize.kicker',
    look: 'label',
  },
  {
    text: 'Display 42',
    size: '42px',
    path: 'fontSize.display',
    look: 'heading',
    tight: true,
  },
  {
    text: 'Page title 34',
    size: '34px',
    path: 'fontSize.xl',
    look: 'heading',
    tight: true,
  },
  {
    text: 'Section 22 · Amount lg',
    size: '22px',
    path: 'fontSize.lg',
    look: 'heading',
  },
  {
    text: 'Card title 19',
    size: '19px',
    path: 'fontSize.cardTitle',
    look: 'heading',
  },
  {
    text: 'Body 15, Barlow regular',
    size: '15px',
    path: 'fontSize.body',
    look: 'body',
  },
  {
    text: 'UI 14, tables, inputs, buttons',
    size: '14px',
    path: 'fontSize.md',
    look: 'body',
  },
  {
    text: 'Caption 12, hints, meta',
    size: '12px',
    path: 'fontSize.caption',
    look: 'caption',
  },
  {
    text: 'Kicker 11 · uppercase',
    size: '11px',
    path: 'fontSize.kicker',
    look: 'kicker',
  },
];

// Component Inventory.dc.html, spaces: each step's variable, its px as the
// inventory writes it, and the Theme path of its value.
const SPACING_BARS: readonly {
  name: string;
  px: string;
  path: TokenPath<Theme>;
}[] = [
  { name: '--space-1', px: '3.4px', path: 'space.space1' },
  { name: '--space-2', px: '6.8px', path: 'space.space2' },
  { name: '--space-3', px: '10.2px', path: 'space.space3' },
  { name: '--space-4', px: '13.6px', path: 'space.space4' },
  { name: '--space-6', px: '20.4px', path: 'space.space6' },
  { name: '--space-8', px: '27.2px', path: 'space.space8' },
];

// Component Inventory.dc.html: the layout of the Tokens section itself, not
// Tokens of the sheet.
const SECTION_GAP = 20;
const TILE_MIN_WIDTH = 150;
const TILE_GRID_GAP = 12;
const TILE_GAP = 6;
const SWATCH_HEIGHT = 44;
const PANEL_MIN_WIDTH = 320;
const PANEL_GRID_GAP = 24;
const PANEL_PADDING = 20;
const PANEL_GAP = 10;
const BAR_ROW_GAP = 12;
const BAR_NAME_WIDTH = 80;
const BAR_HEIGHT = 10;
const NOTE_PADDING_TOP = 8;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${String(SECTION_GAP)}px;
`;

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(${String(TILE_MIN_WIDTH)}px, 1fr)
  );
  gap: ${String(TILE_GRID_GAP)}px;
`;

const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${String(TILE_GAP)}px;
`;

const Swatch = styled.div<{ $fill: string | undefined }>`
  height: ${String(SWATCH_HEIGHT)}px;
  background: ${({ $fill }) => $fill ?? ''};
  border: 1px solid ${({ theme: t }) => t.color.divider};
`;

const TileName = styled.span`
  font-size: ${({ theme: t }) => t.fontSize.caption};
`;

const TileRole = styled.span<{ $size: string | undefined }>`
  font-size: ${({ $size }) => $size ?? ''};
  color: ${({ theme: t }) => t.color.textFaint};
`;

const Panels = styled.div`
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(${String(PANEL_MIN_WIDTH)}px, 1fr)
  );
  gap: ${String(PANEL_GRID_GAP)}px;
`;

const Panel = styled.div`
  padding: ${String(PANEL_PADDING)}px;
  display: flex;
  flex-direction: column;
  gap: ${String(PANEL_GAP)}px;
  border: 1px solid ${({ theme: t }) => t.color.divider};
`;

const TypeLine = styled.span<{
  $size: string | undefined;
  $look: TypeLook;
  $tight: boolean;
}>`
  font-size: ${({ $size }) => $size ?? ''};
  ${({ $look, theme: t }) =>
    $look === 'heading'
      ? `font-family: ${t.font.heading}; font-weight: ${String(t.font.headingWeight)};`
      : ''}
  ${({ $tight }) => ($tight ? 'line-height: 1;' : '')}
  ${({ $look, theme: t }) =>
    $look === 'label' || $look === 'kicker'
      ? `letter-spacing: ${t.font.kickerLetterSpacing}; text-transform: uppercase;`
      : ''}
  ${({ $look, theme: t }) =>
    $look === 'label' || $look === 'caption'
      ? `color: ${t.color.textMuted};`
      : ''}
  ${({ $look, theme: t }) =>
    $look === 'kicker' ? `color: ${t.color.accent[600]};` : ''}
`;

const BarRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${String(BAR_ROW_GAP)}px;
  font-size: ${({ theme: t }) => t.fontSize.caption};
`;

const BarName = styled.span`
  width: ${String(BAR_NAME_WIDTH)}px;
  color: ${({ theme: t }) => t.color.textMuted};
`;

const Bar = styled.span<{ $width: string | undefined }>`
  height: ${String(BAR_HEIGHT)}px;
  width: ${({ $width }) => $width ?? ''};
  background: ${({ theme: t }) => t.color.accent[500]};
`;

const Faint = styled.span`
  color: ${({ theme: t }) => t.color.textFaint};
`;

const Note = styled.span`
  font-size: ${({ theme: t }) => t.fontSize.caption};
  color: ${({ theme: t }) => t.color.textFaint};
  padding-top: ${String(NOTE_PADDING_TOP)}px;
`;

function TokenSheet() {
  return (
    <Section>
      <Tiles>
        {COLOUR_TILES.map((tile) => (
          <Tile key={tile.name} data-testid="colour-tile">
            <Swatch data-testid="swatch" $fill={readToken(tile.path)} />
            <TileName>{tile.name}</TileName>
            <TileRole $size={readToken('fontSize.kicker')}>
              {tile.role}
            </TileRole>
          </Tile>
        ))}
      </Tiles>
      <Panels>
        <Panel data-testid="type-scale">
          {TYPE_LINES.map((line) => (
            <TypeLine
              key={line.text}
              $size={readToken(line.path)}
              $look={line.look}
              $tight={line.tight ?? false}
            >
              {line.text}
            </TypeLine>
          ))}
        </Panel>
        <Panel>
          <TypeLine
            $size={readToken('fontSize.kicker')}
            $look="label"
            $tight={false}
          >
            Spacing · 0.85× density
          </TypeLine>
          {SPACING_BARS.map((bar) => (
            <BarRow key={bar.name} data-testid="spacing-bar">
              <BarName>{bar.name}</BarName>
              <Bar data-testid="bar" $width={readToken(bar.path)} />
              <Faint>{bar.px}</Faint>
            </BarRow>
          ))}
          <Note>
            Radius 0 on every framed element (Industry blueprint rule). Borders
            1px hairline var(--color-divider). No corner marks.
          </Note>
        </Panel>
      </Panels>
    </Section>
  );
}

const meta = {
  title: 'Tokens',
  render: () => <TokenSheet />,
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

export const Tokens: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Every colour tile of the inventory, in its order, with its name, its
    // role and a filled swatch.
    const tiles = canvas.getAllByTestId('colour-tile');
    await expect(tiles).toHaveLength(COLOUR_TILES.length);
    for (const [index, expected] of COLOUR_TILES.entries()) {
      const tile = within(tiles[index] ?? canvasElement);
      await expect(tile.getByText(expected.name)).toBeVisible();
      await expect(tile.getByText(expected.role)).toBeVisible();
      await expect(
        getComputedStyle(tile.getByTestId('swatch')).backgroundColor,
        `${expected.name} is filled`,
      ).not.toBe(TRANSPARENT);
    }

    // The nine lines of the type panel, each at its size.
    const typeScale = within(canvas.getByTestId('type-scale'));
    for (const expected of TYPE_LINES) {
      await expect(
        getComputedStyle(typeScale.getByText(expected.text)).fontSize,
        `${expected.text} is set in ${expected.size}`,
      ).toBe(expected.size);
    }

    // Every spacing bar, in its order, with its name, its px and a bar as wide
    // as the px.
    const bars = canvas.getAllByTestId('spacing-bar');
    await expect(bars).toHaveLength(SPACING_BARS.length);
    for (const [index, expected] of SPACING_BARS.entries()) {
      const row = within(bars[index] ?? canvasElement);
      await expect(row.getByText(expected.name)).toBeVisible();
      await expect(row.getByText(expected.px)).toBeVisible();
      await expect(
        row.getByTestId('bar').getBoundingClientRect().width,
        `${expected.name} is ${expected.px} wide`,
      ).toBeCloseTo(Number.parseFloat(expected.px), 1);
    }
  },
};
