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

// ============================================================
// Company Expenses report — strictly separated money
//
// Money In  = Expense Funding only (e.g. from Mr Hassan)
// Money Out = genuine company operating expenses
// Everything else (housemaid money, third-party holdings, internal
// transfers, card top-ups, pass-through) is excluded entirely.
// ============================================================
import { isExpenseFunding, COMPANY_EXPENSE_EXCLUSION_NOTE } from "@/lib/wallet-rules";
import { dayOfWeek } from "@/lib/format";
import type { FuelPrintRow } from "@/lib/format";

const _isExpense = isCompanyOperatingExpense;


export type CompanyExpenseReport = {
  funding: Transaction[];
  expenses: Transaction[];
  totalFunding: number;
  totalExpenses: number;
  remaining: number;
  rows: PrintReportRow[];
  note: string;
};

export function companyExpenseReport(
  rows: Transaction[],
  opts: { from?: string; to?: string; company?: string; wallets?: WalletKey[] } = {},
): CompanyExpenseReport {
  const walletSet = opts.wallets && opts.wallets.length ? new Set<WalletKey>(opts.wallets) : null;
  const inScope = rows.filter((t) => {
    if (opts.from && t.date < opts.from) return false;
    if (opts.to && t.date > opts.to) return false;
    if (opts.company === "__none__") {
      if (t.company) return false;
    } else if (opts.company && opts.company !== "__all__" && t.company !== opts.company) return false;
    return true;
  });

  const funding = byDateAsc(
    inScope.filter((t) => isExpenseFunding(t) && (!walletSet || walletSet.has(t.toWallet))),
  );
  const expenses = byDateAsc(
    inScope.filter((t) => _isExpense(t) && (!walletSet || walletSet.has(t.fromWallet))),
  );

  const totalFunding = funding.reduce((a, t) => a + t.amount, 0);
  const totalExpenses = expenses.reduce((a, t) => a + t.amount, 0);

  const rowsOut: PrintReportRow[] = byDateAsc([...funding, ...expenses]).map((t) => {
    const funded = isExpenseFunding(t);
    return {
      date: t.date,
      company: companyOf(t),
      particulars: funded
        ? `Expense funding received — ${WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet}`
        : [t.purposeCategory, particularsOf(t)].filter(Boolean).join(" · "),
      amount: t.amount,
      moneyIn: funded ? t.amount : 0,
      moneyOut: funded ? 0 : t.amount,
      wallet: WALLET_BY_KEY[funded ? t.toWallet : t.fromWallet]?.name ?? "—",
    };
  });

  return {
    funding,
    expenses,
    totalFunding,
    totalExpenses,
    remaining: totalFunding - totalExpenses,
    rows: rowsOut,
    note: COMPANY_EXPENSE_EXCLUSION_NOTE,
  };
}

export function toCompanyExpenseCsvRows(r: CompanyExpenseReport): Record<string, unknown>[] {
  return r.rows.map((x) => ({
    Date: x.date,
    Company: x.company,
    "Particulars / Purpose": x.particulars,
    "Money In": x.moneyIn || "",
    "Money Out": x.moneyOut || "",
    "Payment Wallet": x.wallet,
  }));
}

// ---------- Wallet / card statement with a running balance ----------
export function toBalanceLedgerRows(
  rows: Transaction[],
  wallet: WalletKey,
  opening: number,
  openingDate?: string,
): PrintReportRow[] {
  let balance = opening;
  const out: PrintReportRow[] = [
    {
      date: openingDate ?? (rows.length ? byDateAsc(rows)[0].date : ""),
      company: "—",
      particulars: "Opening Balance",
      amount: opening,
      moneyIn: opening > 0 ? opening : 0,
      moneyOut: opening < 0 ? -opening : 0,
      balance: opening,
      wallet: WALLET_BY_KEY[wallet]?.name ?? wallet,
    },
  ];
  for (const r of toLedgerPrintRows(rows, wallet)) {
    balance += (r.moneyIn ?? 0) - (r.moneyOut ?? 0);
    out.push({ ...r, balance });
  }
  return out;
}

