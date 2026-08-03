// ============================================================
// Derived reporting engine — Phase 2
// Nothing here stores data. Every report, ledger, reconciliation
// snapshot and General Ledger entry is computed from the master
// transactions table, so editing one transaction updates everything.
// ============================================================
import type {
  Company,
  MonthClosing,
  MonthStatus,
  Payable,
  PayablePayment,
  Transaction,
  WalletKey,
} from "./finance-types";
import {
  CARD_WALLETS,
  COMPANY_ACCOUNT_BY_COMPANY,
  COMPANY_ACCOUNT_WALLETS,
  COMPANY_LABEL,
  COMPANIES,
  MONTH_NAMES,
  RECON_TARGETS,
  WALLET_BY_KEY,
} from "./finance-types";
import type { FinanceState } from "./finance-store";
import { salaryLedger, walletBalance, cardUsage, candidateHoldingTotal } from "./finance-store";

const active = (t: Transaction) => t.status !== "Cancelled" && t.status !== "Refunded";

export const monthKey = (date: string) => date.slice(0, 7); // YYYY-MM
export const monthLabel = (year: number, month: number) => `${MONTH_NAMES[month - 1]} ${year}`;
export const monthRange = (year: number, month: number) => {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end: endDate };
};

export function txnsForMonth(s: FinanceState, year: number, month: number): Transaction[] {
  const { start, end } = monthRange(year, month);
  return s.transactions.filter((t) => t.date >= start && t.date <= end);
}

/** Years present in the ledger (plus the current year), newest first. */
export function ledgerYears(s: FinanceState): number[] {
  const years = new Set<number>(s.transactions.map((t) => Number(t.date.slice(0, 4))).filter(Boolean));
  for (const c of s.closings) years.add(c.year);
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

// ---------- Wallet ledgers with running balances ----------
export type WalletLedgerRow = {
  txn: Transaction;
  date: string;
  company?: Company;
  particulars: string;
  debit: number; // money in
  credit: number; // money out
  running: number;
};

export function walletLedger(
  s: FinanceState,
  wallet: WalletKey,
  range?: { start?: string; end?: string },
): { opening: number; rows: WalletLedgerRow[]; debit: number; credit: number; closing: number } {
  const all = s.transactions
    .filter(active)
    .filter((t) => t.fromWallet === wallet || t.toWallet === wallet)
    .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1));

  const signed = (t: Transaction) =>
    (t.toWallet === wallet && t.fromWallet !== wallet ? t.amount : 0) -
    (t.fromWallet === wallet && t.toWallet !== wallet ? t.amount : 0);

  let opening = s.openingBalances[wallet] ?? 0;
  const rows: WalletLedgerRow[] = [];
  let running = opening;
  let debit = 0;
  let credit = 0;

  for (const t of all) {
    const delta = signed(t);
    if (range?.start && t.date < range.start) {
      opening += delta;
      running = opening;
      continue;
    }
    if (range?.end && t.date > range.end) continue;
    running += delta;
    if (delta >= 0) debit += delta;
    else credit += -delta;
    rows.push({
      txn: t,
      date: t.date,
      company: t.company,
      particulars:
        t.purpose ||
        t.description ||
        [t.type, t.candidate].filter(Boolean).join(" · ") ||
        t.type,
      debit: delta > 0 ? delta : 0,
      credit: delta < 0 ? -delta : 0,
      running,
    });
  }
  return { opening, rows, debit, credit, closing: running };
}

export function walletBalanceAsOf(s: FinanceState, wallet: WalletKey, end: string): number {
  return walletLedger(s, wallet, { end }).closing;
}

/** For a card, how much has been spent as of a date (what needs restoring). */
export function cardUsedAsOf(s: FinanceState, wallet: WalletKey, end: string): number {
  let used = 0;
  for (const t of s.transactions) {
    if (!active(t) || t.date > end) continue;
    if (t.fromWallet === wallet && t.toWallet !== wallet) used += t.amount;
    if (t.toWallet === wallet && t.fromWallet !== wallet) used -= t.amount;
  }
  return Math.max(0, used);
}

// ---------- Payables ----------
export type PayableView = Payable & {
  outstanding: number;
  payments: PayablePayment[];
  linkedTxn?: Transaction;
};

