import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { SalaryReleaseDialog } from "@/components/SalaryReleaseDialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronRight } from "lucide-react";
import { useFinance, salariesHeldTotal, salaryLedger } from "@/lib/finance-store";
import { COMPANY_LABEL } from "@/lib/finance-types";
import { qar } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/salaries")({
  head: () => ({
    meta: [
      { title: "Housemaid Salaries · AHG Finance Core" },
      { name: "description", content: "Automatic salary ledger: received, released and running balance per housemaid." },
      { property: "og:title", content: "Housemaid Salaries · AHG Finance Core" },
      { property: "og:description", content: "Automatic salary ledger per housemaid, derived from the master transactions table." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalariesPage,
});

function SalariesPage() {
  const s = useFinance();
  const held = salariesHeldTotal(s);
  const ledger = salaryLedger(s);
  const rows = s.transactions.filter((t) => t.type === "Salary Holding" || t.type === "Salary Release");
  const received = ledger.reduce((a, e) => a + e.received, 0);
  const released = ledger.reduce((a, e) => a + e.released, 0);

  return (
    <AppLayout>
      <PageHeader
        title="Housemaid Salaries"
        description="Balances are always calculated from the complete transaction history."
        action={
          <div className="flex gap-2">
            <SalaryReleaseDialog
              trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4" /> Release</Button>}
            />
            <TransactionDialog
              trigger={<Button size="sm"><Plus className="h-4 w-4" /> Salary received</Button>}
              defaults={{ type: "Salary Holding", fromWallet: "external", toWallet: "cbq", purposeCategory: "Salary" }}
            />
          </div>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Currently Held" value={held} tone={held < 0 ? "warning" : "success"} />
        <StatCard label="Total Received" value={received} tone="success" />
        <StatCard label="Total Released" value={released} />
        <StatCard label="Housemaids" value={ledger.length} format="raw" />
      </div>

      <div className="rounded-lg border bg-card mb-6">
        <div className="px-3 py-2 border-b text-sm font-medium">Salary ledger by housemaid</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Housemaid</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Received</TableHead>
              <TableHead className="text-right">Released</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Last movement</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No salary records yet.
                </TableCell>
              </TableRow>
            ) : (
              ledger.map((e) => (
                <TableRow key={e.name} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link to="/salaries/$name" params={{ name: e.name }} className="font-medium hover:underline">
                      {e.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs">{e.company ? COMPANY_LABEL[e.company] : "—"}</TableCell>
                  <TableCell className="text-right tabular">{qar(e.received)}</TableCell>
                  <TableCell className="text-right tabular">{qar(e.released)}</TableCell>
                  <TableCell className={cn("text-right tabular font-semibold", e.balance < 0 && "text-rose-400")}>
                    {qar(e.balance)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.lastDate}</TableCell>
                  <TableCell>
                    <Link to="/salaries/$name" params={{ name: e.name }}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TransactionsTable rows={rows} exportName="salaries.csv" />
    </AppLayout>
  );
}
