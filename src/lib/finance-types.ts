// ============================================================
// AHG Finance Core – Phase 1
// Single source of truth: one Master Transactions table.
// Every screen is a filtered view over `transactions`.
// ============================================================

export type Company = "FAST" | "BROKER" | "SKILL" | "DANET" | "AHG" | "FACTORY" | "QUALITY" | "ALSABH";
export const COMPANIES: Company[] = ["AHG", "FAST", "BROKER", "DANET", "SKILL", "FACTORY", "QUALITY", "ALSABH"];
// Human-facing labels (DANET is stored as-is to protect existing records).
export const COMPANY_LABEL: Record<Company, string> = {
  AHG: "AHG",
  FAST: "Fast",
  BROKER: "Broker",
  DANET: "Danat",
  SKILL: "Skill",
  FACTORY: "Factory",
  QUALITY: "Quality",
  ALSABH: "Alsabh",
};
// AHG is used for office expenses, cards and petty cash only.
// It does NOT use Receipt Vouchers or Payment Vouchers.
export const VOUCHER_COMPANIES: Company[] = ["FAST", "BROKER", "SKILL", "DANET", "FACTORY", "QUALITY", "ALSABH"];


// ---------- Wallets ----------
export type WalletKey =
  | "office-petty"
  | "dumonde-petty"
  | "cbq"
  | "fast-acct"
  | "broker-acct"
  | "skill-acct"
  | "danet-acct"
  | "maryam-card"
  | "yousef-card"
  | "maha-card"
  | "limit-card"
  | "external"; // outside the business (sponsors, POLO, vendors, drivers, staff, etc.)

export type WalletKind = "cash" | "bank" | "company-account" | "card" | "external";

export const WALLETS: { key: WalletKey; name: string; kind: WalletKind; last4?: string; limit?: number; purpose?: string }[] = [
  { key: "office-petty", name: "Office Petty Cash", kind: "cash" },
  { key: "dumonde-petty", name: "Du Monde Petty Cash", kind: "cash" },
  { key: "cbq", name: "CBQ", kind: "bank" },
  { key: "fast-acct", name: "FAST Account", kind: "company-account" },
  { key: "broker-acct", name: "BROKER Account", kind: "company-account" },
  { key: "skill-acct", name: "SKILL Account", kind: "company-account" },
  { key: "danet-acct", name: "DANET Account", kind: "company-account" },
  { key: "maryam-card", name: "Maryam Card", kind: "card", last4: "5515", limit: 5000, purpose: "General Company Expenses" },
  { key: "yousef-card", name: "Yousef Card", kind: "card", last4: "6921", limit: 5000, purpose: "Immigration Expenses" },
  { key: "maha-card", name: "Maha Petrol Card", kind: "card", last4: "0552", limit: 5000, purpose: "Fuel" },
  { key: "limit-card", name: "Limit Card", kind: "card", last4: "3852", limit: 1000, purpose: "Mixed Expenses" },
  { key: "external", name: "External / Third Party", kind: "external" },
];

export const WALLET_BY_KEY: Record<WalletKey, (typeof WALLETS)[number]> = WALLETS.reduce(
  (acc, w) => ({ ...acc, [w.key]: w }),
  {} as Record<WalletKey, (typeof WALLETS)[number]>,
);

export const COMPANY_ACCOUNT_BY_COMPANY: Partial<Record<Company, WalletKey>> = {
  FAST: "fast-acct",
  BROKER: "broker-acct",
  SKILL: "skill-acct",
  DANET: "danet-acct",
};

export const CARD_WALLETS: WalletKey[] = ["maryam-card", "yousef-card", "maha-card", "limit-card"];
export const PETTY_WALLETS: WalletKey[] = ["office-petty", "dumonde-petty"];
export const COMPANY_ACCOUNT_WALLETS: WalletKey[] = ["fast-acct", "broker-acct", "skill-acct", "danet-acct"];

// ---------- Transaction ----------
export type TxnType =
  | "Receipt Voucher"
  | "Payment Voucher"
  | "Transfer"
  | "Card Expense"
  | "Petty Cash"
  | "Salary Holding"
  | "Salary Release"
  | "Fuel Expense"
  | "Adjustment";

export const TXN_TYPES: TxnType[] = [
  "Receipt Voucher",
  "Payment Voucher",
  "Transfer",
  "Card Expense",
  "Petty Cash",
  "Salary Holding",
  "Salary Release",
  "Fuel Expense",
  "Adjustment",
];

export type Classification = "Sponsor Expense" | "Company Expense";
export const CLASSIFICATIONS: Classification[] = ["Sponsor Expense", "Company Expense"];

export type PurposeCategory =
  | "POLO"
  | "Visa"
  | "Medical"
  | "QVC"
  | "Penalty"
  | "Transportation"
  | "Service Charge"
  | "Salary"
  | "Fuel"
  | "Office Expense"
  | "Factory Catering"
  | "Other";

export const PURPOSE_CATEGORIES: PurposeCategory[] = [
  "POLO",
  "Visa",
  "Medical",
  "QVC",
  "Penalty",
  "Transportation",
  "Service Charge",
  "Salary",
  "Fuel",
  "Office Expense",
  "Factory Catering",
  "Other",
];

export type PaymentMethod = "Cash" | "CBQ" | "Company Account" | "Card";
export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "CBQ", "Company Account", "Card"];

export type Status = "Pending" | "Completed" | "Refunded" | "Cancelled";
export const STATUSES: Status[] = ["Pending", "Completed", "Refunded", "Cancelled"];

export type CardCategory = "Personal" | "Company Expense" | "Factory Catering";

export type Transaction = {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  type: TxnType;
  voucherNumber?: string; // e.g. "FAST RV-0001"
  company?: Company;
  classification?: Classification;
  candidate?: string;
  sponsor?: string;
  passport?: string;
  purpose?: string;
  purposeCategory?: PurposeCategory;
  amount: number;
  paymentMethod?: PaymentMethod;
  fromWallet: WalletKey;
  toWallet: WalletKey;
  currentLocation?: WalletKey; // auto = toWallet for the latest position
  status: Status;
  description?: string;
  referenceNumber?: string;
  attachment?: string;
  // Card-specific
  cardCategory?: CardCategory; // Limit card branching
  // Fuel-specific
  driver?: string;
  vehicle?: string;
  plateNumber?: string;
  station?: string;
  kmBefore?: number;
  kmAfter?: number;
  // Salary linkage
  parentTxnId?: string; // Salary Release → Salary Holding
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};