export function payableViews(s: FinanceState): PayableView[] {
  return s.payables
    .map((p) => ({
      ...p,
      outstanding: Math.max(0, p.amount - p.paid),
      payments: s.payablePayments.filter((x) => x.payableId === p.id),
      linkedTxn: s.transactions.find((t) => t.id === p.txnId),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function outstandingPayables(s: FinanceState): PayableView[] {
  return payableViews(s).filter((p) => p.outstanding > 0.001);
}

export function outstandingPayablesTotal(s: FinanceState): number {
  return outstandingPayables(s).reduce((a, p) => a + p.outstanding, 0);
}

// ---------- Monthly summary & reconciliation ----------
export type MonthSummary = {
  year: number;
  month: number;
  label: string;
  income: number;
  expenses: number;
  transfers: number;
  count: number;
  transactions: Transaction[];
};

export function monthSummary(s: FinanceState, year: number, month: number): MonthSummary {
  const txns = txnsForMonth(s, year, month);
  let income = 0;
  let expenses = 0;
  let transfers = 0;
  for (const t of txns) {
    if (!active(t)) continue;
    const outward = t.toWallet === "external";
    const inward = t.fromWallet === "external" || t.fromWallet === "hassan";
    if (outward) expenses += t.amount;
    else if (inward) income += t.amount;
    else transfers += t.amount;
  }
  return { year, month, label: monthLabel(year, month), income, expenses, transfers, count: txns.length, transactions: txns };
}

export type ReconciliationLine = {
  wallet: WalletKey;
  name: string;
  balance: number;
  target?: number;
  difference?: number;
  ok: boolean;
  topUp?: number;
};

export type MonthReconciliation = {
  year: number;
  month: number;
  label: string;
  end: string;
  lines: ReconciliationLine[];
  salaryWallet: number;
  negativeSalaries: { name: string; balance: number }[];
  candidateHeld: number;
  cbqPending: number;
  companyPending: { company: Company; amount: number }[];
  outstandingPayables: number;
  cardsNeedingTopUp: ReconciliationLine[];
  income: number;
  expenses: number;
  exceptions: string[];
  ready: boolean;
};

export function monthReconciliation(s: FinanceState, year: number, month: number): MonthReconciliation {
  const { end } = monthRange(year, month);
  const summary = monthSummary(s, year, month);

  const lines: ReconciliationLine[] = RECON_TARGETS.map(({ wallet, target }) => {
    const isCard = CARD_WALLETS.includes(wallet);
    const balance = isCard
      ? (WALLET_BY_KEY[wallet].limit ?? 0) - cardUsedAsOf(s, wallet, end)
      : walletBalanceAsOf(s, wallet, end);
    const difference = balance - target;
    return {
      wallet,
      name: WALLET_BY_KEY[wallet].name,
      balance,
      target,
      difference,
      ok: Math.abs(difference) < 0.01,
      topUp: isCard ? Math.max(0, target - balance) : undefined,
    };
  });

  const salaryWallet = walletBalanceAsOf(s, "salary-wallet", end);
  const negativeSalaries = salaryLedger(s)
    .filter((e) => e.balance < -0.001)
    .map((e) => ({ name: e.name, balance: e.balance }));

  const companyPending = COMPANIES.filter((c) => COMPANY_ACCOUNT_BY_COMPANY[c])
    .map((c) => ({ company: c, amount: Math.max(0, walletBalanceAsOf(s, COMPANY_ACCOUNT_BY_COMPANY[c]!, end)) }))
    .filter((x) => x.amount > 0.001);
  const cbqPending = companyPending.reduce((a, x) => a + x.amount, 0);
  const payablesTotal = outstandingPayables(s)
    .filter((p) => p.date <= end)
    .reduce((a, p) => a + p.outstanding, 0);

  const cardsNeedingTopUp = lines.filter((l) => (l.topUp ?? 0) > 0.01);

  const exceptions: string[] = [];
  for (const l of lines) {
    if (l.ok) continue;
    if (l.topUp && l.topUp > 0.01) {
      exceptions.push(`${l.name} needs a top-up of ${l.topUp.toFixed(2)} to reach its ${l.target?.toFixed(2)} limit.`);
    } else {
      exceptions.push(`${l.name} is ${l.balance.toFixed(2)} — target is ${l.target?.toFixed(2)}.`);
    }
  }
  for (const n of negativeSalaries) exceptions.push(`${n.name} has a negative salary balance (${n.balance.toFixed(2)}).`);
  if (payablesTotal > 0.01) exceptions.push(`${payablesTotal.toFixed(2)} of payables are still outstanding.`);
  for (const c of companyPending) {
    exceptions.push(`${COMPANY_LABEL[c.company]} account holds ${c.amount.toFixed(2)} not yet transferred to CBQ.`);
  }
  const pendingTxns = summary.transactions.filter((t) => t.status === "Pending");
  if (pendingTxns.length) exceptions.push(`${pendingTxns.length} transaction(s) in this month are still Pending.`);

  return {
    year,
    month,
    label: monthLabel(year, month),
    end,
    lines,
    salaryWallet,
    negativeSalaries,
    candidateHeld: candidateHoldingTotal(s),
    cbqPending,
    companyPending,
    outstandingPayables: payablesTotal,
    cardsNeedingTopUp,
    income: summary.income,
    expenses: summary.expenses,
    exceptions,
    ready: exceptions.length === 0,
  };
}

export function monthStatus(s: FinanceState, year: number, month: number): MonthStatus {
  const closing = s.closings.find((c) => c.year === year && c.month === month);
  if (closing && closing.status === "Closed") return "Closed";
  const txns = txnsForMonth(s, year, month);
  if (!txns.length) return "Open";
  return monthReconciliation(s, year, month).ready ? "Ready to Close" : "Open";
}

export function monthsOfYear(s: FinanceState, year: number): {
  year: number;
  month: number;
  label: string;
  status: MonthStatus;
  closing?: MonthClosing;
  count: number;
  expenses: number;
  income: number;
}[] {
  return MONTH_NAMES.map((_, i) => {
    const month = i + 1;
    const summary = monthSummary(s, year, month);
    return {
      year,
      month,
      label: MONTH_NAMES[i],
      status: monthStatus(s, year, month),
      closing: s.closings.find((c) => c.year === year && c.month === month),
      count: summary.count,
      expenses: summary.expenses,
      income: summary.income,
    };
  });
}

export function closedMonthsCount(s: FinanceState): number {
  return s.closings.filter((c) => c.status === "Closed").length;
}

export function openMonthsCount(s: FinanceState): number {
  let open = 0;
  for (const y of ledgerYears(s)) {
    for (const m of monthsOfYear(s, y)) {
      if (m.count > 0 && m.status !== "Closed") open += 1;
    }
  }
  return open;
}

export function readyToCloseMonths(s: FinanceState): { year: number; month: number; label: string }[] {
  const out: { year: number; month: number; label: string }[] = [];
  for (const y of ledgerYears(s)) {
    for (const m of monthsOfYear(s, y)) {
      if (m.status === "Ready to Close") out.push({ year: y, month: m.month, label: `${m.label} ${y}` });
    }
  }
  return out;
}

// ---------- Company expense reports ----------
export type CompanyExpenseRow = {
  serial: number;
  date: string;
  company: string;
  particulars: string;
  wallet: string;
  amount: number;
  txnId: string;
};

/** Every expense for a company in a period, regardless of the wallet that paid it. */
export function companyExpenseReport(
  s: FinanceState,
  company: Company | "OTHER",
  year: number,
  month?: number,
): { rows: CompanyExpenseRow[]; total: number } {
  const start = month ? monthRange(year, month).start : `${year}-01-01`;
  const end = month ? monthRange(year, month).end : `${year}-12-31`;
  const rows: CompanyExpenseRow[] = [];
  const matches = (t: Transaction) =>
    company === "OTHER" ? !t.company : t.company === company;

  const list = s.transactions
    .filter((t) => active(t) && t.date >= start && t.date <= end && t.toWallet === "external" && matches(t))
    .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1));

  list.forEach((t, i) => {
    rows.push({
      serial: i + 1,
      date: t.date,
      company: t.company ? COMPANY_LABEL[t.company] : "—",
      particulars: t.purpose || t.description || t.purposeCategory || t.type,
      wallet: WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet,
      amount: t.amount,
      txnId: t.id,
    });
  });
  return { rows, total: rows.reduce((a, r) => a + r.amount, 0) };
}

export function companyMonthlySummary(
  s: FinanceState,
  year: number,
  month?: number,
): { rows: { company: string; total: number }[]; grandTotal: number } {
  const keys: (Company | "OTHER")[] = [...COMPANIES, "OTHER"];
  const rows = keys.map((c) => ({
    company: c === "OTHER" ? "Other" : COMPANY_LABEL[c],
    total: companyExpenseReport(s, c, year, month).total,
  }));
  return { rows, grandTotal: rows.reduce((a, r) => a + r.total, 0) };
}

// ---------- General Ledger (auto-generated, no manual entries) ----------
export type GLEntry = {
  date: string;
  uuid: string;
  reference: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
  description: string;
  linkedTxnId: string;
  createdBy?: string;
  createdAt: string;
};

function accountForOut(t: Transaction): string {
  if (t.toWallet === "external") {
    if (t.type === "Salary Release") return "Expense · Housemaid Salary";
    return `Expense · ${t.purposeCategory ?? t.type}`;
  }
  return `Wallet · ${WALLET_BY_KEY[t.toWallet]?.name ?? t.toWallet}`;
}

function accountForIn(t: Transaction): string {
  if (t.fromWallet === "external") {
    if (t.classification === "Sponsor Expense") return "Liability · Candidate / Sponsor Holdings";
    if (t.type === "Salary Holding") return "Liability · Housemaid Salaries";
    return "Income · Funds Received";
  }
  return `Wallet · ${WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet}`;
}

export function generalLedger(s: FinanceState, range?: { start?: string; end?: string }): GLEntry[] {
  const entries: GLEntry[] = [];
  for (const t of s.transactions) {
    if (t.status === "Cancelled") continue;
    if (range?.start && t.date < range.start) continue;
    if (range?.end && t.date > range.end) continue;
    entries.push({
      date: t.date,
      uuid: t.id,
      reference: t.voucherNumber ?? t.referenceNumber ?? t.type,
      debitAccount: accountForOut(t),
      creditAccount: accountForIn(t),
      amount: t.amount,
      description: t.purpose || t.description || t.type,
      linkedTxnId: t.id,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
    });
  }
  // Month-end closing entries (memo only — they move no money).
  for (const c of s.closings.filter((x) => x.status === "Closed")) {
    const { end } = monthRange(c.year, c.month);
    if (range?.start && end < range.start) continue;
    if (range?.end && end > range.end) continue;
    entries.push({
      date: end,
      uuid: c.id,
      reference: `CLOSE-${c.year}-${String(c.month).padStart(2, "0")}`,
      debitAccount: "Equity · Retained Position",
      creditAccount: "Control · Month-End Closing",
      amount: 0,
      description: `${monthLabel(c.year, c.month)} reconciliation closed${c.closedWithExceptions ? " with exceptions" : ""}`,
      linkedTxnId: "",
      createdAt: c.closedAt,
    });
  }
  return entries.sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1));
}

