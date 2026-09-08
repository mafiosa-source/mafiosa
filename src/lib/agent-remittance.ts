// ============================================================
// Agent remittance — derived entirely from existing records:
//   agreed amount  -> candidates.agreed_remittance
//   half 1 due     -> housemaid reached VISA_READY_TO_PRINT (or later)
//   half 2 due     -> housemaid ARRIVED
//   paid           -> master-ledger entries tagged AGENT_REMITTANCE
//   approvals      -> recruitment_requests (Approved)
// Nothing is stored separately; no static balances.
// ============================================================
import type { Candidate, Agent } from "@/lib/cv-management";
import type { Transaction } from "@/lib/finance-types";
import { flowFor, type StatusCode } from "@/lib/recruitment";
import { housemaidKey as housemaidKeyOf } from "@/lib/finance-store";
import type { RecruitmentRequest } from "@/lib/recruitment-requests";

export type HalfState = "Not due" | "Due" | "Paid" | "Partial";

export type CandidateRemittance = {
  candidate: Candidate;
  agreed: number;
  half: number;
  half1Due: boolean;
  half2Due: boolean;
  due: number;
  paid: number;
  balance: number;
  half1: HalfState;
  half2: HalfState;
  approved1?: RecruitmentRequest;
  approved2?: RecruitmentRequest;
  pending: RecruitmentRequest[];
  payments: Transaction[];
};

export type AgentRemittance = {
  agent: Agent;
  rows: CandidateRemittance[];
  agreed: number;
  due: number;
  paid: number;
  balance: number;
  payments: Transaction[];
};

function reached(c: Candidate, status: StatusCode): boolean {
  const flow = flowFor(c);
  const at = flow.indexOf(c.pipelineStatus as StatusCode);
  const target = flow.indexOf(status);
  if (c.pipelineStatus === status) return true;
  if (target < 0 || at < 0) return false;
  return at >= target;
}

export function isRemittancePayment(t: Transaction): boolean {
  if (t.status === "Cancelled") return false;
  if (t.expenseKind === "AGENT_REMITTANCE") return true;
  return !t.expenseKind && /agent remittance/i.test(t.purpose ?? "");
}

export function remittancePayments(transactions: Transaction[], c: Pick<Candidate, "id" | "fullName">): Transaction[] {
  const key = housemaidKeyOf(c.fullName);
  return transactions
    .filter(isRemittancePayment)
    .filter((t) => t.candidateId === c.id || (!t.candidateId && housemaidKeyOf(t.candidate) === key))
    .sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1));
}

function halfState(due: boolean, paidSoFar: number, half: number, slot: 1 | 2): HalfState {
  const covered = slot === 1 ? paidSoFar : Math.max(0, paidSoFar - half);
  if (covered >= half - 0.005 && half > 0) return "Paid";
  if (!due) return "Not due";
  return covered > 0 ? "Partial" : "Due";
}

export function candidateRemittance(c: Candidate, transactions: Transaction[], requests: RecruitmentRequest[]): CandidateRemittance {
  const agreed = c.agreedRemittance ?? 0;
  const half = agreed / 2;
  const half1Due = reached(c, "VISA_READY_TO_PRINT") || reached(c, "VISA_DONE") || c.pipelineStatus === "ARRIVED";
  const half2Due = c.pipelineStatus === "ARRIVED";
  const payments = remittancePayments(transactions, c);
  const paid = payments.reduce((a, t) => a + t.amount, 0);
  const due = (half1Due ? half : 0) + (half2Due ? half : 0);
  const mine = requests.filter((r) => r.candidateId === c.id);
  return {
    candidate: c,
    agreed,
    half,
    half1Due,
    half2Due,
    due,
    paid,
    balance: Math.max(0, due - paid),
    half1: halfState(half1Due, paid, half, 1),
    half2: halfState(half2Due, paid, half, 2),
    approved1: mine.find((r) => r.type === "AGENT_REMITTANCE_1" && r.status === "Approved"),
    approved2: mine.find((r) => r.type === "AGENT_REMITTANCE_2" && r.status === "Approved"),
    pending: mine.filter((r) => r.status === "Pending" && r.type.startsWith("AGENT_REMITTANCE")),
    payments,
  };
}

export function agentRemittances(
  agents: Agent[],
  candidates: Candidate[],
  transactions: Transaction[],
  requests: RecruitmentRequest[],
): AgentRemittance[] {
  return agents
    .map((agent) => {
      const rows = candidates
        .filter((c) => c.agentId === agent.id && c.pipelineStatus !== "CANCELLED")
        .map((c) => candidateRemittance(c, transactions, requests))
        .filter((r) => r.agreed > 0 || r.payments.length > 0)
        .sort((a, b) => b.balance - a.balance);
      const sum = (f: (r: CandidateRemittance) => number) => rows.reduce((a, r) => a + f(r), 0);
      return {
        agent,
        rows,
        agreed: sum((r) => r.agreed),
        due: sum((r) => r.due),
        paid: sum((r) => r.paid),
        balance: sum((r) => r.balance),
        payments: rows.flatMap((r) => r.payments).sort((a, b) => (a.date < b.date ? 1 : -1)),
      };
    })
    .sort((a, b) => b.balance - a.balance || a.agent.name.localeCompare(b.agent.name));
}
