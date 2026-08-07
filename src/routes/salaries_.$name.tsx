import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { SalaryReleaseDialog } from "@/components/SalaryReleaseDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus } from "lucide-react";
import { useFinance, salaryLedgerFor } from "@/lib/finance-store";
import { COMPANY_LABEL, WALLET_BY_KEY } from "@/lib/finance-types";
import { qar } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salaries_/$name")({
  head: () => ({
    meta: [
      { title: "Salary History · Alhakeem Expenses ERP" },
      { name: "description", content: "Complete salary ledger for a single housemaid: received, released and running balance." },
      { property: "og:title", content: "Salary History · Alhakeem Expenses ERP" },
      { property: "og:description", content: "Chronological salary movements and running balance for one housemaid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalaryHistoryPage,
});

function SalaryHistoryPage() {
  const { name } = useParams({ from: "/salaries_/$name" });
  const s = useFinance();
  const entry = salaryLedgerFor(s, name);

  let running = 0;
  const rows = (entry?.timeline ?? []).map((t) => {
    running += t.type === "Salary Holding" ? t.amount : -t.amount;
    return { t, running };
  });

  return (
    <AppLayout>
      <PageHeader
        title={entry?.name ?? name}
        description="Salary history ledger — every movement in chronological order."
        action={
          <div className="flex gap-2">
            <Link to="/salaries">
              <Button size="sm" variant="outline"><ArrowLeft className="h-4 w-4" /> All housemaids</Button>
            </Link>
            <SalaryReleaseDialog
              presetName={entry?.name ?? name}
              trigger={<Button size="sm"><Plus className="h-4 w-4" /> Release salary</Button>}
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Current Balance" value={entry?.balance ?? 0} tone={(entry?.balance ?? 0) < 0 ? "warning" : "success"} />
        <StatCard label="Total Received" value={entry?.received ?? 0} tone="success" />
        <StatCard label="Total Released" value={entry?.released ?? 0} />
        <StatCard label="Movements" value={rows.length} format="raw" />
      </div>

      {(entry?.balance ?? 0) < 0 && (
        <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Outstanding negative balance of <span className="font-semibold tabular">{qar(entry!.balance)}</span> — the
          company paid salary in advance. It will offset automatically when the sponsor's salary is received.
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="px-3 py-2 border-b text-sm font-medium">
          Transaction history {entry?.company ? `· ${COMPANY_LABEL[entry.company]}` : ""}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Movement</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Payment wallet</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No salary movements recorded for this housemaid.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ t, running: bal }) => {
                const isIn = t.type === "Salary Holding";
                const wallet = isIn ? t.toWallet : t.fromWallet;
                return (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="whitespace-nowrap">
                      <Link to="/transactions/$id" params={{ id: t.id }} className="hover:underline">{t.date}</Link>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Link to="/transactions/$id" params={{ id: t.id }} className="hover:underline">
                        {isIn ? "Salary received" : "Salary released"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">{t.company ? COMPANY_LABEL[t.company] : "—"}</TableCell>
                    <TableCell className="text-xs">{WALLET_BY_KEY[wallet]?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                      {t.description ?? t.purpose ?? "—"}
                    </TableCell>
                    <TableCell className={cn("text-right tabular", isIn ? "text-emerald-600" : "text-rose-600")}>
                      {isIn ? "+" : "−"}{qar(t.amount)}
                    </TableCell>
                    <TableCell className={cn("text-right tabular font-medium", bal < 0 && "text-rose-400")}>
                      {qar(bal)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
