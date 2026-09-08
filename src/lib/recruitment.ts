// ============================================================
// Recruitment pipeline — sponsors, per-nationality status flow,
// status history and the per-housemaid expense folder.
// Additive: expenses live in the master ledger (transactions).
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import type { Candidate } from "@/lib/cv-management";
import type { Transaction, Company, PurposeCategory, WalletKey, Classification } from "@/lib/finance-types";
import { addTransaction, currentUser, housemaidKey } from "@/lib/finance-store";

// ---------- Sponsors ----------
export type Sponsor = {
  id: string;
  fullName: string;
  qid?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
};

type Row = Record<string, unknown>;

function sponsorFromRow(r: Row): Sponsor {
  return {
    id: String(r.id),
    fullName: String(r.full_name ?? ""),
    qid: (r.qid as string) ?? undefined,
    phone: (r.phone as string) ?? undefined,
    address: (r.address as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    createdAt: String(r.created_at ?? ""),
  };
}

export const nameKey = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export async function listSponsors(): Promise<Sponsor[]> {
  const { data, error } = await supabase.from("sponsors").select("*").order("full_name");
  if (error) throw error;
  return (data ?? []).map((r) => sponsorFromRow(r as Row));
}

export async function createSponsor(input: Omit<Sponsor, "id" | "createdAt">): Promise<Sponsor> {
  const { data, error } = await supabase
    .from("sponsors")
    .insert({
      full_name: input.fullName.trim(),
      name_key: nameKey(input.fullName),
      qid: input.qid?.trim() || null,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      created_by: currentUser() || null,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("A sponsor with this QID already exists");
    throw error;
  }
  return sponsorFromRow(data as Row);
}

export async function updateSponsor(id: string, patch: Partial<Omit<Sponsor, "id" | "createdAt">>): Promise<void> {
  const row: Row = {};
  if (patch.fullName !== undefined) {
    row.full_name = patch.fullName.trim();
    row.name_key = nameKey(patch.fullName);
  }
  if (patch.qid !== undefined) row.qid = patch.qid.trim() || null;
  if (patch.phone !== undefined) row.phone = patch.phone.trim() || null;
  if (patch.address !== undefined) row.address = patch.address.trim() || null;
  if (patch.notes !== undefined) row.notes = patch.notes.trim() || null;
  const { error } = await supabase.from("sponsors").update(row as never).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error("A sponsor with this QID already exists");
    throw error;
  }
}

export async function deleteSponsor(id: string): Promise<void> {
  const { error } = await supabase.from("sponsors").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Pipeline statuses ----------
export type StatusCode =
  | "CV_UPLOADED"
  | "SELECTED"
  | "PARTIAL_PAID"
  | "VISA_PROCESSING"
  | "VISA_READY_TO_PRINT"
  | "CONTRACT_QA_SIGNED"
  | "QVC_FIT"
  | "QVC_UNFIT"
  | "POLO_SUBMITTED"
  | "POLO_COLLECTED"
  | "SHIPPED_TO_PH"
  | "OWWA_DONE"
  | "OEC_DONE"
  | "MEDICAL_FIT"
  | "MEDICAL_UNFIT"
  | "VISA_DONE"
  | "EMBASSY_CONTRACT_SUBMITTED"
  | "TICKET_BOOKED"
  | "ARRIVED"
  | "CANCELLED";

export const STATUS_LABEL: Record<StatusCode, string> = {
  CV_UPLOADED: "CV Uploaded",
  SELECTED: "Selected by Sponsor",
  PARTIAL_PAID: "Partial Payment Received",
  VISA_PROCESSING: "Visa Processing",
  VISA_READY_TO_PRINT: "Visa Ready to Print",
  CONTRACT_QA_SIGNED: "Contract Signed (Qatar)",
  QVC_FIT: "QVC Medical — FIT",
  QVC_UNFIT: "QVC Medical — UNFIT",
  POLO_SUBMITTED: "POLO Submitted",
  POLO_COLLECTED: "POLO Contract Collected",
  SHIPPED_TO_PH: "Shipped to Philippines",
  OWWA_DONE: "OWWA Done",
  OEC_DONE: "OEC Done",
  MEDICAL_FIT: "Medical — FIT",
  MEDICAL_UNFIT: "Medical — UNFIT",
  VISA_DONE: "Visa Done",
  EMBASSY_CONTRACT_SUBMITTED: "Embassy Contract Submitted (TZ)",
  TICKET_BOOKED: "Ticket Booked",
  ARRIVED: "Arrived in Qatar",
  CANCELLED: "Cancelled / Replaced",
};

/** Steps that can fail (unfit) and what the failure status is. */
export const UNFIT_ALTERNATIVE: Partial<Record<StatusCode, StatusCode>> = {
  QVC_FIT: "QVC_UNFIT",
  MEDICAL_FIT: "MEDICAL_UNFIT",
};

export const TERMINAL_STATUSES: StatusCode[] = ["ARRIVED", "QVC_UNFIT", "MEDICAL_UNFIT", "CANCELLED"];

/** Guidance shown when a step is reached — the finance step it triggers. */
export const STATUS_HINT: Partial<Record<StatusCode, string>> = {
  PARTIAL_PAID: "Record the sponsor's partial payment in Candidate Holdings. A discount needs an Admin-approved request.",
  VISA_READY_TO_PRINT: "Triggers the first agent remittance (50% of agreed remittance) — needs Admin approval.",
  POLO_SUBMITTED: "POLO fee QAR 160 is paid by the sponsor — add it to the expense folder and set the settlement.",
  POLO_COLLECTED: "Enter the POLO appointment / pickup date.",
  OWWA_DONE: "Required only when the housemaid has no experience abroad.",
  OEC_DONE: "OEC payment is released by the company — creates a money request to the agent (Admin approval).",
  EMBASSY_CONTRACT_SUBMITTED: "Embassy contract QAR 100 charged to the sponsor — add it to the expense folder.",
  TICKET_BOOKED: "Add the ticket cost to the expense folder.",
};

export const PH_FLOW: StatusCode[] = [
  "CV_UPLOADED",
  "SELECTED",
  "PARTIAL_PAID",
  "VISA_PROCESSING",
  "VISA_READY_TO_PRINT",
  "CONTRACT_QA_SIGNED",
  "QVC_FIT",
  "POLO_SUBMITTED",
  "POLO_COLLECTED",
  "SHIPPED_TO_PH",
  "OWWA_DONE",
  "OEC_DONE",
  "TICKET_BOOKED",
  "ARRIVED",
];

export const OTHER_FLOW: StatusCode[] = ["CV_UPLOADED", "SELECTED", "MEDICAL_FIT", "VISA_DONE", "TICKET_BOOKED", "ARRIVED"];

export const TZ_FLOW: StatusCode[] = [
  "CV_UPLOADED",
  "SELECTED",
  "MEDICAL_FIT",
  "VISA_DONE",
  "EMBASSY_CONTRACT_SUBMITTED",
  "TICKET_BOOKED",
  "ARRIVED",
];

export function flowFor(c: Pick<Candidate, "countryCode" | "experienceAbroad">): StatusCode[] {
  const cc = c.countryCode.toUpperCase();
  if (cc === "PH") return c.experienceAbroad ? PH_FLOW.filter((s) => s !== "OWWA_DONE") : PH_FLOW;
  if (cc === "TZ") return TZ_FLOW;
  return OTHER_FLOW;
}

export function flowName(countryCode: string): string {
  const cc = countryCode.toUpperCase();
  if (cc === "PH") return "Philippines flow";
  if (cc === "TZ") return "Tanzania flow";
  return "Standard flow";
}

export function statusLabel(code: string): string {
  return STATUS_LABEL[code as StatusCode] ?? code;
}

export function isTerminal(code: string): boolean {
  return TERMINAL_STATUSES.includes(code as StatusCode);
}

export function nextStatus(c: Pick<Candidate, "countryCode" | "experienceAbroad" | "pipelineStatus">): StatusCode | null {
  const flow = flowFor(c);
  const idx = flow.indexOf(c.pipelineStatus as StatusCode);
  if (idx < 0) return flow[0] ?? null;
  return flow[idx + 1] ?? null;
}

export function stepIndex(c: Pick<Candidate, "countryCode" | "experienceAbroad" | "pipelineStatus">): { index: number; total: number } {
  const flow = flowFor(c);
  const idx = flow.indexOf(c.pipelineStatus as StatusCode);
  return { index: idx < 0 ? 0 : idx, total: flow.length };
}

export const STATUS_TONE: Record<string, string> = {
  ARRIVED: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  QVC_UNFIT: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  MEDICAL_UNFIT: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  CANCELLED: "bg-rose-500/15 text-rose-700 border-rose-500/30",
  CV_UPLOADED: "bg-muted text-muted-foreground border-border",
};

// ---------- Status history ----------
export type StatusHistoryEntry = {
  id: string;
  candidateId: string;
  fromStatus?: string;
  toStatus: string;
  note?: string;
  changedBy?: string;
  changedAt: string;
};

export async function listStatusHistory(candidateId: string): Promise<StatusHistoryEntry[]> {
  const { data, error } = await supabase
    .from("candidate_status_history")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("changed_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Row;
    return {
      id: String(row.id),
      candidateId: String(row.candidate_id),
      fromStatus: (row.from_status as string) ?? undefined,
      toStatus: String(row.to_status),
      note: (row.note as string) ?? undefined,
      changedBy: (row.changed_by as string) ?? undefined,
      changedAt: String(row.changed_at),
    };
  });
}

export async function changeStatus(
  candidate: Candidate,
  toStatus: StatusCode,
  extra: { note?: string; poloPickupDate?: string } = {},
): Promise<void> {
  const patch: Row = { pipeline_status: toStatus };
  if (extra.poloPickupDate) patch.polo_pickup_date = extra.poloPickupDate;
  if (toStatus === "SELECTED" && !candidate.selectedAt) patch.selected_at = new Date().toISOString();
  if (toStatus === "ARRIVED") {
    patch.arrived_at = new Date().toISOString();
    patch.status = "Deployed";
  }
  if (toStatus === "SELECTED" || toStatus === "PARTIAL_PAID") patch.availability_status = "Reserved";
  const { error } = await supabase.from("candidates").update(patch as never).eq("id", candidate.id);
  if (error) throw error;
  const { error: hErr } = await supabase.from("candidate_status_history").insert({
    candidate_id: candidate.id,
    from_status: candidate.pipelineStatus,
    to_status: toStatus,
    note: extra.note?.trim() || null,
    changed_by: currentUser() || null,
  } as never);
  if (hErr) throw hErr;
}

/** Link (or, for admins, re-link) the sponsor. The link is permanent for non-admins. */
export async function linkSponsor(candidateId: string, sponsorId: string | null): Promise<void> {
  const { error } = await supabase
    .from("candidates")
    .update({ sponsor_id: sponsorId } as never)
    .eq("id", candidateId);
  if (error) throw error;
}

export async function updatePipelineFields(
  candidateId: string,
  patch: { experienceAbroad?: boolean; agreedRemittance?: number | null; pipelineNotes?: string; poloPickupDate?: string | null },
): Promise<void> {
  const row: Row = {};
  if (patch.experienceAbroad !== undefined) row.experience_abroad = patch.experienceAbroad;
  if (patch.agreedRemittance !== undefined) row.agreed_remittance = patch.agreedRemittance;
  if (patch.pipelineNotes !== undefined) row.pipeline_notes = patch.pipelineNotes || null;
  if (patch.poloPickupDate !== undefined) row.polo_pickup_date = patch.poloPickupDate || null;
  const { error } = await supabase.from("candidates").update(row as never).eq("id", candidateId);
  if (error) throw error;
}

// ---------- Passport duplicate check ----------
export async function passportExists(passportNumber: string, excludeId?: string): Promise<boolean> {
  const p = passportNumber.trim().toUpperCase();
  if (!p) return false;
  let q = supabase.from("candidates").select("id, passport_number").ilike("passport_number", p);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).some((r) => String((r as Row).passport_number ?? "").trim().toUpperCase() === p);
}

