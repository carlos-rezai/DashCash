// DashCash mock store, invented sample data, integer cents everywhere.
// In code this is the domain package + IPC contract; features read it through hooks.
(function () {
  if (window.SB) return;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const START_YEAR = 2024, TODAY_IDX = 33, LAST_IDX = 107; // Jan 2024 … Dec 2032 (mortgage contract ends Oct 2032)
  const mLabel = (i) => MONTHS[i % 12] + ' ' + (START_YEAR + Math.floor(i / 12));
  const mShort = (i) => MONTHS[i % 12];
  const mYear = (i) => START_YEAR + Math.floor(i / 12);
  const nf = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  function eur(c, o) {
    o = o || {};
    if (c == null || isNaN(c)) return '';
    const neg = c < 0;
    let s = (o.whole ? nf0.format(Math.abs(c) / 100) : nf.format(Math.abs(c) / 100)) + '\u00a0€';
    if (neg) s = '\u2212' + s; else if (o.sign && c > 0) s = '+' + s;
    return s;
  }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const TYPES = {
    income: { label: 'Income', color: 'var(--sb-acc-income)', goalKind: 'grow', projection: 'Recurring items only' },
    spending: { label: 'Spending', color: 'var(--sb-acc-spending)', goalKind: 'grow', projection: 'Recurring items + typical variable spending' },
    savings: { label: 'Savings', color: 'var(--sb-acc-savings)', goalKind: 'grow', projection: 'Recurring items only' },
    card: { label: 'Credit card', color: 'var(--sb-acc-card)', goalKind: 'cap', projection: 'Resets to 0 on settlement day' },
    mortgage: { label: 'Mortgage', color: 'var(--sb-acc-mortgage)', goalKind: 'reduce', projection: 'Recurring transfers + Sondertilgung' }
  };

  const state = {
    accounts: [
      { id: 'postbank', name: 'Postbank Giro', short: 'Postbank', type: 'income', anchor: 354612, monthStart: 238000, goal: 5000, budget: 50000, due: -68640, dueLabel: 'card settlement and savings transfer on 28 Oct', projGrowth: 7292, seed: 11, missed: [3, 9, 14, 20, 24], lastImport: 33 * 31 + 23 },
      { id: 'sparkasse', name: 'Sparkasse Giro', short: 'Sparkasse', type: 'spending', anchor: 152960, monthStart: 141200, goal: 5000, budget: 45000, due: 0, projGrowth: 6250, seed: 23, missed: [2, 7, 12, 18, 23, 26], lastImport: 33 * 31 + 17 },
      { id: 'renault', name: 'Renault Bank Tagesgeld', short: 'Renault Bank', type: 'savings', anchor: 1188000, monthStart: 1188000, goal: 60000, due: 60000, dueLabel: 'savings transfer on 28 Oct', seed: 5, lastImport: 33 * 31 + 21 },
      { id: 'card', name: 'Visa Card', short: 'Visa', type: 'card', anchor: -8640, monthStart: -2150, goal: 15000, spent: 8640, budget: 15000, seed: 31, missed: [5, 11, 16, 22, 29], linked: 'postbank', lastImport: 33 * 31 + 14 },
      { id: 'darlehen', name: 'Darlehen', short: 'Darlehen', type: 'mortgage', anchor: 9000000, monthStart: 9095500, goal: 95500, total: 16000000, loan: 13000000, start: 'Nov 2022', contractEndIdx: 105, payment: 95500, sondertilgung: 650000, stMonth: 10, seed: 3, lastImport: 33 * 31 + 22 }
    ],
    recurring: [
      { id: 'r1', account: 'postbank', name: 'Salary · Muster Logistik GmbH', amount: 287000, interval: 'Monthly', next: '27 Nov 2026', kind: 'income' },
      { id: 'r2', account: 'postbank', name: 'Wohngeld', amount: 11200, interval: 'Monthly', next: '1 Nov 2026', kind: 'income' },
      { id: 'r3', account: 'postbank', name: 'Rent · Wohnbau Nord', amount: -112000, interval: 'Monthly', next: '1 Nov 2026', kind: 'expense' },
      { id: 'r4', account: 'postbank', name: 'Allowance → Sparkasse Giro', amount: -50000, interval: 'Monthly', next: '1 Nov 2026', kind: 'transfer' },
      { id: 'r5', account: 'postbank', name: 'Savings → Renault Bank', amount: -60000, interval: 'Monthly', next: '28 Oct 2026', kind: 'transfer' },
      { id: 'r6', account: 'postbank', name: 'Mortgage payment → Darlehen', amount: -95500, interval: 'Monthly', next: '1 Nov 2026', kind: 'transfer' },
      { id: 'r7', account: 'postbank', name: 'Electricity · Stadtwerke Nord', amount: -6800, interval: 'Monthly', next: '5 Nov 2026', kind: 'expense' },
      { id: 'r8', account: 'postbank', name: 'Phone · Telefonica', amount: -2499, interval: 'Monthly', next: '15 Nov 2026', kind: 'expense' },
      { id: 'r9', account: 'postbank', name: 'Cat insurance · PetProtect', amount: -1490, interval: 'Monthly', next: '1 Nov 2026', kind: 'expense' },
      { id: 'r10', account: 'postbank', name: 'Streaming · Flimmer+', amount: -1299, interval: 'Monthly', next: '9 Nov 2026', kind: 'expense' },
      { id: 'r11', account: 'sparkasse', name: 'Allowance ← Postbank Giro', amount: 50000, interval: 'Monthly', next: '1 Nov 2026', kind: 'transfer' },
      { id: 'r12', account: 'sparkasse', name: 'Music · Spotify via PayPal', amount: -1099, interval: 'Monthly', next: '22 Nov 2026', kind: 'expense' },
      { id: 'r13', account: 'renault', name: 'Savings ← Postbank Giro', amount: 60000, interval: 'Monthly', next: '28 Oct 2026', kind: 'transfer' },
      { id: 'r14', account: 'renault', name: 'Interest', amount: 5400, interval: 'Quarterly', next: '31 Dec 2026', kind: 'income' },
      { id: 'r15', account: 'renault', name: 'Sondertilgung → Darlehen', amount: -650000, interval: 'Yearly', next: '15 Nov 2026', kind: 'transfer' },
      { id: 'r16', account: 'card', name: 'Cat food · Zooplus', amount: -3240, interval: 'Monthly', next: '12 Nov 2026', kind: 'expense' },
      { id: 'r17', account: 'darlehen', name: 'Payment ← Postbank Giro', amount: -95500, interval: 'Monthly', next: '1 Nov 2026', kind: 'transfer' },
      { id: 'r18', account: 'darlehen', name: 'Sondertilgung ← Renault Bank', amount: -650000, interval: 'Yearly', next: '15 Nov 2026', kind: 'transfer' }
    ],
    categories: [
      { id: 'groceries', name: 'Groceries', color: 'var(--sb-cat-1)', kind: 'variable', base: 26000, tx: 214 },
      { id: 'dining', name: 'Dining out', color: 'var(--sb-cat-2)', kind: 'variable', base: 7000, tx: 61 },
      { id: 'shopping', name: 'Shopping', color: 'var(--sb-cat-3)', kind: 'variable', base: 9000, tx: 88 },
      { id: 'leisure', name: 'Leisure', color: 'var(--sb-cat-4)', kind: 'variable', base: 6000, tx: 47 },
      { id: 'pets', name: 'Pets', color: 'var(--sb-cat-5)', kind: 'variable', base: 4500, tx: 39 },
      { id: 'transport', name: 'Transport', color: 'var(--sb-cat-6)', kind: 'variable', base: 7500, tx: 72 },
      { id: 'hobbies', name: 'Hobbies', color: 'var(--sb-cat-7)', kind: 'variable', base: 3500, tx: 18 },
      { id: 'health', name: 'Health', color: 'var(--sb-cat-8)', kind: 'variable', base: 2500, tx: 26 },
      { id: 'gifts', name: 'Gifts', color: 'var(--sb-cat-9)', kind: 'variable', base: 2500, tx: 14 },
      { id: 'cash', name: 'Cash', color: 'var(--sb-cat-10)', kind: 'variable', base: 8000, tx: 21, builtIn: true },
      { id: 'rent', name: 'Rent', color: 'var(--sb-cat-11)', kind: 'fixed', base: 112000, tx: 34 },
      { id: 'utilities', name: 'Utilities', color: 'var(--sb-cat-12)', kind: 'fixed', base: 6800, tx: 34 },
      { id: 'phone', name: 'Phone & internet', color: 'var(--sb-cat-13)', kind: 'fixed', base: 2499, tx: 34 },
      { id: 'insurance', name: 'Insurance', color: 'var(--sb-cat-14)', kind: 'fixed', base: 1490, tx: 34 },
      { id: 'subscriptions', name: 'Subscriptions', color: 'var(--sb-cat-15)', kind: 'fixed', base: 2398, tx: 61 },
      { id: 'salary', name: 'Salary', color: 'var(--sb-cat-16)', kind: 'income', base: 0, tx: 34 },
      { id: 'wohngeld', name: 'Wohngeld', color: 'var(--sb-cat-17)', kind: 'income', base: 0, tx: 22 }
    ],
    rules: [
      { id: 'u0', match: 'contains', pattern: 'Bargeld · Geldautomat · ATM', field: 'Merchant + purpose', category: 'cash', hits: 21, builtIn: true },
      { id: 'u1', match: 'exact', pattern: 'rewe markt', field: 'Merchant', category: 'groceries', hits: 96 },
      { id: 'u2', match: 'contains', pattern: 'LIDL', field: 'Merchant', category: 'groceries', hits: 71 },
      { id: 'u3', match: 'contains', pattern: 'AMAZON', field: 'Merchant', category: 'shopping', hits: 64 },
      { id: 'u4', match: 'exact', pattern: 'zooplus', field: 'Merchant', category: 'pets', hits: 31 },
      { id: 'u5', match: 'contains', pattern: 'DB VERTRIEB', field: 'Merchant', category: 'transport', hits: 28 },
      { id: 'u6', match: 'contains', pattern: 'ARAL', field: 'Merchant', category: 'transport', hits: 19 },
      { id: 'u7', match: 'contains', pattern: 'spotify', field: 'Purpose · PayPal', category: 'subscriptions', hits: 27 },
      { id: 'u8', match: 'contains', pattern: 'lieferando', field: 'Purpose · Klarna', category: 'dining', hits: 22 },
      { id: 'u9', match: 'exact', pattern: 'kickstarter', field: 'Merchant', category: 'hobbies', hits: 9 },
      { id: 'u10', match: 'exact', pattern: 'stadtwerke nord', field: 'Merchant', category: 'utilities', hits: 34 },
      { id: 'u11', match: 'exact', pattern: 'telefonica germany', field: 'Merchant', category: 'phone', hits: 34 },
      { id: 'u12', match: 'exact', pattern: 'petprotect', field: 'Merchant', category: 'insurance', hits: 34 }
    ],
    settings: {
      version: '2.0.0', latest: '2.1.0', autoCheck: true, autoInstall: false, lastChecked: '26 Oct 2026, 09:12',
      remindersOn: true,
      reminders: { postbank: { on: true, days: 7 }, sparkasse: { on: true, days: 7 }, renault: { on: false, days: 30 }, card: { on: true, days: 7 }, darlehen: { on: false, days: 30 } },
      startPage: 'dashboard', dataPath: 'C:\\Users\\you\\AppData\\Roaming\\DashCash\\dashcash.db', lastBackup: '12 Oct 2026'
    },
    files: [
      { id: 'f1', name: 'Postbank_Giro_2026-10-23.csv', label: 'Postbank October', account: 'postbank', from: '1 Oct 2026', to: '23 Oct 2026', rows: 34, imported: '23 Oct 2026', size: '6,1 KB' },
      { id: 'f2', name: 'Darlehen_Kontoauszug_2026-10-22.csv', label: 'Darlehen statement', account: 'darlehen', from: '1 Jan 2026', to: '22 Oct 2026', rows: 12, imported: '22 Oct 2026', size: '1,4 KB' },
      { id: 'f3', name: 'RenaultBank_Umsaetze_2026-10-21.csv', label: 'Renault Q3', account: 'renault', from: '1 Jul 2026', to: '21 Oct 2026', rows: 9, imported: '21 Oct 2026', size: '1,1 KB' },
      { id: 'f4', name: 'Umsaetze_Sparkasse_Giro_2026-10-17.csv', label: 'Sparkasse Sep–Oct', account: 'sparkasse', from: '1 Sep 2026', to: '17 Oct 2026', rows: 61, imported: '17 Oct 2026', size: '9,8 KB' },
      { id: 'f5', name: 'Visa_Abrechnung_2026-10-14.csv', label: 'Visa October statement', account: 'card', from: '15 Sep 2026', to: '14 Oct 2026', rows: 12, imported: '14 Oct 2026', size: '2,0 KB' },
      { id: 'f6', name: 'Umsaetze_Sparkasse_Giro_2026-08-31.csv', label: 'Sparkasse Jan–Aug', account: 'sparkasse', from: '1 Jan 2026', to: '31 Aug 2026', rows: 402, imported: '1 Sep 2026', size: '58,3 KB' }
    ],
    profiles: [
      { id: 'p1', bank: 'Sparkasse', name: 'Sparkasse CSV-CAMT V2', columns: 'Buchungstag · Betrag · Beguenstigter/Zahlungspflichtiger · Verwendungszweck · Saldo', used: 'Sparkasse Giro', lastUsed: '17 Oct 2026' },
      { id: 'p2', bank: 'Postbank', name: 'Postbank Umsatzliste', columns: 'Buchungsdatum · Betrag (€) · Empfänger · Verwendungszweck', used: 'Postbank Giro', lastUsed: '23 Oct 2026' },
      { id: 'p3', bank: 'Postbank Visa', name: 'Visa Abrechnung', columns: 'Belegdatum · Beschreibung · Betrag', used: 'Visa Card', lastUsed: '14 Oct 2026' },
      { id: 'p4', bank: 'Renault Bank', name: 'Renault Bank direkt', columns: 'Datum · Text · Betrag · Saldo', used: 'Renault Bank Tagesgeld, Darlehen', lastUsed: '22 Oct 2026' }
    ],
    toasts: [],
    uncategorised: [
      { id: 't1', date: '3 Oct 2026', account: 'card', merchant: 'Steady Media GmbH', purpose: 'Mitgliedschaft Oktober', amount: -500 },
      { id: 't2', date: '6 Oct 2026', account: 'sparkasse', merchant: 'Wochenmarkt Stand 12', purpose: 'Kartenzahlung', amount: -940 },
      { id: 't3', date: '8 Oct 2026', account: 'postbank', merchant: 'PayPal Europe', purpose: 'Etsy Inc · Bestellung 2281', amount: -3450 },
      { id: 't4', date: '12 Oct 2026', account: 'sparkasse', merchant: 'Tierarztpraxis Lindenhof', purpose: 'Rechnung 10/114', amount: -6830 },
      { id: 't5', date: '15 Oct 2026', account: 'card', merchant: 'Kickstarter PBC', purpose: 'Pledge · Tabletop', amount: -4500 },
      { id: 't6', date: '18 Oct 2026', account: 'sparkasse', merchant: 'Stadtbibliothek', purpose: 'Gebühr', amount: -200 },
      { id: 't7', date: '22 Oct 2026', account: 'postbank', merchant: 'Klarna', purpose: 'Möbelhaus Nord · Rate 2/6', amount: -8900 }
    ]
  };

  // Mortgage schedule from today: in the Sondertilgung month the extra payment goes first, capped to what is left;
  // the regular payment is capped too. Returns balances per month, the actual amounts paid, and the payoff month.
  function mortgagePlan() {
    const d = state.accounts.find((a) => a.type === 'mortgage');
    if (!d) return null;
    const pay = d.payment || 95500, stAmt = d.sondertilgung || 0, stM = d.stMonth ?? 10;
    const bal = {}, st = {}, reg = {};
    let v = d.anchor, payoff = null;
    bal[TODAY_IDX] = v;
    for (let j = TODAY_IDX + 1; j <= LAST_IDX + 36; j++) {
      const s = j % 12 === stM ? Math.min(v, stAmt) : 0; v -= s;
      const r = Math.min(v, pay); v -= r;
      bal[j] = v; st[j] = s; reg[j] = r;
      if (v <= 0 && payoff == null) { payoff = j; break; }
    }
    return { bal, st, reg, payoff, stAmt, pay, partialSt: payoff != null && st[payoff] > 0 && st[payoff] < stAmt ? st[payoff] : null, contractEnd: d.contractEndIdx };
  }
  function payoffIdx() { const p = mortgagePlan(); return p ? p.payoff : null; }

  function series(a) {
    const hist = new Array(TODAY_IDX).fill(null), met = new Array(TODAY_IDX).fill(null), spend = new Array(TODAY_IDX).fill(null);
    const r = rng(a.seed || 99), missed = a.missed || [], plan = mortgagePlan(), pay = plan ? plan.payoff : null;
    if (a.seed) {
      hist[TODAY_IDX - 1] = a.monthStart;
      for (let i = TODAY_IDX - 1; i >= 1; i--) {
        let g = 0;
        if (a.type === 'income' || a.type === 'spending') {
          const ok = !missed.includes(i);
          g = ok ? a.goal + Math.round(r() * (a.type === 'income' ? 9000 : 3000)) : -Math.round(1500 + r() * (a.type === 'income' ? 24000 : 9000));
          met[i] = ok; hist[i - 1] = hist[i] - g;
        } else if (a.type === 'savings') {
          g = 60000 + (i % 12 === 10 ? -650000 : 0) + ([2, 5, 8, 11].includes(i % 12) ? 5400 : 0);
          // Transfers to savings/mortgage accounts (the Sondertilgung) never count against the sender's streak
          const toDebtOrSavings = i % 12 === 10 ? 650000 : 0;
          met[i] = g + toDebtOrSavings >= a.goal; hist[i - 1] = hist[i] - g;
        } else if (a.type === 'mortgage') {
          hist[i - 1] = hist[i] + (a.payment || 95500) + (i % 12 === (a.stMonth ?? 10) ? (a.sondertilgung || 0) : 0); met[i] = true;
        }
      }
      if (a.type === 'card') {
        for (let i = 0; i < TODAY_IDX; i++) {
          spend[i] = missed.includes(i) ? 15500 + Math.round(r() * 8000) : 3500 + Math.round(r() * 10500);
          hist[i] = -Math.round(r() * 5200); met[i] = spend[i] <= a.goal;
        }
        hist[TODAY_IDX - 1] = a.monthStart;
      }
      met[0] = met[0] == null ? true : met[0];
    }
    const proj = new Array(LAST_IDX + 1).fill(null);
    proj[TODAY_IDX] = a.type === 'card' ? 0 : a.anchor + (a.due || 0);
    for (let j = TODAY_IDX + 1; j <= LAST_IDX; j++) {
      const p = proj[j - 1];
      if (a.type === 'income') proj[j] = p + (a.projGrowth || 0) + (plan ? plan.pay - (plan.reg[j] || 0) : 0);
      else if (a.type === 'spending') proj[j] = p + (a.projGrowth || 0);
      else if (a.type === 'savings') proj[j] = p + (a.seed ? 60000 + ([2, 5, 8, 11].includes(j % 12) ? 5400 : 0) - (plan ? plan.st[j] || 0 : 0) : 0);
      else if (a.type === 'card') proj[j] = 0;
      else if (a.type === 'mortgage') proj[j] = plan && plan.bal[j] != null ? plan.bal[j] : 0;
    }
    return { hist, met, spend, today: a.anchor, proj, payoff: a.type === 'mortgage' ? pay : null, hasHistory: !!a.seed };
  }

  function streak(a) {
    const s = series(a);
    let cur = 0;
    for (let i = TODAY_IDX - 1; i >= 0 && s.met[i]; i--) cur++;
    let best = 0, run = 0;
    s.met.forEach((m) => { run = m ? run + 1 : 0; best = Math.max(best, run); });
    const months = [];
    for (let i = TODAY_IDX - 11; i < TODAY_IDX; i++) months.push({ idx: i, label: mShort(i), full: mLabel(i), met: s.met[i] });
    const kind = TYPES[a.type].goalKind;
    let actual = 0, projected = 0;
    if (kind === 'grow') { actual = (a.anchor - a.monthStart) / a.goal; projected = (a.anchor + (a.due || 0) - a.monthStart) / a.goal; }
    else if (kind === 'reduce') { actual = projected = (a.monthStart - a.anchor) / a.goal; }
    else { actual = projected = (a.spent || 0) <= a.goal ? 1 : 0; }
    const cl = (x) => Math.max(0, Math.min(1, x || 0));
    const milestones = [3, 6, 12, 18, 24, 36, 48, 60];
    const next = milestones.find((m) => m > cur) || cur + 12;
    return { current: cur, best, months, actual: cl(actual), projected: cl(projected), nextMilestone: next, toMilestone: next - cur };
  }

  function headroom(a) {
    const kind = TYPES[a.type].goalKind;
    if (!['income', 'spending', 'card'].includes(a.type) || !a.goal) return null;
    const value = kind === 'cap' ? a.goal - (a.spent || 0) : a.anchor + (a.due || 0) - (a.monthStart + a.goal);
    const budget = a.budget || a.goal;
    const ratio = value / budget;
    const tone = value <= 0 ? 'danger' : ratio < 0.2 ? 'warning' : 'neutral';
    return { value, budget, ratio: Math.max(0, Math.min(1, ratio)), tone };
  }

  // lastImport is stored as a day number (month index * 31 + day); today = 33 * 31 + 26
  function importAge(a) {
    if (a.lastImport == null) return { days: null, label: 'No import yet', short: 'No import yet', date: '', stale: true, threshold: 7, remind: true };
    const days = 33 * 31 + 26 - a.lastImport;
    const rem = (state.settings.reminders[a.id]) || { on: true, days: 7 };
    const remind = state.settings.remindersOn && rem.on;
    const date = (a.lastImport % 31) + ' ' + MONTHS[Math.floor(a.lastImport / 31) % 12];
    const ago = days === 0 ? 'today' : days === 1 ? 'yesterday' : days + ' days ago';
    return { days, date, ago, label: 'Last import: ' + ago, short: ago, stale: remind && days > rem.days, threshold: rem.days, remind };
  }

  function goalText(a) {
    if (!a.goal) return 'No goal';
    const k = TYPES[a.type].goalKind;
    if (k === 'cap') return 'Stay under ' + eur(a.goal) + ' per month';
    if (k === 'reduce') return 'Reduce by ' + eur(a.goal) + ' per month';
    return 'Grow by ' + eur(a.goal) + ' per month';
  }

  function assumptions(a) {
    const pay = payoffIdx();
    const base = {
      income: ['Recurring items only, applied on their dates.', 'Card settlement on the 28th, estimated as the median of the last 6 settlements: ' + eur(11820) + '.', 'The mortgage payment of ' + eur(95500) + ' stops after payoff in ' + (pay ? mLabel(pay) : 'n/a') + '.'],
      spending: ['Allowance of ' + eur(50000) + ' on the 1st (recurring transfer from Postbank Giro).', 'Typical variable spending: ' + eur(43750) + ' per month, the median of non-recurring spending, Apr–Sep 2026.', 'An average, never a trend: one-off months such as December are ignored by the median.'],
      savings: ['Recurring items only, applied on their dates.', 'Sondertilgung of ' + eur(650000) + ' every November until the mortgage is paid off; the last one only covers what is left.', 'Interest of ' + eur(5400) + ' per quarter.'],
      card: ['Settled to 0 on the 28th of each month from Postbank Giro (a transfer).', 'Card purchases are categorised like any other spending; they are not part of the Sparkasse headroom.'],
      mortgage: (() => { const pl = mortgagePlan(), early = pl && pl.payoff != null ? pl.contractEnd - pl.payoff : 0; return [
        'Contract Nov 2022 – ' + mLabel(pl.contractEnd) + ': ' + eur(13000000) + ' loan, ' + eur(16000000) + ' total owed incl. interest. The fixed total is what DashCash tracks, so no rate is modelled.',
        'Monthly payment of ' + eur(pl.pay) + ' from Postbank Giro; Sondertilgung of ' + eur(pl.stAmt) + ' every November from Renault Bank Tagesgeld.',
        'In the Sondertilgung month the extra payment goes first and is capped to what is left' + (pl.payoff != null ? ': the last one, in ' + mLabel(pl.payoff) + ', is ' + eur(pl.st[pl.payoff] || pl.reg[pl.payoff]) + (pl.partialSt ? ' instead of ' + eur(pl.stAmt) : '') + ', and payments stop after it.' : '.'),
        'Payoff ' + (pl.payoff != null ? mLabel(pl.payoff) : 'n/a') + (early > 0 ? ', ' + early + ' months before the contract ends.' : '.')
      ]; })()
    };
    return a.seed ? base[a.type] : ['No imported history yet. The projection holds the balance today flat until recurring items are added.'];
  }

  // Compare data: spending per category for the last 12 months (Nov 2025 – Oct 2026; Oct to date)
  function categorySpend(catId, idx) {
    const c = state.categories.find((x) => x.id === catId);
    if (!c || c.kind === 'income') return 0;
    if (c.kind === 'fixed') {
      if (c.id === 'utilities') return idx >= 30 ? 7400 : 6800;
      if (c.id === 'subscriptions') return idx >= 31 ? 3497 : 2398;
      return c.base;
    }
    const r = rng(c.base + idx * 131 + c.name.length * 7);
    let v = Math.round(c.base * (0.55 + r() * 0.9));
    if (c.id === 'gifts' && ((idx % 12) + 12) % 12 === 11) v = Math.round(c.base * 6.4);
    if (c.id === 'hobbies' && r() < 0.35) v = 0;
    if (idx === TODAY_IDX) v = Math.round(v * 0.82);
    return v;
  }

  // Import sample (Sparkasse CSV, 15 Sep – 25 Oct 2026)
  const importSample = {
    fileName: 'Umsaetze_Sparkasse_Giro_2026-10-25.csv',
    profile: 'Sparkasse CSV-CAMT V2',
    rows: 25, duplicates: 5, from: '15 Sep 2026', to: '25 Oct 2026',
    csvBalance: 152960, calcBalance: 153110,
    transactions: [
      { id: 'i1', date: '16 Sep', merchant: 'REWE Markt GmbH', purpose: 'REWE SAGT DANKE 4471', amount: -4218, suggestion: 'groceries', source: 'exact', rule: 'rewe markt' },
      { id: 'i2', date: '17 Sep', merchant: 'AMAZON EU S.A.R.L.', purpose: 'AMZN Mktp DE 302-4471', amount: -2399, suggestion: 'shopping', source: 'contains', rule: 'AMAZON' },
      { id: 'i3', date: '18 Sep', merchant: 'Café Fräulein Grün', purpose: 'Kartenzahlung', amount: -840, suggestion: null, source: 'new' },
      { id: 'i4', date: '20 Sep', merchant: 'LIDL Dienstleistung', purpose: 'LIDL SAGT DANKE', amount: -3177, suggestion: 'groceries', source: 'contains', rule: 'LIDL' },
      { id: 'i5', date: '22 Sep', merchant: 'PayPal Europe', purpose: 'Spotify AB · Abo', amount: -1099, suggestion: 'subscriptions', source: 'contains', rule: 'spotify (purpose)' },
      { id: 'i6', date: '24 Sep', merchant: 'Kino am Markt', purpose: 'Kartenzahlung', amount: -1900, suggestion: null, source: 'new' },
      { id: 'i7', date: '26 Sep', merchant: 'dm-drogerie markt', purpose: 'Kartenzahlung', amount: -1465, suggestion: null, source: 'new' },
      { id: 'i8', date: '27 Sep', merchant: 'Fitnessstudio Kraftwerk', purpose: 'Beitrag 09/2026', amount: -2990, suggestion: null, source: 'new' },
      { id: 'i10', date: '2 Oct', merchant: 'REWE Markt GmbH', purpose: 'REWE SAGT DANKE 4471', amount: -5602, suggestion: 'groceries', source: 'exact', rule: 'rewe markt' },
      { id: 'i11', date: '4 Oct', merchant: 'DB Vertrieb GmbH', purpose: 'Fahrkarte 8841', amount: -2490, suggestion: 'transport', source: 'contains', rule: 'DB VERTRIEB' },
      { id: 'i20', date: '12 Oct', merchant: 'Sparkasse Geldautomat 0412', purpose: 'Bargeldauszahlung GA 0412', amount: -10000, suggestion: 'cash', source: 'builtin', rule: 'Bargeld' },
      { id: 'i12', date: '7 Oct', merchant: 'Klarna', purpose: 'Lieferando.de Bestellung', amount: -2750, suggestion: 'dining', source: 'contains', rule: 'lieferando (purpose)' },
      { id: 'i13', date: '9 Oct', merchant: 'AMAZON EU S.A.R.L.', purpose: 'AMZN Mktp DE 302-9921', amount: -4599, suggestion: 'shopping', source: 'contains', rule: 'AMAZON' },
      { id: 'i14', date: '11 Oct', merchant: 'Hofladen Meier', purpose: 'Kartenzahlung', amount: -1230, suggestion: null, source: 'new' },
      { id: 'i15', date: '14 Oct', merchant: 'ARAL Station 2210', purpose: 'Kartenzahlung', amount: -1800, suggestion: 'transport', source: 'contains', rule: 'ARAL' },
      { id: 'i16', date: '17 Oct', merchant: 'REWE Markt GmbH', purpose: 'REWE SAGT DANKE 4471', amount: -3864, suggestion: 'groceries', source: 'exact', rule: 'rewe markt' },
      { id: 'i17', date: '21 Oct', merchant: 'Buchhandlung Lesezeichen', purpose: 'Kartenzahlung', amount: -1690, suggestion: null, source: 'new' },
      { id: 'i18', date: '24 Oct', merchant: 'Fitnessstudio Kraftwerk', purpose: 'Beitrag 10/2026', amount: -2990, suggestion: null, source: 'new' },
      { id: 'i19', date: '25 Oct', merchant: 'Bäckerei Kamps', purpose: 'Kartenzahlung', amount: -680, suggestion: null, source: 'new' }
    ],
    recurringCandidates: [
      { id: 'c1', payee: 'Fitnessstudio Kraftwerk', amount: -2990, months: 'Aug, Sep, Oct', interval: 'Monthly', next: '27 Nov 2026' },
      { id: 'c2', payee: 'PayPal · Spotify AB', amount: -1099, months: 'Aug, Sep, Oct', interval: 'Monthly', next: '22 Nov 2026' }
    ],
    transferCandidates: [
      { id: 'x1', date: '1 Oct', amount: 50000, here: 'Sparkasse Giro · Gutschrift Postbank', other: 'Postbank Giro', otherDate: '1 Oct', otherText: 'Dauerauftrag Taschengeld', days: 0 },
      { id: 'x2', date: '30 Sep', amount: -4000, here: 'Sparkasse Giro · Übertrag', other: 'Renault Bank Tagesgeld', otherDate: '2 Oct', otherText: 'Eingang Sparkasse', days: 2 }
    ],
    prev: { spending: 44120, income: 50000 },
    curr: { spending: 38240, income: 50000 }
  };

  const listeners = new Set();
  const emit = () => listeners.forEach((f) => f());
  let n = 100;
  const uid = (p) => p + (++n);

  const actions = {
    addAccount(a) { state.accounts.push(Object.assign({ id: uid('a'), monthStart: a.anchor, due: 0 }, a)); emit(); },
    updateAccount(id, patch) { const a = state.accounts.find((x) => x.id === id); if (a) Object.assign(a, patch); emit(); },
    deleteAccount(id) { state.accounts = state.accounts.filter((x) => x.id !== id); state.recurring = state.recurring.filter((r) => r.account !== id); emit(); },
    saveRecurring(item) { if (item.id) { const r = state.recurring.find((x) => x.id === item.id); Object.assign(r, item); } else state.recurring.push(Object.assign({ id: uid('r') }, item)); emit(); },
    deleteRecurring(id) { state.recurring = state.recurring.filter((x) => x.id !== id); emit(); },
    addCategory(c) { state.categories.push(Object.assign({ id: uid('c'), tx: 0, base: 0 }, c)); emit(); },
    updateCategory(id, patch) { Object.assign(state.categories.find((c) => c.id === id), patch); emit(); },
    mergeCategory(from, to) {
      const f = state.categories.find((c) => c.id === from), t = state.categories.find((c) => c.id === to);
      if (!f || !t) return; t.tx += f.tx; t.base += f.base;
      state.rules.forEach((r) => { if (r.category === from) r.category = to; });
      state.categories = state.categories.filter((c) => c.id !== from); emit();
    },
    saveRule(rule) { if (rule.id && state.rules.find((r) => r.id === rule.id)) Object.assign(state.rules.find((r) => r.id === rule.id), rule); else state.rules.unshift(Object.assign({ hits: 0 }, rule, { id: uid('u') })); emit(); },
    deleteRule(id) { state.rules = state.rules.filter((r) => r.id !== id); emit(); },
    categorise(txId, catId) { state.uncategorised = state.uncategorised.filter((t) => t.id !== txId); const c = state.categories.find((x) => x.id === catId); if (c) c.tx++; emit(); },
    setSetting(k, v) { state.settings[k] = v; emit(); },
    setReminder(id, patch) { state.settings.reminders[id] = Object.assign({ on: true, days: 7 }, state.settings.reminders[id], patch); emit(); },
    addFile(f) { state.files.unshift(Object.assign({ id: uid('f') }, f)); emit(); },
    updateFile(id, patch) { Object.assign(state.files.find((f) => f.id === id), patch); emit(); },
    deleteFile(id) { state.files = state.files.filter((f) => f.id !== id); emit(); },
    deleteProfile(id) { state.profiles = state.profiles.filter((p) => p.id !== id); emit(); },
    notify(t) {
      const toast = Object.assign({ id: uid('t'), tone: 'info' }, t);
      state.toasts = state.toasts.filter((x) => !(t.key && x.key === t.key)).concat(toast); emit();
      if (toast.autoHide) setTimeout(() => actions.dismiss(toast.id), toast.autoHide);
      return toast.id;
    },
    checkForUpdates(manual) {
      state.settings.checking = true; emit();
      setTimeout(() => {
        const st = state.settings; st.checking = false; st.lastChecked = '26 Oct 2026, ' + new Date().toTimeString().slice(0, 5);
        if (st.version !== st.latest) actions.notify({ key: 'update', tone: 'info', icon: 'download', title: 'DashCash ' + st.latest + ' is available', message: 'You have ' + st.version + '. The update installs on restart; your data stays as it is.', actionLabel: 'Restart and update', actionIcon: 'refresh', onAction: () => actions.installUpdate(), secondaryLabel: 'Later' });
        else if (manual) actions.notify({ key: 'update', tone: 'success', title: "You're up to date", message: 'DashCash ' + st.version + ' is the latest version.', autoHide: 5000 });
        emit();
      }, manual ? 1200 : 0);
    },
    installUpdate() {
      const st = state.settings;
      actions.notify({ key: 'update', tone: 'info', icon: 'refresh', title: 'Installing ' + st.latest + '…', message: 'DashCash restarts in a moment.', loading: true });
      setTimeout(() => { st.version = st.latest; actions.notify({ key: 'update', tone: 'success', title: 'Updated to ' + st.version, message: "See what's new in the release notes.", autoHide: 6000 }); }, 1600);
    },
    dismiss(id) { state.toasts = state.toasts.filter((t) => t.id !== id); emit(); },
    markImported(id) { const a = state.accounts.find((x) => x.id === id); if (a) a.lastImport = 33 * 31 + 26; emit(); },
    addUncategorised(list) { state.uncategorised = state.uncategorised.concat(list); emit(); }
  };

  function parseEur(s) { const v = parseFloat(String(s || '').replace(/[€\s\u00a0.]/g, '').replace('\u2212', '-').replace(',', '.')); return isNaN(v) ? null : Math.round(v * 100); }
  const inputEur = (c) => (c == null ? '' : (c < 0 ? '-' : '') + nf.format(Math.abs(c) / 100));
  const normalise = (m) => m.toLowerCase().replace(/\b(gmbh|ag|s\.a\.r\.l\.|se|e\.k\.|kg|inc|pbc)\b/g, '').replace(/[0-9]+/g, '').replace(/\s+/g, ' ').trim();
  window.SB = {
    parseEur, inputEur, normalise,
    MONTHS, TODAY_IDX, LAST_IDX, TODAY_LABEL: '26 Oct 2026', mLabel, mShort, mYear, eur, TYPES,
    TX_RANGE: { first: 0, last: TODAY_IDX }, // first/last month with imported transactions (sample: Jan 2024 – Oct 2026)
    state, actions, mortgagePlan, series, streak, headroom, importAge, goalText, assumptions, categorySpend, payoffIdx, importSample,
    subscribe(f) { listeners.add(f); return () => listeners.delete(f); },
    account(id) { return state.accounts.find((a) => a.id === id); },
    category(id) { return state.categories.find((c) => c.id === id); },
    CAT_HUES: [25,163,300,78,215,353,130,268,45,183,320,98,235,13,150,288,65,203,340,118,255,33,170,308,85,223,0,138,275,53,190,328,105,243,20,158,295,73,210,348],
    CAT_COLORS: Array.from({ length: 40 }, (_, i) => 'var(--sb-cat-' + (i + 1) + ')'),
    colorOwner(color, exceptId) { return state.categories.find((c) => c.color === color && c.id !== exceptId); },
    freeColor() { return window.SB.CAT_COLORS.find((col) => !state.categories.some((c) => c.color === col)); },
    staleAccounts() { return state.accounts.map((a) => ({ a, age: importAge(a) })).filter((x) => x.age.stale).sort((x, y) => (y.age.days ?? 999) - (x.age.days ?? 999)); }
  };
  window.dispatchEvent(new Event('sb-ready'));
})();