// ---------- Dashboard helpers ----------
export function totalCardExposure(s: FinanceState): number {
  return CARD_WALLETS.reduce((a, k) => a + cardUsage(s, k).used, 0);
}

export function pendingTransfersTotal(s: FinanceState): number {
  return COMPANY_ACCOUNT_WALLETS.reduce((a, k) => a + Math.max(0, walletBalance(s, k).balance), 0);
}

// ---------- Housemaid Holding Wallet (sponsor money held per housemaid) ----------
export type HoldingWalletEntry = {
  name: string;
  sponsor?: string;
  company?: Company;
  received: number;
  released: number;
  balance: number;
  lastDate: string;
  timeline: Transaction[];
};

const HOLDING_WALLET: WalletKey = "housemaid-holding";

/** Per-housemaid breakdown of the Housemaid Holding Wallet. */
export function housemaidHoldingLedger(s: FinanceState): HoldingWalletEntry[] {
  const map = new Map<string, HoldingWalletEntry>();
  for (const t of s.transactions) {
    if (!active(t)) continue;
    const into = t.toWallet === HOLDING_WALLET && t.fromWallet !== HOLDING_WALLET;
    const outOf = t.fromWallet === HOLDING_WALLET && t.toWallet !== HOLDING_WALLET;
    if (!into && !outOf) continue;
    const name = (t.candidate ?? "").trim() || "Unassigned";
    const key = name.toLowerCase();
    let cur = map.get(key);
    if (!cur) {
      cur = { name, sponsor: t.sponsor, company: t.company, received: 0, released: 0, balance: 0, lastDate: t.date, timeline: [] };
      map.set(key, cur);
    }
    if (!cur.sponsor && t.sponsor) cur.sponsor = t.sponsor;
    if (!cur.company && t.company) cur.company = t.company;
    if (into) cur.received += t.amount;
    else cur.released += t.amount;
    cur.timeline.push(t);
    if (t.date > cur.lastDate) cur.lastDate = t.date;
  }
  for (const cur of map.values()) {
    cur.balance = cur.received - cur.released;
    cur.timeline.sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1));
  }
  return Array.from(map.values()).sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
}

export function holdingWalletTotal(s: FinanceState): number {
  return walletBalance(s, HOLDING_WALLET).balance;
}

/**
 * Carry-forward reconciliation for a wallet that is not expected to reach zero.
 * Opening + Received − Released = Closing (C/F to the next month).
 */
export function carryForwardSummary(
  s: FinanceState,
  wallet: WalletKey,
  year: number,
  month?: number,
): { opening: number; received: number; released: number; closing: number; rows: WalletLedgerRow[] } {
  const start = month ? monthRange(year, month).start : `${year}-01-01`;
  const end = month ? monthRange(year, month).end : `${year}-12-31`;
  const led = walletLedger(s, wallet, { start, end });
  return { opening: led.opening, received: led.debit, released: led.credit, closing: led.closing, rows: led.rows };
}