// ---------- Fuel / vehicle reporting ----------
export const isFuelTransaction = (t: Transaction) =>
  t.type === "Fuel Expense" || t.purposeCategory === "Fuel";

export type FuelFilters = {
  from?: string;
  to?: string;
  company?: string;
  vehicle?: string;
  plateNumber?: string;
  driver?: string;
  wallet?: WalletKey | "";
};

export function fuelTransactions(rows: Transaction[], f: FuelFilters): Transaction[] {
  const like = (a?: string, b?: string) =>
    !b || (a ?? "").toLowerCase().includes(b.toLowerCase());
  return byDateAsc(
    rows.filter((t) => {
      if (!isFuelTransaction(t)) return false;
      if (t.status === "Cancelled") return false;
      if (f.from && t.date < f.from) return false;
      if (f.to && t.date > f.to) return false;
      if (f.company === "__none__") {
        if (t.company) return false;
      } else if (f.company && f.company !== "__all__" && t.company !== f.company) return false;
      if (!like(t.vehicle, f.vehicle)) return false;
      if (!like(t.plateNumber, f.plateNumber)) return false;
      if (!like(t.driver, f.driver)) return false;
      if (f.wallet && t.fromWallet !== f.wallet) return false;
      return true;
    }),
  );
}

/** Odometer reading recorded at the time of the transaction. */
export const fuelOdometer = (t: Transaction) => t.kmAfter ?? t.kmBefore ?? undefined;

/**
 * OFFICIAL KM = the value the user typed. Never derived from odometer gaps.
 * Legacy rows that only carry before/after readings keep their recorded span.
 */
export const fuelManualKm = (t: Transaction): number | undefined =>
  t.kmReading != null
    ? t.kmReading
    : t.kmBefore != null && t.kmAfter != null
      ? t.kmAfter - t.kmBefore
      : undefined;

export function fuelKmMap(rows: Transaction[]): Map<string, number | undefined> {
  const map = new Map<string, number | undefined>();
  for (const t of rows) map.set(t.id, fuelManualKm(t));
  return map;
}

export const fuelKm = fuelManualKm;

// ---------- Odometer verification (audit only — never changes KM) ----------
export type FuelAuditStatus = "ok" | "review" | "discrepancy" | "odometer-error" | "no-previous";

export type FuelAudit = {
  status: FuelAuditStatus;
  label: string;
  detail: string;
  expectedKm?: number;
  manualKm?: number;
  diff?: number;
  /** Odometer of the immediately previous dated entry for the same vehicle. */
  previousOdometer?: number;
  previousDate?: string;
};

export const FUEL_AUDIT_FILTERS = ["all", "ok", "review", "discrepancy", "odometer-error"] as const;
export type FuelAuditFilter = (typeof FUEL_AUDIT_FILTERS)[number];

/** Statuses that the user should look at. */
export const needsFuelReview = (a?: FuelAudit) =>
  !!a && (a.status === "review" || a.status === "discrepancy" || a.status === "odometer-error");

/**
 * Compares the entered KM against the odometer gap versus the immediately
 * previous dated entry for the same vehicle. Entries are always read in date
 * order, so the most recent date carries the current readings. Values entered
 * by the user are never changed or recalculated — this is tagging only.
 * Pass the full fuel history so previous readings are found even when filtered.
 */
