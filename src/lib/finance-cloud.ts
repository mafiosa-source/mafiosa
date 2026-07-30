// Cloud persistence layer for the master transactions ledger.
// The finance store keeps a synchronous in-memory mirror; this module
// loads it from the backend and writes every mutation through.
import { supabase } from "@/integrations/supabase/client";
import type { Transaction, WalletKey } from "./finance-types";

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
    driver: (r.driver as string) ?? undefined,
    vehicle: (r.vehicle as string) ?? undefined,
    plateNumber: (r.plate_number as string) ?? undefined,
    station: (r.station as string) ?? undefined,
    kmBefore: r.km_before == null ? undefined : Number(r.km_before),
    kmAfter: r.km_after == null ? undefined : Number(r.km_after),
    parentTxnId: (r.parent_txn_id as string) ?? undefined,
    createdBy: (r.created_by as string) ?? undefined,
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
  set("driver", t.driver);
  set("vehicle", t.vehicle);
  set("plate_number", t.plateNumber);
  set("station", t.station);
  set("km_before", t.kmBefore);
  set("km_after", t.kmAfter);
  set("parent_txn_id", t.parentTxnId);
  set("created_by", t.createdBy);
  return row;
}

export async function fetchCloudState(): Promise<{
  transactions: Transaction[];
  openingBalances: Partial<Record<WalletKey, number>>;
}> {
  const [{ data: txns, error: e1 }, { data: obs, error: e2 }] = await Promise.all([
    supabase.from("transactions").select("*").order("date", { ascending: false }),
    supabase.from("opening_balances").select("*"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const openingBalances: Partial<Record<WalletKey, number>> = {};
  for (const o of (obs ?? []) as Row[]) {
    openingBalances[o.wallet as WalletKey] = Number(o.amount ?? 0);
  }
  return {
    transactions: ((txns ?? []) as Row[]).map(rowToTransaction),
    openingBalances,
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
