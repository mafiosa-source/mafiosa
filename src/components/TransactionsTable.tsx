import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Pencil, Trash2, Download } from "lucide-react";
import type { Transaction } from "@/lib/finance-types";
import { WALLET_BY_KEY } from "@/lib/finance-types";
import { deleteTransaction, sortByDateDesc } from "@/lib/finance-store";
import { qar, exportCsv } from "@/lib/format";
import { TransactionDialog } from "./TransactionDialog";
import { toast } from "sonner";

const STATUS_TONE: Record<string, string> = {
  Completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Refunded: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Cancelled: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export function TransactionsTable({
  rows,
  showColumns = { voucher: true, company: true, candidate: true, wallets: true, status: true, type: true },
  empty = "No transactions yet.",
  exportName,
}: {
  rows: Transaction[];
  showColumns?: { voucher?: boolean; company?: boolean; candidate?: boolean; wallets?: boolean; status?: boolean; type?: boolean };
  empty?: string;
  exportName?: string;
}) {
  const [q, setQ] = useState("");
  const sorted = useMemo(() => sortByDateDesc(rows), [rows]);
  const filtered = useMemo(() => {
    if (!q) return sorted;
    const n = q.toLowerCase();
    return sorted.filter((t) => JSON.stringify(t).toLowerCase().includes(n));
  }, [sorted, q]);

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
          <Button variant="outline" size="sm" onClick={() => exportCsv(exportName, filtered as unknown as Record<string, unknown>[])}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        ) : null}
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
                {showColumns.company && <TableCell>{t.company ?? "—"}</TableCell>}
                {showColumns.candidate && (
                  <TableCell>
                    <div className="text-sm">{t.candidate ?? "—"}</div>
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
