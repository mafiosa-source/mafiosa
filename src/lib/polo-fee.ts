// ============================================================
// POLO 160 fee tracker — money movement + document status.
// Money steps are recorded as rows in the master transactions
// ledger (never as static balances) and tagged with expenseKind,
// so vouchers, wallet reports and reconciliation pick them up.
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import type { Candidate } from "@/lib/cv-management";
import type { Transaction, WalletKey } from "@/lib/finance-types";
import { addTransaction, currentUser } from "@/lib/finance-store";

export const POLO_FEE_AMOUNT = 160;

// ---------- Money steps ----------
export type PoloMoneyStep =
  | "POLO_PAID"
  | "POLO_TO_WALLET"
  | "POLO_FROM_WALLET"
  | "POLO_TO_OFFICE"
  | "POLO_RETURNED";

export const POLO_STEP_LABEL: Record<PoloMoneyStep, string> = {
  POLO_PAID: "Paid by sponsor",
  POLO_TO_WALLET: "Transferred to wallet",
  POLO_FROM_WALLET: "Received from wallet",
  POLO_TO_OFFICE: "Paid to office",
  POLO_RETURNED: "Returned (rejected)",
};

export const POLO_STEP_ORDER: PoloMoneyStep[] = [
  "POLO_PAID",
  "POLO_TO_WALLET",
  "POLO_FROM_WALLET",
  "POLO_TO_OFFICE",
  "POLO_RETURNED",
];

/** Accounts the sponsor may pay the 160 into (step 1). */
export const POLO_RECEIPT_WALLETS: WalletKey[] = [
  "fast-acct",
  "broker-acct",
  "skill-acct",
  "danet-acct",
  "cbq",
  "office-petty",
];

export const POLO_WALLET: WalletKey = "housemaid-holding";
export const POLO_STAFF_WALLET: WalletKey = "with-staff";
export const POLO_OFFICE_WALLET: WalletKey = "external-office";

function candidateRows(transactions: Transaction[], candidateId: string): Transaction[] {
  return transactions
    .filter((t) => t.candidateId === candidateId && t.status !== "Cancelled")
    .filter((t) => POLO_STEP_ORDER.includes(t.expenseKind as PoloMoneyStep))
    .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1));
}

export type PoloMoneyState = {
  rows: Transaction[];
  done: Record<PoloMoneyStep, Transaction | undefined>;
  /** Where the 160 currently sits, in plain words. */
  location: string;
  /** Paid to the office without ever taking the money out of the wallet. */
  alert: boolean;
  /** The amount to collect back from the wallet (0 when there is no alert). */
  toCollect: number;
  /** Account the sponsor paid into, when step 1 is recorded. */
  account?: WalletKey;
};

export function poloMoneyState(transactions: Transaction[], candidateId: string): PoloMoneyState {
  const rows = candidateRows(transactions, candidateId);
  const pick = (k: PoloMoneyStep) => rows.find((t) => t.expenseKind === k);
  const done = {
    POLO_PAID: pick("POLO_PAID"),
    POLO_TO_WALLET: pick("POLO_TO_WALLET"),
    POLO_FROM_WALLET: pick("POLO_FROM_WALLET"),
    POLO_TO_OFFICE: pick("POLO_TO_OFFICE"),
    POLO_RETURNED: pick("POLO_RETURNED"),
  };
  const alert = !!done.POLO_TO_OFFICE && !done.POLO_FROM_WALLET;
  const location = done.POLO_RETURNED
    ? "Back in the holding wallet"
    : done.POLO_TO_OFFICE
      ? "At the external office"
      : done.POLO_FROM_WALLET
        ? "With staff"
        : done.POLO_TO_WALLET
          ? "In the holding wallet"
          : done.POLO_PAID
            ? "In the company account"
            : "Not received yet";
  return {
    rows,
    done,
    location,
    alert,
    toCollect: alert ? (done.POLO_TO_OFFICE?.amount ?? POLO_FEE_AMOUNT) : 0,
    account: done.POLO_PAID?.toWallet,
  };
}

