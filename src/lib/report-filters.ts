// ============================================================
// Report filtering engine — pure, derived, read-only.
//
// Money In / Money Out is decided by the standardised Movement Type
// rules in wallet-rules.ts, never by reading free text.
// ============================================================
import type { Transaction, TxnType, WalletKey } from "@/lib/finance-types";
import { COMPANY_LABEL, WALLET_BY_KEY } from "@/lib/finance-types";
import type { PrintReportRow } from "@/lib/format";
import type { FinancialCategory } from "@/lib/wallet-rules";
import {
  isCompanyOperatingExpense,
  matchesCategory,
  movementLabel,
  movementType,
  walletDirection,
} from "@/lib/wallet-rules";

export type ReportScope = {
  from?: string;
  to?: string;
  /** Empty = all companies. "__none__" matches transactions with no company. */
  company?: string;
  /** Empty = all types. */
  types?: TxnType[];
  /** Empty = all wallets. Matches the paying or receiving wallet. */
  wallets?: WalletKey[];
  /** Empty = all categories. Multiple categories are OR-ed together. */
  categories?: FinancialCategory[];
  /** Empty = all statuses. */
  status?: string;
};

export function applyScope(rows: Transaction[], scope: ReportScope): Transaction[] {
  const { from, to, company, wallets, categories, types, status } = scope;
  const walletSet = wallets && wallets.length ? new Set<WalletKey>(wallets) : null;
  const catList = categories && categories.length ? categories : null;
  const typeSet = types && types.length ? new Set<TxnType>(types) : null;
  return rows.filter((t) => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (company === "__none__") {
      if (t.company) return false;
    } else if (company && company !== "__all__" && t.company !== company) return false;
    if (status && status !== "__all__" && t.status !== status) return false;
    if (typeSet && !typeSet.has(t.type)) return false;
    if (walletSet && !walletSet.has(t.fromWallet) && !walletSet.has(t.toWallet)) return false;
    if (catList && !catList.some((c) => matchesCategory(t, c))) return false;
    return true;
  });
}

export const byDateAsc = (rows: Transaction[]) =>
  [...rows].sort((a, b) =>
    a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1,
  );

export const particularsOf = (t: Transaction, wallet?: WalletKey) =>
  [movementLabel(t, wallet), t.candidate].filter(Boolean).join(" · ");

export const walletPath = (t: Transaction) =>
  t.toWallet === "external"
    ? WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet
    : `${WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet} → ${WALLET_BY_KEY[t.toWallet]?.name ?? t.toWallet}`;

export const companyOf = (t: Transaction) => (t.company ? COMPANY_LABEL[t.company] ?? t.company : "—");

/** Single-amount print rows (expense-style reports). */
export function toPrintRows(rows: Transaction[]): PrintReportRow[] {
  return byDateAsc(rows).map((t) => ({
    date: t.date,
    company: companyOf(t),
    particulars: particularsOf(t),
    amount: t.amount,
    wallet: walletPath(t),
  }));
}

/**
 * Cash-book print rows for one wallet: Money In / Money Out.
 * Money arriving in the wallet is Money In, money leaving it is Money Out —
 * so a card top-up is Money Out on petty cash and Money In on the card.
 */
export function toLedgerPrintRows(rows: Transaction[], wallet: WalletKey): PrintReportRow[] {
  return byDateAsc(rows).map((t) => {
    const { moneyIn, moneyOut } = walletDirection(t, wallet);
    return {
      date: t.date,
      company: companyOf(t),
      particulars: particularsOf(t, wallet),
      amount: t.amount,
      moneyIn,
      moneyOut,
      wallet: WALLET_BY_KEY[wallet]?.name ?? wallet,
    };
  });
}

/** Same shape as the printed ledger, for CSV export. */
export function toLedgerCsvRows(rows: Transaction[], wallet: WalletKey): Record<string, unknown>[] {
  return toLedgerPrintRows(rows, wallet).map((r) => ({
    Date: r.date,
    Company: r.company,
    Particulars: r.particulars,
    "Money In": r.moneyIn || "",
    "Money Out": r.moneyOut || "",
    Wallet: r.wallet,
  }));
}

