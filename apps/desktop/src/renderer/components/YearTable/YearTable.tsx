import { useRef, useState, type ComponentProps } from 'react';
import type { Cents } from '@dashcash/domain/money/cents/cents';
import { useRevealOnExpand } from '../../hooks/useRevealOnExpand/useRevealOnExpand.ts';
import { Amount } from '../../primitives/Amount/Amount.tsx';
import { Icon, type IconName } from '../../primitives/Icon/Icon.tsx';
import { Swatch } from '../../primitives/Swatch/Swatch.tsx';
import { Tag, type TagTone } from '../../primitives/Tag/Tag.tsx';
import {
  Chevron,
  CellText,
  DataCell,
  Head,
  HeadLabel,
  IconHolder,
  Month,
  MonthHead,
  MonthRow,
  Table,
  Wrapper,
  Year as YearLabel,
  YearHead,
  YearRow,
  type Align,
  type Highlight,
} from './YearTable.styles.ts';

type AmountProps = ComponentProps<typeof Amount>;

// What a cell shows: an amount, an icon with its tooltip, a text or nothing.
type Cell =
  | {
      type: 'amount';
      cents: Cents;
      tone?: NonNullable<AmountProps['tone']>;
      sign?: NonNullable<AmountProps['sign']>;
      size?: NonNullable<AmountProps['size']>;
    }
  | { type: 'icon'; glyph: IconName; color?: string; title?: string }
  | { type: 'text'; text: string }
  | { type: 'empty' };

type Column = {
  label: string;
  color?: string;
  align?: Align;
  width?: string;
};

type Row = {
  label: string;
  tag?: string;
  tagTone?: TagTone;
  tagIcon?: IconName;
  muted?: boolean;
  highlight?: Highlight;
  cells: Cell[];
};

type Year = {
  key: string | number;
  label: string;
  tag?: string;
  tagTone?: TagTone;
  tagIcon?: IconName;
  cells: Cell[];
  rows: Row[];
};

type YearTableProps = {
  equalColumns?: boolean;
  firstWidth?: string;
  columns: Column[];
  years: Year[];
  defaultOpen?: Year['key'][];
  firstLabel?: string;
  onToggle?: (key: Year['key'], open: boolean) => void;
};

const CHEVRON_SIZE = 16;
const DOT_SIZE = 9;
const CELL_ICON_SIZE = 14;
const DEFAULT_FIRST_LABEL = 'Year · month';
const EMPTY: Cell = { type: 'empty' };

function CellContent({ cell, strong }: { cell: Cell; strong: boolean }) {
  switch (cell.type) {
    case 'amount':
      return (
        <Amount
          cents={cell.cents}
          tone={cell.tone ?? 'auto'}
          sign={cell.sign ?? 'auto'}
          size={cell.size ?? 'md'}
          strong={strong}
        />
      );
    case 'icon':
      return (
        <IconHolder
          $color={cell.color}
          {...(cell.title === undefined
            ? {}
            : { role: 'img', title: cell.title, 'aria-label': cell.title })}
        >
          <Icon glyph={cell.glyph} size={CELL_ICON_SIZE} />
        </IconHolder>
      );
    case 'text':
      return <CellText>{cell.text}</CellText>;
    default:
      return null;
  }
}

function DataCells({
  columns,
  cells,
  strong,
}: {
  columns: readonly Column[];
  cells: readonly Cell[];
  strong: boolean;
}) {
  return columns.map((column, index) => (
    <DataCell key={index} $align={column.align ?? 'right'}>
      <CellContent cell={cells[index] ?? EMPTY} strong={strong} />
    </DataCell>
  ));
}

// One year: its row, and below it its months while it is open. The year is a
// body of its own, so the scroll area can show all of it after it opens.
function YearBody({
  year,
  columns,
  open,
  onToggle,
}: {
  year: Year;
  columns: readonly Column[];
  open: boolean;
  onToggle: () => void;
}) {
  const row = useRef<HTMLTableRowElement>(null);
  const body = useRef<HTMLTableSectionElement>(null);
  useRevealOnExpand(row, body, open);

  return (
    <tbody ref={body}>
      <YearRow
        ref={row}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
      >
        <DataCell $align="left">
          <YearHead>
            <Chevron $open={open}>
              <Icon glyph="chevronRight" size={CHEVRON_SIZE} />
            </Chevron>
            <YearLabel>{year.label}</YearLabel>
            {year.tag === undefined ? null : (
              <Tag
                label={year.tag}
                tone={year.tagTone ?? 'neutral'}
                icon={year.tagIcon}
              />
            )}
          </YearHead>
        </DataCell>
        <DataCells columns={columns} cells={year.cells} strong />
      </YearRow>
      {open
        ? year.rows.map((month) => (
            <MonthRow key={month.label} $highlight={month.highlight}>
              <DataCell $align="left" $inset>
                <MonthHead>
                  <Month $muted={month.muted === true}>{month.label}</Month>
                  {month.tag === undefined ? null : (
                    <Tag
                      label={month.tag}
                      tone={month.tagTone ?? 'outline'}
                      icon={month.tagIcon}
                    />
                  )}
                </MonthHead>
              </DataCell>
              <DataCells columns={columns} cells={month.cells} strong={false} />
            </MonthRow>
          ))
        : null}
    </tbody>
  );
}

// A table of years that open into their months, in columns of amounts, icons
// and texts. Year rows toggle on a click and report it; the scroll area the
// table sits in scrolls to show a year after it opens.
export function YearTable({
  equalColumns = false,
  firstWidth,
  columns,
  years,
  defaultOpen = [],
  firstLabel = DEFAULT_FIRST_LABEL,
  onToggle,
}: YearTableProps) {
  const [openKeys, setOpenKeys] = useState<ReadonlySet<Year['key']>>(
    () => new Set(defaultOpen),
  );

  function toggle(key: Year['key']) {
    const open = openKeys.has(key);
    const next = new Set(openKeys);
    if (open) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setOpenKeys(next);
    onToggle?.(key, !open);
  }

  return (
    <Wrapper>
      <Table $equal={equalColumns} $columns={columns.length}>
        <thead>
          <tr>
            <Head $align="left" $width={equalColumns ? firstWidth : '1%'}>
              {firstLabel}
            </Head>
            {columns.map((column, index) => {
              const align = column.align ?? 'right';
              return (
                <Head
                  key={index}
                  $align={align}
                  $width={column.width ?? 'auto'}
                >
                  <HeadLabel $align={align}>
                    {column.color === undefined ? null : (
                      <Swatch
                        color={column.color}
                        shape="circle"
                        size={DOT_SIZE}
                      />
                    )}
                    {column.label}
                  </HeadLabel>
                </Head>
              );
            })}
          </tr>
        </thead>
        {years.map((year) => (
          <YearBody
            key={year.key}
            year={year}
            columns={columns}
            open={openKeys.has(year.key)}
            onToggle={() => {
              toggle(year.key);
            }}
          />
        ))}
      </Table>
    </Wrapper>
  );
}