// ---------- Expense folder ----------
export type ExpenseKind =
  | "POLO_FEE"
  | "OEC"
  | "OWWA"
  | "TICKET"
  | "EMBASSY_CONTRACT_TZ"
  | "MEDICAL"
  | "QVC"
  | "VISA"
  | "AGENT_REMITTANCE"
  | "OTHER";

export const EXPENSE_KINDS: { key: ExpenseKind; label: string; defaultAmount?: number; defaultPayer?: PaidBy; purpose: PurposeCategory }[] = [
  { key: "POLO_FEE", label: "POLO Fee", defaultAmount: 160, defaultPayer: "Sponsor", purpose: "POLO" },
  { key: "OEC", label: "OEC Payment", defaultPayer: "Company", purpose: "Other" },
  { key: "OWWA", label: "OWWA", defaultPayer: "Company", purpose: "Other" },
  { key: "TICKET", label: "Flight Ticket", defaultPayer: "Company", purpose: "Ticket" },
  { key: "EMBASSY_CONTRACT_TZ", label: "Embassy Contract (TZ) 100 QR", defaultAmount: 100, defaultPayer: "Sponsor", purpose: "Other" },
  { key: "MEDICAL", label: "Medical", defaultPayer: "Sponsor", purpose: "Medical" },
  { key: "QVC", label: "QVC", defaultPayer: "Sponsor", purpose: "QVC" },
  { key: "VISA", label: "Visa", defaultPayer: "Company", purpose: "Visa" },
  { key: "AGENT_REMITTANCE", label: "Agent Remittance", defaultPayer: "Company", purpose: "Other" },
  { key: "OTHER", label: "Other", defaultPayer: "Company", purpose: "Other" },
];