/**
 * Money In / Money Out rows for a mixed list with no single wallet context
 * (the master transactions table, a voucher list, a multi-wallet report).
 * The standardised movement type decides the direction.
 */
const INFLOW_MOVEMENTS = new Set([
  "Income",
  "Opening Balance",
  "Salary Received",
  "Holding Received",
  "Candidate Money Received",
]);

export function toDirectionalPrintRows(rows: Transaction[]): PrintReportRow[] {
  return byDateAsc(rows).map((t) => {
    const incoming = INFLOW_MOVEMENTS.has(movementType(t));
    return {
      date: t.date,
      company: companyOf(t),
      particulars: particularsOf(t),
      amount: t.amount,
      moneyIn: incoming ? t.amount : 0,
      moneyOut: incoming ? 0 : t.amount,
      wallet: walletPath(t),
    };
  });
}

/** Generic CSV rows that mirror exactly what is on screen / printed. */
export function toDirectionalCsvRows(rows: Transaction[]): Record<string, unknown>[] {
  return byDateAsc(rows).map((t) => ({
    Date: t.date,
    Type: t.type,
    "Movement Type": movementType(t),
    Voucher: t.voucherNumber ?? "",
    Company: companyOf(t),
    "Candidate / Party": t.candidate ?? "",
    Particulars: particularsOf(t),
    "Money In": INFLOW_MOVEMENTS.has(movementType(t)) ? t.amount : "",
    "Money Out": INFLOW_MOVEMENTS.has(movementType(t)) ? "" : t.amount,
    Amount: t.amount,
    "From Wallet": WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet,
    "To Wallet": WALLET_BY_KEY[t.toWallet]?.name ?? t.toWallet,
    Status: t.status,
  }));
}

// ---------- Monthly Company Expense Closing ----------
/**
 * Genuine company operating expenses across every selected company wallet.
 * Internal transfers, card top-ups, opening balances, bank movements and all
 * held funds are excluded — they are cash movements, not expenses.
 */
export function companyExpenseClosingRows(
  rows: Transaction[],
  opts: { from?: string; to?: string; company?: string; wallets?: WalletKey[]; classification?: string },
): Transaction[] {
  const walletSet = opts.wallets && opts.wallets.length ? new Set(opts.wallets) : null;
  return byDateAsc(
    rows.filter((t) => {
      if (opts.from && t.date < opts.from) return false;
      if (opts.to && t.date > opts.to) return false;
      if (opts.company === "__none__") {
        if (t.company) return false;
      } else if (opts.company && opts.company !== "__all__" && t.company !== opts.company) return false;
      if (walletSet && !walletSet.has(t.fromWallet)) return false;
      const cls = opts.classification ?? "Company Expense";
      if (cls === "Company Expense") return isCompanyOperatingExpense(t);
      if (cls === "Sponsor Expense") return t.classification === "Sponsor Expense";
      if (cls === "Internal Transfer") return movementType(t) === "Internal Transfer" || movementType(t) === "Top Up Balance";
      if (cls === "Liability") return matchesCategory(t, "Liabilities / Held Funds");
      return true;
    }),
  );
}

/** Printable rows for the Monthly Company Expense Closing Report. */
export function toExpenseClosingPrintRows(rows: Transaction[]): PrintReportRow[] {
  return rows.map((t) => ({
    date: t.date,
    company: companyOf(t),
    particulars: [t.purposeCategory, particularsOf(t)].filter(Boolean).join(" · "),
    amount: t.amount,
    moneyIn: 0,
    moneyOut: t.amount,
    wallet: WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet,
  }));
}

export function toExpenseClosingCsvRows(rows: Transaction[]): Record<string, unknown>[] {
  return rows.map((t) => ({
    Date: t.date,
    "Source Wallet": WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet,
    Company: companyOf(t),
    "Expense Category": t.purposeCategory ?? "",
    Particulars: particularsOf(t),
    "Money Out": t.amount,
  }));
}
