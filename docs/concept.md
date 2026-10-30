# DashCash: Concept

Oct 26, 2026

## Purpose

> Horizon showed what's ahead. DashCash shows the whole line: where your money came from, where it is today, and where it's heading.

DashCash shows where your money has been, where it is, and where it is going, on one timeline across all accounts. The past comes from imported bank CSVs, the present from a known balance per account, and the future from recurring items and typical spending, up to the day the mortgage is paid off.

On top sits a motivation layer: each account has a monthly savings goal, a streak counts the months it was met, and the spending account shows how much headroom is left this month before the streak breaks.

DashCash is the successor to Horizon and starts in a fresh repo. Horizon stays as it is, as the "before".

## Accounts

Every account has a type, and the type decides how it is projected and what its streak means. All money moving between accounts is a transfer: one account shows −500 €, the other +500 €, and neither counts as spending.

| Type | Example | Role | Projection |
| --- | --- | --- | --- |
| Income | Postbank | Receives salary, pays fixed costs, settles the credit card | Recurring items only |
| Spending | Sparkasse | Receives a monthly allowance (500 €), pays groceries, Amazon, leisure | Recurring items + typical variable spending |
| Savings | Renault | Receives savings, pays the yearly Sondertilgung | Recurring items only |
| Credit card | Card | Purchases with categories, settled to 0 once a month | Resets to 0 on settlement day |
| Mortgage | Darlehen | Restschuld; fixed total, fixed monthly payment | Recurring transfers + Sondertilgung |

**Anchor.** When an account is created, you enter its balance today. History is calculated backwards from that anchor using the imported transactions, and the future is calculated forwards. Editing the balance later adds a correction at that date; older months stay as they were.

**Mortgage.** The total owed is fixed and the payment is fixed, so no interest is modelled. A monthly recurring transfer reduces the Restschuld; a yearly Sondertilgung from the savings account reduces it further. The payoff date is the month the Restschuld reaches 0.

**Credit card.** The card is linked to Postbank, which settles it to 0 on a fixed day each month. The settlement is a transfer. Card purchases (Kickstarter, cat food, sometimes Amazon) are normal transactions with categories, so they appear in the monthly category comparison like everything else.

Recommendation: keep the settlement on Postbank and keep card spending outside the Sparkasse headroom. The card is small and rare; routing it into the allowance would add a special case for little gain. Postbank's projection includes the settlement as one variable item, estimated from the median of past settlements. If the card ever becomes everyday spending, switch the settlement to Sparkasse, and the headroom then covers it automatically.

## Transactions, categories and rules

A transaction is one of three kinds: expense, income or transfer. Expenses and income carry a category; transfers carry the other account instead. Any transaction can be marked recurring.

**Categories** have a name and a colour. Renaming one updates it everywhere. Deleting one asks for a replacement category, so it is effectively a merge: its transactions and rules move to the replacement, and nothing becomes uncategorised silently.

**Rules** are one list with two match types: exact (a merchant you approved once) and contains (a keyword such as "AMAZON"). There is no separate "remembered merchants" list. Matching runs on a normalised merchant name: lower case, legal suffixes and reference numbers removed. For payment providers such as PayPal and Klarna, matching uses the purpose text, because the payee is always the provider.

**Recurring items** have an amount, an interval (monthly, quarterly, yearly) and a next date. Examples: salary, rent, allowance transfer, phone bill, subscriptions, Wohngeld, electricity, cat insurance, mortgage payment, Sondertilgung. They can be marked during import and edited on the account detail page.

**Money** is stored as integer cents everywhere. Floats never hold an amount.

## CSV import

Import is a five-step wizard. A file may cover any date range; overlapping files are fine because duplicates are skipped.

