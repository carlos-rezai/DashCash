import { Fragment, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import styled from 'styled-components';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { toCents } from '@dashcash/domain/money/cents/cents';
import { Amount } from '../../primitives/Amount/Amount.tsx';
import { Icon, type IconName } from '../../primitives/Icon/Icon.tsx';
import { Swatch } from '../../primitives/Swatch/Swatch.tsx';
import { Tag, type TagTone } from '../../primitives/Tag/Tag.tsx';
import { readComputedColour } from '../../test-support/readComputedColour/readComputedColour.ts';
import { readFirstFamily } from '../../test-support/readFirstFamily/readFirstFamily.ts';
import { readHoveredStyle } from '../../test-support/readHoveredStyle/readHoveredStyle.ts';
import * as components from '../index.ts';
import { YearTable } from './YearTable.tsx';

// The colours a reader sees, written out from Industry's styles.css,
// dashcash-dark.css and YearTable.dc.html, apart from the Theme. The mixes
// stay color-mix() strings, so each colour is compared through what Chromium
// computes for it.
// --sb-text-muted: the chevron, a text cell and a future month's label
const TEXT_MUTED = 'color-mix(in srgb, #e9f1fa 62%, transparent)';
// --color-text: a month's label
const TEXT = '#e9f1fa';
// styles.css, .table th: the text colour at 60 %
const HEAD_INK = 'color-mix(in srgb, #e9f1fa 60%, transparent)';
// --color-divider: the line under the column headers
const DIVIDER = 'color-mix(in srgb, #e9f1fa 16%, transparent)';
// styles.css, .table td: the line under each cell, the text colour at 8 %
const ROW_LINE = 'color-mix(in srgb, #e9f1fa 8%, transparent)';
// --sb-hover: a year row's fill under the pointer
const HOVER = 'color-mix(in srgb, #e9f1fa 6%, transparent)';
// --sb-ground-sunken: a month row's ground
const SUNKEN = '#16222f';
// --color-accent-100: today's month
const ACCENT_100 = '#22384d';
// --sb-milestone-row: the payoff month, the milestone green at 12 % over the
// sunken ground (design log Q7)
const MILESTONE_ROW = 'color-mix(in srgb, #7cc59a 12%, #16222f)';
const TRANSPARENT = 'transparent';

// Invented cell colours, as a caller passes them.
const MET = '#7cc59a';
const MISSED = 'color-mix(in srgb, #e9f1fa 60%, transparent)';
const IN_PROGRESS = '#94bce3';

// Invented account colours from SPEC section 2's data palette.
const INCOME = '#cdbb8b';
const SPENDING = '#d69c8e';
const SAVINGS = '#94bce3';
const CARD = '#b3a3d1';
const MORTGAGE = '#e9f1fa';

// styles.css, .table: 14 px, collapsed borders, the full width; th and td
// padded --space-2; th at 11 px, 0.08em, upper case, never wrapping
// (dashcash-dark.css), at the bottom of their cell. YearTable.dc.html: the
// wrapper 4 px past the card on either side and padded back by 4 px; a year
// row's parts centred, 10 px apart, the chevron 16 px, turned by 90 degrees
// over 160 ms with ease, the year in the heading font at 19 px, weight 600; a
// month row 40 px in, its parts 8 px apart; a header's colour dot a 9 px
// circle, 6 px before the label; a cell's icon 14 px; a text cell 13 px.
const TABLE_SIZE = '14px';
const CELL_PADDING = 6.8;
const HEAD_SIZE = '11px';
const HEAD_SPACING = '0.88px';
const BLEED = 4;
const YEAR_GAP = 10;
const MONTH_GAP = 8;
const MONTH_INSET = 40;
const CHEVRON_SIZE = 16;
const TURN = '0.16s';
const HEADING_FONT = 'Barlow Condensed';
const YEAR_SIZE = '19px';
const YEAR_WEIGHT = '600';
const DOT_SIZE = 9;
const DOT_GAP = 6;
const CELL_ICON_SIZE = 14;
const TEXT_CELL_SIZE = '13px';

// SPEC section 3, equalColumns: the first column 230 px wide, the table at
// least 230 px plus 130 px per data column, the data columns sharing the rest
// equally; the default first label.
const FIRST_WIDTH = 230;
const MIN_COLUMN = 130;
const FIRST_LABEL = 'Year · month';
// An invented first column width, as a caller passes one.
const OTHER_FIRST_WIDTH = 260;

// SPEC, Auto-scroll on expand: the margin kept below an opened block.
const REVEAL_MARGIN = 24;

// YearTable.dc.html's preview width; a card wide enough for six equal
// columns; one too narrow for them; a wider one for the auto layout.
const FRAME_WIDTH = 900;
const WIDE_FRAME = 1200;
const NARROW_FRAME = 600;
const WIDER_FRAME = 1300;

// An invented scroll area that holds the closed years but not an opened one,
// with room below them.
const AREA_HEIGHT = 360;
const AREA_ROOM_BELOW = 48;

// SPEC section 3: the YearTable's props, and no others; columns and years
// alone are required. Typecheck fails when a prop is missing, one is added,
// or one changes between required and optional.
type YearTableProps = ComponentProps<typeof YearTable>;
type Column = YearTableProps['columns'][number];
type Year = YearTableProps['years'][number];
type Row = Year['rows'][number];
type Cell = Year['cells'][number];
type CellOf<Kind> = Extract<Cell, { type: Kind }>;
type AmountProps = ComponentProps<typeof Amount>;
type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type RequiredKey<T> = {
  [Key in keyof T]-?: object extends Pick<T, Key> ? never : Key;
}[keyof T];

const EXACTLY_THE_LISTED_PROPS: Equal<
  keyof YearTableProps,
  | 'equalColumns'
  | 'firstWidth'
  | 'columns'
  | 'years'
  | 'defaultOpen'
  | 'firstLabel'
  | 'onToggle'
> = true;
const ONLY_COLUMNS_AND_YEARS_REQUIRED: Equal<
  RequiredKey<YearTableProps>,
  'columns' | 'years'
> = true;
// A column, a year and a month row hold exactly SPEC section 3's fields.
const FIELDS: [
  Equal<keyof Column, 'label' | 'color' | 'align' | 'width'>,
  Equal<RequiredKey<Column>, 'label'>,
  Equal<
    keyof Year,
    'key' | 'label' | 'tag' | 'tagTone' | 'tagIcon' | 'cells' | 'rows'
  >,
  Equal<RequiredKey<Year>, 'key' | 'label' | 'cells' | 'rows'>,
  Equal<
    keyof Row,
    'label' | 'tag' | 'tagTone' | 'tagIcon' | 'muted' | 'highlight' | 'cells'
  >,
  Equal<RequiredKey<Row>, 'label' | 'cells'>,
] = [true, true, true, true, true, true];
// YearTable.dc.html's types: a year's key a string or a number, which
// defaultOpen lists and onToggle reports with the new state; a column aligned
// left or right; a month highlighted as today or the payoff; tags of a Tag's
// tones and icons; the texts and sizes strings; equalColumns a boolean.
const VALUE_TYPES: [
  Equal<Year['key'], string | number>,
  Equal<NonNullable<YearTableProps['defaultOpen']>[number], Year['key']>,
  Equal<
    NonNullable<YearTableProps['onToggle']>,
    (key: Year['key'], open: boolean) => void
  >,
  Equal<NonNullable<Column['align']>, 'left' | 'right'>,
  Equal<NonNullable<Row['highlight']>, 'today' | 'payoff'>,
  Equal<NonNullable<Year['tagTone']>, TagTone>,
  Equal<NonNullable<Row['tagTone']>, TagTone>,
  Equal<NonNullable<Year['tagIcon']>, IconName>,
  Equal<NonNullable<Row['tagIcon']>, IconName>,
  Equal<NonNullable<YearTableProps['equalColumns']>, boolean>,
  Equal<
    [
      NonNullable<YearTableProps['firstWidth']>,
      NonNullable<YearTableProps['firstLabel']>,
      Column['label'],
      NonNullable<Column['color']>,
      NonNullable<Column['width']>,
      Year['label'],
      Row['label'],
    ],
    [string, string, string, string, string, string, string]
  >,
] = [true, true, true, true, true, true, true, true, true, true, true];
// SPEC section 3: a cell is an amount, an icon, a text or nothing, each with
// exactly its fields; an amount's tone, sign and size are the Amount's.
const CELL_TYPES: [
  Equal<Cell['type'], 'amount' | 'icon' | 'text' | 'empty'>,
  Equal<keyof CellOf<'amount'>, 'type' | 'cents' | 'tone' | 'sign' | 'size'>,
  Equal<RequiredKey<CellOf<'amount'>>, 'type' | 'cents'>,
  Equal<keyof CellOf<'icon'>, 'type' | 'glyph' | 'color' | 'title'>,
  Equal<RequiredKey<CellOf<'icon'>>, 'type' | 'glyph'>,
  Equal<keyof CellOf<'text'>, 'type' | 'text'>,
  Equal<RequiredKey<CellOf<'text'>>, 'type' | 'text'>,
  Equal<keyof CellOf<'empty'>, 'type'>,
  Equal<
    NonNullable<CellOf<'amount'>['tone']>,
    NonNullable<AmountProps['tone']>
  >,
  Equal<
    NonNullable<CellOf<'amount'>['sign']>,
    NonNullable<AmountProps['sign']>
  >,
  Equal<
    NonNullable<CellOf<'amount'>['size']>,
    NonNullable<AmountProps['size']>
  >,
  Equal<CellOf<'icon'>['glyph'], IconName>,
] = [true, true, true, true, true, true, true, true, true, true, true, true];

// Invented cells, as a caller builds them.
function amount(
  cents: number,
  options: Omit<CellOf<'amount'>, 'type' | 'cents'> = {},
): Cell {
  return { type: 'amount', cents: toCents(cents), ...options };
}

function text(value: string): Cell {
  return { type: 'text', text: value };
}

const EMPTY: Cell = { type: 'empty' };

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

// An invented savings account's history, as an account's year table shows it:
// month-end balance, change and goal; 150,00 € a month, missed in March 2026;
// October 2026 is today, the months after it projected.
const DETAIL_COLUMNS: Column[] = [
  { label: 'Month-end balance' },
  { label: 'Change' },
  { label: 'Goal', width: '110px' },
];
const GOAL_WIDTH = 110;
const MONTHLY = 15000;
const MISSED_CHANGE = -3000;
const START_BALANCE = 240000;
const TODAY_YEAR = 2026;
const TODAY_MONTH = 'Oct';
const MISSED_MONTH = 'Mar';
const FUTURE_MONTHS = ['Nov', 'Dec'] as const;

function detailYear(
  key: number,
  tag: string,
  tagTone: TagTone,
  startBalance: number,
  stage: (month: number) => 'past' | 'today' | 'future',
): Year {
  let balance = startBalance;
  let met = 0;
  const rows: Row[] = MONTH_LABELS.map((label, month) => {
    const kind = stage(month);
    const change =
      key === TODAY_YEAR && label === MISSED_MONTH ? MISSED_CHANGE : MONTHLY;
    balance += change;
    const future = kind === 'future';
    const tone = future ? 'muted' : 'auto';
    let goal: Cell = EMPTY;
    if (kind === 'today') {
      goal = {
        type: 'icon',
        glyph: 'loaderCircle',
        color: IN_PROGRESS,
        title: 'Goal in progress · grow by 150,00 €',
      };
    } else if (kind === 'past' && change >= MONTHLY) {
      met += 1;
      goal = { type: 'icon', glyph: 'check', color: MET, title: 'Goal met' };
    } else if (kind === 'past') {
      goal = { type: 'icon', glyph: 'x', color: MISSED, title: 'Goal missed' };
    }
    return {
      label,
      muted: future,
      ...(kind === 'today' ? { highlight: 'today' as const } : {}),
      cells: [
        amount(balance, { tone }),
        amount(change, { sign: 'always', size: 'sm', tone }),
        goal,
      ],
    };
  });
  return {
    key,
    label: String(key),
    tag,
    tagTone,
    cells: [
      amount(balance),
      amount(balance - startBalance, { sign: 'always', size: 'sm' }),
      met > 0 ? text(`${String(met)} of 12 met`) : EMPTY,
    ],
    rows,
  };
}

const TODAY_INDEX = MONTH_LABELS.indexOf(TODAY_MONTH);
const DETAIL_YEARS: Year[] = [
  detailYear(2025, 'Actual', 'neutral', START_BALANCE, () => 'past'),
  detailYear(
    TODAY_YEAR,
    'Actual · projected',
    'outline',
    START_BALANCE + 12 * MONTHLY,
    (month) =>
      month < TODAY_INDEX ? 'past' : month === TODAY_INDEX ? 'today' : 'future',
  ),
  detailYear(
    2027,
    'Projected',
    'outline',
    START_BALANCE + 24 * MONTHLY + MISSED_CHANGE - MONTHLY,
    () => 'future',
  ),
];

// An invented mortgage paid off in November 2031: the year tag and the month
// tag in the milestone tone with a flag, the debt red, zero after it.
const PAYOFF_YEAR = 2031;
const PAYOFF_MONTH = 'Nov';
const PAYOFF_YEAR_TAG = 'Payoff Nov';
const PAYOFF_TAG = 'Paid off';
const PAYOFF_COLUMNS: Column[] = [{ label: 'Restschuld' }, { label: 'Change' }];
const PAYOFF_YEARS: Year[] = [
  {
    key: 2030,
    label: '2030',
    tag: 'Projected',
    tagTone: 'outline',
    cells: [
      amount(1250000, { tone: 'negative' }),
      amount(-1146000, { sign: 'always', size: 'sm', tone: 'neutral' }),
    ],
    rows: [],
  },
  {
    key: PAYOFF_YEAR,
    label: String(PAYOFF_YEAR),
    tag: PAYOFF_YEAR_TAG,
    tagTone: 'milestone',
    tagIcon: 'flag',
    cells: [
      amount(0, { tone: 'neutral' }),
      amount(-1250000, { sign: 'always', size: 'sm', tone: 'neutral' }),
    ],
    rows: MONTH_LABELS.map((label, month): Row => {
      const left = Math.max(0, 1250000 - (month + 1) * 125000);
      const payoff = label === PAYOFF_MONTH;
      return {
        label,
        muted: true,
        ...(payoff
          ? {
              highlight: 'payoff' as const,
              tag: PAYOFF_TAG,
              tagTone: 'milestone' as const,
              tagIcon: 'flag' as const,
            }
          : {}),
        cells: [
          amount(left, { tone: left === 0 ? 'neutral' : 'negative' }),
          left === 0 && !payoff
            ? EMPTY
            : amount(-125000, { sign: 'always', size: 'sm', tone: 'neutral' }),
        ],
      };
    }),
  },
];

// Every cell kind in one year: an amount with the defaults and one with its
// own tone, sign and size; an icon with its colour and tooltip and one in the
// cell's colour; a text; nothing. The text column is aligned left.
const KIND_COLUMNS: Column[] = [
  { label: 'Amount' },
  { label: 'Icon' },
  { label: 'Text', align: 'left' },
  { label: 'Nothing' },
];
const ICON_TITLE = 'Goal met';
const KIND_TEXT = '3 of 4 met';
const KIND_YEARS: Year[] = [
  {
    key: 'kinds',
    label: '2026',
    cells: [
      amount(123456),
      { type: 'icon', glyph: 'check', color: MET, title: ICON_TITLE },
      text(KIND_TEXT),
      EMPTY,
    ],
    rows: [
      {
        label: 'Jan',
        cells: [
          amount(-8640, { tone: 'neutral', sign: 'none', size: 'sm' }),
          { type: 'icon', glyph: 'x' },
          text('Note'),
          EMPTY,
        ],
      },
    ],
  },
];

// Five invented accounts and their net, as the dashboard's balance table
// shows them: a colour dot per account, none for the net.
const ACCOUNT_COLUMNS: Column[] = [
  { label: 'Giro', color: INCOME },
  { label: 'Household', color: SPENDING },
  { label: 'Savings', color: SAVINGS },
  { label: 'Card', color: CARD },
  { label: 'Mortgage', color: MORTGAGE },
  { label: 'Net' },
];
const BALANCE_YEARS: Year[] = [2025, 2026, 2027].map((key, index): Year => ({
  key,
  label: String(key),
  tag: ['Actual', 'Actual · projected', 'Projected'][index],
  tagTone: index === 0 ? 'neutral' : 'outline',
  cells: ACCOUNT_COLUMNS.map((_, column) =>
    amount(100000 * (column + 1) + 5000 * index),
  ),
  rows: MONTH_LABELS.map((label, month) => ({
    label,
    cells: ACCOUNT_COLUMNS.map((_, column) =>
      amount(100000 * (column + 1) + 400 * month),
    ),
  })),
}));

// Five closed years of six months each, for the scroll area.
const SCROLL_YEARS: Year[] = [2026, 2027, 2028, 2029, 2030].map(
  (key): Year => ({
    key,
    label: String(key),
    tag: 'Projected',
    tagTone: 'outline',
    cells: [amount(1000000 + key), amount(180000, { sign: 'always' })],
    rows: MONTH_LABELS.slice(6).map((label, month) => ({
      label,
      cells: [
        amount(900000 + month * 15000),
        amount(15000, { sign: 'always' }),
      ],
    })),
  }),
);
const SCROLL_COLUMNS: Column[] = [{ label: 'Balance' }, { label: 'Change' }];

// The turn a computed transform describes, as the matrix Chromium gives for
// it; none is no turn.
function turnOf(transform: string): DOMMatrix {
  return new DOMMatrix(transform === 'none' ? undefined : transform);
}

// The card the table sits in. While its resting colours are read, it holds
// the YearTable out of the pointer's reach: Chromium on Linux can apply
// :hover without pointer movement.
const Frame = styled.div`
  &[data-resting] {
    pointer-events: none;
  }
`;

// An invented scroll area, as a page's main area is one, with room below
// its table as a page leaves below its content.
const Area = styled.div`
  width: ${String(FRAME_WIDTH)}px;
  height: ${String(AREA_HEIGHT)}px;
  padding-bottom: ${String(AREA_ROOM_BELOW)}px;
  box-sizing: border-box;
  overflow-y: auto;
`;

function referenceId(...parts: (string | number)[]): string {
  return `reference-${parts.map(String).join('-')}`;
}

// What a cell shows, rendered alone for the comparison: the Amount with the
// cell's tone, sign and size (bold on a year row), or the 14 px Icon.
function CellReference({
  id,
  cell,
  strong,
}: {
  id: string;
  cell: Cell;
  strong: boolean;
}) {
  if (cell.type === 'amount') {
    return (
      <span data-testid={id}>
        <Amount
          cents={cell.cents}
          tone={cell.tone ?? 'auto'}
          sign={cell.sign ?? 'auto'}
          size={cell.size ?? 'md'}
          strong={strong}
        />
      </span>
    );
  }
  if (cell.type === 'icon') {
    return (
      <span data-testid={id}>
        <Icon glyph={cell.glyph} size={CELL_ICON_SIZE} />
      </span>
    );
  }
  return null;
}

// The chevron, the colour dots, the tags and the cells the YearTable is built
// from, rendered alone for the comparison; never shown. A year's tag is
// neutral and a month's outlined when no tone is given (YearTable.dc.html).
function References({
  columns,
  years,
}: {
  columns: readonly Column[];
  years: readonly Year[];
}) {
  return (
    <div hidden>
      <span data-testid="reference-chevron">
        <Icon glyph="chevronRight" size={CHEVRON_SIZE} />
      </span>
      {columns.map((column, index) =>
        column.color === undefined ? null : (
          <span key={column.label} data-testid={referenceId('dot', index)}>
            <Swatch color={column.color} shape="circle" size={DOT_SIZE} />
          </span>
        ),
      )}
      {years.map((year) => (
        <Fragment key={year.key}>
          {year.tag === undefined ? null : (
            <span data-testid={referenceId(year.key, 'tag')}>
              <Tag
                label={year.tag}
                tone={year.tagTone ?? 'neutral'}
                icon={year.tagIcon}
              />
            </span>
          )}
          {year.cells.map((cell, index) => (
            <CellReference
              key={index}
              id={referenceId(year.key, 'cell', index)}
              cell={cell}
              strong
            />
          ))}
          {year.rows.map((row, rowIndex) => (
            <Fragment key={row.label}>
              {row.tag === undefined ? null : (
                <span data-testid={referenceId(year.key, rowIndex, 'tag')}>
                  <Tag
                    label={row.tag}
                    tone={row.tagTone ?? 'outline'}
                    icon={row.tagIcon}
                  />
                </span>
              )}
              {row.cells.map((cell, index) => (
                <CellReference
                  key={index}
                  id={referenceId(year.key, rowIndex, 'cell', index)}
                  cell={cell}
                  strong={false}
                />
              ))}
            </Fragment>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function renderIn(width: number, resting: boolean) {
  return function render(args: YearTableProps) {
    return (
      <>
        <Frame
          data-testid="frame"
          {...(resting ? { 'data-resting': '' } : {})}
          style={{ width: `${String(width)}px` }}
        >
          <YearTable {...args} />
        </Frame>
        <References columns={args.columns} years={args.years} />
      </>
    );
  };
}

function theFrame(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByTestId('frame');
}

function theTable(element: HTMLElement): HTMLTableElement {
  const table = within(element).getByRole('table');
  if (!(table instanceof HTMLTableElement)) {
    throw new Error('no table');
  }
  return table;
}

function theReference(canvasElement: HTMLElement, id: string): string {
  const part = within(canvasElement).getByTestId(id).firstElementChild;
  if (part === null) {
    throw new Error(`no reference ${id}`);
  }
  return part.outerHTML;
}

function hasReference(canvasElement: HTMLElement, id: string): boolean {
  return within(canvasElement).queryByTestId(id) !== null;
}

// The row that holds the year's label.
function yearRow(table: HTMLElement, label: string): HTMLTableRowElement {
  const row = within(table).getByText(label).closest('tr');
  if (row === null) {
    throw new Error(`no row for ${label}`);
  }
  return row;
}

// The month rows a year row opens: the other rows of its body.
function monthRows(year: HTMLTableRowElement): HTMLTableRowElement[] {
  const body = year.parentElement;
  if (!(body instanceof HTMLTableSectionElement)) {
    throw new Error('the year row is not in a table body');
  }
  return [...body.rows].filter((row) => row !== year);
}

function monthRow(
  year: HTMLTableRowElement,
  label: string,
): HTMLTableRowElement {
  const row = monthRows(year).find(
    (candidate) => within(cell(candidate, 0)).queryByText(label) !== null,
  );
  if (row === undefined) {
    throw new Error(`no month row ${label}`);
  }
  return row;
}

// The button in a year row's first cell that opens and closes the year
// (design log D12).
function yearButton(year: HTMLTableRowElement): HTMLButtonElement {
  const button = within(cell(year, 0)).getByRole('button');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('no year button');
  }
  return button;
}

function cell(row: HTMLTableRowElement, index: number): HTMLTableCellElement {
  const found = row.cells.item(index);
  if (found === null) {
    throw new Error(`no cell ${String(index)}`);
  }
  return found;
}

function headers(table: HTMLElement): HTMLElement[] {
  return within(table).getAllByRole('columnheader');
}

function box(element: Element): DOMRect {
  return element.getBoundingClientRect();
}

function middle(rect: DOMRect): number {
  return rect.top + rect.height / 2;
}

// The element inside the given one whose markup is the reference's.
function partMatching(
  element: Element,
  reference: string,
): Element | undefined {
  return [...element.querySelectorAll('*')].find(
    (part) => part.outerHTML === reference,
  );
}

// The chevron: the first svg in the year row's first cell, and the element
// that turns it.
function theChevron(year: HTMLTableRowElement): {
  svg: SVGSVGElement;
  turner: HTMLElement;
} {
  const svg = cell(year, 0).querySelector('svg');
  const turner = svg?.parentElement ?? null;
  if (svg === null || turner === null) {
    throw new Error('no chevron');
  }
  return { svg, turner };
}

// The table, its wrapper and its column headers: the wrapper scrolls sideways
// and reaches 4 px past the card on either side, padded back by 4 px; the
// table 14 px with collapsed borders across the card; every header 11 px,
// 0.08em, upper case, in the header ink, padded --space-2, never wrapping, at
// the bottom of its cell, with the divider line under it; the first header
// the first label, aligned left; each other its column's label in a centred
// inline flex row, aligned as the column is (right when not given), with a
// 9 px circle of the column's colour 6 px before the label, or none.
async function expectHeaders(
  canvasElement: HTMLElement,
  columns: readonly Column[],
  firstLabel: string,
): Promise<void> {
  const frame = theFrame(canvasElement);
  const table = theTable(frame);
  const tableStyle = getComputedStyle(table);
  await expect(tableStyle.fontSize, 'table size').toBe(TABLE_SIZE);
  await expect(tableStyle.borderCollapse, 'collapsed').toBe('collapse');

  const wrapper = table.parentElement;
  if (wrapper === null) {
    throw new Error('no wrapper');
  }
  const wrapperStyle = getComputedStyle(wrapper);
  await expect(wrapperStyle.overflowX, 'scrolls sideways').toBe('auto');
  await expect(wrapperStyle.minWidth, 'wrapper min width').toBe('0px');
  await expect(box(frame).left - box(wrapper).left, 'bleed left').toBeCloseTo(
    BLEED,
    1,
  );
  await expect(
    box(wrapper).right - box(frame).right,
    'bleed right',
  ).toBeCloseTo(BLEED, 1);
  await expect(box(table).left, 'table left').toBeCloseTo(box(frame).left, 1);

  const all = headers(table);
  await expect(all.length, 'headers').toBe(columns.length + 1);
  for (const [index, header] of all.entries()) {
    const style = getComputedStyle(header);
    await expect(style.fontSize, `header ${String(index)} size`).toBe(
      HEAD_SIZE,
    );
    await expect(style.letterSpacing, 'header spacing').toBe(HEAD_SPACING);
    await expect(style.textTransform, 'header case').toBe('uppercase');
    await expect(style.color, 'header ink').toBe(readComputedColour(HEAD_INK));
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      await expect(style[`padding${side}`], `header ${side} padding`).toBe(
        `${String(CELL_PADDING)}px`,
      );
    }
    await expect(style.borderBottomWidth, 'header line').toBe('1px');
    await expect(style.borderBottomStyle, 'header line style').toBe('solid');
    await expect(style.borderBottomColor, 'header line colour').toBe(
      readComputedColour(DIVIDER),
    );
    await expect(style.whiteSpace, 'header never wraps').toBe('nowrap');
    await expect(style.verticalAlign, 'header at the bottom').toBe('bottom');
  }

  const [first, ...rest] = all;
  if (first === undefined) {
    throw new Error('no first header');
  }
  await expect(first.textContent, 'first label').toBe(firstLabel);
  await expect(getComputedStyle(first).textAlign, 'first align').toBe('left');

  for (const [index, column] of columns.entries()) {
    const header = rest[index];
    const label = header?.firstElementChild;
    if (header === undefined || !(label instanceof HTMLElement)) {
      throw new Error(`no header for ${column.label}`);
    }
    const align = column.align ?? 'right';
    await expect(header.textContent, 'column label').toBe(column.label);
    await expect(getComputedStyle(header).textAlign, 'column align').toBe(
      align,
    );
    const labelStyle = getComputedStyle(label);
    await expect(labelStyle.display, 'label row').toBe('inline-flex');
    await expect(labelStyle.alignItems, 'label centred').toBe('center');
    await expect(labelStyle.justifyContent, 'label justified').toBe(
      align === 'right' ? 'flex-end' : 'flex-start',
    );
    await expect(labelStyle.columnGap, 'dot gap').toBe(`${String(DOT_GAP)}px`);
    const dotId = referenceId('dot', index);
    const dot = hasReference(canvasElement, dotId)
      ? partMatching(header, theReference(canvasElement, dotId))
      : undefined;
    if (column.color === undefined) {
      await expect(
        header.querySelector('[aria-hidden="true"]'),
        `no dot for ${column.label}`,
      ).toBeNull();
    } else {
      await expect(dot, `the dot of ${column.label}`).toBeDefined();
      await expect(label.firstElementChild === dot, 'dot first').toBe(true);
    }
  }
}

// A year row at rest: a plain table row, neither a button nor focusable
// itself, with the pointer cursor and no fill. Its first cell holds a real
// button, open or closed to assistive technology and holding the year, that
// looks like no button: no fill, no border, no padding, the cell's colour,
// font family and size, the pointer cursor (design log D12). In the button
// the chevron (the 16 px chevronRight in the muted colour, in a flex holder
// turned by 90 degrees when open and not at all when closed, over 160 ms
// with ease), then the year in the heading font at 19 px, weight 600, then
// its Tag, each 10 px apart, centred on each other, in a row that never
// wraps.
async function expectYearRow(
  canvasElement: HTMLElement,
  year: Year,
  open: boolean,
): Promise<void> {
  const frame = theFrame(canvasElement);
  await expect(frame.hasAttribute('data-resting'), 'resting').toBe(true);
  const row = yearRow(theTable(frame), year.label);
  await expect(row.matches(':hover'), 'hovered').toBe(false);
  await expect(row, 'a plain row').not.toHaveAttribute('role');
  await expect(row, 'the row not focusable').not.toHaveAttribute('tabindex');
  await expect(row, 'expanded on the button').not.toHaveAttribute(
    'aria-expanded',
  );
  const rowStyle = getComputedStyle(row);
  await expect(rowStyle.cursor, 'cursor').toBe('pointer');
  await expect(rowStyle.backgroundColor, 'no fill').toBe(
    readComputedColour(TRANSPARENT),
  );

  const first = cell(row, 0);
  const button = yearButton(row);
  await expect(button, `${year.label} expanded`).toHaveAttribute(
    'aria-expanded',
    String(open),
  );
  await expect(button, 'the button holds the year').toHaveTextContent(
    year.label,
  );
  const firstStyle = getComputedStyle(first);
  const buttonStyle = getComputedStyle(button);
  await expect(buttonStyle.backgroundColor, 'button no fill').toBe(
    readComputedColour(TRANSPARENT),
  );
  for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
    await expect(
      buttonStyle[`border${side}Width`],
      `button ${side} border`,
    ).toBe('0px');
    await expect(buttonStyle[`padding${side}`], `button ${side} padding`).toBe(
      '0px',
    );
  }
  await expect(buttonStyle.color, 'button colour').toBe(firstStyle.color);
  await expect(buttonStyle.fontFamily, 'button font').toBe(
    firstStyle.fontFamily,
  );
  await expect(buttonStyle.fontSize, 'button size').toBe(firstStyle.fontSize);
  await expect(buttonStyle.cursor, 'button cursor').toBe('pointer');

  const holder = first.firstElementChild;
  if (!(holder instanceof HTMLElement)) {
    throw new Error('no holder in the first cell');
  }
  await expect(holder === button, 'the button holds the year parts').toBe(true);
  const holderStyle = getComputedStyle(holder);
  await expect(holderStyle.display, 'year parts in a row').toBe('flex');
  await expect(holderStyle.alignItems, 'year parts centred').toBe('center');
  await expect(holderStyle.whiteSpace, 'year parts never wrap').toBe('nowrap');

  const { svg, turner } = theChevron(row);
  await expect(
    svg.outerHTML === theReference(canvasElement, 'reference-chevron'),
    'the 16 px chevronRight',
  ).toBe(true);
  await expect(getComputedStyle(svg).color, 'chevron colour').toBe(
    readComputedColour(TEXT_MUTED),
  );
  const turnerStyle = getComputedStyle(turner);
  await expect(turnerStyle.display, 'chevron holder').toBe('flex');
  const turn = turnOf(turnerStyle.transform);
  if (open) {
    await expect(
      [turn.a, turn.b, turn.c, turn.d].map((value) => Math.round(value)),
      'turned 90 degrees',
    ).toEqual([0, 1, -1, 0]);
  } else {
    await expect(turn.isIdentity, 'not turned').toBe(true);
  }
  await expect(turnerStyle.transitionProperty, 'turn property').toBe(
    'transform',
  );
  await expect(turnerStyle.transitionDuration, 'turn duration').toBe(TURN);
  await expect(turnerStyle.transitionTimingFunction, 'turn easing').toBe(
    'ease',
  );

  const label = within(first).getByText(year.label);
  const labelStyle = getComputedStyle(label);
  await expect(readFirstFamily(labelStyle), 'year font').toBe(HEADING_FONT);
  await expect(labelStyle.fontSize, 'year size').toBe(YEAR_SIZE);
  await expect(labelStyle.fontWeight, 'year weight').toBe(YEAR_WEIGHT);
  await expect(box(label).left - box(turner).right, 'chevron gap').toBeCloseTo(
    YEAR_GAP,
    1,
  );
  await expect(middle(box(label)), 'year centred').toBeCloseTo(
    middle(box(turner)),
    1,
  );

  const tagId = referenceId(year.key, 'tag');
  if (year.tag === undefined) {
    await expect(holder.children.length, 'no tag').toBe(2);
  } else {
    const tag = partMatching(first, theReference(canvasElement, tagId));
    await expect(tag, `the tag of ${year.label}`).toBeDefined();
    if (tag !== undefined) {
      await expect(box(tag).left - box(label).right, 'tag gap').toBeCloseTo(
        YEAR_GAP,
        1,
      );
      await expect(middle(box(tag)), 'tag centred').toBeCloseTo(
        middle(box(label)),
        1,
      );
    }
  }
}

// A row's data cells, each aligned as its column is (right when not given),
// padded --space-2 with the 8 % line under it, showing its kind: the Amount
// with the cell's tone, sign and size (bold on a year row); the 14 px Icon in
// an inline flex holder carrying the tooltip as its title and its name, in
// the cell's colour or the row's; the text at 13 px, muted, never wrapping; or
// nothing at all.
async function expectCells(
  canvasElement: HTMLElement,
  columns: readonly Column[],
  row: HTMLTableRowElement,
  cells: readonly Cell[],
  idParts: (string | number)[],
): Promise<void> {
  for (const [index, data] of cells.entries()) {
    const element = cell(row, index + 1);
    const style = getComputedStyle(element);
    const name = `cell ${idParts.map(String).join(' ')} ${String(index)}`;
    await expect(style.textAlign, `${name} align`).toBe(
      columns[index]?.align ?? 'right',
    );
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      await expect(style[`padding${side}`], `${name} ${side} padding`).toBe(
        `${String(CELL_PADDING)}px`,
      );
    }
    await expect(style.borderBottomWidth, `${name} line`).toBe('1px');
    await expect(style.borderBottomStyle, `${name} line style`).toBe('solid');
    await expect(style.borderBottomColor, `${name} line colour`).toBe(
      readComputedColour(ROW_LINE),
    );

    const id = referenceId(...idParts, 'cell', index);
    if (data.type === 'amount') {
      await expect(
        element.innerHTML === theReference(canvasElement, id),
        `${name} shows its Amount`,
      ).toBe(true);
    } else if (data.type === 'icon') {
      const holder = element.firstElementChild;
      if (!(holder instanceof HTMLElement)) {
        throw new Error(`${name}: no icon holder`);
      }
      await expect(element.children.length, `${name} one holder`).toBe(1);
      await expect(
        holder.innerHTML === theReference(canvasElement, id),
        `${name} shows its Icon`,
      ).toBe(true);
      const holderStyle = getComputedStyle(holder);
      await expect(holderStyle.display, `${name} holder`).toBe('inline-flex');
      await expect(holderStyle.color, `${name} icon colour`).toBe(
        data.color === undefined ? style.color : readComputedColour(data.color),
      );
      if (data.title !== undefined) {
        await expect(holder, `${name} tooltip`).toHaveAttribute(
          'title',
          data.title,
        );
        await expect(holder, `${name} name`).toHaveAccessibleName(data.title);
      }
    } else if (data.type === 'text') {
      const span = within(element).getByText(data.text);
      await expect(element.textContent, `${name} text`).toBe(data.text);
      const spanStyle = getComputedStyle(span);
      await expect(spanStyle.fontSize, `${name} text size`).toBe(
        TEXT_CELL_SIZE,
      );
      await expect(spanStyle.color, `${name} text colour`).toBe(
        readComputedColour(TEXT_MUTED),
      );
      await expect(spanStyle.whiteSpace, `${name} text never wraps`).toBe(
        'nowrap',
      );
    } else {
      await expect(element.innerHTML, `${name} empty`).toBe('');
    }
  }
}

// A month row: on its ground, its label 40 px in at 14 px in the given
// colour, its Tag 8 px after it in a row that never wraps, or no tag.
async function expectMonthRow(
  canvasElement: HTMLElement,
  columns: readonly Column[],
  year: Year,
  rowIndex: number,
  ground: string,
  labelColour: string,
): Promise<void> {
  const data = year.rows[rowIndex];
  if (data === undefined) {
    throw new Error(`no month ${String(rowIndex)}`);
  }
  const yearElement = yearRow(theTable(theFrame(canvasElement)), year.label);
  const row = monthRow(yearElement, data.label);
  await expect(
    getComputedStyle(row).backgroundColor,
    `${data.label} ground`,
  ).toBe(readComputedColour(ground));

  const first = cell(row, 0);
  await expect(getComputedStyle(first).paddingLeft, 'month inset').toBe(
    `${String(MONTH_INSET)}px`,
  );
  const holder = first.firstElementChild;
  if (!(holder instanceof HTMLElement)) {
    throw new Error('no holder in the month cell');
  }
  const holderStyle = getComputedStyle(holder);
  await expect(holderStyle.display, 'month parts in a row').toBe('flex');
  await expect(holderStyle.alignItems, 'month parts centred').toBe('center');
  await expect(holderStyle.whiteSpace, 'month parts never wrap').toBe('nowrap');
  const label = within(first).getByText(data.label);
  await expect(box(label).left - box(first).left, 'label inset').toBeCloseTo(
    MONTH_INSET,
    1,
  );
  const labelStyle = getComputedStyle(label);
  await expect(labelStyle.fontSize, 'month size').toBe(TABLE_SIZE);
  await expect(labelStyle.color, `${data.label} label colour`).toBe(
    readComputedColour(labelColour),
  );

  if (data.tag === undefined) {
    await expect(holder.children.length, `${data.label} no tag`).toBe(1);
  } else {
    const tag = partMatching(
      first,
      theReference(canvasElement, referenceId(year.key, rowIndex, 'tag')),
    );
    await expect(tag, `the tag of ${data.label}`).toBeDefined();
    if (tag !== undefined) {
      await expect(
        box(tag).left - box(label).right,
        'month tag gap',
      ).toBeCloseTo(MONTH_GAP, 1);
    }
  }
  await expectCells(canvasElement, columns, row, data.cells, [
    year.key,
    rowIndex,
  ]);
}

function theYear(years: readonly Year[], key: Year['key']): Year {
  const year = years.find((candidate) => candidate.key === key);
  if (year === undefined) {
    throw new Error(`no year ${String(key)}`);
  }
  return year;
}

function rowIndexOf(year: Year, label: string): number {
  const index = year.rows.findIndex((row) => row.label === label);
  if (index < 0) {
    throw new Error(`no month ${label}`);
  }
  return index;
}

// Every element of the row at full strength: a future month is told apart by
// its row's styling, never by a lower contrast (design log D2).
async function expectFullStrength(row: HTMLTableRowElement): Promise<void> {
  for (const element of [row, ...row.querySelectorAll('*')]) {
    await expect(getComputedStyle(element).opacity, 'full strength').toBe('1');
  }
}

function columnWidths(table: HTMLElement): number[] {
  return headers(table).map((header) => box(header).width);
}

const meta = {
  title: 'Components/YearTable',
  component: YearTable,
  render: renderIn(FRAME_WIDTH, true),
  args: {
    columns: DETAIL_COLUMNS,
    years: DETAIL_YEARS,
    onToggle: fn(),
  },
} satisfies Meta<typeof YearTable>;

export default meta;

type Story = StoryObj<typeof meta>;

// Closed by default: the headers with the default first label, every year a
// closed row with its tag and bold totals, no month below any of them;
// onToggle is not called before a click.
export const ClosedByDefault: Story = {
  play: async ({ args, canvasElement }) => {
    await expect(EXACTLY_THE_LISTED_PROPS).toBe(true);
    await expect(ONLY_COLUMNS_AND_YEARS_REQUIRED).toBe(true);
    await expect(FIELDS.every(Boolean)).toBe(true);
    await expect(VALUE_TYPES.every(Boolean)).toBe(true);
    await expect(CELL_TYPES.every(Boolean)).toBe(true);
    await expect(
      components.YearTable === YearTable,
      'exported by the barrel',
    ).toBe(true);

    await expectHeaders(canvasElement, args.columns, FIRST_LABEL);
    const table = theTable(theFrame(canvasElement));
    for (const year of args.years) {
      await expectYearRow(canvasElement, year, false);
      const row = yearRow(table, year.label);
      await expectCells(canvasElement, args.columns, row, year.cells, [
        year.key,
      ]);
      await expect(monthRows(row).length, `${year.label} closed`).toBe(0);
    }
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
};

// Open by default: the listed year open, its months below it in order on the
// sunken ground, the others closed.
export const OpenByDefault: Story = {
  args: { defaultOpen: [TODAY_YEAR] },
  play: async ({ args, canvasElement }) => {
    const table = theTable(theFrame(canvasElement));
    for (const year of args.years) {
      const open = year.key === TODAY_YEAR;
      await expectYearRow(canvasElement, year, open);
      const rows = monthRows(yearRow(table, year.label));
      await expect(
        rows.map((row) => cell(row, 0).textContent),
        `${year.label} months`,
      ).toEqual(open ? year.rows.map((row) => row.label) : []);
    }
    const year = theYear(args.years, TODAY_YEAR);
    for (const label of ['Jan', MISSED_MONTH, 'Sep']) {
      await expectMonthRow(
        canvasElement,
        args.columns,
        year,
        rowIndexOf(year, label),
        SUNKEN,
        TEXT,
      );
    }
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
};

// Today's month on accent-100, its label in the text colour, without a tag.
export const TodayMonth: Story = {
  args: { defaultOpen: [TODAY_YEAR] },
  play: async ({ args, canvasElement }) => {
    const year = theYear(args.years, TODAY_YEAR);
    await expectMonthRow(
      canvasElement,
      args.columns,
      year,
      rowIndexOf(year, TODAY_MONTH),
      ACCENT_100,
      TEXT,
    );
  },
};

// Future months below today's row: on the sunken ground with the label in the
// muted colour, every part at full strength (design log D1, D2); their goal
// cells empty.
export const FutureMonths: Story = {
  args: { defaultOpen: [TODAY_YEAR] },
  play: async ({ args, canvasElement }) => {
    const year = theYear(args.years, TODAY_YEAR);
    const yearElement = yearRow(theTable(theFrame(canvasElement)), year.label);
    const today = monthRow(yearElement, TODAY_MONTH);
    for (const label of FUTURE_MONTHS) {
      await expectMonthRow(
        canvasElement,
        args.columns,
        year,
        rowIndexOf(year, label),
        SUNKEN,
        TEXT_MUTED,
      );
      const row = monthRow(yearElement, label);
      await expect(box(row).top >= box(today).bottom - 1, 'below today').toBe(
        true,
      );
      await expectFullStrength(row);
    }
  },
};

// The payoff month in the milestone row colour (design log Q7), with its
// milestone tag and flag; the payoff year's milestone tag.
export const PayoffMonth: Story = {
  args: {
    columns: PAYOFF_COLUMNS,
    years: PAYOFF_YEARS,
    defaultOpen: [PAYOFF_YEAR],
  },
  play: async ({ args, canvasElement }) => {
    const year = theYear(args.years, PAYOFF_YEAR);
    await expectYearRow(canvasElement, year, true);
    await expectMonthRow(
      canvasElement,
      args.columns,
      year,
      rowIndexOf(year, PAYOFF_MONTH),
      MILESTONE_ROW,
      TEXT_MUTED,
    );
    await expectMonthRow(
      canvasElement,
      args.columns,
      year,
      rowIndexOf(year, 'Oct'),
      SUNKEN,
      TEXT_MUTED,
    );
  },
};

// Each cell kind on a year row and a month row: amounts with the defaults and
// with their own tone, sign and size; an icon with its colour and tooltip and
// one in the row's colour; a text; nothing; the text column aligned left.
export const CellKinds: Story = {
  args: {
    columns: KIND_COLUMNS,
    years: KIND_YEARS,
    defaultOpen: ['kinds'],
  },
  play: async ({ args, canvasElement }) => {
    await expectHeaders(canvasElement, args.columns, FIRST_LABEL);
    const year = theYear(args.years, 'kinds');
    await expectYearRow(canvasElement, year, true);
    const row = yearRow(theTable(theFrame(canvasElement)), year.label);
    await expectCells(canvasElement, args.columns, row, year.cells, [year.key]);
    await expectMonthRow(canvasElement, args.columns, year, 0, SUNKEN, TEXT);
  },
};

// An empty first label is no first label, as in the prototype: the header
// shows the default first label.
export const EmptyFirstLabel: Story = {
  args: { firstLabel: '' },
  play: async ({ args, canvasElement }) => {
    await expectHeaders(canvasElement, args.columns, FIRST_LABEL);
  },
};

// An empty tag is no tag, as in the prototype: neither a year row nor a month
// row draws a Tag for it, so each holds only its chevron and year, or its
// label.
export const EmptyTags: Story = {
  args: {
    columns: SCROLL_COLUMNS,
    years: [
      {
        key: 'untagged',
        label: '2026',
        tag: '',
        cells: [amount(1000000), amount(180000, { sign: 'always' })],
        rows: [
          {
            label: 'Jul',
            tag: '',
            cells: [amount(900000), amount(15000, { sign: 'always' })],
          },
        ],
      },
    ],
    defaultOpen: ['untagged'],
  },
  play: async ({ args, canvasElement }) => {
    const year = theYear(args.years, 'untagged');
    const row = yearRow(theTable(theFrame(canvasElement)), year.label);
    await expect(yearButton(row).children.length, 'no year tag').toBe(2);
    const month = monthRow(row, 'Jul');
    const holder = cell(month, 0).firstElementChild;
    await expect(holder?.children.length, 'no month tag').toBe(1);
  },
};

// An empty tooltip is no tooltip, as in the prototype's absent one: the icon
// holder carries no title and is no named image, on a year row and a month
// row.
export const EmptyIconTitle: Story = {
  args: {
    columns: [{ label: 'Goal' }],
    years: [
      {
        key: 'untitled',
        label: '2026',
        cells: [{ type: 'icon', glyph: 'check', color: MET, title: '' }],
        rows: [
          {
            label: 'Jan',
            cells: [{ type: 'icon', glyph: 'x', title: '' }],
          },
        ],
      },
    ],
    defaultOpen: ['untitled'],
  },
  play: async ({ args, canvasElement }) => {
    const year = theYear(args.years, 'untitled');
    const row = yearRow(theTable(theFrame(canvasElement)), year.label);
    for (const element of [row, monthRow(row, 'Jan')]) {
      const holder = cell(element, 1).firstElementChild;
      await expect(holder, 'an icon holder').not.toBeNull();
      await expect(holder, 'no role').not.toHaveAttribute('role');
      await expect(holder, 'no tooltip').not.toHaveAttribute('title');
      await expect(holder, 'no name').not.toHaveAttribute('aria-label');
    }
  },
};

// The auto layout: the first column only as wide as its content however wide
// the card, a column with a width exactly that wide, the rest sharing the
// space; nothing scrolls.
export const AutoColumns: Story = {
  args: { defaultOpen: [TODAY_YEAR] },
  render: (args) => (
    <>
      <Frame
        data-testid="frame"
        data-resting=""
        style={{ width: `${String(FRAME_WIDTH)}px` }}
      >
        <YearTable {...args} />
      </Frame>
      <Frame
        data-testid="wider"
        data-resting=""
        style={{ width: `${String(WIDER_FRAME)}px` }}
      >
        <YearTable {...args} />
      </Frame>
      <References columns={args.columns} years={args.years} />
    </>
  ),
  play: async ({ args, canvasElement }) => {
    await expectHeaders(canvasElement, args.columns, FIRST_LABEL);
    const table = theTable(theFrame(canvasElement));
    const wider = theTable(within(canvasElement).getByTestId('wider'));
    for (const [element, width] of [
      [table, FRAME_WIDTH],
      [wider, WIDER_FRAME],
    ] as const) {
      const style = getComputedStyle(element);
      await expect(style.tableLayout, 'auto layout').toBe('auto');
      await expect(style.minWidth, 'no min width').toBe('0px');
      await expect(box(element).width, 'across the card').toBeCloseTo(width, 1);
      const goal = columnWidths(element)[DETAIL_COLUMNS.length];
      // Border-box, as the prototype's global rule: the padding is inside.
      await expect(goal, 'the goal column').toBeCloseTo(GOAL_WIDTH, 1);
    }
    await expect(
      columnWidths(table)[0],
      'the first column fits its content',
    ).toBeCloseTo(columnWidths(wider)[0] ?? 0, 1);
  },
};

// Equal columns in a card wide enough: the first column 230 px, the data
// columns sharing the rest equally; a given first label; nothing scrolls.
export const EqualColumns: Story = {
  render: renderIn(WIDE_FRAME, true),
  args: {
    equalColumns: true,
    firstLabel: 'Year',
    columns: ACCOUNT_COLUMNS,
    years: BALANCE_YEARS,
    defaultOpen: [TODAY_YEAR],
  },
  play: async ({ args, canvasElement }) => {
    await expectHeaders(canvasElement, args.columns, 'Year');
    const table = theTable(theFrame(canvasElement));
    await expect(getComputedStyle(table).tableLayout, 'fixed layout').toBe(
      'fixed',
    );
    await expect(box(table).width, 'across the card').toBeCloseTo(
      WIDE_FRAME,
      1,
    );
    const [first, ...data] = columnWidths(table);
    // Border-box, as the prototype's global rule: the padding is inside.
    const firstBox = FIRST_WIDTH;
    await expect(first, 'first column').toBeCloseTo(firstBox, 1);
    for (const width of data) {
      await expect(
        Math.abs(width - (WIDE_FRAME - firstBox) / data.length) <= 0.5,
        'equal columns',
      ).toBe(true);
    }
    const wrapper = table.parentElement;
    await expect(
      wrapper !== null && wrapper.scrollWidth <= wrapper.clientWidth,
      'no scrolling',
    ).toBe(true);
  },
};

// A first column of another width: the data columns share what it leaves.
export const FirstWidth: Story = {
  render: renderIn(WIDE_FRAME, true),
  args: {
    equalColumns: true,
    firstWidth: `${String(OTHER_FIRST_WIDTH)}px`,
    columns: ACCOUNT_COLUMNS,
    years: BALANCE_YEARS,
  },
  play: async ({ canvasElement }) => {
    const table = theTable(theFrame(canvasElement));
    const [first, ...data] = columnWidths(table);
    // Border-box, as the prototype's global rule: the padding is inside.
    const firstBox = OTHER_FIRST_WIDTH;
    await expect(first, 'first column').toBeCloseTo(firstBox, 1);
    for (const width of data) {
      await expect(
        Math.abs(width - (WIDE_FRAME - firstBox) / data.length) <= 0.5,
        'equal columns',
      ).toBe(true);
    }
  },
};

// Several account columns in a narrow card: the table keeps 230 px plus
// 130 px per data column, the data columns equal, and scrolls sideways
// inside the card; the headers keep their dots and never wrap.
export const NarrowWithSeveralAccounts: Story = {
  render: renderIn(NARROW_FRAME, true),
  args: {
    equalColumns: true,
    columns: ACCOUNT_COLUMNS,
    years: BALANCE_YEARS,
    defaultOpen: [TODAY_YEAR],
  },
  play: async ({ args, canvasElement }) => {
    await expectHeaders(canvasElement, args.columns, FIRST_LABEL);
    const frame = theFrame(canvasElement);
    const table = theTable(frame);
    const minWidth = FIRST_WIDTH + args.columns.length * MIN_COLUMN;
    await expect(getComputedStyle(table).minWidth, 'min width').toBe(
      `${String(minWidth)}px`,
    );
    await expect(box(table).width, 'kept wide').toBeCloseTo(minWidth, 1);
    const [first, ...data] = columnWidths(table);
    // Border-box, as the prototype's global rule: the padding is inside.
    const firstBox = FIRST_WIDTH;
    await expect(first, 'first column').toBeCloseTo(firstBox, 1);
    for (const width of data) {
      await expect(
        Math.abs(width - (minWidth - firstBox) / data.length) <= 0.5,
        'equal columns',
      ).toBe(true);
    }
    const wrapper = table.parentElement;
    if (wrapper === null) {
      throw new Error('no wrapper');
    }
    await expect(
      wrapper.scrollWidth > wrapper.clientWidth,
      'scrolls inside the card',
    ).toBe(true);
    await expect(box(wrapper).width, 'the card keeps its width').toBeCloseTo(
      NARROW_FRAME + 2 * BLEED,
      1,
    );
  },
};

// Under the pointer a year row takes the hover fill.
export const YearRowHover: Story = {
  render: renderIn(FRAME_WIDTH, false),
  play: async ({ canvasElement }) => {
    const row = yearRow(theTable(theFrame(canvasElement)), String(TODAY_YEAR));
    await expect(
      readHoveredStyle(row, (style) => style.backgroundColor),
      'hover fill',
    ).toBe(readComputedColour(HOVER));
  },
};

// A click on a closed year row opens its months and reports the year open; a
// second click closes them and reports it closed. A click on a year open by
// default closes it. A click on the year's button itself toggles it once.
export const Toggles: Story = {
  render: renderIn(FRAME_WIDTH, false),
  args: { defaultOpen: [TODAY_YEAR] },
  play: async ({ args, canvasElement }) => {
    const table = theTable(theFrame(canvasElement));
    const closed = theYear(args.years, 2027);
    const row = yearRow(table, closed.label);
    const button = yearButton(row);
    await expect(monthRows(row).length, 'closed').toBe(0);

    await userEvent.click(row);
    await expect(args.onToggle).toHaveBeenCalledTimes(1);
    await expect(args.onToggle).toHaveBeenLastCalledWith(2027, true);
    await expect(button, 'opened').toHaveAttribute('aria-expanded', 'true');
    await expect(
      monthRows(row).map((month) => cell(month, 0).textContent),
      'months shown',
    ).toEqual(closed.rows.map((month) => month.label));

    await userEvent.click(row);
    await expect(args.onToggle).toHaveBeenCalledTimes(2);
    await expect(args.onToggle).toHaveBeenLastCalledWith(2027, false);
    await expect(button, 'closed again').toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(monthRows(row).length, 'months gone').toBe(0);

    const open = yearRow(table, String(TODAY_YEAR));
    const openButton = yearButton(open);
    await expect(monthRows(open).length, 'open by default').toBe(12);
    await userEvent.click(open);
    await expect(args.onToggle).toHaveBeenCalledTimes(3);
    await expect(args.onToggle).toHaveBeenLastCalledWith(TODAY_YEAR, false);
    await expect(openButton, 'closed').toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(monthRows(open).length, 'its months gone').toBe(0);

    await userEvent.click(button);
    await expect(args.onToggle, 'one toggle per click').toHaveBeenCalledTimes(
      4,
    );
    await expect(args.onToggle).toHaveBeenLastCalledWith(2027, true);
    await expect(button, 'opened by its button').toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(monthRows(row).length, 'months shown again').toBe(
      closed.rows.length,
    );
  },
};

// Tab reaches a year's button. Enter opens the year and Enter closes it,
// then Space opens it and Space closes it, each toggle reported once and
// shown on the button, while the focus stays on the button (design log D12).
export const OpensWithTheKeyboard: Story = {
  render: renderIn(FRAME_WIDTH, false),
  play: async ({ args, canvasElement }) => {
    const table = theTable(theFrame(canvasElement));
    const year = theYear(args.years, 2027);
    const row = yearRow(table, year.label);
    const button = yearButton(row);
    for (
      let step = 0;
      step < args.years.length && document.activeElement !== button;
      step += 1
    ) {
      await userEvent.tab();
    }
    await expect(button, 'reached by Tab').toHaveFocus();

    const presses = [
      ['{Enter}', true],
      ['{Enter}', false],
      [' ', true],
      [' ', false],
    ] as const;
    for (const [index, [key, open]] of presses.entries()) {
      const name = `${key === ' ' ? 'Space' : 'Enter'} ${String(index + 1)}`;
      await userEvent.keyboard(key);
      await expect(args.onToggle, `${name} reported`).toHaveBeenCalledTimes(
        index + 1,
      );
      await expect(args.onToggle).toHaveBeenLastCalledWith(2027, open);
      await expect(button, `${name} shown`).toHaveAttribute(
        'aria-expanded',
        String(open),
      );
      await expect(monthRows(row).length, `${name} months`).toBe(
        open ? year.rows.length : 0,
      );
      await expect(button, `${name} keeps the focus`).toHaveFocus();
    }
  },
};

// Closed years in a scroll area that holds them. Opening the last one runs
// its months past the area's bottom: the area scrolls just far enough to show
// the whole year with the 24 px margin below it, and the clicked row stays
// inside the area.
export const InAScrollArea: Story = {
  args: { columns: SCROLL_COLUMNS, years: SCROLL_YEARS },
  render: (args) => (
    <>
      <Area data-testid="area">
        <Frame data-testid="frame">
          <YearTable {...args} />
        </Frame>
      </Area>
      <References columns={args.columns} years={args.years} />
    </>
  ),
  play: async ({ args, canvasElement }) => {
    const area = within(canvasElement).getByTestId('area');
    await expect(
      area.scrollHeight <= area.clientHeight,
      'the closed years fit',
    ).toBe(true);
    await expect(area.scrollTop, 'not scrolled').toBe(0);

    const last = args.years[args.years.length - 1];
    if (last === undefined) {
      throw new Error('no years');
    }
    const row = yearRow(theTable(area), last.label);
    await userEvent.click(row);
    await expect(args.onToggle).toHaveBeenCalledTimes(1);
    await expect(monthRows(row).length, 'opened').toBe(last.rows.length);

    const block = row.parentElement;
    if (block === null) {
      throw new Error('no body around the year row');
    }
    await waitFor(
      async () => {
        await expect(
          Math.abs(box(area).bottom - box(block).bottom - REVEAL_MARGIN) <= 1,
          'the year shown with the margin below it',
        ).toBe(true);
      },
      { timeout: 2000 },
    );
    await expect(area.scrollTop > 0, 'scrolled').toBe(true);
    await expect(
      box(row).top >= box(area).top + REVEAL_MARGIN - 1,
      'the clicked row below the top margin',
    ).toBe(true);
    await expect(
      box(row).bottom <= box(area).bottom,
      'the clicked row inside the area',
    ).toBe(true);
  },
};