/** Which step may be recorded next. */
export function nextPoloStep(state: PoloMoneyState): PoloMoneyStep | null {
  if (!state.done.POLO_PAID) return "POLO_PAID";
  if (!state.done.POLO_TO_WALLET) return "POLO_TO_WALLET";
  if (!state.done.POLO_FROM_WALLET) return "POLO_FROM_WALLET";
  if (!state.done.POLO_TO_OFFICE) return "POLO_TO_OFFICE";
  if (!state.done.POLO_RETURNED) return "POLO_RETURNED";
  return null;
}

export type PoloStepInput = {
  step: PoloMoneyStep;
  date: string;
  amount?: number;
  /** Required for step 1 — where the sponsor's money landed. */
  account?: WalletKey;
  note?: string;
};

/** Records one money step of the 160 fee in the master ledger. */
export function recordPoloStep(
  candidate: Candidate,
  sponsorName: string | undefined,
  state: PoloMoneyState,
  input: PoloStepInput,
): Transaction {
  const amount = input.amount ?? POLO_FEE_AMOUNT;
  const account = input.account ?? state.account ?? "cbq";
  const base = {
    date: input.date,
    candidate: candidate.fullName,
    candidateId: candidate.id,
    sponsor: sponsorName,
    passport: candidate.passportNumber,
    amount,
    purposeCategory: "POLO" as const,
    status: "Completed" as const,
    expenseKind: input.step,
    description: input.note || undefined,
  };

  switch (input.step) {
    case "POLO_PAID":
      return addTransaction({
        ...base,
        type: "Receipt Voucher",
        classification: "Sponsor Expense",
        purpose: "POLO fee 160 received from sponsor",
        paymentMethod: account === "office-petty" ? "Cash" : "Company Account",
        fromWallet: "external",
        toWallet: account,
        settlementStatus: "SPONSOR_PAID",
      });
    case "POLO_TO_WALLET":
      return addTransaction({
        ...base,
        type: "Housemaid Holding",
        classification: "Sponsor Expense",
        purpose: "POLO fee 160 moved to holding wallet",
        fromWallet: account,
        toWallet: POLO_WALLET,
      });
    case "POLO_FROM_WALLET":
      return addTransaction({
        ...base,
        type: "Transfer",
        classification: "Sponsor Expense",
        purpose: "POLO fee 160 received from wallet by staff",
        fromWallet: POLO_WALLET,
        toWallet: POLO_STAFF_WALLET,
      });
    case "POLO_TO_OFFICE":
      return addTransaction({
        ...base,
        type: "Payment Voucher",
        classification: "Sponsor Expense",
        purpose: "POLO fee 160 paid to external office",
        fromWallet: POLO_STAFF_WALLET,
        toWallet: POLO_OFFICE_WALLET,
        settlementStatus: "SPONSOR_PAID",
      });
    case "POLO_RETURNED":
      return addTransaction({
        ...base,
        type: "Transfer",
        classification: "Sponsor Expense",
        purpose: "POLO fee 160 returned after rejection",
        fromWallet: POLO_OFFICE_WALLET,
        toWallet: POLO_WALLET,
      });
  }
}

// ---------- Company-wide totals for the dashboard ----------
export type PoloTotals = {
  inAccounts: number;
  inWallet: number;
  toCollect: number;
  atOffice: number;
  returned: number;
  /** Housemaids whose 160 was paid to the office without leaving the wallet. */
  alerts: { candidateId: string; candidate: string; amount: number }[];
};

