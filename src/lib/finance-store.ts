import { useSyncExternalStore } from "react";
import type {
  PettyCashTxn,
  CardTxn,
  CandidateHolding,
  SalaryHolding,
  SponsorReceivable,
  CompanyTransfer,
  Voucher,
  CardKey,
} from "./finance-types";

export type FinanceState = {
  officeOpeningBalance: number;
  dumondeOpeningBalance: number;
  cbqBalance: number;
  pettyCash: PettyCashTxn[];
  cardTxns: CardTxn[];
  candidates: CandidateHolding[];
  salaries: SalaryHolding[];
  sponsors: SponsorReceivable[];
  transfers: CompanyTransfer[];
  vouchers: Voucher[];
};

const KEY = "finance-control-v1";

const initial: FinanceState = {
  officeOpeningBalance: 0,
  dumondeOpeningBalance: 0,
  cbqBalance: 0,
  pettyCash: [],
  cardTxns: [],
  candidates: [],
  salaries: [],
  sponsors: [],
  transfers: [],
  vouchers: [],
};

function load(): FinanceState {
  if (typeof window === "undefined") return initial;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initial;
    return { ...initial, ...JSON.parse(raw) };
  } catch {
    return initial;
  }
}

let state: FinanceState = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

export function setState(update: Partial<FinanceState> | ((s: FinanceState) => Partial<FinanceState>)) {
  const patch = typeof update === "function" ? update(state) : update;
  state = { ...state, ...patch };
  persist();
}

export function getState() {
  return state;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useFinance(): FinanceState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initial,
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10);

// --- Mutations ---
export const addPettyCash = (t: Omit<PettyCashTxn, "id">) =>
  setState((s) => ({ pettyCash: [{ ...t, id: uid() }, ...s.pettyCash] }));
export const deletePettyCash = (id: string) =>
  setState((s) => ({ pettyCash: s.pettyCash.filter((x) => x.id !== id) }));

export const addCardTxn = (t: Omit<CardTxn, "id">) =>
  setState((s) => ({ cardTxns: [{ ...t, id: uid() }, ...s.cardTxns] }));
export const deleteCardTxn = (id: string) =>
  setState((s) => ({ cardTxns: s.cardTxns.filter((x) => x.id !== id) }));

export const addCandidate = (t: Omit<CandidateHolding, "id">) =>
  setState((s) => ({ candidates: [{ ...t, id: uid() }, ...s.candidates] }));
export const updateCandidate = (id: string, patch: Partial<CandidateHolding>) =>
  setState((s) => ({ candidates: s.candidates.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
export const deleteCandidate = (id: string) =>
  setState((s) => ({ candidates: s.candidates.filter((c) => c.id !== id) }));

export const addSalary = (t: Omit<SalaryHolding, "id" | "releases">) =>
  setState((s) => ({ salaries: [{ ...t, id: uid(), releases: [] }, ...s.salaries] }));
export const releaseSalary = (
  salaryId: string,
  release: { date: string; amount: number; receivedBy: string; newSponsorDetails?: string; proof?: string },
) =>
  setState((s) => ({
    salaries: s.salaries.map((sal) => {
      if (sal.id !== salaryId) return sal;
      const releases = [...sal.releases, { ...release, id: uid() }];
      const totalReleased = releases.reduce((a, r) => a + r.amount, 0);
      const status = totalReleased >= sal.amount ? "Fully released" : totalReleased > 0 ? "Partially released" : "Holding";
      return { ...sal, releases, status };
    }),
  }));
export const deleteSalary = (id: string) =>
  setState((s) => ({ salaries: s.salaries.filter((x) => x.id !== id) }));

export const addSponsor = (t: Omit<SponsorReceivable, "id">) =>
  setState((s) => ({ sponsors: [{ ...t, id: uid() }, ...s.sponsors] }));
export const deleteSponsor = (id: string) =>
  setState((s) => ({ sponsors: s.sponsors.filter((x) => x.id !== id) }));

export const addTransfer = (t: Omit<CompanyTransfer, "id">) =>
  setState((s) => ({ transfers: [{ ...t, id: uid() }, ...s.transfers] }));
export const deleteTransfer = (id: string) =>
  setState((s) => ({ transfers: s.transfers.filter((x) => x.id !== id) }));

export const addVoucher = (t: Omit<Voucher, "id">) =>
  setState((s) => ({ vouchers: [{ ...t, id: uid() }, ...s.vouchers] }));
export const deleteVoucher = (id: string) =>
  setState((s) => ({ vouchers: s.vouchers.filter((x) => x.id !== id) }));

export const setOpeningBalance = (scope: "office" | "dumonde" | "cbq", value: number) =>
  setState(() =>
    scope === "office"
      ? { officeOpeningBalance: value }
      : scope === "dumonde"
        ? { dumondeOpeningBalance: value }
        : { cbqBalance: value },
  );

// --- Derived selectors ---
export function pettyCashBalance(s: FinanceState, scope: "office" | "dumonde") {
  const opening = scope === "office" ? s.officeOpeningBalance : s.dumondeOpeningBalance;
  const rows = s.pettyCash.filter((x) => x.scope === scope);
  const received = rows.filter((r) => r.type === "received").reduce((a, r) => a + r.amount, 0);
  const paid = rows.filter((r) => r.type === "paid").reduce((a, r) => a + r.amount, 0);
  return { opening, received, paid, balance: opening + received - paid };
}

export function cardUsage(s: FinanceState, card: CardKey) {
  const rows = s.cardTxns.filter((t) => t.card === card);
  const total = rows.reduce((a, r) => a + r.amount, 0);
  return { total, rows };
}

export function limitCardBreakdown(s: FinanceState) {
  const rows = s.cardTxns.filter((t) => t.card === "limit");
  const personal = rows.filter((r) => r.limitBranch === "personal").reduce((a, r) => a + r.amount, 0);
  const company = rows.filter((r) => r.limitBranch === "company").reduce((a, r) => a + r.amount, 0);
  const factory = rows.filter((r) => r.limitBranch === "factory").reduce((a, r) => a + r.amount, 0);
  return { personal, company, factory, total: personal + company + factory };
}

export function candidateHoldingTotal(s: FinanceState) {
  return s.candidates
    .filter((c) => c.status !== "Completed")
    .reduce((a, c) => a + c.amount, 0);
}

export function salaryHoldingTotal(s: FinanceState) {
  return s.salaries.reduce((a, sal) => {
    const released = sal.releases.reduce((x, r) => x + r.amount, 0);
    return a + Math.max(0, sal.amount - released);
  }, 0);
}

export function pendingTransferToCBQ(s: FinanceState) {
  return s.transfers.reduce((a, t) => a + Math.max(0, t.amountReceived - t.amountTransferred), 0);
}