export type PaidBy = "Company" | "Sponsor";
export type Settlement = "SPONSOR_PAID" | "SPONSOR_WILL_PAY_LATER" | "COMPANY_PAID";

export const SETTLEMENT_LABEL: Record<Settlement, string> = {
  SPONSOR_PAID: "Paid by Sponsor",
  SPONSOR_WILL_PAY_LATER: "Company Paid — Sponsor Will Pay Later",
  COMPANY_PAID: "Company Paid",
};

export function expenseKindLabel(kind?: string): string {
  return EXPENSE_KINDS.find((k) => k.key === kind)?.label ?? kind ?? "Expense";
}

export function isUnsettledSponsorDebt(t: Pick<Transaction, "settlementStatus">): boolean {
  return t.settlementStatus === "SPONSOR_WILL_PAY_LATER";
}

/**
 * All cost entries for a housemaid, from the master ledger.
 * Matched by the stored candidate id first, then by the housemaid's name
 * (so older, hand-entered records still show in the folder).
 */
export function expenseFolder(transactions: Transaction[], c: Pick<Candidate, "id" | "fullName">): Transaction[] {
  const key = housemaidKey(c.fullName);
  return transactions
    .filter((t) => t.status !== "Cancelled")
    .filter((t) => t.candidateId === c.id || (!t.candidateId && housemaidKey(t.candidate) === key))
    .filter((t) => t.toWallet === "external" && t.type !== "Salary Release" && t.type !== "Holding Release")
    .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1));
}

