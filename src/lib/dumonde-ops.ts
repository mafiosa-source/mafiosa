// Du Monde factory catering operations: LPO, sales, expenses and bank statements.
// Purely additive: nothing here changes the finance ledger unless the user
// explicitly posts an expense with `postExpenseToLedger`.
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addTransaction } from "./finance-store";

export const DM_BUCKET = "du-monde-files";

export type DmLpoItem = { id?: string; name: string; qty: number; unit?: string; unitCost: number; total: number };
export type DmSaleItem = { id?: string; name: string; qty: number; unitPrice: number; total: number };

export type DmLpo = {
  id: string;
  date: string;
  location: string;
  notes?: string;
  total: number;
  attachmentUrl?: string;
  items: DmLpoItem[];
};

export type DmSale = {
  id: string;
  date: string;
  location: string;
  notes?: string;
  total: number;
  attachmentUrl?: string;
  items: DmSaleItem[];
};

export const DM_EXPENSE_CATEGORIES = [
  "LPO / Supplies",
  "Staff",
  "Rent",
  "Utilities",
  "Transport",
  "Gas",
  "Maintenance",
  "Other",
] as const;

export type DmExpense = {
  id: string;
  date: string;
  location: string;
  category: string;
  particulars?: string;
  amount: number;
  lpoId?: string;
  txnId?: string;
};

export type DmBankLine = {
  id?: string;
  date: string;
  description?: string;
  location?: string;
  direction: "in" | "out";
  amount: number;
};

export type DmStatement = {
  id: string;
  label: string;
  fromDate?: string;
  toDate?: string;
  attachmentUrl?: string;
  lines: DmBankLine[];
};

export type DuMondeState = {
  lpos: DmLpo[];
  sales: DmSale[];
  expenses: DmExpense[];
  statements: DmStatement[];
  loading: boolean;
};

let state: DuMondeState = { lpos: [], sales: [], expenses: [], statements: [], loading: true };
const listeners = new Set<() => void>();
let started = false;

function emit(next: Partial<DuMondeState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0) || 0);

export async function loadDuMonde() {
  const [lpos, lpoItems, sales, saleItems, expenses, statements, bankLines] = await Promise.all([
    supabase.from("dm_lpos").select("*").order("date", { ascending: false }),
    supabase.from("dm_lpo_items").select("*"),
    supabase.from("dm_sales").select("*").order("date", { ascending: false }),
    supabase.from("dm_sale_items").select("*"),
    supabase.from("dm_expenses").select("*").order("date", { ascending: false }),
    supabase.from("dm_bank_statements").select("*").order("created_at", { ascending: false }),
    supabase.from("dm_bank_lines").select("*").order("date", { ascending: true }),
  ]);

  emit({
    loading: false,
    lpos: (lpos.data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      location: r.location,
      notes: r.notes ?? undefined,
      total: num(r.total),
      attachmentUrl: r.attachment_url ?? undefined,
      items: (lpoItems.data ?? [])
        .filter((i) => i.lpo_id === r.id)
        .map((i) => ({
          id: i.id,
          name: i.name,
          qty: num(i.qty),
          unit: i.unit ?? undefined,
          unitCost: num(i.unit_cost),
          total: num(i.total),
        })),
    })),
    sales: (sales.data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      location: r.location,
      notes: r.notes ?? undefined,
      total: num(r.total),
      attachmentUrl: r.attachment_url ?? undefined,
      items: (saleItems.data ?? [])
        .filter((i) => i.sale_id === r.id)
        .map((i) => ({ id: i.id, name: i.name, qty: num(i.qty), unitPrice: num(i.unit_price), total: num(i.total) })),
    })),
    expenses: (expenses.data ?? []).map((r) => ({
      id: r.id,
      date: r.date,
      location: r.location,
      category: r.category,
      particulars: r.particulars ?? undefined,
      amount: num(r.amount),
      lpoId: r.lpo_id ?? undefined,
      txnId: r.txn_id ?? undefined,
    })),
    statements: (statements.data ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      fromDate: r.from_date ?? undefined,
      toDate: r.to_date ?? undefined,
      attachmentUrl: r.attachment_url ?? undefined,
      lines: (bankLines.data ?? [])
        .filter((l) => l.statement_id === r.id)
        .map((l) => ({
          id: l.id,
          date: l.date,
          description: l.description ?? undefined,
          location: l.location ?? undefined,
          direction: l.direction === "out" ? "out" : "in",
          amount: num(l.amount),
        })),
    })),
  });
}

export function useDuMonde(): DuMondeState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!started) {
        started = true;
        void loadDuMonde();
      }
      return () => listeners.delete(cb);
    },
    () => state,
    () => state,
  );
}

