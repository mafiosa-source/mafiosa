// ============================================================
// POLO batch tracking (submission / return sheets) + bulk
// transfers of the 160 fee into the Housemaid Holding wallet.
// Purely additive: all money still lives in master transactions.
// ============================================================
import { supabase } from "@/integrations/supabase/client";
import { addTransaction, currentUser, updateTransaction } from "@/lib/finance-store";
import { POLO_FEE_AMOUNT } from "@/lib/polo-fee";
import type { Transaction, WalletKey } from "@/lib/finance-types";
import { WALLET_BY_KEY } from "@/lib/finance-types";
import type { Candidate } from "@/lib/cv-management";

type Row = Record<string, unknown>;

export const HOLDING_WALLET: WalletKey = "housemaid-holding";

/** Accounts the 160 fee may be paid from before it reaches the holding wallet. */
export const FEE_SOURCE_WALLETS: WalletKey[] = [
  "fast-acct",
  "broker-acct",
  "skill-acct",
  "danet-acct",
  "cbq",
];

/** Fee locations that are acceptable once the sheet has been submitted. */
export const SAFE_FEE_LOCATIONS: WalletKey[] = [
  "housemaid-holding",
  "office-petty",
  "dumonde-petty",
  "external-office",
];

export const walletName = (k?: WalletKey | string) =>
  (k && WALLET_BY_KEY[k as WalletKey]?.name) || "—";

// ---------- Types ----------
export type PoloEventType = "submitted" | "returned" | "approved";

export type PoloBatch = {
  id: string;
  type: "submitted" | "returned";
  scanDate: string;
  image?: string;
  note?: string;
  createdAt: string;
};

export type PoloEvent = {
  id: string;
  batchId?: string;
  workerId?: string;
  workerName: string;
  referenceCode?: string;
  eventType: PoloEventType;
  eventDate: string;
  attemptNo: number;
  feeLocation?: string;
  note?: string;
  createdAt: string;
};

export type BulkTransfer = {
  id: string;
  ref: string;
  fromAccount: WalletKey;
  toAccount: WalletKey;
  total: number;
  status: "pending" | "completed";
  transferDate: string;
  note?: string;
  createdAt: string;
};

export type BulkItem = {
  id: string;
  bulkId: string;
  feeTransactionId: string;
  workerId?: string;
  workerName?: string;
  sponsorName?: string;
  amount: number;
  signStatus: "pending" | "signed";
  proof?: string;
  signDate?: string;
  signedBy?: string;
  transferTransactionId?: string;
  createdAt: string;
};

// ---------- Mappers ----------
const batchFromRow = (r: Row): PoloBatch => ({
  id: String(r.id),
  type: (r.type as PoloBatch["type"]) ?? "submitted",
  scanDate: String(r.scan_date ?? ""),
  image: (r.image as string) ?? undefined,
  note: (r.note as string) ?? undefined,
  createdAt: String(r.created_at ?? ""),
});

const eventFromRow = (r: Row): PoloEvent => ({
  id: String(r.id),
  batchId: (r.batch_id as string) ?? undefined,
  workerId: (r.worker_id as string) ?? undefined,
  workerName: String(r.worker_name ?? ""),
  referenceCode: (r.reference_code as string) ?? undefined,
  eventType: (r.event_type as PoloEventType) ?? "submitted",
  eventDate: String(r.event_date ?? ""),
  attemptNo: Number(r.attempt_no ?? 1),
  feeLocation: (r.fee_location as string) ?? undefined,
  note: (r.note as string) ?? undefined,
  createdAt: String(r.created_at ?? ""),
});

const bulkFromRow = (r: Row): BulkTransfer => ({
  id: String(r.id),
  ref: String(r.ref ?? ""),
  fromAccount: (r.from_account as WalletKey) ?? "cbq",
  toAccount: (r.to_account as WalletKey) ?? HOLDING_WALLET,
  total: Number(r.total ?? 0),
  status: (r.status as BulkTransfer["status"]) ?? "pending",
  transferDate: String(r.transfer_date ?? ""),
  note: (r.note as string) ?? undefined,
  createdAt: String(r.created_at ?? ""),
});

const itemFromRow = (r: Row): BulkItem => ({
  id: String(r.id),
  bulkId: String(r.bulk_id),
  feeTransactionId: String(r.fee_transaction_id ?? ""),
  workerId: (r.worker_id as string) ?? undefined,
  workerName: (r.worker_name as string) ?? undefined,
  sponsorName: (r.sponsor_name as string) ?? undefined,
  amount: Number(r.amount ?? POLO_FEE_AMOUNT),
  signStatus: (r.sign_status as BulkItem["signStatus"]) ?? "pending",
  proof: (r.proof as string) ?? undefined,
  signDate: (r.sign_date as string) ?? undefined,
  signedBy: (r.signed_by as string) ?? undefined,
  transferTransactionId: (r.transfer_transaction_id as string) ?? undefined,
  createdAt: String(r.created_at ?? ""),
});

