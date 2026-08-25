// Cloud persistence layer for the master transactions ledger.
// The finance store keeps a synchronous in-memory mirror; this module
// loads it from the backend and writes every mutation through.
import { supabase } from "@/integrations/supabase/client";
import type {
  Transaction,
  WalletKey,
  Payable,
  PayablePayment,
  MonthClosing,
  PayableBy,
  PayableStatus,
  Company,
} from "./finance-types";

type Row = Record<string, unknown>;

export function rowToTransaction(r: Row): Transaction {
  return {
    id: String(r.id),
    date: String(r.date),
    type: r.type as Transaction["type"],
    voucherNumber: (r.voucher_number as string) ?? undefined,
    company: (r.company as Transaction["company"]) ?? undefined,
    classification: (r.classification as Transaction["classification"]) ?? undefined,
    candidate: (r.candidate as string) ?? undefined,
    sponsor: (r.sponsor as string) ?? undefined,
    passport: (r.passport as string) ?? undefined,
    purpose: (r.purpose as string) ?? undefined,
    purposeCategory: (r.purpose_category as Transaction["purposeCategory"]) ?? undefined,
    amount: Number(r.amount ?? 0),
    paymentMethod: (r.payment_method as Transaction["paymentMethod"]) ?? undefined,
    fromWallet: r.from_wallet as WalletKey,
    toWallet: r.to_wallet as WalletKey,
    currentLocation: (r.current_location as WalletKey) ?? undefined,
    status: r.status as Transaction["status"],
    description: (r.description as string) ?? undefined,
    referenceNumber: (r.reference_number as string) ?? undefined,
    attachment: (r.attachment as string) ?? undefined,
    cardCategory: (r.card_category as Transaction["cardCategory"]) ?? undefined,
    payableBy: (r.payable_by as Transaction["payableBy"]) ?? undefined,
    payerName: (r.payer_name as string) ?? undefined,
    driver: (r.driver as string) ?? undefined,
    vehicle: (r.vehicle as string) ?? undefined,
    plateNumber: (r.plate_number as string) ?? undefined,
    station: (r.station as string) ?? undefined,
    kmBefore: r.km_before == null ? undefined : Number(r.km_before),
    kmAfter: r.km_after == null ? undefined : Number(r.km_after),
    kmReading: r.km_reading == null ? undefined : Number(r.km_reading),
    parentTxnId: (r.parent_txn_id as string) ?? undefined,
    createdBy: (r.created_by as string) ?? undefined,
    lastEditedBy: (r.last_edited_by as string) ?? undefined,
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  };
}

export function transactionToRow(t: Partial<Transaction>): Row {
  const row: Row = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) row[k] = v === "" ? null : v;
  };
  set("id", t.id);
  set("date", t.date);
  set("type", t.type);
  set("voucher_number", t.voucherNumber);
  set("company", t.company);
  set("classification", t.classification);
  set("candidate", t.candidate);
  set("sponsor", t.sponsor);
  set("passport", t.passport);
  set("purpose", t.purpose);
  set("purpose_category", t.purposeCategory);
  set("amount", t.amount);
  set("payment_method", t.paymentMethod);
  set("from_wallet", t.fromWallet);
  set("to_wallet", t.toWallet);
  set("current_location", t.currentLocation);
  set("status", t.status);
  set("description", t.description);
  set("reference_number", t.referenceNumber);
  set("attachment", t.attachment);
  set("card_category", t.cardCategory);
  set("payable_by", t.payableBy);
  set("payer_name", t.payerName);
  set("driver", t.driver);
  set("vehicle", t.vehicle);
  set("plate_number", t.plateNumber);
  set("station", t.station);
  set("km_before", t.kmBefore);
  set("km_after", t.kmAfter);
  set("km_reading", t.kmReading);
  set("parent_txn_id", t.parentTxnId);
  set("created_by", t.createdBy);
  set("last_edited_by", t.lastEditedBy);
  return row;
}