// ---------- files ----------
export async function uploadDuMondeFile(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(DM_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function duMondeFileUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(DM_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ---------- LPO ----------
export type LpoInput = {
  date: string;
  location: string;
  notes?: string;
  attachmentUrl?: string;
  items: DmLpoItem[];
};

export function lpoTotal(items: DmLpoItem[]) {
  return items.reduce((sum, i) => sum + (i.total || i.qty * i.unitCost), 0);
}

export async function saveLpo(input: LpoInput, id?: string) {
  const total = lpoTotal(input.items);
  const row = {
    date: input.date,
    location: input.location,
    notes: input.notes ?? null,
    total,
    attachment_url: input.attachmentUrl ?? null,
  };

  let lpoId = id;
  if (lpoId) {
    const { error } = await supabase.from("dm_lpos").update(row).eq("id", lpoId);
    if (error) throw error;
    await supabase.from("dm_lpo_items").delete().eq("lpo_id", lpoId);
  } else {
    const { data, error } = await supabase.from("dm_lpos").insert(row).select("id").single();
    if (error) throw error;
    lpoId = data.id;
  }

  if (input.items.length) {
    const { error } = await supabase.from("dm_lpo_items").insert(
      input.items.map((i) => ({
        lpo_id: lpoId!,
        name: i.name,
        qty: i.qty,
        unit: i.unit ?? null,
        unit_cost: i.unitCost,
        total: i.total || i.qty * i.unitCost,
      })),
    );
    if (error) throw error;
  }

  // Keep the auto-linked expense in step with the LPO cost.
  const existing = state.expenses.find((e) => e.lpoId === lpoId);
  const expenseRow = {
    date: input.date,
    location: input.location,
    category: "LPO / Supplies",
    particulars: `LPO – ${input.items.length} item${input.items.length === 1 ? "" : "s"}`,
    amount: total,
    lpo_id: lpoId!,
  };
  if (existing) await supabase.from("dm_expenses").update(expenseRow).eq("id", existing.id);
  else await supabase.from("dm_expenses").insert(expenseRow);

  await loadDuMonde();
  return lpoId!;
}

export async function deleteLpo(id: string) {
  await supabase.from("dm_expenses").delete().eq("lpo_id", id);
  const { error } = await supabase.from("dm_lpos").delete().eq("id", id);
  if (error) throw error;
  await loadDuMonde();
}

// ---------- Sales ----------
export type SaleInput = {
  date: string;
  location: string;
  notes?: string;
  attachmentUrl?: string;
  items: DmSaleItem[];
};

export function saleTotal(items: DmSaleItem[]) {
  return items.reduce((sum, i) => sum + (i.total || i.qty * i.unitPrice), 0);
}

export async function saveSale(input: SaleInput, id?: string) {
  const total = saleTotal(input.items);
  const row = {
    date: input.date,
    location: input.location,
    notes: input.notes ?? null,
    total,
    attachment_url: input.attachmentUrl ?? null,
  };

  let saleId = id;
  if (saleId) {
    const { error } = await supabase.from("dm_sales").update(row).eq("id", saleId);
    if (error) throw error;
    await supabase.from("dm_sale_items").delete().eq("sale_id", saleId);
  } else {
    const { data, error } = await supabase.from("dm_sales").insert(row).select("id").single();
    if (error) throw error;
    saleId = data.id;
  }

  if (input.items.length) {
    const { error } = await supabase.from("dm_sale_items").insert(
      input.items.map((i) => ({
        sale_id: saleId!,
        name: i.name,
        qty: i.qty,
        unit_price: i.unitPrice,
        total: i.total || i.qty * i.unitPrice,
      })),
    );
    if (error) throw error;
  }
  await loadDuMonde();
  return saleId!;
}

export async function deleteSale(id: string) {
  const { error } = await supabase.from("dm_sales").delete().eq("id", id);
  if (error) throw error;
  await loadDuMonde();
}

// ---------- Expenses ----------
export type ExpenseInput = {
  date: string;
  location: string;
  category: string;
  particulars?: string;
  amount: number;
};

export async function saveExpense(input: ExpenseInput, id?: string) {
  const row = {
    date: input.date,
    location: input.location,
    category: input.category,
    particulars: input.particulars ?? null,
    amount: input.amount,
  };
  if (id) {
    const { error } = await supabase.from("dm_expenses").update(row).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("dm_expenses").insert(row);
    if (error) throw error;
  }
  await loadDuMonde();
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("dm_expenses").delete().eq("id", id);
  if (error) throw error;
  await loadDuMonde();
}

/** Optional: record the expense in the Du Monde petty cash ledger as well. */
export async function postExpenseToLedger(expense: DmExpense) {
  const txn = addTransaction({
    date: expense.date,
    type: "Petty Cash",
    company: "FACTORY",
    classification: "Company Expense",
    purpose: `${expense.location} – ${expense.category}${expense.particulars ? ` – ${expense.particulars}` : ""}`,
    purposeCategory: "Factory Catering",
    amount: expense.amount,
    fromWallet: "dumonde-petty",
    toWallet: "external",
    status: "Completed",
    description: `Du Monde ${expense.category}`,
  });
  const { error } = await supabase.from("dm_expenses").update({ txn_id: txn.id }).eq("id", expense.id);
  if (error) throw error;
  await loadDuMonde();
}

// ---------- Bank statements ----------
export type StatementInput = {
  label: string;
  fromDate?: string;
  toDate?: string;
  attachmentUrl?: string;
  lines: DmBankLine[];
};

export async function saveStatement(input: StatementInput, id?: string) {
  const row = {
    label: input.label,
    from_date: input.fromDate || null,
    to_date: input.toDate || null,
    attachment_url: input.attachmentUrl ?? null,
  };
  let stId = id;
  if (stId) {
    const { error } = await supabase.from("dm_bank_statements").update(row).eq("id", stId);
    if (error) throw error;
    await supabase.from("dm_bank_lines").delete().eq("statement_id", stId);
  } else {
    const { data, error } = await supabase.from("dm_bank_statements").insert(row).select("id").single();
    if (error) throw error;
    stId = data.id;
  }
  if (input.lines.length) {
    const { error } = await supabase.from("dm_bank_lines").insert(
      input.lines.map((l) => ({
        statement_id: stId!,
        date: l.date,
        description: l.description ?? null,
        location: l.location ?? null,
        direction: l.direction,
        amount: l.amount,
      })),
    );
    if (error) throw error;
  }
  await loadDuMonde();
  return stId!;
}

export async function deleteStatement(id: string) {
  const { error } = await supabase.from("dm_bank_statements").delete().eq("id", id);
  if (error) throw error;
  await loadDuMonde();
}

// ---------- Derived ----------
export const inPeriod = (date: string, from?: string, to?: string) =>
  (!from || date >= from) && (!to || date <= to);

export function duMondeLocations(s: DuMondeState): string[] {
  const set = new Set<string>();
  s.lpos.forEach((l) => set.add(l.location));
  s.sales.forEach((l) => set.add(l.location));
  s.expenses.forEach((l) => set.add(l.location));
  s.statements.forEach((st) => st.lines.forEach((l) => l.location && set.add(l.location)));
  return [...set].sort();
}

export type LocationSummary = {
  location: string;
  moneyIn: number;
  moneyOut: number;
  profit: number;
  bankIn: number;
  variance: number;
};

/** Money In = entered sales. Money Out = all expenses (LPO costs included). */
export function duMondeSummary(
  s: DuMondeState,
  from?: string,
  to?: string,
): { rows: LocationSummary[]; totals: LocationSummary } {
  const locations = duMondeLocations(s);
  const rows = locations.map((location) => {
    const moneyIn = s.sales
      .filter((x) => x.location === location && inPeriod(x.date, from, to))
      .reduce((n, x) => n + x.total, 0);
    const moneyOut = s.expenses
      .filter((x) => x.location === location && inPeriod(x.date, from, to))
      .reduce((n, x) => n + x.amount, 0);
    const bankIn = s.statements
      .flatMap((st) => st.lines)
      .filter((l) => l.direction === "in" && (l.location ?? "") === location && inPeriod(l.date, from, to))
      .reduce((n, l) => n + l.amount, 0);
    return { location, moneyIn, moneyOut, profit: moneyIn - moneyOut, bankIn, variance: bankIn - moneyIn };
  });

  const bankInAll = s.statements
    .flatMap((st) => st.lines)
    .filter((l) => l.direction === "in" && inPeriod(l.date, from, to))
    .reduce((n, l) => n + l.amount, 0);
  const moneyIn = rows.reduce((n, r) => n + r.moneyIn, 0);
  const moneyOut = rows.reduce((n, r) => n + r.moneyOut, 0);

  return {
    rows,
    totals: {
      location: "All locations",
      moneyIn,
      moneyOut,
      profit: moneyIn - moneyOut,
      bankIn: bankInAll,
      variance: bankInAll - moneyIn,
    },
  };
}

/** Sales vs bank per day/location for the comparison table. */
export function bankVsSales(s: DuMondeState, from?: string, to?: string) {
  const keys = new Set<string>();
  s.sales.filter((x) => inPeriod(x.date, from, to)).forEach((x) => keys.add(`${x.date}|${x.location}`));
  s.statements
    .flatMap((st) => st.lines)
    .filter((l) => l.direction === "in" && inPeriod(l.date, from, to))
    .forEach((l) => keys.add(`${l.date}|${l.location ?? ""}`));

  return [...keys]
    .map((k) => {
      const [date, location] = k.split("|");
      const entered = s.sales
        .filter((x) => x.date === date && x.location === location)
        .reduce((n, x) => n + x.total, 0);
      const bank = s.statements
        .flatMap((st) => st.lines)
        .filter((l) => l.direction === "in" && l.date === date && (l.location ?? "") === location)
        .reduce((n, l) => n + l.amount, 0);
      return { id: k, date: date!, location: location || "—", entered, bank, variance: bank - entered };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