1. **File.** Pick the target account and drop the CSV. The bank profile (Postbank, Sparkasse, card) is detected from the header row.
2. **Preview.** Row count, date range, total spending, duplicates skipped. The column mapping is shown only the first time per bank and saved as a profile.
3. **Categories.** Each row shows its suggestion and its source: rule (exact or contains), or new. No confidence percentages. One button confirms all rule matches. A manual change saves an exact rule by default.
4. **Recurring and transfers.** Only candidates are shown: payees with the same amount in several months (mark as recurring), and matching amounts with opposite signs between your own accounts within a few days (link as transfer).
5. **Summary.** Spending and income versus the previous month, rules that will be saved, and how many rows remain uncategorised.

The import does not block on unconfirmed rows. They are saved as uncategorised, and a counter in the sidebar shows how many are left.

**Duplicates** are detected by date, amount, normalised merchant and purpose text. Identical rows within one file (two 3.50 € coffees on the same day) are counted, so both are kept.

**Balance check.** If the CSV states a balance, it is compared with the calculated balance for that date. A mismatch shows a warning with the difference.

## Projection

The projection starts from each account's balance today and applies, month by month, only things you can see and edit.

- **Recurring items** on every account, applied exactly on their dates.
- **Typical variable spending** on spending accounts only: the median of the non-recurring spending of the last 6 months. A median ignores one-off months like December. With fewer than 3 months of history, the spending account assumes the allowance is spent apart from its savings goal.
- **Credit card settlement** on Postbank: the median of past settlements.

The projection uses an average, never a trend: a rising trend extrapolated over years becomes absurd.

Past and future share one table and one graph, with a marker for today. Past months show actual balances; future months show projected ones. The payoff month of the mortgage is highlighted. The assumptions behind each account's projection are listed on its detail page.

## Saving

Saving means an account balance grew. Category spending is a separate signal that warns or motivates, but it does not decide the streak.

**Goal.** Each account can have a monthly goal: "grow by X € per month".

**Streak.** The number of consecutive months an account met its goal, measured on the balance at the start and end of each calendar month. The dashboard shows each streak and the progress towards this month's goal in a playful way.

**Headroom.** For the current month, how much can still be spent before the goal is missed:

```latex
\text{headroom} = \text{balance today} + \text{recurring items still due this month} - (\text{balance at month start} + \text{goal})
```

On Sparkasse this reads as: 500 € allowance − spent so far − goal = what is left. Headroom turns from neutral to a warning as it approaches 0.

**Category comparison.** Spending per category for up to 4 chosen months side by side, the highest value per row highlighted, and the change between the last two months. Fixed (recurring) categories are separated from variable ones, because only variable spending can be saved on. It covers all accounts, including the credit card.

## Screens

A panel on the left navigates between five pages. The UI is in English and deliberately simple.

| Page | Shows | Main actions |
| --- | --- | --- |
| Dashboard | Balance graph with past, today and future per account, mortgage payoff marked; streaks, goal progress and headroom per account | Jump to import |
| Accounts | One card per account; detail page with a year accordion (month-end balances, actual and projected), recurring items and projection assumptions | Create, edit, delete accounts; set balance today and goal; edit recurring items |
| Import | The five-step wizard | Import a CSV |
| Compare | Spending per category across up to 4 months; fixed and variable separated | Pick months |
| Categories | Categories with colour and usage; the rule list | Create, rename, merge categories; edit and delete rules |

The sidebar shows the number of uncategorised transactions when it is above 0.

## Scope

v2 ships the account model, import, categories, projection and saving features described above, plus auto-update. Everything else waits until it can come in as a normal feature through the pipeline.

- **In:** accounts with anchor and five types; CSV import with rules, recurring items and transfers; categories; month comparison; dashboard graph with payoff; goals, streaks and headroom; auto-update.
- **Out for now:** dashboard clock, quick start guide, native menu beyond the defaults.
- **Out by decision:** AI features. Bank data stays on the machine; the AI story lives in how the app is built.

## Architecture and quality gates

Architecture, folder structure and workflow are in [conventions.md](conventions.md); the gates and their rollout in [quality-gates.md](quality-gates.md). The UI is specified in [design/SPEC.md](design/SPEC.md), which supersedes the screen list above where they differ.