export function folderTotals(rows: Transaction[]) {
  const total = rows.reduce((a, t) => a + t.amount, 0);
  const sponsorPaid = rows.filter((t) => t.settlementStatus === "SPONSOR_PAID").reduce((a, t) => a + t.amount, 0);
  const sponsorDebt = rows.filter((t) => t.settlementStatus === "SPONSOR_WILL_PAY_LATER").reduce((a, t) => a + t.amount, 0);
  const companyPaid = rows
    .filter((t) => t.settlementStatus === "COMPANY_PAID" || (!t.settlementStatus && t.classification === "Company Expense"))
    .reduce((a, t) => a + t.amount, 0);
  return { total, sponsorPaid, sponsorDebt, companyPaid };
}

export type ExpenseInput = {
  date: string;
  kind: ExpenseKind;
  amount: number;
  paidBy: PaidBy;
  settlement: Settlement;
  fromWallet: WalletKey;
  company?: Company;
  description?: string;
  receipt?: string;
};

/** Records a cost in the master ledger, tagged to the housemaid's expense folder. */
export function recordExpense(candidate: Candidate, sponsorName: string | undefined, input: ExpenseInput): Transaction {
  const kind = EXPENSE_KINDS.find((k) => k.key === input.kind)!;
  const sponsorDirect = input.settlement === "SPONSOR_PAID";
  const classification: Classification = input.settlement === "COMPANY_PAID" ? "Company Expense" : "Sponsor Expense";
  return addTransaction({
    date: input.date,
    type: sponsorDirect ? "Adjustment" : "Payment Voucher",
    company: input.company,
    classification,
    candidate: candidate.fullName,
    candidateId: candidate.id,
    sponsor: sponsorName,
    passport: candidate.passportNumber,
    purpose: `${kind.label}${input.description ? ` — ${input.description}` : ""}`,
    purposeCategory: kind.purpose,
    amount: input.amount,
    paymentMethod: "Cash",
    fromWallet: sponsorDirect ? "external" : input.fromWallet,
    toWallet: "external",
    status: "Completed",
    description: sponsorDirect ? "Paid directly by sponsor" : undefined,
    attachment: input.receipt || undefined,
    payableBy: input.paidBy,
    expenseKind: input.kind,
    settlementStatus: input.settlement,
  });
}
