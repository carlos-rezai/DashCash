# DashCash, design handoff

High-fidelity clickable prototype of DashCash v2 (Electron, Windows). Dark theme, English UI, 1440 × 900 reference viewport. Visual language: **Industry** design system (Barlow Condensed / Barlow, steel accent, square hairline frames, no corner marks), adapted to a dark ground.

- Open **`DashCash.dc.html`** for the app, **`Component Inventory.dc.html`** for every level in isolation.
- All data is invented (`lib/store.js`). "Today" is fixed at **26 Oct 2026**. Money is integer cents everywhere.
- Prototype tweaks (on `DashCash.dc.html`): `headroomScenario` calm / close / over (Sparkasse spending), `chartRange` (default graph range, `payoff`), `demoSnackbar` (fires each snackbar tone), `cardFill` (`surface` default / `none`).

---

## 1. File → React mapping

Each `.dc.html` file is one React component (styled-components, typed props). Suggested target paths:

| Level | Prototype file | Target |
| --- | --- | --- |
| tokens | `tokens/dashcash-dark.css` + Industry `styles.css` | `renderer/src/tokens/theme.ts` (`DefaultTheme`), `GlobalStyle.ts` |
| primitives | Icon, Button, Amount, Tag, Input, Select, Segmented, Swatch, Checkbox, Meter, Chip | `renderer/src/primitives/<Name>.tsx` |
| components | Card, Modal, FormField, PageHeader, NavItem, Stepper, Accordion, StatTile, Logo, Sparkline, YearTable | `renderer/src/components/<Name>.tsx` |
| features/saving | BalanceChart, SavingPanel, StreakStrip, HeadroomMeter | `renderer/src/features/saving/` |
| features/accounts | AccountCard, AccountList, AccountDetail, AccountFormModal, BalanceTable | `renderer/src/features/accounts/` |
| features/import | ImportWizard, ImportedFiles | `renderer/src/features/import/` (split steps into `FileStep`, `PreviewStep`, `CategoriesStep`, `RecurringStep`, `SummaryStep`) |
| features/settings | ReminderSettings, UpdateSettings, BankProfiles, DataSettings | `renderer/src/features/settings/` |
| features/compare | CompareTable | `renderer/src/features/compare/` |
| features/categories | CategoryList, RuleList, UncategorisedList | `renderer/src/features/categories/` |
| layouts | Sidebar, AppShell, PageLayout | `renderer/src/layouts/` |
| pages | DashboardPage (BalanceChart, SavingPanel, BalanceTable), AccountsPage, ImportPage, ComparePage, CategoriesPage, UncategorisedPage | `renderer/src/pages/` |
| app | DashCash | `renderer/src/App.tsx` (router) |
| mock data | `lib/store.js` | replace with domain package + typed IPC contract; features read via hooks (`useAccounts()`, `useSeries(id)` …) |

Layer rule: a level only imports from levels below it. StreakStrip and HeadroomMeter are domain UI of `saving`, so they live in the feature (not in components).

Shared types used below:
```ts
type Cents = number & { readonly __brand: 'Cents' };
type IconName = 'dashboard'|'wallet'|'upload'|'columns'|'tags'|'plus'|'pencil'|'trash'|'chevronDown'|'chevronRight'|'chevronLeft'|'check'|'x'|'arrowLeft'|'arrowRight'|'arrowUp'|'arrowDown'|'file'|'alert'|'repeat'|'transfer'|'inbox'|'search'|'merge'|'flag'|'info'|'link'|'layers'|'target'|'calendar'|'loaderCircle'|'settings'|'download'|'refresh'|'database'|'circleX'|'circleCheck'|'bell'|'panelClose';
type TagTone = 'accent'|'neutral'|'outline'|'warning'|'danger';
type PageId = 'dashboard'|'accounts'|'import'|'compare'|'categories'|'uncategorised';
type AccountType = 'income'|'spending'|'savings'|'card'|'mortgage';
```

---

## 2. Design tokens

Industry's `styles.css` is loaded first; `tokens/dashcash-dark.css` overrides it for dark. Theme keys in brackets are suggested `theme.ts` names.

**Ground & ink**
| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` [color.bg] | `#1b2a39` | App ground (derived from Industry accent-900) |
| `--sb-ground-sunken` [color.sunken] | `#16222f` | Sidebar, meter track, projected zone of the graph |
| `--color-surface` | `#213345` | Card, stat tile, modal and snackbar fill (via `--sb-card-bg` / `--sb-raised-bg`) |
| `--sb-card-border` | text @ 8% | Card, stat tile and modal outline (softer than `--color-divider`, which stays for rules and controls) |
| `--color-text` [color.text] | `#e9f1fa` | Ink (Industry accent-100 "paper") |
| `--sb-text-muted` | text @ 62% | Secondary text |
| `--sb-text-faint` | text @ 42% | Captions, axis labels |
| `--color-divider` | text @ 16% | All 1px hairlines |
| `--sb-hover` | text @ 6% | Row / tile hover |
| `--sb-backdrop` | `rgba(9,15,22,.66)` | Modal backdrop |

