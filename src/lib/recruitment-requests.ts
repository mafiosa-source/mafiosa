// ============================================================
// Official requests — money / discount requests that need Admin approval.
// Auto-created by pipeline steps; decided only by admins.
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import type { Candidate } from "@/lib/cv-management";
import type { Transaction } from "@/lib/finance-types";
import { currentUser } from "@/lib/finance-store";
import { expenseFolder, folderTotals, type StatusCode } from "@/lib/recruitment";

export type RequestType = "AGENT_REMITTANCE_1" | "AGENT_REMITTANCE_2" | "OEC_PAYMENT" | "DISCOUNT" | "OTHER";
export type RequestStatus = "Pending" | "Approved" | "Rejected";

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  AGENT_REMITTANCE_1: "Agent remittance — 1st half (50%)",
  AGENT_REMITTANCE_2: "Agent remittance — 2nd half (50%)",
  OEC_PAYMENT: "OEC payment to agent",
  DISCOUNT: "Sponsor discount",
  OTHER: "Other money request",
};

export type RecruitmentRequest = {
  id: string;
  type: RequestType;
  candidateId?: string;
  agentId?: string;
  sponsorId?: string;
  requestedBy?: string;
  requestedByUser?: string;
  amount?: number;
  reason?: string;
  status: RequestStatus;
  settlementStatus?: string;
  flags: string[];
  autoCreated: boolean;
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
  seenByRequester: boolean;
  createdAt: string;
};

type Row = Record<string, unknown>;

function fromRow(r: Row): RecruitmentRequest {
  return {
    id: String(r.id),
    type: r.type as RequestType,
    candidateId: (r.candidate_id as string) ?? undefined,
    agentId: (r.agent_id as string) ?? undefined,
    sponsorId: (r.sponsor_id as string) ?? undefined,
    requestedBy: (r.requested_by as string) ?? undefined,
    requestedByUser: (r.requested_by_user as string) ?? undefined,
    amount: r.amount == null ? undefined : Number(r.amount),
    reason: (r.reason as string) ?? undefined,
    status: (r.status as RequestStatus) ?? "Pending",
    settlementStatus: (r.settlement_status as string) ?? undefined,
    flags: Array.isArray(r.flags) ? (r.flags as string[]) : [],
    autoCreated: Boolean(r.auto_created),
    decidedBy: (r.decided_by as string) ?? undefined,
    decidedAt: (r.decided_at as string) ?? undefined,
    decisionNote: (r.decision_note as string) ?? undefined,
    seenByRequester: Boolean(r.seen_by_requester),
    createdAt: String(r.created_at ?? ""),
  };
}

export async function listRequests(): Promise<RecruitmentRequest[]> {
  const { data, error } = await supabase.from("recruitment_requests").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => fromRow(r as Row));
}

export async function countPendingRequests(): Promise<number> {
  const { count, error } = await supabase
    .from("recruitment_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "Pending");
  if (error) return 0;
  return count ?? 0;
}

/** Decisions on my own requests that I have not seen yet. */
export async function listUnseenDecisions(): Promise<RecruitmentRequest[]> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("recruitment_requests")
    .select("*")
    .eq("requested_by_user", uid)
    .neq("status", "Pending")
    .eq("seen_by_requester", false);
  if (error) return [];
  return (data ?? []).map((r) => fromRow(r as Row));
}

export async function markSeen(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await supabase.from("recruitment_requests").update({ seen_by_requester: true } as never).in("id", ids);
}

