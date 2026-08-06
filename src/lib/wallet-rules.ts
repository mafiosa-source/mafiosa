// ============================================================
// Wallet movement rules — the accounting brain of the Finance Core.
//
// Every transaction is classified into a standardised Movement Type.
// Reports never inspect free text to decide Money In / Money Out;
// they ask this module instead, so wording can never break a report.
//
// Nothing here stores data. All values are derived from the master
// transactions table, so editing one transaction updates every report.
// ============================================================
import type { Company, Transaction, TxnType, WalletKey } from "./finance-types";
import {
  CARD_WALLETS,
  COMPANY_ACCOUNT_WALLETS,
  PETTY_WALLETS,
  WALLET_BY_KEY,
} from "./finance-types";

// ---------- Movement types (hidden system field, derived) ----------
export type MovementType =
  | "Opening Balance"
  | "Top Up Balance"
  | "Expense"
  | "Internal Transfer"
  | "Salary Received"
  | "Salary Released"
  | "Holding Received"
  | "Holding Released"
  | "Candidate Money Received"
  | "Candidate Money Released"
  | "Deposit"
  | "Withdrawal"
  | "Income"
  | "Adjustment";

export const MOVEMENT_TYPES: MovementType[] = [
  "Opening Balance",
  "Top Up Balance",
  "Expense",
  "Internal Transfer",
  "Salary Received",
  "Salary Released",
  "Holding Received",
  "Holding Released",
  "Candidate Money Received",
  "Candidate Money Released",
  "Deposit",
  "Withdrawal",
  "Income",
  "Adjustment",
];

const BANK_WALLETS: WalletKey[] = ["cbq", ...COMPANY_ACCOUNT_WALLETS];

const text = (t: Transaction) =>
  `${t.purpose ?? ""} ${t.description ?? ""}`.trim().toLowerCase();

/** Legacy support: older records only carry the wording in Purpose / Description. */
const looksLikeOpeningBalance = (t: Transaction) => /opening\s*balance/.test(text(t));
const looksLikeTopUp = (t: Transaction) => /top\s*-?\s*up/.test(text(t));

/**
 * The standardised movement type for a transaction.
 * Order matters: the first matching rule wins.
 */
export function movementType(t: Transaction): MovementType {
  const fromExternal = t.fromWallet === "external";
  const toExternal = t.toWallet === "external";
  const internal = !fromExternal && !toExternal;

  if (looksLikeOpeningBalance(t)) return "Opening Balance";

  // Housemaid salary money
  if (t.type === "Salary Holding" || t.toWallet === "salary-wallet") return "Salary Received";
  if (t.type === "Salary Release" || t.fromWallet === "salary-wallet") return "Salary Released";

  // Sponsor money held for a specific housemaid
  if (t.type === "Housemaid Holding" || t.toWallet === "housemaid-holding") return "Holding Received";
  if (t.type === "Holding Release" || t.fromWallet === "housemaid-holding") return "Holding Released";

  // Candidate / sponsor money (a liability, never a company cost)
  if (t.classification === "Sponsor Expense") {
    return fromExternal ? "Candidate Money Received" : "Candidate Money Released";
  }

  // Card replenishment — company money moving between company wallets
  if (internal && CARD_WALLETS.includes(t.toWallet)) return "Top Up Balance";
  if (internal && looksLikeTopUp(t)) return "Top Up Balance";

  // Bank movements
  if (internal && BANK_WALLETS.includes(t.toWallet)) return "Deposit";
  if (internal && BANK_WALLETS.includes(t.fromWallet)) return "Withdrawal";

  if (internal) return "Internal Transfer";
  if (t.type === "Adjustment") return "Adjustment";
  if (fromExternal) return t.type === "Receipt Voucher" ? "Income" : "Income";
  return "Expense";
}

// ---------- Wallet-specific Money In / Money Out ----------
/**
 * Each wallet is an independent ledger. Money that arrives in the wallet is
 * Money In, money that leaves it is Money Out — the same transaction is
 * therefore Money Out on the paying wallet and Money In on the receiving one
 * (e.g. a card top-up leaves Office Petty Cash and enters Maryam Card).
 */