export function fuelAuditMap(rows: Transaction[]): Map<string, FuelAudit> {
  const map = new Map<string, FuelAudit>();
  const last = new Map<string, { odo: number; date: string }>();
  for (const t of byDateAsc(rows)) {
    const key = t.plateNumber ?? t.vehicle ?? "";
    const odo = fuelOdometer(t);
    const manual = fuelManualKm(t);
    const prev = last.get(key);

    if (odo == null || prev == null || manual == null) {
      map.set(t.id, {
        status: "no-previous",
        label: "No previous reading",
        detail:
          odo == null
            ? "No odometer reading recorded for this transaction."
            : manual == null
              ? "No KM recorded for this transaction."
              : "This is the first odometer reading for this vehicle, so no comparison is possible.",
        manualKm: manual,
        previousOdometer: prev?.odo,
        previousDate: prev?.date,
      });
    } else if (odo < prev.odo) {
      map.set(t.id, {
        status: "odometer-error",
        label: "Odometer reading error",
        detail: `Current odometer reading (${odo}) is lower than the previous reading (${prev.odo} on ${prev.date}). Please verify the entry.`,
        manualKm: manual,
        previousOdometer: prev.odo,
        previousDate: prev.date,
      });
    } else {
      const expected = odo - prev.odo;
      const diff = manual - expected;
      const abs = Math.abs(diff);
      const base = {
        expectedKm: expected,
        manualKm: manual,
        diff,
        previousOdometer: prev.odo,
        previousDate: prev.date,
      };
      if (abs <= 2) {
        map.set(t.id, {
          status: "ok",
          label: "OK",
          detail: `Entered KM matches the odometer gap since ${prev.date} (${expected} KM).`,
          ...base,
        });
      } else if (abs <= 10) {
        map.set(t.id, {
          status: "review",
          label: `Review: ${abs} KM difference`,
          detail: `Odometer gap since ${prev.date} is ${expected} KM, ${manual} KM was entered.`,
          ...base,
        });
      } else {
        map.set(t.id, {
          status: "discrepancy",
          label: `⚠ Discrepancy: ${abs} KM ${diff > 0 ? "higher" : "lower"} than expected`,
          detail: `Odometer gap since ${prev.date} is ${expected} KM, ${manual} KM was entered.`,
          ...base,
        });
      }
    }
    if (odo != null) last.set(key, { odo, date: t.date });
  }
  return map;
}

/** Current readings per vehicle: the values from the most recent dated entry. */
export function fuelLatestReadings(
  rows: Transaction[],
): Map<string, { date: string; odometer?: number; km?: number; vehicle?: string }> {
  const map = new Map<string, { date: string; odometer?: number; km?: number; vehicle?: string }>();
  for (const t of byDateAsc(rows.filter(isFuelTransaction))) {
    const key = t.plateNumber ?? t.vehicle ?? "";
    if (!key) continue;
    map.set(key, {
      date: t.date,
      odometer: fuelOdometer(t),
      km: fuelManualKm(t),
      vehicle: t.vehicle,
    });
  }
  return map;
}

export function toFuelPrintRows(rows: Transaction[], audit?: Map<string, FuelAudit>): FuelPrintRow[] {
  return rows.map((t) => ({
    date: t.date,
    day: dayOfWeek(t.date),
    company: companyOf(t),
    vehicle: t.vehicle ?? "—",
    plateNumber: t.plateNumber ?? "—",
    odometer: fuelOdometer(t),
    km: fuelManualKm(t),
    discrepancy: audit?.get(t.id)?.label ?? "",
    driver: t.driver ?? "—",
    amount: t.amount,
    wallet: WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet,
  }));
}


export function toFuelCsvRows(rows: Transaction[], audit?: Map<string, FuelAudit>): Record<string, unknown>[] {
  return toFuelPrintRows(rows, audit).map((r) => ({
    Date: r.date,
    Day: r.day,
    Company: r.company,
    Vehicle: r.vehicle,
    "Number Plate": r.plateNumber,
    Odometer: r.odometer ?? "",
    KM: r.km ?? "",
    Discrepancy: r.discrepancy ?? "",
    Driver: r.driver,
    "Amount (QAR)": r.amount,
    "Payment Wallet": r.wallet,
  }));
}