// ---------- Reads ----------
export async function listPoloBatches(): Promise<PoloBatch[]> {
  const { data, error } = await supabase.from("polo_batches").select("*").order("scan_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => batchFromRow(r as Row));
}

export async function listPoloEvents(): Promise<PoloEvent[]> {
  const { data, error } = await supabase
    .from("polo_events")
    .select("*")
    .order("event_date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => eventFromRow(r as Row));
}

export async function listBulkTransfers(): Promise<BulkTransfer[]> {
  const { data, error } = await supabase.from("bulk_transfers").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => bulkFromRow(r as Row));
}

export async function listBulkItems(bulkId?: string): Promise<BulkItem[]> {
  let q = supabase.from("bulk_items").select("*");
  if (bulkId) q = q.eq("bulk_id", bulkId);
  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => itemFromRow(r as Row));
}

// ---------- Derived state ----------
export const nameKey = (s?: string) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

/** All 160 fee rows in the master ledger for one worker, oldest first. */
export function feeRows(transactions: Transaction[], workerId?: string, workerName?: string): Transaction[] {
  const key = nameKey(workerName);
  return transactions
    .filter((t) => t.purposeCategory === "POLO" && t.status !== "Cancelled")
    .filter((t) => (workerId && t.candidateId === workerId) || (!!key && nameKey(t.candidate) === key))
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)));
}

/** Where the fee currently sits, read from the latest fee row. */
export function feeLocation(transactions: Transaction[], workerId?: string, workerName?: string): WalletKey | undefined {
  const rows = feeRows(transactions, workerId, workerName);
  const last = rows[rows.length - 1];
  return last ? ((last.currentLocation ?? last.toWallet) as WalletKey) : undefined;
}

export type PoloStatus = "Pending" | "Submitted" | "Returned" | "Approved";