// ---------- Payables ----------
function rowToPayable(r: Row): Payable {
  return {
    id: String(r.id),
    txnId: (r.txn_id as string) ?? undefined,
    date: String(r.date),
    responsibleParty: (r.responsible_party as PayableBy) ?? "Other",
    payerName: (r.payer_name as string) ?? undefined,
    cardWallet: r.card_wallet as WalletKey,
    company: (r.company as Company) ?? undefined,
    candidate: (r.candidate as string) ?? undefined,
    sponsor: (r.sponsor as string) ?? undefined,
    particulars: (r.particulars as string) ?? undefined,
    amount: Number(r.amount ?? 0),
    paid: Number(r.paid ?? 0),
    status: (r.status as PayableStatus) ?? "Outstanding",
    notes: (r.notes as string) ?? undefined,
    createdAt: String(r.created_at ?? new Date().toISOString()),
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  };
}

function payableToRow(p: Partial<Payable>): Row {
  const row: Row = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) row[k] = v === "" ? null : v;
  };
  set("id", p.id);
  set("txn_id", p.txnId);
  set("date", p.date);
  set("responsible_party", p.responsibleParty);
  set("payer_name", p.payerName);
  set("card_wallet", p.cardWallet);
  set("company", p.company);
  set("candidate", p.candidate);
  set("sponsor", p.sponsor);
  set("particulars", p.particulars);
  set("amount", p.amount);
  set("paid", p.paid);
  set("status", p.status);
  set("notes", p.notes);
  return row;
}

function rowToPayablePayment(r: Row): PayablePayment {
  return {
    id: String(r.id),
    payableId: String(r.payable_id),
    txnId: (r.txn_id as string) ?? undefined,
    date: String(r.date),
    amount: Number(r.amount ?? 0),
    notes: (r.notes as string) ?? undefined,
    createdAt: String(r.created_at ?? new Date().toISOString()),
  };
}

function rowToClosing(r: Row): MonthClosing {
  return {
    id: String(r.id),
    year: Number(r.year),
    month: Number(r.month),
    status: (r.status as MonthClosing["status"]) ?? "Closed",
    closedWithExceptions: Boolean(r.closed_with_exceptions),
    exceptions: Array.isArray(r.exceptions) ? (r.exceptions as string[]) : [],
    snapshot: (r.snapshot as Record<string, unknown>) ?? {},
    notes: (r.notes as string) ?? undefined,
    closedAt: String(r.closed_at ?? new Date().toISOString()),
  };
}

export type CloudState = {
  transactions: Transaction[];
  openingBalances: Partial<Record<WalletKey, number>>;
  walletTargets: Partial<Record<WalletKey, number>>;
  payables: Payable[];
  payablePayments: PayablePayment[];
  closings: MonthClosing[];
};

export async function fetchCloudState(): Promise<CloudState> {
  const [txnRes, obRes, wtRes, payRes, payPayRes, closeRes] = await Promise.all([
    supabase.from("transactions").select("*").order("date", { ascending: false }),
    supabase.from("opening_balances").select("*"),
    supabase.from("wallet_targets").select("*"),
    supabase.from("payables").select("*").order("date", { ascending: false }),
    supabase.from("payable_payments").select("*").order("date", { ascending: false }),
    supabase.from("month_closings").select("*"),
  ]);
  if (txnRes.error) throw txnRes.error;
  if (obRes.error) throw obRes.error;
  const openingBalances: Partial<Record<WalletKey, number>> = {};
  for (const o of (obRes.data ?? []) as Row[]) {
    openingBalances[o.wallet as WalletKey] = Number(o.amount ?? 0);
  }
  const walletTargets: Partial<Record<WalletKey, number>> = {};
  for (const o of (wtRes.data ?? []) as Row[]) {
    walletTargets[o.wallet as WalletKey] = Number(o.amount ?? 0);
  }
  return {
    transactions: ((txnRes.data ?? []) as Row[]).map(rowToTransaction),
    openingBalances,
    walletTargets,
    payables: ((payRes.data ?? []) as Row[]).map(rowToPayable),
    payablePayments: ((payPayRes.data ?? []) as Row[]).map(rowToPayablePayment),
    closings: ((closeRes.data ?? []) as Row[]).map(rowToClosing),
  };
}