export function walletDirection(
  t: Transaction,
  wallet: WalletKey,
): { moneyIn: number; moneyOut: number } {
  const incoming = t.toWallet === wallet && t.fromWallet !== wallet;
  const outgoing = t.fromWallet === wallet && t.toWallet !== wallet;
  if (incoming) return { moneyIn: t.amount, moneyOut: 0 };
  if (outgoing) return { moneyIn: 0, moneyOut: t.amount };
  return { moneyIn: 0, moneyOut: 0 };
}

/** Movement types that a wallet treats as Money In (used for statement summaries). */
export function walletMoneyInTypes(wallet: WalletKey): MovementType[] {
  if (PETTY_WALLETS.includes(wallet)) return ["Opening Balance", "Income", "Withdrawal"];
  if (CARD_WALLETS.includes(wallet)) return ["Top Up Balance", "Opening Balance"];
  if (wallet === "salary-wallet") return ["Salary Received"];
  if (wallet === "housemaid-holding") return ["Holding Received", "Candidate Money Received"];
  if (BANK_WALLETS.includes(wallet)) return ["Deposit", "Income"];
  return ["Income", "Deposit", "Opening Balance"];
}

/** Friendly label for a wallet statement line. */
export function movementLabel(t: Transaction, wallet?: WalletKey): string {
  const mt = movementType(t);
  if (wallet && CARD_WALLETS.includes(wallet) && mt === "Top Up Balance" && t.toWallet === wallet) {
    return "Top Up Balance";
  }
  if (mt === "Top Up Balance" && wallet && t.fromWallet === wallet) {
    return `Top Up ${WALLET_BY_KEY[t.toWallet]?.name ?? t.toWallet}`;
  }
  return t.purpose || t.description || t.purposeCategory || mt;
}

// ---------- Financial categories (report filter) ----------
export type FinancialCategory =
  | "Company Expenses"
  | "Income"
  | "Liabilities / Held Funds"
  | "Internal Transfers"
  | "Salary Transactions"
  | "Candidate Money"
  | "Bank Transfers";

export const FINANCIAL_CATEGORIES: FinancialCategory[] = [
  "Company Expenses",
  "Income",
  "Liabilities / Held Funds",
  "Internal Transfers",
  "Salary Transactions",
  "Candidate Money",
  "Bank Transfers",
];

const HELD_FUND_MOVEMENTS: MovementType[] = [
  "Salary Received",
  "Salary Released",
  "Holding Received",
  "Holding Released",
  "Candidate Money Received",
  "Candidate Money Released",
];

/** Categories overlap on purpose, so a transaction can match more than one. */
export function matchesCategory(t: Transaction, category: FinancialCategory): boolean {
  const mt = movementType(t);
  switch (category) {
    case "Company Expenses":
      return isCompanyOperatingExpense(t);
    case "Income":
      return mt === "Income";
    case "Liabilities / Held Funds":
      return HELD_FUND_MOVEMENTS.includes(mt);
    case "Internal Transfers":
      return mt === "Internal Transfer" || mt === "Top Up Balance" || mt === "Opening Balance";
    case "Salary Transactions":
      return mt === "Salary Received" || mt === "Salary Released";
    case "Candidate Money":
      return (
        mt === "Candidate Money Received" ||
        mt === "Candidate Money Released" ||
        mt === "Holding Received" ||
        mt === "Holding Released"
      );
    case "Bank Transfers":
      return mt === "Deposit" || mt === "Withdrawal";
    default:
      return false;
  }
}

export function financialCategories(t: Transaction): FinancialCategory[] {
  return FINANCIAL_CATEGORIES.filter((c) => matchesCategory(t, c));
}

/**
 * A genuine company operating expense: company money that left the business.
 * Internal movements (card top-ups, bank transfers, opening balances) and any
 * money held on behalf of housemaids, candidates or sponsors are excluded.
 */
