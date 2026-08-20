// ============================================================
// Alhakeem Group ERP – Phase 2
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

// ---------- Vehicles & drivers (fuel tracking) ----------
export const DRIVERS = ["SHREERAM", "JABAR", "ALEEM", "OTHER"] as const;

export type Vehicle = { name: string; plate: string };

/** Vehicles registered under each company. Plate uniquely identifies a vehicle. */
export const VEHICLES_BY_COMPANY: Partial<Record<Company, Vehicle[]>> = {
  AHG: [
    { name: "ISUZU TRUCK", plate: "181318" },
    { name: "HYUNDAI PICKUP", plate: "253089" },
    { name: "TOYOTA PICKUP", plate: "11811" },
    { name: "NISSAN CIVILIAN", plate: "93621" },
  ],
  SKILL: [
    { name: "MITSUBISHI BUS", plate: "78578" },
    { name: "TOYOTA HILUX", plate: "31519" },
  ],
  FAST: [
    { name: "NISSAN PICKUP", plate: "131613" },
    { name: "NISSAN PICKUP", plate: "124242" },
  ],
  BROKER: [
    { name: "URVAN BUS", plate: "121215" },
    { name: "CADILLAC", plate: "61715" },
  ],
  DANET: [
    { name: "TOYOTA COROLLA", plate: "315509" },
    { name: "LEXUS", plate: "270025" },
  ],
};

export const vehicleLabel = (v: Vehicle) => `${v.name} ${v.plate}`;

export function vehiclesForCompany(company?: Company): Vehicle[] {
  if (company) return VEHICLES_BY_COMPANY[company] ?? [];
  return Object.values(VEHICLES_BY_COMPANY).flat();
}




// ---------- Wallets ----------
export type WalletKey =
  | "office-petty"
  | "dumonde-petty"
  | "salary-wallet"
  | "housemaid-holding"
  | "cbq"
  | "fast-acct"
  | "broker-acct"
  | "skill-acct"
  | "danet-acct"
  | "maryam-card"
  | "yousef-card"
  | "maha-card"
  | "limit-card"
  | "hassan"
  | "external"; // outside the business (sponsors, POLO, vendors, drivers, staff, etc.)

export type WalletKind = "cash" | "bank" | "company-account" | "card" | "holding" | "person" | "external";

export const WALLETS: { key: WalletKey; name: string; kind: WalletKind; last4?: string; limit?: number; purpose?: string }[] = [
  { key: "office-petty", name: "Office Petty Cash", kind: "cash" },
  { key: "dumonde-petty", name: "Du Monde Petty Cash", kind: "cash" },
  { key: "salary-wallet", name: "Housemaid Salary Wallet", kind: "holding", purpose: "Housemaid salary money only" },
  {
    key: "housemaid-holding",
    name: "Housemaid Holding Wallet",
    kind: "holding",
    purpose: "Sponsor money held for a specific housemaid until released",
  },
  { key: "cbq", name: "CBQ", kind: "bank" },
  { key: "fast-acct", name: "FAST Account", kind: "company-account" },
  { key: "broker-acct", name: "BROKER Account", kind: "company-account" },
  { key: "skill-acct", name: "SKILL Account", kind: "company-account" },
  { key: "danet-acct", name: "DANET Account", kind: "company-account" },
  { key: "maryam-card", name: "Maryam Card", kind: "card", last4: "5515", limit: 5000, purpose: "General Company Expenses" },
  { key: "yousef-card", name: "Yousef Card", kind: "card", last4: "6921", limit: 5000, purpose: "Immigration Expenses" },
  { key: "maha-card", name: "Maha Petrol Card", kind: "card", last4: "0552", limit: 5000, purpose: "Fuel" },
  { key: "limit-card", name: "Limit Card", kind: "card", last4: "3852", limit: 1000, purpose: "Mixed Expenses" },
  { key: "hassan", name: "MR HASSAN", kind: "person", purpose: "Owner funds in / personal settlements" },
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
/** Wallets that appear in wallet reports and reconciliation. */
export const REPORT_WALLETS: WalletKey[] = [
  "office-petty",
  "dumonde-petty",
  "salary-wallet",
  "housemaid-holding",
  "cbq",
  "maryam-card",
  "yousef-card",
  "maha-card",
  "limit-card",
  "hassan",
  ...COMPANY_ACCOUNT_WALLETS,
];
/** Wallets whose incoming money may settle an outstanding payable. */
export const REIMBURSEMENT_WALLETS: WalletKey[] = [
  "office-petty",
  "dumonde-petty",
  "cbq",
  ...COMPANY_ACCOUNT_WALLETS,
];

/**
 * Wallets that are NOT expected to return to a target at month end.
 * Their closing balance simply becomes next month's carry-forward (C/F),
 * because the money is held on behalf of housemaids or sponsors.
 */
export const CARRY_FORWARD_WALLETS: WalletKey[] = ["salary-wallet", "housemaid-holding"];

/** Monthly reconciliation targets — the ERP only reports these, it never moves money. */
export const RECON_TARGETS: { wallet: WalletKey; target: number }[] = [
  { wallet: "office-petty", target: 0 },
  { wallet: "dumonde-petty", target: 0 },
  { wallet: "maryam-card", target: 5000 },
  { wallet: "yousef-card", target: 5000 },
  { wallet: "maha-card", target: 5000 },
  { wallet: "limit-card", target: 1000 },
];

// ---------- Transaction ----------
export type TxnType =
  | "Receipt Voucher"
  | "Payment Voucher"
  | "Transfer"
  | "Card Expense"
  | "Petty Cash"
  | "Salary Holding"
  | "Salary Release"
  | "Housemaid Holding"
  | "Holding Release"
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
  "Housemaid Holding",
  "Holding Release",
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
  | "Ticket"
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
  "Ticket",
  "Office Expense",
  "Factory Catering",
  "Other",
];