// ---------- Red flags ----------
export function computeFlags(
  type: RequestType,
  candidate: Candidate | null,
  amount: number | undefined,
  transactions: Transaction[],
  existing: RecruitmentRequest[],
): string[] {
  const flags: string[] = [];
  if (!candidate) {
    flags.push("Not linked to a housemaid");
    return flags;
  }
  const dupe = existing.find((r) => r.candidateId === candidate.id && r.type === type && r.status !== "Rejected");
  if (dupe) flags.push(`A ${dupe.status.toLowerCase()} request of the same type already exists`);
  if (!candidate.sponsorId) flags.push("No sponsor linked");
  const folder = expenseFolder(transactions, candidate);
  const totals = folderTotals(folder);
  if (totals.sponsorDebt > 0) flags.push(`Sponsor still owes QAR ${totals.sponsorDebt.toLocaleString()}`);

  if (type === "AGENT_REMITTANCE_1" || type === "AGENT_REMITTANCE_2") {
    if (!candidate.agreedRemittance) flags.push("Agreed remittance amount not set on the housemaid file");
    else if (amount && amount > candidate.agreedRemittance / 2 + 0.01) flags.push("Amount is more than 50% of the agreed remittance");
    const received = transactions.some(
      (t) =>
        t.status !== "Cancelled" &&
        (t.candidateId === candidate.id || (t.candidate ?? "").trim().toLowerCase() === candidate.fullName.trim().toLowerCase()) &&
        t.fromWallet === "external" &&
        t.toWallet !== "external" &&
        (t.type === "Housemaid Holding" || t.type === "Receipt Voucher"),
    );
    if (!received) flags.push("No payment received from the sponsor yet");
    if (type === "AGENT_REMITTANCE_1" && candidate.pipelineStatus !== "VISA_READY_TO_PRINT") {
      const order: StatusCode[] = ["VISA_READY_TO_PRINT", "CONTRACT_QA_SIGNED", "QVC_FIT", "POLO_SUBMITTED", "POLO_COLLECTED", "SHIPPED_TO_PH", "OWWA_DONE", "OEC_DONE", "TICKET_BOOKED", "ARRIVED"];
      if (!order.includes(candidate.pipelineStatus as StatusCode)) flags.push("Visa is not ready to print yet");
    }
    if (type === "AGENT_REMITTANCE_2" && candidate.pipelineStatus !== "ARRIVED") flags.push("Housemaid has not arrived yet");
  }
  if (type === "OEC_PAYMENT" && !["OEC_DONE", "TICKET_BOOKED", "ARRIVED", "OWWA_DONE", "SHIPPED_TO_PH"].includes(candidate.pipelineStatus)) {
    flags.push("Housemaid has not reached the OEC stage");
  }
  if (type === "DISCOUNT") {
    const prior = existing.find((r) => r.candidateId === candidate.id && r.type === "DISCOUNT" && r.status === "Approved");
    if (prior) flags.push("A discount was already approved for this housemaid");
    if (!amount) flags.push("Discount amount missing");
  }
  if (amount != null && amount <= 0) flags.push("Amount must be greater than zero");
  return flags;
}

export async function createRequest(input: {
  type: RequestType;
  candidate: Candidate | null;
  amount?: number;
  reason?: string;
  flags: string[];
  autoCreated?: boolean;
}): Promise<RecruitmentRequest> {
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("recruitment_requests")
    .insert({
      type: input.type,
      candidate_id: input.candidate?.id ?? null,
      agent_id: input.candidate?.agentId ?? null,
      sponsor_id: input.candidate?.sponsorId ?? null,
      requested_by: currentUser() || u.user?.email || null,
      requested_by_user: u.user?.id ?? null,
      amount: input.amount ?? null,
      reason: input.reason?.trim() || null,
      flags: input.flags,
      auto_created: !!input.autoCreated,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as Row);
}

/** Called after a pipeline step; creates the automatic request once. */
export async function autoRequestForStatus(candidate: Candidate, status: StatusCode, transactions: Transaction[]): Promise<RecruitmentRequest | null> {
  let type: RequestType | null = null;
  if (status === "VISA_READY_TO_PRINT") type = "AGENT_REMITTANCE_1";
  if (status === "OEC_DONE") type = "OEC_PAYMENT";
  if (status === "ARRIVED") type = "AGENT_REMITTANCE_2";
  if (!type) return null;
  const existing = await listRequests();
  if (existing.some((r) => r.candidateId === candidate.id && r.type === type && r.status !== "Rejected")) return null;
  const amount = type.startsWith("AGENT_REMITTANCE") && candidate.agreedRemittance ? candidate.agreedRemittance / 2 : undefined;
  const flags = computeFlags(type, { ...candidate, pipelineStatus: status }, amount, transactions, existing);
  return createRequest({
    type,
    candidate: { ...candidate, pipelineStatus: status },
    amount,
    reason: `Auto-created when ${candidate.fullName} reached ${status.replace(/_/g, " ").toLowerCase()}`,
    flags,
    autoCreated: true,
  });
}

export async function decideRequest(
  id: string,
  decision: "Approved" | "Rejected",
  opts: { note?: string; settlementStatus?: string; amount?: number } = {},
): Promise<void> {
  const patch: Row = {
    status: decision,
    decided_by: currentUser() || null,
    decided_at: new Date().toISOString(),
    decision_note: opts.note?.trim() || null,
    seen_by_requester: false,
  };
  if (opts.settlementStatus !== undefined) patch.settlement_status = opts.settlementStatus;
  if (opts.amount !== undefined) patch.amount = opts.amount;
  const { error } = await supabase.from("recruitment_requests").update(patch as never).eq("id", id);
  if (error) throw error;
}
