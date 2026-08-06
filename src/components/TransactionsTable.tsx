import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Pencil, Trash2, Download, X, Printer } from "lucide-react";
import type { Transaction, TxnType, WalletKey } from "@/lib/finance-types";
import { WALLET_BY_KEY, COMPANIES, COMPANY_LABEL, REPORT_WALLETS, TXN_TYPES } from "@/lib/finance-types";
import { deleteTransaction, sortByDateDesc } from "@/lib/finance-store";
import { qar, exportCsv, printAccountingReport } from "@/lib/format";
import {
  toLedgerPrintRows,
  toDirectionalPrintRows,
  toLedgerCsvRows,
  toDirectionalCsvRows,
} from "@/lib/report-filters";
import type { FinancialCategory } from "@/lib/wallet-rules";
import { FINANCIAL_CATEGORIES, REPORT_PRESETS, matchesCategory, presetById } from "@/lib/wallet-rules";
import { MultiSelect } from "./MultiSelect";
import { HousemaidLink } from "./HousemaidLink";
import { TransactionDialog } from "./TransactionDialog";
import { toast } from "sonner";

const STATUS_TONE: Record<string, string> = {
  Completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Refunded: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

const ALL = "__all__";
/** Matches transactions that have no company assigned. */
const NO_COMPANY = "__none__";

const WALLET_GROUP: Partial<Record<string, string>> = {
  cash: "Petty cash",
  card: "Company cards",
  bank: "Bank",
  "company-account": "Company accounts",
  holding: "Held funds",
  person: "People",
};

export function TransactionsTable({
  rows,
  showColumns = { voucher: true, company: true, candidate: true, wallets: true, status: true, type: true },
  empty = "No transactions yet.",
  exportName,
  printTitle = "Transaction Report",
  initialCompany,
  initialStatus,
  initialPreset,
  ledgerWallet,
}: {
  rows: Transaction[];
  showColumns?: { voucher?: boolean; company?: boolean; candidate?: boolean; wallets?: boolean; status?: boolean; type?: boolean };
  empty?: string;
  exportName?: string;
  printTitle?: string;
  /** Pre-applied filters (used when arriving from a dashboard card). */
  initialCompany?: string;
  initialStatus?: string;
  /** Quick preset applied on first render, e.g. "company-expense". */
  initialPreset?: string;
  /** When this table is a single-wallet ledger, printed Money In / Money Out follow that wallet. */
  ledgerWallet?: WalletKey;
}) {
  const startPreset = initialPreset ? presetById(initialPreset) : undefined;

  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [types, setTypes] = useState<TxnType[]>(startPreset?.types ?? []);
  const [wallets, setWallets] = useState<WalletKey[]>(startPreset?.wallets ?? []);
  const [categories, setCategories] = useState<FinancialCategory[]>(startPreset?.categories ?? []);
  const [company, setCompany] = useState(initialCompany ?? ALL);
  const [status, setStatus] = useState(initialStatus ?? ALL);
  const [preset, setPreset] = useState(startPreset?.id ?? "all");

  const sorted = useMemo(() => sortByDateDesc(rows), [rows]);

  const options = useMemo(() => {
    const uniq = (vals: (string | undefined)[]) =>
      Array.from(new Set(vals.filter((v): v is string => !!v))).sort();
    const present = new Set(rows.map((t) => t.company).filter(Boolean) as string[]);
    const presentTypes = new Set(rows.map((t) => t.type));
    const presentWallets = new Set<WalletKey>();
    for (const t of rows) {
      presentWallets.add(t.fromWallet);
      presentWallets.add(t.toWallet);
    }
    return {
      types: TXN_TYPES.filter((t) => presentTypes.has(t)),
      companies: Array.from(new Set([...COMPANIES, ...present])) as string[],
      statuses: uniq(rows.map((t) => t.status)),
      wallets: REPORT_WALLETS.filter((k) => presentWallets.has(k)),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const typeSet = types.length ? new Set(types) : null;
    const walletSet = wallets.length ? new Set(wallets) : null;
    return sorted.filter((t) => {
      if (n && !JSON.stringify(t).toLowerCase().includes(n)) return false;
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (typeSet && !typeSet.has(t.type)) return false;
      if (company === NO_COMPANY) {
        if (t.company) return false;
      } else if (company !== ALL && t.company !== company) return false;
      if (status !== ALL && t.status !== status) return false;
      if (walletSet && !walletSet.has(t.fromWallet) && !walletSet.has(t.toWallet)) return false;
      if (categories.length && !categories.some((c) => matchesCategory(t, c))) return false;
      return true;
    });
  }, [sorted, q, from, to, types, company, status, wallets, categories]);

  const totals = useMemo(() => {
    const rowsForTotals = ledgerWallet
      ? toLedgerPrintRows(filtered, ledgerWallet)
      : toDirectionalPrintRows(filtered);
    return {
      amount: filtered.reduce((a, t) => a + (t.amount ?? 0), 0),
      moneyIn: rowsForTotals.reduce((a, r) => a + (r.moneyIn ?? 0), 0),
      moneyOut: rowsForTotals.reduce((a, r) => a + (r.moneyOut ?? 0), 0),
    };
  }, [filtered, ledgerWallet]);

  const hasFilters = !!(
    q || from || to || types.length || wallets.length || categories.length ||
    company !== ALL || status !== ALL
  );

  function reset() {
    setQ(""); setFrom(""); setTo(""); setTypes([]); setWallets([]); setCategories([]);
    setCompany(ALL); setStatus(ALL); setPreset("all");
  }

  function applyPreset(id: string) {
    setPreset(id);
    const p = presetById(id);
    setTypes(p?.types ?? []);
    setWallets((p?.wallets ?? []).filter((w) => options.wallets.includes(w)));
    setCategories(p?.categories ?? []);
  }

  const companyLabel =
    company === ALL
      ? undefined
      : company === NO_COMPANY
        ? "No company assigned"
        : COMPANY_LABEL[company as keyof typeof COMPANY_LABEL] ?? company;

  /** Everything printed / exported uses exactly the filters on screen. */
  const filterSummary = () =>
    [
      types.length ? `Types: ${types.join(", ")}` : null,
      categories.length ? `Categories: ${categories.join(", ")}` : null,
      wallets.length ? `Wallets: ${wallets.map((w) => WALLET_BY_KEY[w]?.name ?? w).join(", ")}` : null,
      status !== ALL ? `Status: ${status}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

  function print() {
    const asc = [...filtered].sort((a, b) =>
      a.date === b.date ? (a.createdAt < b.createdAt ? -1 : 1) : a.date < b.date ? -1 : 1,
    );
    const printRows = ledgerWallet ? toLedgerPrintRows(asc, ledgerWallet) : toDirectionalPrintRows(asc);
    const totalIn = printRows.reduce((a, r) => a + (r.moneyIn ?? 0), 0);
    const totalOut = printRows.reduce((a, r) => a + (r.moneyOut ?? 0), 0);
    printAccountingReport({
      title: printTitle,
      subtitle: filterSummary(),
      from,
      to,
      company: companyLabel,
      columns: "inout",
      rows: printRows,
      summary: [
        { label: "Total Money In", value: qar(totalIn) },
        { label: "Total Money Out", value: qar(totalOut) },
        { label: ledgerWallet ? "Net Movement" : "Net", value: qar(totalIn - totalOut) },
      ],
    });
  }

  function csv() {
    if (!exportName) return;
    const data = ledgerWallet ? toLedgerCsvRows(filtered, ledgerWallet) : toDirectionalCsvRows(filtered);
    exportCsv(exportName, data);
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-3 border-b flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search candidate, sponsor, voucher, amount, date..."
          className="h-8 max-w-md border-0 shadow-none focus-visible:ring-0"
        />
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {rows.length}</span>
        {exportName ? (
          <Button variant="outline" size="sm" onClick={csv}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={print}>
          <Printer className="h-4 w-4" /> Print Report
        </Button>
      </div>

      <div className="px-3 py-2 border-b flex flex-wrap items-center gap-2 bg-muted/30">
        <Select value={preset} onValueChange={applyPreset}>
          <SelectTrigger className="h-9 w-[220px]"><SelectValue placeholder="Preset" /></SelectTrigger>
          <SelectContent>
            {REPORT_PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">From</span>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[150px]" />
        <span className="text-xs text-muted-foreground">To</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[150px]" />

        <MultiSelect
          className="w-[180px]"
          allLabel="All categories"
          options={FINANCIAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
          value={categories}
          onChange={(v) => setCategories(v as FinancialCategory[])}
        />
        {showColumns.type !== false && options.types.length > 1 && (
          <MultiSelect
            className="w-[170px]"
            allLabel="All types"
            options={options.types.map((t) => ({ value: t, label: t }))}
            value={types}
            onChange={(v) => setTypes(v as TxnType[])}
          />
        )}
        {options.wallets.length > 1 && (
          <MultiSelect
            className="w-[180px]"
            allLabel="All wallets"
            options={options.wallets.map((k) => ({
              value: k,
              label: WALLET_BY_KEY[k]?.name ?? k,
              group: WALLET_GROUP[WALLET_BY_KEY[k]?.kind ?? ""] ?? "Other",
            }))}
            value={wallets}
            onChange={(v) => setWallets(v as WalletKey[])}
          />
        )}
        {showColumns.company && (
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All companies</SelectItem>
              <SelectItem value={NO_COMPANY}>-- None --</SelectItem>
              {options.companies.map((v) => (
                <SelectItem key={v} value={v}>{COMPANY_LABEL[v as keyof typeof COMPANY_LABEL] ?? v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {showColumns.status && options.statuses.length > 1 && (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {options.statuses.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={reset}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
        <span className="ml-auto flex items-center gap-4 text-xs">
          <span>
            <span className="text-muted-foreground">Money in </span>
            <span className="font-semibold tabular text-emerald-600">{qar(totals.moneyIn)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Money out </span>
            <span className="font-semibold tabular text-rose-600">{qar(totals.moneyOut)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Total </span>
            <span className="font-semibold tabular">{qar(totals.amount)}</span>
          </span>
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            {showColumns.type !== false && <TableHead>Type</TableHead>}
            {showColumns.voucher && <TableHead>Voucher</TableHead>}
            {showColumns.company && <TableHead>Company</TableHead>}
            {showColumns.candidate && <TableHead>Candidate / Party</TableHead>}
            <TableHead>Purpose</TableHead>
            {showColumns.wallets && <TableHead>From → To</TableHead>}
            <TableHead className="text-right">Amount</TableHead>
            {showColumns.status && <TableHead>Status</TableHead>}
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground py-8">{empty}</TableCell>
            </TableRow>
          ) : (
            filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                {showColumns.type !== false && <TableCell className="text-xs">{t.type}</TableCell>}
                {showColumns.voucher && <TableCell className="font-mono text-xs">{t.voucherNumber ?? "—"}</TableCell>}
                {showColumns.company && <TableCell>{t.company ? (COMPANY_LABEL[t.company] ?? t.company) : "—"}</TableCell>}
                {showColumns.candidate && (
                  <TableCell>
                    <div className="text-sm">
                      {t.candidate ? <HousemaidLink name={t.candidate} /> : "—"}
                    </div>
                    {t.sponsor ? <div className="text-xs text-muted-foreground">{t.sponsor}</div> : null}
                  </TableCell>
                )}
                <TableCell>
                  <div className="text-sm">{t.purposeCategory ?? "—"}</div>
                  {t.purpose ? <div className="text-xs text-muted-foreground truncate max-w-[220px]">{t.purpose}</div> : null}
                </TableCell>
                {showColumns.wallets && (
                  <TableCell className="text-xs">
                    <span className="text-muted-foreground">{WALLET_BY_KEY[t.fromWallet]?.name}</span>
                    <span className="mx-1">→</span>
                    <span className="font-medium">{WALLET_BY_KEY[t.toWallet]?.name}</span>
                  </TableCell>
                )}
                <TableCell className="text-right tabular font-medium">{qar(t.amount)}</TableCell>
                {showColumns.status && (
                  <TableCell>
                    <Badge variant="outline" className={STATUS_TONE[t.status] ?? ""}>{t.status}</Badge>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <TransactionDialog
                      editing={t}
                      trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                    />
                    <Button size="icon" variant="ghost" onClick={() => {
                      if (confirm("Delete this transaction?")) {
                        deleteTransaction(t.id);
                        toast.success("Deleted");
                      }
                    }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