**Accent ramp (inverted for dark: 100 = subtle tint, 900 = strongest ink)**
`100 #22384d · 200 #2c455d · 300 #416180 · 400 #597ea3 · 500 #749dc4 (= --color-accent) · 600 #94bce3 · 700 #b5d9fd · 800 #d6ebff · 900 #eef6ff`
- Primary button fill `--color-accent`, hover `600`, text `--color-bg`.
- Accent text / links / icons on ground: `600` (≥ 4.5:1). Selected tint: `100` + border `300/400`. Highlight cell (Compare max): `200` + inset ring `400`, text `900`.
- **Milestone (mortgage payoff) = positive green**, never the warning amber: `--sb-milestone` (#7cc59a), `--sb-milestone-tint` (16 %), `--sb-milestone-row` (12 % over sunken). Used for the graph's payoff band, dashed payoff line, payoff dot and flag label; Tag `tone="milestone"` (year tag "Payoff Mar 2031", month tag "Paid off" / "Mortgage paid off"); the payoff month row in both year tables; the "Paid off" value on the mortgage AccountCard.
- Neutral ramp follows the same inversion (`--color-neutral-100 … 900`).

**Money polarity**, `--sb-positive #7cc59a` (green) for positive amounts, `--sb-negative #e8877b` (red) for negative ones, plain ink for 0. Applied by Amount's default `tone="auto"`. The mortgage Restschuld is debt, so it shows red although stored positive. Compare change is signed as the effect on your money (previous − last month): more spending = negative/red, less = positive/green. Compare month cells are spending magnitudes and stay plain ink.

**Status**, `--sb-warning #e0b469` (+ `--sb-warning-tint` 14%), `--sb-danger #e8877b` (+ tint). Only used for headroom, balance-check, delete.

**Data palette** (equal OKLCH lightness, low chroma)
- Accounts: income `#cdbb8b`, spending `#d69c8e`, savings `#94bce3`, card `#b3a3d1`, mortgage `#e9f1fa`.
- Categories `--sb-cat-1…40`: 40 hues at OKLCH L 0.75 / C 0.12 in golden-angle order; exact hex values in `tokens/dashcash-dark.css` (see *Category colours*).

**Type**, `--font-heading` Barlow Condensed 600, `--font-body` Barlow 400/500. Scale: 42 display · 34 page title · 22 section / Amount lg · 19 card title · 15 body · 14 UI/table · 13 small · 12 caption · 11 kicker (uppercase, 0.1em). Amounts always `font-variant-numeric: tabular-nums`.

**Spacing** (0.85× density), `--space-1 3.4 · 2 6.8 · 3 10.2 · 4 13.6 · 6 20.4 · 8 27.2` px. Page padding 24 px, sidebar 208 px (64 px rail when collapsed), content max-width 1320 px, grid gaps `--space-6`.

**Shape & elevation**, radius 0 on every framed element. Cards/figures: transparent, 1px divider border, square. Corner registration marks are removed by decision (`.blueprint > .corner { display: none }` in the token sheet). Shadows (dark): hairline ring + ambient dark (`--shadow-sm/md/lg`); only Modal (`lg`) and graph tooltip (`md`) use them.

**Icons**, Lucide, stroke 1.5, 12–22 px, `currentColor`.

**Focus/hover**, Industry defaults: `:focus-visible` 2px accent outline, offset 2; hovers tint with `--sb-hover` or accent-100.

**Money formatting**, `Intl.NumberFormat('de-DE', {minimumFractionDigits: 2})` + NBSP + `€`. Negative sign is U+2212 (`−86,40 €`). `sign="always"` prefixes `+`. Axis labels: whole euros (`20.000 €`). Dates are English (`26 Oct 2026`).

---

## 3. Component API

### Primitives
| Component | Props |
| --- | --- |
| **Icon** | `glyph: IconName`, `size?: number = 16` |
| **Button** | `label?: string` (omit → square icon button), `variant?: 'primary'\|'secondary'\|'ghost'\|'danger' = 'secondary'`, `size?: 'sm'\|'md' = 'md'` (28 / 34 px high), `icon?`, `iconRight?: IconName`, `block?: boolean`, `disabled?: boolean`, `title?: string`, `onClick?: (e) => void`. Primary = solid accent (the one solid object). Disabled = 45% opacity. |
| **Amount** | `cents: Cents \| null` (null → "-"), `sign?: 'auto'\|'always'\|'none'`, `size?: 'sm' 13\|'md' 14\|'lg' 22\|'xl' 34` (lg/xl in Barlow Condensed), `tone?: 'auto'\|'muted'\|'neutral'\|'positive'\|'negative'\|'warning'\|'danger' = 'auto'` (`auto`: > 0 green, < 0 red, 0 ink; `muted` = auto at 62% opacity for projected values; `neutral` opts out), `whole?: boolean`, `strong?: boolean` |
| **Tag** | `label: string`, `tone?: TagTone = 'neutral'`, `icon?: IconName`, `swatch?: string` (8px square). Fills (bg / text): accent = accent-300 / accent-900, neutral = neutral-300 / neutral-900 (one step above the 100-level card surface so tags read on filled cards; ≥ 6:1), outline = transparent / accent-600 + accent-400 border, warning / danger / milestone = their 14 % tint / base colour |
| **Input** | `value: string`, `onChange(value: string)`, `placeholder?`, `icon?` (left), `suffix?` (e.g. "€"), `align?: 'left'\|'right'`, `size?: 'sm' 30\|'md' 36`, `numeric?`, `width?` |
| **Select** | `value: string`, `options: {value,label,color?}[]`, `onChange(value)`, `placeholder?` (empty option), `showSwatch?` (shows selected option colour), `size?`, `width?`, `tone?: 'default' | 'warning'` (warning border + placeholder colour, for fields that need attention) |
| **Segmented** | `value: string`, `options: {value,label}[]`, `onChange(value)`, selected = accent fill |
| **Swatch** | `color: string`, `size?: number = 10`, `shape?: 'square'\|'circle'\|'line'` (circle = account marker; square = category) |
| **Checkbox** | `checked: boolean`, `onChange(checked)`, `label?`, 16px square, checked = accent fill + check |
| **Meter** | `value: 0–1` (solid), `projected?: 0–1` (dashed outline beyond value), `tone?: 'neutral'\|'warning'\|'danger'`, `height?: number = 6` |
| **Chip** | `label`, `active?`, `onClick?`, `swatch?`, `swatchShape?: 'square'\|'circle'\|'line'`, `meta?: string` (muted, right), `disabled?`, toggle button for legends and month picking |

### Components
| Component | Props |
| --- | --- |
| **Card** | `kicker?`, `title?`, `padding?: 'none'\|'sm'\|'md'\|'lg' = 'md'`, `children`. Transparent blueprint frame, gap `--space-3`. (In code add an `actions?: ReactNode` header slot if needed.) |
| **Modal** | `open`, `title`, `subtitle?`, `width?: number = 460`, `onClose`, `children` (actions are the last child row, right aligned). Closes on backdrop click and Esc. Panel uses `--color-bg` fill and `--shadow-lg`. |
| **FormField** | `label`, `hint?`, `error?` (replaces hint, danger colour), `children` (the control) |
| **PageHeader** | `title`, `subtitle?`, `tag?`, `tagTone?`, `onBack?`, `backLabel?`, `children` (right-aligned actions) |
| **NavItem** | `icon`, `label`, `active?`, `badge?: number` (hidden at 0), `badgeTone?: 'accent'\|'warning'`, `onClick` |
| **Stepper** | `steps: string[]`, `current: number`, `onStep(index)`, equal cells; done = check in accent square (clickable), current = accent-100 fill + 2px bottom bar, future = faint, disabled |
| **Accordion** | `title`, `open`, `onToggle`, `meta?: string` (right), `tag?`, `tagTone?`, `children` |
| **StatTile** | `label` (kicker style), `value?: string` or `cents?: Cents`, `hint?`, `tone?: 'default'\|'accent'\|'warning'\|'danger'` |
| **Logo** | `variant?: 'full'\|'mark'`, `size?: number = 28`, `theme?: 'dark'\|'light'`. Mark 7c: C cut parallel to the dashes, solid balance line to the centre, three dashes at 45° to the C's tip (see *Name and logo*). Optical stroke 3,2 / 2,6 / 2,2 for ≤ 20 / ≤ 32 / larger |
| **YearTable** | `equalColumns?: boolean` (fixed layout: first column `firstWidth` = 230 px, every data column the same width, min 130 px each, scrolls inside the card when narrower; used by the dashboard BalanceTable so account columns sit on an even rhythm), `firstWidth?`, `columns: {label, color?, align?, width?}[]`, `years: {key, label, tag?, tagTone?, tagIcon?, cells: Cell[], rows: {label, tag?, tagTone?, tagIcon?, muted?, highlight?: 'today'\|'payoff', cells: Cell[]}[]}[]`, `defaultOpen?: key[]`, `firstLabel?`, `onToggle?(key, open)`. `Cell = {type:'amount', cents, tone?, sign?, size?} \| {type:'icon', glyph, color?, title?} \| {type:'text', text} \| {type:'empty'}`. Year rows are clickable (chevron, condensed year, tag, bold totals); month rows sit on `--sb-ground-sunken`, today = accent-100, payoff = accent-200. Scrolls horizontally when narrow. Used by AccountDetail and BalanceTable. |
| **Sparkline** | `past: Cents[]`, `future: Cents[]`, `color`, `height?: 36`, solid past, dashed future, hairline tick at today |

### Features
| Component | Props | Reads |
| --- | --- | --- |
| **BalanceChart** | `defaultRange?: '1y'\|'3y'\|'payoff' = 'payoff'`, `height?: 300` | accounts, series, payoff. **Persists** the hidden accounts and the range across app starts (prototype: localStorage `dashcash-timeline-view`; app: user settings in the DB, like the BalanceTable column toggles) |
| **SavingPanel** | `onOpenAccount(id)` | accounts with goal, streak, headroom |
| **StreakStrip** | `current`, `best`, `months: {label, full, met: boolean\|null}[]` (11 past months), `actual: 0–1`, `projected: 0–1`, `nextMilestone`, `toMilestone` | none |
| **HeadroomMeter** | `value: Cents`, `budget: Cents`, `tone?` (derived if omitted), `label?`, `note?` | none |
| **AccountCard** | `accountId`, `onOpen(id)`, `onEdit(id)` | account, series, streak |
| **AccountList** | `onOpenAccount(id)` | accounts; owns AccountFormModal |
| **AccountFormModal** | `open`, `accountId?` (absent = create), `onClose`, `onDeleted?` | account; actions add/update/delete |
| **BalanceTable** | none | accounts (column headers and toggles use `account.short`, the institution without product words like Giro/Tagesgeld), series, payoff |
| **AccountDetail** | `accountId`, `onBack` | account, series, streak, headroom, recurring, assumptions |
| **ImportWizard** | `initialStep?: 0–4`, `initialAccount?: string` (preselects the target account), `onNavigate(page)` | accounts, categories, import preview; actions saveRule, addUncategorised |
| **CompareTable** | none (internal state: `mode: 'months'|'years'`, `sel`, `ysel`) | categories, spend per month (years = sum of months) |
| **CategoryList** | none | categories, rules; actions add/update/merge |
| **RuleList** | none | rules, categories; actions saveRule/deleteRule |
| **UncategorisedList** | none | uncategorised; actions categorise, saveRule |

### Layouts & pages
- **Sidebar** `active: PageId`, `version?: string`, `compact?: boolean`, `uncategorised: number`, `onNavigate(page)`, `onToggleCompact()`. Expanded 208 px (logo + labels); compact 64 px icon rail (logo mark, icon-only NavItems with tooltip, the uncategorised count as a small corner badge). Expanded: "Version 2.0.0" (11 px, faint) under the logo, aligned with the wordmark. The bottom always holds Settings, then a 38 px icon-only toggle row (chevronLeft = collapse, aligned with the nav icons; chevronRight = expand, centred in the rail). Both rows keep their height in either state, so Settings never moves. No footer text.
- **NavItem** gains `compact?: boolean` (icon only, centred, label as tooltip/aria-label, badge as corner chip).
- **Switch** (primitive) `checked`, `onChange(checked)`, `label?`, `ariaLabel?`, `disabled?` — square 34×18 track, accent when on.
- **Snackbar** (component) `tone: 'success'\|'error'\|'info'\|'warning'`, `title`, `message?`, `icon?` (defaults circleCheck / circleX / info / alert), `actionLabel?`, `actionIcon?`, `onAction?`, `secondaryLabel?`, `onSecondary?`, `onClose?`. Ground fill + 14 % tone tint, 1px tone hairline (55 %), `--shadow-lg`, tone-coloured icon. Primary action is a primary button for info/success, secondary for warning/error. role="alert" for error/warning, "status" otherwise.
- **SnackbarHost** (component) `items`, `onDismiss(id)`, `inline?`. Fixed bottom-right 24 px, 400 px wide, stacks the newest 3 with 10 px gap. Store: `notify({key?, tone, title, …, autoHide?})` (same key replaces), `dismiss(id)`. Success without a required action auto-hides (4–8 s); error and warning stay until dismissed.
- **AppShell** `active`, `uncategorised`, `onNavigate(page, accountId?)`, `height?`, `children`. Resets main scroll on page change. Owns the sidebar state: compact automatically below a 1200 px window, unless the user toggled it (stored in `localStorage['dashcash-sidebar-compact']`; in code a user setting). The layout always reserves only the 64 px rail; the sidebar is absolutely positioned on top (z-index 20), so expanding it to 208 px overlays the content (with `--shadow-lg`) and never moves it. Width animates 180 ms. The content column (max-width 1320 px) is centred in the main area (`margin: 0 auto`).
- **PageLayout** `title?`, `subtitle?`, `primaryAction?: {label, icon?, onClick}`, `children`.
- **Pages** take `onNavigate` (and `accountId` for AccountsPage) and compose only PageLayout + features.

---

## 4. Screens & behaviour

**Shell.** (version under the logo; Settings + icon-only collapse toggle at the bottom) Sidebar 208 px on `--sb-ground-sunken`: logo, five nav items, a "To do" group with *Uncategorised* + warning badge (only when the count > 0); bottom: *Settings*, then the icon-only collapse toggle. Version sits under the logo. Main column scrolls; the route is kept in `localStorage['dashcash-route']`.

**Dashboard.** Header (title + subtitle, no primary action; import is reached via the sidebar, the import reminder snackbar and per-account *Import* links).
- *BalanceChart*: legend chips per account (colour dot, name, balance today) toggle lines; at least one stays on. Range segmented: 1Y (Apr 26–Apr 27), 3Y (Oct 25–Oct 28), Until payoff (default; Jan 2024 → payoff + 3 months = Feb 2032 in the sample). The data runs Jan 2024 – Dec 2032 (mortgage contract end Oct 2032). One shared Y axis for all accounts; no secondary axis. When the large mortgage flattens the smaller balances, the legend toggles are the remedy (hide the mortgage to rescale). Y axis auto-scales to visible lines and always includes 0; nice steps (50 € … 50.000 €). Actual = solid 1.6px (mortgage 2px); projected = dashed 5/4 from the today point; projected zone shaded `--sb-ground-sunken`. *Today* line + label, a hollow dot per line at today (the logo motif). Payoff month (Nov 2031 in the sample) = `--sb-milestone-tint` band, dashed 3/3 line in `--sb-milestone` (1.25 px), flag label "Mortgage paid off · Nov 2031" in `--sb-milestone`, filled milestone-green dot where the debt line meets 0; if payoff is beyond the range, the label sits at the right edge with →. Hover: vertical crosshair, dots, tooltip (month, Actual/Projected/Payoff month, value per visible account).
- *SavingPanel*: equal cells, one per account with a goal. Each: name + colour dot, goal sentence, StreakStrip, then HeadroomMeter (Income, Spending, Credit card) or a goal-progress meter (Savings, Mortgage). Click a cell → account detail.
- *BalanceTable* (below the panel): one table for all accounts. *Edit* (secondary, sm) switches to edit mode: a row of account chips (colour dot) toggles columns in/out, at least one stays; *Done* (primary) closes it. Outside edit mode the row reads "All 5 accounts shown" / "3 of 5 accounts shown". Hidden accounts persist in `localStorage['dashcash-balance-table-hidden']` (in code: a user setting). Net recalculates over the shown accounts and is labelled "Net (shown)" when any are hidden. Columns: Year · month, one per account (colour dot + name), Net (all balances minus the mortgage Restschuld). Year rows (2024–2032) are clickable and show the year-end balance per account plus a tag Actual / Actual · projected / Projected (payoff year 2031: "Payoff Nov" with flag, Tag `tone="milestone"`). The current year is open by default; open years list the 12 month-end balances. Future months are faded (Amount `muted`); October 2026 (today) = accent-100, no tag; the payoff month (Nov 2031) = `--sb-milestone-row` with the milestone tag "Mortgage paid off". Columns use YearTable `equalColumns`. Mortgage values are red (debt), 0 after payoff.

**Streak display.** A 12-cell strip: 11 past months as squares (met = solid accent-500; missed = red: `--sb-danger` 1 px border, `--sb-danger-tint` fill, red diagonal stroke and red month letter (so the blue run reads as something to protect); no data = hairline), plus a taller dashed-frame *Now* cell that fills from the bottom, solid for progress so far, a dashed line at the level reached once items still due this month book (the solid-then-dashed motif again). Above: the streak number (34 px condensed), "months in a row" and a small flag "4 to 12" towards the next milestone (3, 6, 12, 18, 24, 36…); hover shows the best streak. Playful through rhythm and milestones, without colour bursts or animation beyond a 400 ms fill.

**Streak rule (what counts).** A month is met when the account reaches its goal. **Transfers to a savings or mortgage account never count against the sending account** (paying off debt or moving money to savings is saving, not spending), so the yearly Sondertilgung from Renault Bank Tagesgeld (6.500 € every November) does not break Renault's streak, and the 955 € mortgage payment does not count against Postbank Giro. Transfers to a spending account, like the monthly 500 € allowance from Postbank Giro to Sparkasse Giro, still count. In the sample, Renault therefore has an unbroken streak.

**Data freshness.** Balances, history and headroom contain imported transactions only; there is no manual entry in v2 (planned later, with reconciliation against the CSV row). Typical spending feeds only the projection of future months, never the headroom. So every account shows when it was last imported:
- SavingPanel cell footer (under the headroom/goal): calendar icon + "Last import: 3 days ago" (faint); tooltip "Includes transactions imported up to 23 Oct. Later purchases are not counted yet."
- AccountCard row "Last import · 3 days ago"; AccountDetail subtitle and Goal card (label with date + note "Headroom uses the balance from imported transactions only…").
- **Stale (older than the account's reminder limit, default 7 days, set in Settings):** the per-account text turns accent-600 with an *Import* link (→ Import page with that account preselected). At app start a **warning snackbar** appears bottom right: "Time for a fresh import", the accounts with their days, *Import …* (secondary) and *Later*. Amber icon + amber hairline + 14 % amber tint: noticeable, not alarming. A finished import dismisses it and sets that account to "today".
- Day stamp per account is stored as `lastImport`; `importAge(a)` returns `{days, date, label, stale}`.

**Headroom.** `headroom = balance today + recurring still due this month − (balance at month start + goal)`; card: `cap − spent`. Tone: neutral while the headroom is ≥ 20 % of the **headroom at the start of the month** (the month's budget: on the 1st, `balance at month start + all recurring items due that month − (balance at month start + goal)`; for the card the cap), **warning** below 20 %, **danger** at ≤ 0. Headroom is shown on Income, Spending and Credit card; Savings and Mortgage show goal progress instead. Copy: "of 450,00 € left this month" → "Getting close: goal holds if you stay under this" → "Goal missed this month at this pace".

**Accounts.** Grid of AccountCards (auto-fill, min 300 px) + a dashed *New account* tile. Card: type kicker, name, balance today (xl), 25-month sparkline (12 back, today, 12 ahead), goal + streak (mortgage: payoff month), *Open details*, *Edit*. Clicking the card opens the detail; Edit opens AccountFormModal.
- *AccountFormModal*: name, type (with its projection rule as hint), balance today (Restschuld for mortgage; editing hint: "adds a correction dated today; older months stay"), goal (label per type: grow by / stay under / reduce by), *Settled from* for cards. Edit mode has *Delete* → inline confirmation (danger box) → delete returns to the list.
- *AccountDetail*: back link, title + type tag, subtitle with balance today + projection rule, *Edit account*. Left (7/12): year accordion 2024–2032 (current year open); each year shows a tag Actual / Actual · projected / Projected (or the milestone tag "Payoff Nov" in 2031) and the year-end balance. Rows: month, month-end balance (future muted), change, goal icon (Lucide 14px with tooltip: `check` green = met, `x` faint = missed, `loaderCircle` accent = current month in progress; blank for future months or no goal), row tags. October row (today) = accent-100, no tag. Both tables are the shared YearTable component; month rows sit on `--sb-ground-sunken`; year rows show year-end balance, change over the year and "n of 12 met". Payoff row (Nov 2031) = `--sb-milestone-row` + milestone tag "Paid off" with flag. Right (5/12): Goal card (StreakStrip + headroom), Recurring items (icon repeat/transfer, name, interval · next date, signed amount, edit/delete, *Add recurring item* → modal: name, amount, interval, next date), Projection assumptions (bullet list, per type).

**Import (5-step wizard).** Stepper on top; footer with Back, "Step n of 5" and the primary next action (labelled with the next step; last = "Import 20 rows" (25 rows in the sample file − 5 duplicates)). Completed steps are clickable in the stepper.
1. *File*, target account radio tiles; dashed drop zone (click or drag a file). Then a file row with the detected profile tag (accent "Sparkasse CSV-CAMT V2 detected"; for the card account: warning "New bank format"). Next is disabled until a file is chosen.
2. *Preview*, four StatTiles (rows + range, new rows, duplicates skipped, total spending); the balance-check warning (CSV vs calculated, difference); column mapping: collapsed with "Show mapping" for a saved profile, open by default for a new bank (Selects per field + first-row example).
3. *Categories*, filter All / No category / From rules; "10 matched a rule · 8 new". No per-row confirmation: rule matches are trusted and count as categorised; the user only changes rows that are wrong. Rows: date, merchant + purpose, amount, category Select, source tag: *Rule · exact* / *Rule · contains* + the rule text, *New* ("No rule yet"), or *Manual* ("Saves exact rule "…"") after a change. **A manual change applies at once to same-merchant rows:** the exact rule it saves is applied immediately to the other rows of this import with the same normalised merchant (tag *Rule · exact*, note "Your new rule "…""), except rows edited by hand or reset. Clearing or resetting the source row reverts them; resetting an applied row opts it out. **Tab membership is snapshotted** when a tab is picked: editing a row never removes it from the current view; the list re-filters on the next tab switch. **Reset per row:** a changed row (Manual) shows a ghost sm icon button (`undo`, 28 px, in a fixed 28 px slot, `--space-3` gap right of the Select) with tooltip "Reset to rule: {category}" or "Reset to no category"; it restores the imported category and source and drops the rule it would save. **Rows with no category** (needs attention, never blocking): warning tint background, 3 px warning left edge, the category Select in `tone="warning"` (warning border, placeholder "Pick a category" in warning colour). Above the table, while any exist, a warning notice (alert icon, warning border + tint): "n rows have no category yet. You can still import: they are saved as uncategorised and you can finish them later from the sidebar." with a small secondary *Show them* button that sets the filter to *No category* (filter options: All · No category · From rules). Red is reserved for errors that do block; this never blocks, so it uses warning. No confidence percentages anywhere.
   - **Cash:** cash purchases never appear in a CSV, only the ATM withdrawal. A built-in contains-rule ("Bargeld · Geldautomat · ATM", on merchant + purpose) gives withdrawals the built-in category *Cash*; they count as spent on the withdrawal date. Sample row: "12 Oct · Sparkasse Geldautomat 0412 · Bargeldauszahlung GA 0412 · −100,00 €", source tag *Rule · built-in*, note "Cash withdrawal, counted as spent on 12 Oct". The built-in rule and the Cash category carry a *Built-in* tag in Categories and cannot be deleted (rename/recolour allowed).
4. *Recurring & transfers*, two cards: recurring candidates (payee, months seen, interval, next date, amount, *Recurring* checkbox) and transfer candidates (this side ↔ other account with dates, *Link* checkbox).
5. *Summary*, Spending and income this month vs previous month, rules to save (list: Exact · pattern → category), left uncategorised (warning tone if > 0), recurring/transfer counts, target account.
- *Import* saves the manual rules, adds rows without a category to Uncategorised (sidebar counter updates), and shows a done card: *Go to dashboard*, *Review uncategorised* (if any), *Import another file*.

**Compare.** A *Months | Years* segmented control in the picker card switches the period type (default Months; each mode keeps its own selection). **Years**: one chip per year that contains imported data; the chip range runs from the year of the first month with transactions to the year of the last (sample: 2024–2026). Up to 4, default 2025 + 2026; each cell = the calendar year's total. The current year is partial and its column is labelled "2026 · to date". **Like for like:** when the current year is selected, every selected year is summed over the same months (Jan to the current month) and a note above the table reads "Compared Jan–Oct in every year, so the partial year is fair." The note carries a *Full years* switch (off by default): on, the columns go back to full calendar years, the current year stays labelled "to date", the note reads "Full calendar years. 2026 runs to date and is left out of the highlight.", and the current-year column is excluded from the highest-value highlight. Without the current year selected there is no note and full years are compared. Change column compares the earliest with the latest selected column in both modes (header e.g. "2024 → 2026" / "Jul → Oct"); the highlight legend reads "Highest year per row" / "Highest month per row". **Months**: month chips for the last 12 months; up to 4 selectable (others disable at 4; at least 1 stays). Table: category (swatch + name), one column per month (October labelled "to date"), and the change from the earliest to the latest selected month, signed as the effect on your money (more spending = −, red; less = +, green). Sections *Variable* ("Where saving is possible") and *Fixed* ("Recurring items"), each with a subtotal, then *All spending*. Highest value per row = accent-200 cell + inset ring (not when the row is constant). Covers all accounts incl. the card; transfers excluded.

**Categories.** Two columns (wrap below ~1100 px). *CategoryList*: swatch, name, kind tag (Variable / Fixed / Income), transactions, rules, rename (modal: name + the 40-colour picker, see *Category colours*; kind only on create) and delete-as-merge (modal: counts moved, replacement Select, danger *Delete and merge*). *RuleList*: search, filter All / Exact / Contains, an explainer on normalisation and PayPal/Klarna purpose matching; rows: match tag (Exact = accent, Contains = outline), pattern, field, category, hits, edit (modal: match type, pattern, field, category) and delete.

**Uncategorised** (via the sidebar counter). Rows: date, account, merchant + purpose, amount, category Select; picking one files the row immediately (it leaves the list, the counter drops). "Save as exact rule" checkbox (default on) creates a rule from the normalised merchant (or purpose for PayPal/Klarna). Empty state: "All caught up".

---

**Import page:** the ImportWizard, then the ImportedFiles card below it.
- *ImportedFiles* (on the Import page, under the wizard): Original CSVs are always kept locally (a few KB each); table of CSVs (label + file name and size, account, period covered, rows, imported date) with *Download*, *Edit* (modal: label, move to another account) and *Delete* (modal with two choices: delete the file only, or the file and its transactions).

**Settings** (sidebar, above the collapse toggle). One auto-fit grid (min 460 px), cards stretch per row; order: Import reminders, Data, Bank profiles, Updates.
- *ReminderSettings*: master switch "Reminders"; per account a switch and "After 3 / 7 / 14 / 30 days without import", plus the last import (amber when overdue). Defaults: on with 7 days for Postbank, Sparkasse and Visa; off (30 days) for Renault and Darlehen.
- *UpdateSettings*: current version, status, last checked, *Check now* (shows "Checking…", then the update snackbar or a success "You're up to date"), *Restart and update* when available; switches "Check for updates at start" and "Install updates automatically on restart".
- *BankProfiles*: saved column mappings per bank with columns and last use; delete means the mapping is asked again on the next import.
- *DataSettings*: **Database folder** field (read-only Input with database icon + secondary *Change…*, both 36 px) showing the folder of dashcash.db and the CSVs; *Change…* opens a "Move the database" modal: folder Input + *Browse…* (native folder picker), *Reset to default* (ghost, disabled when already default), *Cancel*, *Move and restart* (disabled while empty or unchanged); afterwards a success snackbar "Database moved". Then *Back up now*, *Restore from backup* (warning snackbar to confirm), *Export all transactions (CSV)*, last backup, start page, fixed formats.

**Snackbar use cases.** Auto-update (info, at start when "Check at start" is on: "DashCash 2.1.0 is available" → *Restart and update* → "Installing…" → success "Updated to 2.1.0"); import reminder (warning); import error (error, e.g. dropping a non-CSV file onto the import drop zone); import done, download, delete and backup confirmations (success). Prototype tweak `demoSnackbar` on DashCash fires each tone.

## 5. Interaction details

- Hover: rows/tiles `--sb-hover`; chips/selected accent-100; buttons per Industry (`.btn-*`). Focus: 2px accent outline.
- Transitions: accordion chevron 160 ms, meter width 300 ms, streak fill 400 ms, auto-scroll on expand (smooth); loaders loop 1,6 s (see *Loaders*). Nothing else animates.
- Modals: Esc / backdrop close; forms validate on save (name required, amounts parse German input `1.529,60`).
- Charts: crosshair snaps to month ends; the tooltip flips to the left near the right edge.

## Name and logo

The app is named **DashCash** (dash first, cash second: the dashed projection line, then the C for cash). The mark is final (Logo Options **7c**): the balance line, solid past and dashed future, inside an open C. One colour (accent-600 #94bce3 on dark, #416180 on light), viewBox 0 0 32 32, no fill, butt caps, miter joins.

- **C:** arc of the circle centred (16,16), r 13, `M25.2 6.8 A13 13 0 1 0 29 16`, clipped by an even-odd clipPath `M-2 -2 H34 V34 H-2 Z M16 16 L32.66 16 L23.46 25.2 L16 25.2 Z`. The top end is cut radially at −45° (25.2,6.8), where the dashes meet it; the bottom end is cut along the line x + y = 48.66 (about 20° below horizontal), which runs parallel to the dashes, so both ends share the 45° angle.
- **Solid line (the past):** `M3.3 19 L8.5 16.5 L12.5 19.5 L16 16`. It starts on the circle and ends at the centre (16,16); the last segment runs at 45°.
- **Dashes (the future):** three dashes on the 45° line from the centre to the C's top end, gap first. With u = 13/9 along the line, dashes cover u…3u, 4u…6u and 7u…(13 + stroke/2), gaps 0…u, 3u…4u and 6u…7u. Drawn as `M16 16 L22.128 9.872` with `pathLength="6"`, `stroke-dasharray="2 1"`, `stroke-dashoffset="2"` (dashes 1 and 2), plus dash 3 as its own segment from (23.149, 8.851) to 16 ± 0.7071·(13 + stroke/2), so its tip is flush with the outer edge of the C's top end.
- **Optical sizing (stroke width):** ≤ 20 px 3.2; ≤ 32 px 2.6; larger 2.2. Dash 3's end point follows the stroke width.
- **Variants:** `full` (mark + wordmark "DashCash", Barlow Condensed 600 at 0.78 × size, letter-spacing 0.02em, gap 0.32 × size) and `mark`.

## Control sizing

Every interactive control uses one of two heights, set as a fixed `height` with `box-sizing: border-box`, vertical padding 0, `line-height: 1`, and content centred by flex:
- **md 36 px:** Button md, icon-only Button md (36 × 36), Input, Select, Segmented `size="md"`. Used in forms, modals and page headers.
- **sm 28 px:** Button sm, icon-only Button sm (28 × 28), Input/Select `size="sm"`, Segmented (default), Chip. Used in toolbars, table cells, card headers and snackbars.
- Fixed exceptions: NavItem 38 (expanded and compact, so nothing shifts on collapse), Tag 22, Stepper step 44, account picker tile 44, Checkbox 16 box, Switch 34 × 18.
- Pair rule: a button next to an input always uses the same size (md + md, sm + sm).
- Icon + text: icons 16 in md, 14 in sm, gap 6 (Button) / 8–10 (rows); always `align-items: center`. Input and Select adornments (search icon, € suffix, chevron, swatch) are absolutely positioned and vertically centred over the full control height.
- Disabled controls (45 % opacity, `not-allowed` cursor) have no hover or pressed state: secondary/ghost stay transparent, primary stays accent, disabled chips keep their resting fill.
- Table headers never wrap (`.table th { white-space: nowrap }`).

**Expanding rows (accordions, year rows).** The clicked row stays exactly where it is and new content opens below it, pushing only what's below down. The main scroll area sets `overflow-anchor: none`, because the browser's scroll anchoring would otherwise keep a lower element fixed and shove everything above the clicked row upward. Collapsing works the same way in reverse.
**Auto-scroll on expand** (`lib/reveal.js` → a `useRevealOnExpand(headRef, blockRef)` hook in code). After a year row or accordion opens, if its content runs past the bottom of the scroll area, the area scrolls smoothly just far enough to show the whole block with a 24 px margin. It never scrolls the clicked row above the top edge (24 px margin): for long blocks the row lands near the top and the rest stays scrollable. Nothing happens when the block already fits, or on collapse. With `prefers-reduced-motion` it jumps instead of animating.

**Import step 1, file slot.** Both step 1 cards stretch to the same height (grid `align-items: stretch`); the CSV card's slot fills the remaining height (`flex: 1`, min 190 px), so it lines up with the Target account card and choosing a file never changes the height. Empty: the dashed drop zone. With a file: the same slot shows the file icon, name, size, the profile tag ("Sparkasse detected" / "New bank format"), and two small buttons: *Replace file* (opens the picker again; dropping a new CSV onto the slot also replaces it) and *Remove* (back to the empty drop zone, which disables *Next*).

**Card fill.** Cards are filled with `--sb-card-bg` = `--color-surface` (#213345), one step lighter than the page, and keep a softened 1 px outline (`--sb-card-border`, text at 8 %, half the divider strength) so fill and line don't double up. Stat tiles take the same fill and outline. Modals and snackbars use `--sb-raised-bg` (surface) plus their shadow, so inputs inside a modal read as inset like on cards. Inner hairlines (table rules, control borders, picker tiles) keep `--color-divider`. Inputs and selects then use `--sb-input-bg` = `--color-bg` so they read as inset on a filled card. Opened month rows stay `--sb-ground-sunken`. The DashCash prop `cardFill: 'surface' | 'none'` (tweak) switches back to the transparent line-drawing cards of the Industry system (inputs return to surface).

**Category colours.** 40 colours, `--sb-cat-1…40`: 40 different hues at one lightness (OKLCH L 0.75, chroma 0.12), about 9° apart, so the difference is hue only, never brightness. They are numbered in golden-angle order (137.5° steps), so colour n and n+1 are always far apart and the first free colour is distinct from the ones before it. The picker sorts them by hue into four rows of ten. Each colour belongs to at most one category:
- A colour used by another category is dimmed to 45 %, crossed out with a thin diagonal, disabled, and its tooltip says "Used by Groceries". The category's own colour stays selectable.
- Deleting (merging) or recolouring a category frees its colour at once.
- *New category* preselects the first free colour.
- When all 40 are taken, the used colours become pickable again (still crossed out), the default is the colour of the category with the fewest transactions, and the hint says "All 40 colours are in use. Sharing with …". Creating is never blocked.

**Mortgage sample (invented sample data, chosen to show a long time span in the graph).** Contract Nov 2022 – Oct 2032 (10 years): 130.000 € loan, 160.000 € total owed incl. interest (the fixed total is tracked, so no rate is modelled), 90.000 € left today. 955 € monthly from Postbank Giro, 6.500 € Sondertilgung every November from Renault Bank Tagesgeld. `SB.mortgagePlan()` builds the schedule: in the Sondertilgung month the extra payment goes first and is **capped to what is left**, the regular payment is capped too, and nothing is paid after 0. Result: full Sondertilgungen Nov 2026–Nov 2030, then in Nov 2031 only 200 € are left, so the last Sondertilgung is 200 € instead of 6.500 € and the regular payment is 0. Payoff Nov 2031, 11 months before the contract end. After payoff the 955 € stays on Postbank Giro and no further Sondertilgung leaves Renault Bank. The timeline runs Jan 2024 – Dec 2032 and the year tables list 2024–2032; the graph opens on *Until payoff*.

**Spacing between cards.** One gap everywhere: `--space-6` between cards, both horizontally and vertically (page sections via PageLayout, card grids, stat tile rows, side-by-side columns). Cards that share a row stretch to the same height (`align-items: stretch`, each card in a `display: grid` cell with the Card at `height: 100%`), so the gap below a row is the same under every card. Settings is one auto-fit grid (min 460 px) instead of two separate rows. Inside a card, spacing is `--space-3` between blocks.

## Loaders

**Loader** (component) `variant: 'draw'|'march'|'orbit'|'grow' = 'draw'` (8a Draw is the chosen motion; the others stay as documented alternatives), `size = 32`, `label?`, `delay = 300` (ms before it appears, so quick tasks never flash), `dashesOnly?`, `color = accent-600` (`currentColor` inside buttons). Indeterminate only; one loop is 1,6 s, ease-in-out. role="status", aria-label = label or "Loading". `prefers-reduced-motion`: all motion stops and the whole mark breathes (opacity 1 → 0,45, 2,4 s).
- Geometry is the logo (C, solid line, three dashes). **≤ 20 px** the mark is reduced to its three dashes on the 45° line (stroke 5,2 in a 32 viewBox) so it stays legible in buttons and inline.
- *draw*: dash first, cash second, like the name. The solid line draws (0–24 %), the dashes appear one by one (24–30 / 32–38 / 40–46 %), then the C (hidden until then, `opacity: 0`, so no sliver of it shows early) traces in starting from where the last dash ends, at its top tip, around to the bottom cut (48–78 %); hold, all fade out (86–100 %).
- *march*: C and line static; the three dashes pulse 0,2 → 1 → 0,2 in turn (offset 1/6 loop).
- *orbit*: the C rotates around the centre, line and dashes static.
- *grow*: dashes light up one after another (20 / 42 / 64 %) and stay lit, then reset.
- **Button** gains `loading?: boolean`, `loadingLabel?`, `loaderVariant?`: the icon is replaced by a Loader at icon size, the label becomes the -ing form, the button is disabled but stays at full strength (`aria-busy`, `cursor: progress`), width does not jump.
- Contexts (Loader Options.dc.html): app-start splash (72 px + wordmark + "Opening your accounts…"), full-screen overlay (backdrop + raised panel, 48 px + message), card/section (32 px + label on a sunken well), import progress (16 px in a step list with checks for done steps), buttons, inline (14 px + "Checking…"), snackbar (18 px replaces the tone icon).

**LoadingOverlay** (component) `open`, `variant: 'overlay'|'splash' = 'overlay'`, `title`, `message?`. *splash*: fixed full screen on the ground, Loader 72 + wordmark + title ("Opening your accounts…"), shown once at app start for one full loop (1,6 s) counted from the moment the mark has mounted, never from boot, so the first frame is never an empty box (fallback: closes after 4 s). *overlay*: backdrop + raised panel, Loader 48 + title + message, blocks the app (z 70). Wired in the prototype: app start (splash), Settings → Move the database (overlay 1,8 s, then success snackbar), Updates → Check now (busy button "Checking…"), update install (snackbar with Loader instead of the info icon).
