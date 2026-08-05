// ============================================================
// Report filtering engine — pure, derived, read-only.
// Separates real company operating expenses from money that is
// only HELD on behalf of housemaids, candidates or sponsors.
// ============================================================
import type { Transaction, WalletKey } from "@/lib/finance-types";
import { COMPANY_LABEL, WALLET_BY_KEY, PETTY_WALLETS, CARD_WALLETS } from "@/lib/finance-types";
import type { PrintReportRow } from "@/lib/format";

export type TxnCategory =
  | "Company Expenses"
  | "Income"
  | "Internal Transfer"
  | "Housemaid Salary"
  | "Candidate Money"
  | "Polo Visa"
  | "Other";

export const TXN_CATEGORIES: TxnCategory[] = [
  "Company Expenses",
  "Income",
  "Internal Transfer",
  "Housemaid Salary",
  "Candidate Money",
  "Polo Visa",
  "Other",
];

/** Categories that represent money held for third parties — never a company cost. */
export const HELD_FUND_CATEGORIES: TxnCategory[] = ["Housemaid Salary", "Candidate Money", "Polo Visa"];

/** Categories included in an Expense Report by default. */
export const EXPENSE_CATEGORIES: TxnCategory[] = ["Company Expenses"];

/** Classifies a master transaction into a single reporting category. */
export function txnCategory(t: Transaction): TxnCategory {
  const w = [t.fromWallet, t.toWallet];
  if (t.type === "Salary Holding" || t.type === "Salary Release" || w.includes("salary-wallet")) {
    return "Housemaid Salary";
  }
  if (t.purposeCategory === "POLO") return "Polo Visa";
  if (
    t.type === "Housemaid Holding" ||
    t.type === "Holding Release" ||
    w.includes("housemaid-holding") ||
    t.classification === "Sponsor Expense"
  ) {
    return "Candidate Money";
  }
  const internal = t.fromWallet !== "external" && t.toWallet !== "external";
  if (internal) return "Internal Transfer";
  if (t.fromWallet === "external" || t.type === "Receipt Voucher") return "Income";
  if (t.classification === "Company Expense" || t.toWallet === "external") return "Company Expenses";
  return "Other";
}

export type ReportScope = {
  from?: string;
  to?: string;
  /** Empty = all companies. "__none__" matches transactions with no company. */
  company?: string;
  /** Empty = all wallets. */
  wallets?: WalletKey[];
  /** Empty = all categories. */
  categories?: TxnCategory[];
};

export function applyScope(rows: Transaction[], scope: ReportScope): Transaction[] {
  const { from, to, company, wallets, categories } = scope;
  const walletSet = wallets && wallets.length ? new Set<WalletKey>(wallets) : null;
  const catSet = categories && categories.length ? new Set<TxnCategory>(categories) : null;
  return rows.filter((t) => {
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (company === "__none__") {
      if (t.company) return false;
    } else if (company && company !== "__all__" && t.company !== company) return false;
    if (walletSet && !walletSet.has(t.fromWallet) && !walletSet.has(t.toWallet)) return false;
    if (catSet && !catSet.has(txnCategory(t))) return false;
    return true;
  });
}

export const byDateAsc = (rows: Transaction[]) =>
  [...rows].sort((a, b) =>
    a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1,
  );

export const particularsOf = (t: Transaction) =>
  [t.purpose || t.description || t.purposeCategory || t.type, t.candidate].filter(Boolean).join(" · ");

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

const isOpeningBalance = (t: Transaction) =>
  (t.purpose ?? "").trim().toUpperCase() === "OPENING BALANCE" ||
  (t.description ?? "").trim().toUpperCase() === "OPENING BALANCE";

/**
 * Cash-book print rows for a wallet: Money In / Money Out.
 *
 * Petty cash wallets and company cards only treat "OPENING BALANCE" as Money In —
 * every other movement is a distribution of cash that already exists there.
 * Holding wallets (salary, housemaid holding) treat any incoming movement as Money In.
 */
export function toLedgerPrintRows(rows: Transaction[], wallet: WalletKey): PrintReportRow[] {
  const strict = PETTY_WALLETS.includes(wallet) || CARD_WALLETS.includes(wallet);
  return byDateAsc(rows).map((t) => {
    const incoming = t.toWallet === wallet && t.fromWallet !== wallet;
    const moneyIn = incoming && (!strict || isOpeningBalance(t)) ? t.amount : 0;
    const moneyOut = moneyIn ? 0 : t.amount;
    return {
      date: t.date,
      company: companyOf(t),
      particulars: particularsOf(t),
      amount: t.amount,
      moneyIn,
      moneyOut,
      wallet: walletPath(t),
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
 * Money In / Money Out rows for a mixed list that has no single wallet context
 * (e.g. the master transactions table or a voucher list). Money entering the
 * business from outside is Money In; everything else is Money Out.
 */
export function toDirectionalPrintRows(rows: Transaction[]): PrintReportRow[] {
  return byDateAsc(rows).map((t) => {
    const incoming =
      t.type === "Receipt Voucher" ||
      t.type === "Salary Holding" ||
      t.type === "Housemaid Holding" ||
      (t.fromWallet === "external" && t.toWallet !== "external");
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
