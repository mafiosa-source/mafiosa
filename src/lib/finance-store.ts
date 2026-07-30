import { useSyncExternalStore } from "react";
import type {
  Transaction,
  WalletKey,
  Company,
  Classification,
  TxnType,
} from "./finance-types";
import {
  CARD_WALLETS,
  COMPANY_ACCOUNT_BY_COMPANY,
  COMPANY_ACCOUNT_WALLETS,
  PETTY_WALLETS,
  WALLETS,
  WALLET_BY_KEY,
} from "./finance-types";

// ---------- State ----------
export type FinanceState = {
  transactions: Transaction[];
  openingBalances: Partial<Record<WalletKey, number>>;
};

const KEY = "ahg-finance-v2";
const LEGACY_KEY = "finance-control-v1";

const initial: FinanceState = {
  transactions: [],
  openingBalances: {},
};

// ---------- State (mirror of the cloud database) ----------
let state: FinanceState = initial;
let currentUserId: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function setCloudUser(userId: string | null) {
  currentUserId = userId;
  if (!userId) {
    state = initial;
    notify();
  }
}

export function setState(update: Partial<FinanceState> | ((s: FinanceState) => Partial<FinanceState>)) {
  const patch = typeof update === "function" ? update(state) : update;
  state = { ...state, ...patch };
  notify();
}
export function getState() {
  return state;
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function useFinance(): FinanceState {
  return useSyncExternalStore(subscribe, () => state, () => initial);
}

/** Load everything from the backend into the in-memory mirror. */
export async function hydrateFromCloud() {
  const cloud = await fetchCloudState();
  state = cloud;
  notify();
}

function reportCloudError(action: string, error: unknown) {
  console.error(`[finance] cloud ${action} failed`, error);
  const message = error instanceof Error ? error.message : String(error);
  toast.error(`Could not save to the database (${action})`, { description: message });
}

/** Reads any records still sitting in this browser's local storage. */
export function readLocalBackup(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<FinanceState>;
      return parsed.transactions ?? [];
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return migrateFromV1(JSON.parse(legacy)).transactions;
    return [];
  } catch {
    return [];
  }
}

/** One-time upload of local-storage records. Nothing local is deleted. */
export async function importLocalBackupToCloud(): Promise<number> {
  if (!currentUserId) throw new Error("Not signed in");
  const local = readLocalBackup();
  if (!local.length) return 0;
  const idMap = new Map<string, string>();
  for (const t of local) idMap.set(t.id, crypto.randomUUID());
  const prepared: Transaction[] = local.map((t) => ({
    ...t,
    id: idMap.get(t.id)!,
    parentTxnId: t.parentTxnId ? (idMap.get(t.parentTxnId) ?? undefined) : undefined,
  }));
  await insertCloudTransactions(prepared, currentUserId);
  await hydrateFromCloud();
  return prepared.length;
}

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const nowIso = () => new Date().toISOString();