export async function insertCloudTransaction(t: Transaction, userId: string) {
  const { error } = await supabase
    .from("transactions")
    .insert({ ...transactionToRow(t), user_id: userId } as never);
  if (error) throw error;
}

export async function insertCloudTransactions(list: Transaction[], userId: string) {
  if (!list.length) return;
  const rows = list.map((t) => ({ ...transactionToRow(t), user_id: userId }));
  const { error } = await supabase.from("transactions").insert(rows as never);
  if (error) throw error;
}

export async function updateCloudTransaction(id: string, patch: Partial<Transaction>) {
  const { error } = await supabase
    .from("transactions")
    .update(transactionToRow(patch) as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCloudTransaction(id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Writes a complete transaction back (used by Undo / Redo).
 * Unlike updateCloudTransaction this also clears fields that are absent from
 * the restored snapshot, so previous values are restored exactly.
 */
const TXN_ROW_KEYS = [
  "date", "type", "voucher_number", "company", "classification", "candidate", "sponsor",
  "passport", "purpose", "purpose_category", "amount", "payment_method", "from_wallet",
  "to_wallet", "current_location", "status", "description", "reference_number", "attachment",
  "card_category", "payable_by", "payer_name", "driver", "vehicle", "plate_number", "station",
  "km_before", "km_after", "km_reading", "parent_txn_id", "created_by", "last_edited_by",
] as const;

export async function restoreCloudTransaction(t: Transaction, userId: string) {
  const partial = transactionToRow(t);
  const row: Row = { id: t.id, user_id: userId };
  for (const k of TXN_ROW_KEYS) row[k] = partial[k] ?? null;
  const { error } = await supabase
    .from("transactions")
    .upsert(row as never, { onConflict: "id" });
  if (error) throw error;
}


export async function upsertCloudOpeningBalance(
  wallet: WalletKey,
  amount: number,
  userId: string,
) {
  const { error } = await supabase
    .from("opening_balances")
    .upsert({ wallet, amount, user_id: userId } as never, { onConflict: "user_id,wallet" });
  if (error) throw error;
}

/** Configurable monthly target balance for a wallet (used by card reconciliation). */
export async function upsertCloudWalletTarget(wallet: WalletKey, amount: number, userId: string) {
  const { error } = await supabase
    .from("wallet_targets")
    .upsert({ wallet, amount, user_id: userId } as never, { onConflict: "user_id,wallet" });
  if (error) throw error;
}


export async function insertCloudPayable(p: Payable, userId: string) {
  const { error } = await supabase
    .from("payables")
    .insert({ ...payableToRow(p), user_id: userId } as never);
  if (error) throw error;
}

export async function updateCloudPayable(id: string, patch: Partial<Payable>) {
  const { error } = await supabase.from("payables").update(payableToRow(patch) as never).eq("id", id);
  if (error) throw error;
}

export async function insertCloudPayablePayment(p: PayablePayment, userId: string) {
  const { error } = await supabase.from("payable_payments").insert({
    id: p.id,
    payable_id: p.payableId,
    txn_id: p.txnId ?? null,
    date: p.date,
    amount: p.amount,
    notes: p.notes ?? null,
    user_id: userId,
  } as never);
  if (error) throw error;
}

export async function upsertCloudClosing(c: MonthClosing, userId: string) {
  const { error } = await supabase.from("month_closings").upsert(
    {
      year: c.year,
      month: c.month,
      status: c.status,
      closed_with_exceptions: c.closedWithExceptions,
      exceptions: c.exceptions,
      snapshot: c.snapshot,
      notes: c.notes ?? null,
      closed_at: c.closedAt,
      user_id: userId,
    } as never,
    { onConflict: "user_id,year,month" },
  );
  if (error) throw error;
}