export function isCompanyOperatingExpense(t: Transaction): boolean {
  if (t.status === "Cancelled" || t.status === "Refunded") return false;
  const mt = movementType(t);
  if (mt !== "Expense") return false;
  if (t.classification === "Sponsor Expense") return false;
  return t.toWallet === "external" && t.fromWallet !== "external";
}

/** Wallets that can pay a company operating expense. */
export const COMPANY_EXPENSE_WALLETS: WalletKey[] = [
  ...PETTY_WALLETS,
  ...CARD_WALLETS,
  "cbq",
  ...COMPANY_ACCOUNT_WALLETS,
];

// ---------- Quick preset filters ----------
export type ReportPreset = {
  id: string;
  label: string;
  description: string;
  types?: TxnType[];
  wallets?: WalletKey[];
  categories?: FinancialCategory[];
};

export const REPORT_PRESETS: ReportPreset[] = [
  {
    id: "all",
    label: "All Transactions",
    description: "No filters — every movement in scope.",
  },
  {
    id: "company-expense",
    label: "Company Expense Report",
    description: "Operating expenses only. Excludes held funds and internal transfers.",
    categories: ["Company Expenses"],
  },
  {
    id: "expense-closing",
    label: "Monthly Company Expense Closing",
    description: "Operating expenses across every company wallet — month-end closing.",
    categories: ["Company Expenses"],
    wallets: COMPANY_EXPENSE_WALLETS,
  },
  {
    id: "petty-cash",
    label: "Petty Cash Report",
    description: "Office and Du Monde petty cash movements.",
    wallets: PETTY_WALLETS,
  },
  {
    id: "cards",
    label: "Card Expense Report",
    description: "All company card movements, including top-ups.",
    wallets: CARD_WALLETS,
  },
  {
    id: "salary",
    label: "Housemaid Salary Report",
    description: "Salary money received and released.",
    categories: ["Salary Transactions"],
  },
  {
    id: "candidate",
    label: "Candidate Money Report",
    description: "Sponsor and candidate money received and utilised.",
    categories: ["Candidate Money"],
  },
  {
    id: "held-funds",
    label: "Held Funds Report",
    description: "Every liability the business is holding for someone else.",
    categories: ["Liabilities / Held Funds"],
  },
  {
    id: "bank",
    label: "Bank Transfers Report",
    description: "CBQ and company account movements.",
    categories: ["Bank Transfers"],
  },
];

export const presetById = (id: string) => REPORT_PRESETS.find((p) => p.id === id);

// ---------- Card reconciliation ----------
export type CardReconciliation = {
  wallet: WalletKey;
  name: string;
  last4?: string;
  opening: number;
  topUps: number;
  expenses: number;
  closing: number;
  target: number;
  /** closing − target. Positive = above target, negative = needs a top-up. */
  variance: number;
  topUpRequired: number;
};

/**
 * Card statement reconciliation for a period.
 * Money In = top-ups (money arriving on the card). Money Out = card spending.
 */
export function cardReconciliation(
  rows: Transaction[],
  wallet: WalletKey,
  target: number,
  opening: number,
  range?: { start?: string; end?: string },
): CardReconciliation {
  const meta = WALLET_BY_KEY[wallet];
  let open = opening;
  let topUps = 0;
  let expenses = 0;
  for (const t of rows) {
    if (t.status === "Cancelled" || t.status === "Refunded") continue;
    const { moneyIn, moneyOut } = walletDirection(t, wallet);
    if (!moneyIn && !moneyOut) continue;
    if (range?.start && t.date < range.start) {
      open += moneyIn - moneyOut;
      continue;
    }
    if (range?.end && t.date > range.end) continue;
    topUps += moneyIn;
    expenses += moneyOut;
  }
  const closing = open + topUps - expenses;
  return {
    wallet,
    name: meta?.name ?? wallet,
    last4: meta?.last4,
    opening: open,
    topUps,
    expenses,
    closing,
    target,
    variance: closing - target,
    topUpRequired: Math.max(0, target - closing),
  };
}

/** Company of a transaction, for reporting. */
export const companyKey = (t: Transaction): Company | undefined => t.company;