export function poloTotals(transactions: Transaction[]): PoloTotals {
  const ids = Array.from(
    new Set(
      transactions
        .filter((t) => t.candidateId && POLO_STEP_ORDER.includes(t.expenseKind as PoloMoneyStep) && t.status !== "Cancelled")
        .map((t) => t.candidateId!),
    ),
  );
  const totals: PoloTotals = { inAccounts: 0, inWallet: 0, toCollect: 0, atOffice: 0, returned: 0, alerts: [] };
  for (const id of ids) {
    const st = poloMoneyState(transactions, id);
    const amount = st.done.POLO_PAID?.amount ?? POLO_FEE_AMOUNT;
    if (st.done.POLO_RETURNED) totals.returned += amount;
    else if (st.done.POLO_TO_OFFICE) totals.atOffice += amount;
    else if (st.done.POLO_TO_WALLET) totals.inWallet += amount;
    else if (st.done.POLO_PAID) totals.inAccounts += amount;
    if (st.alert) {
      totals.toCollect += st.toCollect;
      totals.alerts.push({
        candidateId: id,
        candidate: st.done.POLO_TO_OFFICE?.candidate ?? "—",
        amount: st.toCollect,
      });
    }
  }
  return totals;
}

// ---------- Document status ----------
export type PoloDocStatus = "PAID" | "SUBMITTED" | "IN_REVIEW" | "APPROVED" | "REJECTED";

export const POLO_DOC_FLOW: PoloDocStatus[] = ["PAID", "SUBMITTED", "IN_REVIEW", "APPROVED"];

export const POLO_DOC_LABEL: Record<PoloDocStatus, string> = {
  PAID: "Paid",
  SUBMITTED: "Submitted",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export type PoloContract = {
  id: string;
  candidateId: string;
  status: PoloDocStatus;
  submittedDate?: string;
  expectedDate?: string;
  approvedDate?: string;
  rejectionReason?: string;
  attempt: number;
  notes?: string;
  updatedAt: string;
};

type Row = Record<string, unknown>;

function contractFromRow(r: Row): PoloContract {
  return {
    id: String(r.id),
    candidateId: String(r.candidate_id),
    status: (r.status as PoloDocStatus) ?? "PAID",
    submittedDate: (r.submitted_date as string) ?? undefined,
    expectedDate: (r.expected_date as string) ?? undefined,
    approvedDate: (r.approved_date as string) ?? undefined,
    rejectionReason: (r.rejection_reason as string) ?? undefined,
    attempt: Number(r.attempt ?? 1),
    notes: (r.notes as string) ?? undefined,
    updatedAt: String(r.updated_at ?? ""),
  };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getPoloContract(candidateId: string): Promise<PoloContract | null> {
  const { data, error } = await supabase.from("polo_contracts").select("*").eq("candidate_id", candidateId).maybeSingle();
  if (error) throw error;
  return data ? contractFromRow(data as Row) : null;
}

export async function listPoloContracts(): Promise<PoloContract[]> {
  const { data, error } = await supabase.from("polo_contracts").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => contractFromRow(r as Row));
}

/** Saves the document status; submitting sets the expected date to +7 days. */
export async function setPoloDocStatus(
  candidateId: string,
  status: PoloDocStatus,
  extra: { submittedDate?: string; rejectionReason?: string; notes?: string; resubmit?: boolean } = {},
): Promise<void> {
  const existing = await getPoloContract(candidateId);
  const row: Row = { candidate_id: candidateId, status, created_by: currentUser() || null };
  if (status === "SUBMITTED") {
    const d = extra.submittedDate || new Date().toISOString().slice(0, 10);
    row.submitted_date = d;
    row.expected_date = addDays(d, 7);
    row.rejection_reason = null;
    if (extra.resubmit) row.attempt = (existing?.attempt ?? 1) + 1;
  }
  if (status === "APPROVED") row.approved_date = new Date().toISOString().slice(0, 10);
  if (status === "REJECTED") row.rejection_reason = extra.rejectionReason?.trim() || null;
  if (extra.notes !== undefined) row.notes = extra.notes.trim() || null;

  if (existing) {
    const { error } = await supabase.from("polo_contracts").update(row as never).eq("candidate_id", candidateId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("polo_contracts").insert(row as never);
    if (error) throw error;
  }
}

/** First-time housemaid flag on the candidate record. */
export async function setFirstTime(candidateId: string, value: boolean): Promise<void> {
  const { error } = await supabase
    .from("candidates")
    .update({ is_first_time: value } as never)
    .eq("id", candidateId);
  if (error) throw error;
}