/** Approved destinations for money released from the Housemaid Holding Wallet. */
export const HOLDING_RELEASE_PURPOSES: PurposeCategory[] = [
  "Visa",
  "Medical",
  "QVC",
  "POLO",
  "Ticket",
  "Transportation",
  "Service Charge",
  "Penalty",
  "Salary",
  "Other",
];

export type PaymentMethod = "Cash" | "CBQ" | "Company Account" | "Card";
export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "CBQ", "Company Account", "Card"];

export type Status = "Pending" | "Completed" | "Refunded" | "Cancelled";
export const STATUSES: Status[] = ["Pending", "Completed", "Refunded", "Cancelled"];

export type CardCategory = "Personal" | "Company Expense" | "Factory Catering";

// ---------- Payment responsibility ----------
export type PayableBy = "Company" | "Factory" | "Sponsor" | "Personal" | "Other";
export const PAYABLE_BY_OPTIONS: PayableBy[] = ["Company", "Factory", "Sponsor", "Personal", "Other"];
/** Which wallet is expected to reimburse the card. */
export const PAYABLE_SOURCE_WALLET: Record<PayableBy, WalletKey | undefined> = {
  Company: "office-petty",
  Factory: "dumonde-petty",
  Personal: "hassan",
  Sponsor: "external",
  Other: undefined,
};

export type PayableStatus = "Outstanding" | "Partially Paid" | "Fully Paid";

export type Payable = {
  id: string;
  txnId?: string;
  date: string;
  responsibleParty: PayableBy;
  payerName?: string;
  cardWallet: WalletKey;
  company?: Company;
  candidate?: string;
  sponsor?: string;
  particulars?: string;
  amount: number;
  paid: number;
  status: PayableStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type PayablePayment = {
  id: string;
  payableId: string;
  txnId?: string;
  date: string;
  amount: number;
  notes?: string;
  createdAt: string;
};

// ---------- Month closing ----------
export type MonthStatus = "Open" | "Ready to Close" | "Closed";

export type MonthClosing = {
  id: string;
  year: number;
  month: number; // 1-12
  status: "Closed" | "Open";
  closedWithExceptions: boolean;
  exceptions: string[];
  snapshot: Record<string, unknown>;
  notes?: string;
  closedAt: string;
};

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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
  payableBy?: PayableBy;
  payerName?: string;
  // Fuel-specific
  driver?: string;
  vehicle?: string;
  plateNumber?: string;
  station?: string;
  kmBefore?: number;
  kmAfter?: number;
  /** Kilometres travelled, entered manually at the time of the transaction. */
  kmReading?: number;
  // Salary linkage
  parentTxnId?: string; // Salary Release → Salary Holding
  createdBy?: string;
  /** Audit: operator who last edited the record. */
  lastEditedBy?: string;
  createdAt: string;
  updatedAt: string;
};