// ---------- Voucher numbering ----------
export function nextVoucherNumber(company: Company, type: "Receipt Voucher" | "Payment Voucher"): string {
  const prefix = type === "Receipt Voucher" ? "RV" : "PV";
  const existing = state.transactions
    .filter((t) => t.company === company && t.type === type && t.voucherNumber)
    .map((t) => {
      const m = t.voucherNumber!.match(/-(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
  const next = (existing.length ? Math.max(...existing) : 0) + 1;
  return `${company} ${prefix}-${String(next).padStart(4, "0")}`;
}

export function isVoucherNumberTaken(number: string, excludeId?: string): boolean {
  return state.transactions.some((t) => t.voucherNumber === number && t.id !== excludeId);
}

// ---------- Mutations ----------
export function addTransaction(t: Omit<Transaction, "id" | "createdAt" | "updatedAt">): Transaction {
  const now = nowIso();
  const txn: Transaction = {
    ...t,
    id: uid(),
    createdAt: now,
    updatedAt: now,
    currentLocation: t.currentLocation ?? t.toWallet,
  };
  // Auto-assign voucher number if RV/PV without one
  if ((txn.type === "Receipt Voucher" || txn.type === "Payment Voucher") && txn.company && !txn.voucherNumber) {
    txn.voucherNumber = nextVoucherNumber(txn.company, txn.type);
  }
  setState((s) => ({ transactions: [txn, ...s.transactions] }));
  return txn;
}

export function updateTransaction(id: string, patch: Partial<Transaction>) {
  setState((s) => ({
    transactions: s.transactions.map((t) =>
      t.id === id ? { ...t, ...patch, updatedAt: nowIso() } : t,
    ),
  }));
}

export function deleteTransaction(id: string) {
  setState((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) }));
}

export function setOpeningBalance(wallet: WalletKey, value: number) {
  setState((s) => ({ openingBalances: { ...s.openingBalances, [wallet]: value } }));
}

// ---------- Derived selectors ----------
export function sortByDateDesc<T extends { date: string; createdAt: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

function isActive(t: Transaction) {
  return t.status !== "Cancelled" && t.status !== "Refunded";
}

export function walletBalance(s: FinanceState, wallet: WalletKey): {
  opening: number;
  inflow: number;
  outflow: number;
  balance: number;
} {
  const opening = s.openingBalances[wallet] ?? 0;
  let inflow = 0;
  let outflow = 0;
  for (const t of s.transactions) {
    if (!isActive(t)) continue;
    if (t.toWallet === wallet && t.fromWallet !== wallet) inflow += t.amount;
    if (t.fromWallet === wallet && t.toWallet !== wallet) outflow += t.amount;
  }
  return { opening, inflow, outflow, balance: opening + inflow - outflow };
}

export function cardUsage(s: FinanceState, wallet: WalletKey): { used: number; limit: number; remaining: number } {
  const meta = WALLET_BY_KEY[wallet];
  const limit = meta.limit ?? 0;
  // For cards: "used" is money that left the card wallet (outflow).
  let used = 0;
  for (const t of s.transactions) {
    if (!isActive(t)) continue;
    if (t.fromWallet === wallet && t.toWallet !== wallet) used += t.amount;
    if (t.toWallet === wallet && t.fromWallet !== wallet) used -= t.amount; // repayments/refunds reduce usage
  }
  used = Math.max(0, used);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export function pettyCashSummary(s: FinanceState, wallet: WalletKey) {
  const b = walletBalance(s, wallet);
  return { opening: b.opening, received: b.inflow, paid: b.outflow, balance: b.balance };
}

// Candidate money currently held = sum of positive remaining balances across candidates
export function candidateHoldingTotal(s: FinanceState): number {
  return candidateLedger(s).reduce((a, c) => a + Math.max(0, c.balance), 0);
}

export function salariesHeldTotal(s: FinanceState): number {
  const holdings = s.transactions.filter((t) => isActive(t) && t.type === "Salary Holding");
  let total = 0;
  for (const h of holdings) {
    const released = s.transactions
      .filter((t) => isActive(t) && t.type === "Salary Release" && t.parentTxnId === h.id)
      .reduce((a, r) => a + r.amount, 0);
    total += Math.max(0, h.amount - released);
  }
  return total;
}

export function pendingCompanyTransfer(s: FinanceState, company: Exclude<Company, "AHG">): number {
  const account = COMPANY_ACCOUNT_BY_COMPANY[company];
  const balance = walletBalance(s, account).balance;
  return Math.max(0, balance);
}

export function filterByWallets(s: FinanceState, wallets: WalletKey[]): Transaction[] {
  const set = new Set(wallets);
  return s.transactions.filter((t) => set.has(t.fromWallet) || set.has(t.toWallet));
}

export function filterByClassification(s: FinanceState, cls: Classification): Transaction[] {
  return s.transactions.filter((t) => t.classification === cls);
}

export function filterByType(s: FinanceState, types: TxnType[]): Transaction[] {
  const set = new Set(types);
  return s.transactions.filter((t) => set.has(t.type));
}

// Aggregate per candidate for the Candidate Holdings ledger
export type CandidateLedgerEntry = {
  candidate: string;
  sponsor?: string;
  company?: Company;
  received: number;
  utilized: number;
  refunded: number;
  adjustments: number;
  balance: number;
  lastDate: string;
  currentLocation: string;
  status: "Available" | "Partially Utilized" | "Closed" | "Refunded";
  holdings: Transaction[];
  payments: Transaction[];
  refunds: Transaction[];
  timeline: Transaction[];
};

function normalize(s?: string) {
  return (s ?? "").trim().toLowerCase();
}

export function candidateLedger(s: FinanceState): CandidateLedgerEntry[] {
  const map = new Map<string, CandidateLedgerEntry>();

  const isIncomingSponsor = (t: Transaction) =>
    isActive(t) &&
    t.classification === "Sponsor Expense" &&
    t.fromWallet === "external" &&
    t.toWallet !== "external" &&
    !!t.candidate;

  const isOutgoingForCandidate = (t: Transaction) =>
    isActive(t) &&
    !!t.candidate &&
    t.toWallet === "external" &&
    t.fromWallet !== "external";

  const ensure = (key: string, seed: Transaction): CandidateLedgerEntry => {
    let cur = map.get(key);
    if (!cur) {
      cur = {
        candidate: seed.candidate!,
        sponsor: seed.sponsor,
        company: seed.company,
        received: 0,
        utilized: 0,
        refunded: 0,
        adjustments: 0,
        balance: 0,
        lastDate: seed.date,
        currentLocation: "—",
        status: "Available",
        holdings: [],
        payments: [],
        refunds: [],
        timeline: [],
      };
      map.set(key, cur);
    }
    return cur;
  };

  for (const t of s.transactions) {
    if (!t.candidate) continue;
    const key = normalize(t.candidate);
    if (isIncomingSponsor(t)) {
      const cur = ensure(key, t);
      cur.received += t.amount;
      cur.holdings.push(t);
      cur.timeline.push(t);
      if (!cur.sponsor && t.sponsor) cur.sponsor = t.sponsor;
      if (!cur.company && t.company) cur.company = t.company;
      if (t.date > cur.lastDate) cur.lastDate = t.date;
    } else if (isOutgoingForCandidate(t)) {
      const cur = ensure(key, t);
      if (t.type === "Adjustment") {
        cur.adjustments -= t.amount;
      } else if (t.status === "Refunded") {
        cur.refunded += t.amount;
        cur.refunds.push(t);
      } else {
        cur.utilized += t.amount;
        cur.payments.push(t);
      }
      cur.timeline.push(t);
      if (t.date > cur.lastDate) cur.lastDate = t.date;
    }
  }

  for (const cur of map.values()) {
    cur.balance = cur.received - cur.utilized - cur.refunded + cur.adjustments;
    cur.timeline.sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1));

    if (cur.received > 0 && cur.refunded >= cur.received - 0.001 && cur.utilized === 0) {
      cur.status = "Refunded";
    } else if (cur.balance <= 0.001) {
      cur.status = "Closed";
    } else if (cur.balance < cur.received - 0.001) {
      cur.status = "Partially Utilized";
    } else {
      cur.status = "Available";
    }

    if (cur.status === "Refunded") {
      cur.currentLocation = "Refunded";
    } else if (cur.status === "Closed" && cur.payments.length > 0) {
      const last = [...cur.payments].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      cur.currentLocation = `Paid to ${last.purposeCategory ?? last.purpose ?? "External"}`;
    } else if (cur.holdings.length > 0) {
      const last = [...cur.holdings].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      cur.currentLocation = WALLET_BY_KEY[last.toWallet]?.name ?? "—";
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1));
}

// Backwards-compat summary shape
export type CandidateSummary = {
  candidate: string;
  sponsor?: string;
  company?: Company;
  received: number;
  paid: number;
  balance: number;
  lastDate: string;
  transactions: Transaction[];
};
export function candidateSummaries(s: FinanceState): CandidateSummary[] {
  return candidateLedger(s).map((c) => ({
    candidate: c.candidate,
    sponsor: c.sponsor,
    company: c.company,
    received: c.received,
    paid: c.utilized + c.refunded,
    balance: c.balance,
    lastDate: c.lastDate,
    transactions: c.timeline,
  }));
}

export type HoldingMatchCriteria = {
  candidate?: string;
  sponsor?: string;
  company?: Company;
  purposeCategory?: string;
};
export function findMatchingHoldings(s: FinanceState, c: HoldingMatchCriteria): CandidateLedgerEntry[] {
  if (!c.candidate) return [];
  return candidateLedger(s).filter((h) => {
    if (normalize(h.candidate) !== normalize(c.candidate)) return false;
    if (h.balance <= 0.001) return false;
    if (c.company && h.company && h.company !== c.company) return false;
    if (c.sponsor && h.sponsor && normalize(h.sponsor) !== normalize(c.sponsor)) return false;
    return true;
  });
}

// ---------- Legacy migration (v1 → v2) ----------
type V1 = {
  officeOpeningBalance?: number;
  dumondeOpeningBalance?: number;
  cbqBalance?: number;
  pettyCash?: Array<{
    id: string; date: string; description: string; category: string;
    amount: number; type: "received" | "paid"; company?: string;
    candidate?: string; receipt?: string; scope: "office" | "dumonde";
  }>;
  cardTxns?: Array<{
    id: string; card: "maryam" | "yousef" | "maha" | "limit";
    date: string; description: string; category: string; amount: number;
    company?: string; candidate?: string;
    limitBranch?: "personal" | "company" | "factory";
    driver?: string; vehicle?: string; plateNumber?: string; station?: string;
    kmBefore?: number; kmAfter?: number;
  }>;
  candidates?: Array<{
    id: string; date: string; candidateName: string; passport: string;
    nationality?: string; sponsor: string; company: string; purpose: string;
    amount: number; paymentMethod: string; currentLocation: string;
    status: string; notes?: string;
  }>;
  salaries?: Array<{
    id: string; date: string; housemaidName: string; passport: string;
    previousSponsor: string; newSponsor?: string; amount: number;
    receivedFrom: string; currentLocation: "Cash" | "CBQ"; status: string;
    releases: Array<{ id: string; date: string; amount: number; receivedBy: string; newSponsorDetails?: string; proof?: string }>;
  }>;
  transfers?: Array<{
    id: string; date: string; company: string; amountReceived: number;
    purpose: string; amountTransferred: number; transferDate?: string;
  }>;
  vouchers?: Array<{
    id: string; type: "RV" | "PV"; number: string; date: string;
    company: string; party: string; candidate?: string; amount: number;
    paymentMethod: string; purpose: string; attachment?: string;
  }>;
};

function cardKeyToWallet(k: string): WalletKey {
  switch (k) {
    case "maryam": return "maryam-card";
    case "yousef": return "yousef-card";
    case "maha": return "maha-card";
    default: return "limit-card";
  }
}
function normalizeCompany(c?: string): Company | undefined {
  if (!c) return undefined;
  const up = c.toUpperCase();
  if (["FAST", "BROKER", "SKILL", "DANET", "AHG"].includes(up)) return up as Company;
  return undefined;
}

function migrateFromV1(v1: V1): FinanceState {
  const now = nowIso();
  const txns: Transaction[] = [];
  const mkId = () => Math.random().toString(36).slice(2, 10);

  for (const p of v1.pettyCash ?? []) {
    const wallet: WalletKey = p.scope === "office" ? "office-petty" : "dumonde-petty";
    txns.push({
      id: mkId(), date: p.date, type: "Petty Cash", amount: p.amount,
      company: normalizeCompany(p.company),
      candidate: p.candidate,
      purpose: p.description,
      purposeCategory: "Other",
      fromWallet: p.type === "received" ? "external" : wallet,
      toWallet: p.type === "received" ? wallet : "external",
      status: "Completed",
      description: p.description,
      paymentMethod: "Cash",
      createdAt: now, updatedAt: now,
    });
  }

  for (const c of v1.cardTxns ?? []) {
    const wallet = cardKeyToWallet(c.card);
    const isFuel = c.card === "maha";
    txns.push({
      id: mkId(), date: c.date, type: isFuel ? "Fuel Expense" : "Card Expense",
      amount: c.amount,
      company: normalizeCompany(c.company),
      candidate: c.candidate,
      purpose: c.description,
      purposeCategory: isFuel ? "Fuel" : "Other",
      fromWallet: wallet, toWallet: "external",
      status: "Completed",
      description: c.description,
      paymentMethod: "Card",
      cardCategory: c.limitBranch === "personal" ? "Personal" : c.limitBranch === "company" ? "Company Expense" : c.limitBranch === "factory" ? "Factory Catering" : undefined,
      driver: c.driver, vehicle: c.vehicle, plateNumber: c.plateNumber,
      station: c.station, kmBefore: c.kmBefore, kmAfter: c.kmAfter,
      createdAt: now, updatedAt: now,
    });
  }

  for (const cnd of v1.candidates ?? []) {
    txns.push({
      id: mkId(), date: cnd.date, type: "Payment Voucher",
      amount: cnd.amount,
      company: normalizeCompany(cnd.company),
      classification: "Sponsor Expense",
      candidate: cnd.candidateName,
      passport: cnd.passport,
      sponsor: cnd.sponsor,
      purpose: cnd.purpose,
      purposeCategory: (cnd.purpose as any) ?? "Other",
      fromWallet: "external", toWallet: "cbq",
      status: cnd.status === "Completed" ? "Completed" : "Pending",
      description: cnd.notes,
      paymentMethod: (cnd.paymentMethod as any) ?? "Cash",
      createdAt: now, updatedAt: now,
    });
  }

  for (const sal of v1.salaries ?? []) {
    const wallet: WalletKey = sal.currentLocation === "CBQ" ? "cbq" : "office-petty";
    const holdingId = mkId();
    txns.push({
      id: holdingId, date: sal.date, type: "Salary Holding",
      amount: sal.amount,
      candidate: sal.housemaidName,
      passport: sal.passport,
      sponsor: sal.previousSponsor,
      purpose: `Salary held from ${sal.previousSponsor}`,
      purposeCategory: "Salary",
      fromWallet: "external", toWallet: wallet,
      status: "Completed",
      description: sal.newSponsor ? `New sponsor: ${sal.newSponsor}` : undefined,
      paymentMethod: sal.currentLocation === "CBQ" ? "CBQ" : "Cash",
      createdAt: now, updatedAt: now,
    });
    for (const rel of sal.releases ?? []) {
      txns.push({
        id: mkId(), date: rel.date, type: "Salary Release",
        amount: rel.amount,
        candidate: sal.housemaidName,
        passport: sal.passport,
        purpose: `Released to ${rel.receivedBy}`,
        purposeCategory: "Salary",
        fromWallet: wallet, toWallet: "external",
        status: "Completed",
        description: rel.newSponsorDetails,
        paymentMethod: sal.currentLocation === "CBQ" ? "CBQ" : "Cash",
        parentTxnId: holdingId,
        createdAt: now, updatedAt: now,
      });
    }
  }

  for (const tr of v1.transfers ?? []) {
    const company = normalizeCompany(tr.company);
    const acct = company && company !== "AHG" ? COMPANY_ACCOUNT_BY_COMPANY[company] : "fast-acct";
    if (tr.amountReceived > 0) {
      txns.push({
        id: mkId(), date: tr.date, type: "Receipt Voucher",
        amount: tr.amountReceived,
        company,
        classification: "Company Expense",
        purpose: tr.purpose,
        purposeCategory: "Other",
        fromWallet: "external", toWallet: acct,
        status: "Completed",
        paymentMethod: "Company Account",
        createdAt: now, updatedAt: now,
      });
    }
    if (tr.amountTransferred > 0) {
      txns.push({
        id: mkId(), date: tr.transferDate ?? tr.date, type: "Transfer",
        amount: tr.amountTransferred,
        company,
        purpose: `Transfer ${company ?? ""} → CBQ`,
        purposeCategory: "Other",
        fromWallet: acct, toWallet: "cbq",
        status: "Completed",
        paymentMethod: "Company Account",
        createdAt: now, updatedAt: now,
      });
    }
  }

  for (const v of v1.vouchers ?? []) {
    const company = normalizeCompany(v.company);
    const type: TxnType = v.type === "RV" ? "Receipt Voucher" : "Payment Voucher";
    txns.push({
      id: mkId(), date: v.date, type,
      voucherNumber: `${company ?? "FAST"} ${v.type}-${v.number}`,
      amount: v.amount,
      company,
      classification: "Company Expense",
      candidate: v.candidate,
      sponsor: v.party,
      purpose: v.purpose,
      purposeCategory: "Other",
      fromWallet: type === "Receipt Voucher" ? "external" : "office-petty",
      toWallet: type === "Receipt Voucher" ? "office-petty" : "external",
      status: "Completed",
      paymentMethod: (v.paymentMethod as any) ?? "Cash",
      attachment: v.attachment,
      createdAt: now, updatedAt: now,
    });
  }

  return {
    transactions: txns,
    openingBalances: {
      "office-petty": v1.officeOpeningBalance ?? 0,
      "dumonde-petty": v1.dumondeOpeningBalance ?? 0,
      cbq: v1.cbqBalance ?? 0,
    },
  };
}

// Re-export wallet meta helpers
export { WALLETS, WALLET_BY_KEY, CARD_WALLETS, PETTY_WALLETS, COMPANY_ACCOUNT_WALLETS, COMPANY_ACCOUNT_BY_COMPANY };