const ordinal = (n: number) => (n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

/** Badge text from the last event of a worker. */
export function statusLabelFor(last?: PoloEvent): string {
  if (!last) return "Pending";
  if (last.eventType === "approved") return "Approved";
  if (last.eventType === "returned") return "Returned";
  return last.attemptNo > 1 ? `Submitted ${ordinal(last.attemptNo)} Time` : "Submitted";
}

export function statusOf(last?: PoloEvent): PoloStatus {
  if (!last) return "Pending";
  if (last.eventType === "approved") return "Approved";
  if (last.eventType === "returned") return "Returned";
  return "Submitted";
}

export function attemptFor(events: PoloEvent[], nextType: PoloEventType): number {
  const last = events[events.length - 1];
  if (!last) return 1;
  if (last.eventType === "returned") return nextType === "submitted" ? last.attemptNo + 1 : last.attemptNo;
  return last.attemptNo;
}

export type PoloListRow = {
  workerId?: string;
  workerName: string;
  referenceCode?: string;
  sponsorName?: string;
  events: PoloEvent[];
  last?: PoloEvent;
  status: PoloStatus;
  statusLabel: string;
  attempt: number;
  location?: WalletKey;
  amount: number;
  alert: boolean;
  note?: string;
  date: string;
};

export function buildPoloRows(
  events: PoloEvent[],
  transactions: Transaction[],
  sponsorNameFor: (workerId?: string, workerName?: string) => string | undefined,
): PoloListRow[] {
  const groups = new Map<string, PoloEvent[]>();
  for (const e of events) {
    const key = e.workerId ? `id:${e.workerId}` : `name:${nameKey(e.workerName)}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return Array.from(groups.values()).map((list) => {
    const sorted = [...list].sort((a, b) =>
      a.eventDate === b.eventDate ? a.createdAt.localeCompare(b.createdAt) : a.eventDate.localeCompare(b.eventDate),
    );
    const last = sorted[sorted.length - 1];
    const status = statusOf(last);
    const location = feeLocation(transactions, last?.workerId, last?.workerName);
    return {
      workerId: last?.workerId,
      workerName: last?.workerName ?? "—",
      referenceCode: sorted.find((e) => e.referenceCode)?.referenceCode,
      sponsorName: sponsorNameFor(last?.workerId, last?.workerName),
      events: sorted,
      last,
      status,
      statusLabel: statusLabelFor(last),
      attempt: last?.attemptNo ?? 1,
      location,
      amount: POLO_FEE_AMOUNT,
      alert: status === "Submitted" && !(location && SAFE_FEE_LOCATIONS.includes(location)),
      note: last?.note,
      date: last?.eventDate ?? "",
    };
  });
}

// ---------- Scan → batch + events ----------
export type ScannedWorker = { name: string; referenceCode?: string };

/** Matches a scanned line to an existing worker by reference code, then by name. */
export function matchWorker(candidates: Candidate[], scan: ScannedWorker): Candidate | undefined {
  const code = (scan.referenceCode ?? "").trim().toUpperCase();
  if (code) {
    const byCode = candidates.find(
      (c) => c.candidateCode.toUpperCase() === code || `${c.countryCode}-${c.candidateCode}`.toUpperCase() === code,
    );
    if (byCode) return byCode;
  }
  const key = nameKey(scan.name);
  return candidates.find((c) => nameKey(c.fullName) === key);
}

export async function createScanBatch(input: {
  type: "submitted" | "returned";
  scanDate: string;
  image?: string;
  note?: string;
  workers: ScannedWorker[];
  candidates: Candidate[];
  transactions: Transaction[];
  sponsorNameFor: (workerId?: string, workerName?: string) => string | undefined;
}): Promise<{ batchId: string; saved: number; moved: number }> {
  const { data: batchRow, error: batchError } = await supabase
    .from("polo_batches")
    .insert({
      type: input.type,
      scan_date: input.scanDate,
      image: input.image ?? null,
      note: input.note ?? null,
      created_by: currentUser() || null,
    } as never)
    .select("id")
    .single();
  if (batchError) throw batchError;
  const batchId = String((batchRow as Row).id);

  const existing = await listPoloEvents();
  let moved = 0;
  let saved = 0;

  for (const scan of input.workers) {
    const match = matchWorker(input.candidates, scan);
    const workerId = match?.id;
    const workerName = match?.fullName ?? scan.name;
    const prior = existing.filter((e) =>
      workerId ? e.workerId === workerId : nameKey(e.workerName) === nameKey(workerName),
    );
    const attempt = attemptFor(prior, input.type);
    const location = feeLocation(input.transactions, workerId, workerName);

    const { data: inserted, error } = await supabase
      .from("polo_events")
      .insert({
        batch_id: batchId,
        worker_id: workerId ?? null,
        worker_name: workerName,
        reference_code: scan.referenceCode ?? match?.candidateCode ?? null,
        event_type: input.type,
        event_date: input.scanDate,
        attempt_no: attempt,
        fee_location: location ?? null,
        created_by: currentUser() || null,
      } as never)
      .select("*")
      .single();
    if (error) throw error;
    saved += 1;
    existing.push(eventFromRow(inserted as Row));

    // A return puts the money back in the holding wallet.
    if (input.type === "returned" && location && location !== HOLDING_WALLET) {
      addTransaction({
        date: input.scanDate,
        type: "Transfer",
        classification: "Sponsor Expense",
        candidate: workerName,
        candidateId: workerId,
        sponsor: input.sponsorNameFor(workerId, workerName),
        passport: match?.passportNumber,
        amount: POLO_FEE_AMOUNT,
        purpose: `POLO fee ${POLO_FEE_AMOUNT} returned to holding wallet`,
        purposeCategory: "POLO",
        status: "Completed",
        expenseKind: "POLO_RETURNED",
        description: `Return Attempt ${attempt} — money back`,
        fromWallet: location,
        toWallet: HOLDING_WALLET,
      });
      moved += 1;
    }
  }

  return { batchId, saved, moved };
}

/** Records an approval (no money movement). */
export async function markApproved(row: PoloListRow, date: string): Promise<void> {
  const { error } = await supabase
    .from("polo_events")
    .insert({
      worker_id: row.workerId ?? null,
      worker_name: row.workerName,
      reference_code: row.referenceCode ?? null,
      event_type: "approved",
      event_date: date,
      attempt_no: row.attempt,
      fee_location: row.location ?? null,
      created_by: currentUser() || null,
    } as never);
  if (error) throw error;
}

// ---------- Bulk transfers ----------
export function nextBulkRef(fromAccount: WalletKey, existing: BulkTransfer[]): string {
  const prefix = walletName(fromAccount).split(" ")[0].toUpperCase().replace(/[^A-Z0-9]/g, "");
  const used = existing
    .filter((b) => b.ref.startsWith(`${prefix}-BULK-`))
    .map((b) => Number(b.ref.split("-").pop()) || 0);
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}-BULK-${String(next).padStart(3, "0")}`;
}

/** Fee rows still sitting in the chosen source account and not already in a bulk. */
export function transferableFees(
  transactions: Transaction[],
  fromAccount: WalletKey,
  items: BulkItem[],
): Transaction[] {
  const used = new Set(items.map((i) => i.feeTransactionId));
  return transactions
    .filter((t) => t.purposeCategory === "POLO" && t.status !== "Cancelled" && !used.has(t.id))
    .filter((t) => (t.currentLocation ?? t.toWallet) === fromAccount)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function createBulk(input: {
  fromAccount: WalletKey;
  ref: string;
  date: string;
  note?: string;
  fees: Transaction[];
}): Promise<string> {
  const total = input.fees.reduce((sum, t) => sum + t.amount, 0);
  const { data, error } = await supabase
    .from("bulk_transfers")
    .insert({
      ref: input.ref,
      from_account: input.fromAccount,
      to_account: HOLDING_WALLET,
      total,
      status: "pending",
      transfer_date: input.date,
      note: input.note ?? null,
      created_by: currentUser() || null,
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  const bulkId = String((data as Row).id);

  const rows = input.fees.map((t) => ({
    bulk_id: bulkId,
    fee_transaction_id: t.id,
    worker_id: t.candidateId ?? null,
    worker_name: t.candidate ?? null,
    sponsor_name: t.sponsor ?? null,
    amount: t.amount,
    sign_status: "pending",
  }));
  const { error: itemsError } = await supabase.from("bulk_items").insert(rows as never);
  if (itemsError) throw itemsError;
  return bulkId;
}

/** Mr Hassan confirms receipt: the fee moves into the holding wallet. */
export async function signBulkItem(input: {
  bulk: BulkTransfer;
  item: BulkItem;
  fee?: Transaction;
  proof?: string;
  date: string;
}): Promise<void> {
  const { bulk, item, fee } = input;
  let transferId: string | undefined;

  if (fee) {
    const txn = addTransaction({
      date: input.date,
      type: "Transfer",
      classification: fee.classification ?? "Sponsor Expense",
      candidate: fee.candidate,
      candidateId: fee.candidateId,
      sponsor: fee.sponsor,
      passport: fee.passport,
      amount: item.amount,
      purpose: `POLO fee ${item.amount} moved to holding wallet (${bulk.ref})`,
      purposeCategory: "POLO",
      status: "Completed",
      expenseKind: "POLO_TO_WALLET",
      referenceNumber: bulk.ref,
      description: `Bulk ${bulk.ref} — signed in by Mr Hassan`,
      fromWallet: bulk.fromAccount,
      toWallet: HOLDING_WALLET,
    });
    transferId = txn.id;
    updateTransaction(fee.id, { currentLocation: HOLDING_WALLET });
  }

  const { error } = await supabase
    .from("bulk_items")
    .update({
      sign_status: "signed",
      proof: input.proof ?? item.proof ?? null,
      sign_date: input.date,
      signed_by: currentUser() || null,
      transfer_transaction_id: transferId ?? null,
    } as never)
    .eq("id", item.id);
  if (error) throw error;

  const remaining = (await listBulkItems(bulk.id)).filter((i) => i.signStatus !== "signed");
  if (remaining.length === 0) {
    const { error: bulkError } = await supabase
      .from("bulk_transfers")
      .update({ status: "completed", updated_at: new Date().toISOString() } as never)
      .eq("id", bulk.id);
    if (bulkError) throw bulkError;
  }
}

/** The office advanced the fee from petty cash — pay petty cash back. */
export function refundToPetty(row: PoloListRow, date: string, amount = POLO_FEE_AMOUNT): void {
  addTransaction({
    date,
    type: "Transfer",
    classification: "Sponsor Expense",
    candidate: row.workerName,
    candidateId: row.workerId,
    sponsor: row.sponsorName,
    amount,
    purpose: "POLO fee refunded to office petty cash",
    purposeCategory: "POLO",
    status: "Completed",
    expenseKind: "POLO_REFUND_PETTY",
    description: "Petty cash advance returned after bulk transfer arrived",
    fromWallet: HOLDING_WALLET,
    toWallet: "office-petty",
  });
}

/** Cancelled worker: the sponsor gets the 160 back. */
export function markRefunded(row: PoloListRow, date: string, amount = POLO_FEE_AMOUNT): void {
  addTransaction({
    date,
    type: "Payment Voucher",
    classification: "Sponsor Expense",
    candidate: row.workerName,
    candidateId: row.workerId,
    sponsor: row.sponsorName,
    amount,
    purpose: "POLO fee refunded to sponsor (cancelled)",
    purposeCategory: "POLO",
    status: "Completed",
    expenseKind: "POLO_REFUNDED",
    paymentMethod: row.location === "office-petty" ? "Cash" : "Company Account",
    fromWallet: row.location ?? HOLDING_WALLET,
    toWallet: "external",
  });
}
