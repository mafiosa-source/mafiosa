import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useFinance, walletBalance, setOpeningBalance } from "@/lib/finance-store";
import { useState } from "react";

export const Route = createFileRoute("/petty-cash")({
  head: () => ({
    meta: [
      { title: "Office Petty Cash · Alhakeem Expenses ERP" },
      { name: "description", content: "Office petty cash movements." },
    ],
  }),
  component: OfficePetty,
});

function OfficePetty() {
  const s = useFinance();
  const b = walletBalance(s, "office-petty");
  const [opening, setOpening] = useState(String(b.opening));
  const rows = s.transactions.filter((t) => t.fromWallet === "office-petty" || t.toWallet === "office-petty");

  return (
    <AppLayout>
      <PageHeader
        title="Office Petty Cash"
        description="Automatic ledger for the Office Petty Cash wallet."
        action={
          <TransactionDialog
            trigger={<Button size="sm"><Plus className="h-4 w-4" /> New transaction</Button>}
            defaults={{ type: "Petty Cash", toWallet: "office-petty", fromWallet: "external" }}
          />
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Opening balance" value={b.opening} />
        <StatCard label="Received" value={b.inflow} tone="success" />
        <StatCard label="Paid out" value={b.outflow} tone="warning" />
        <StatCard label="Current balance" value={b.balance} tone={b.balance < 0 ? "danger" : "info"} />
      </div>
      <div className="rounded-lg border bg-card p-3 mb-6 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Set opening balance</span>
        <Input value={opening} onChange={(e) => setOpening(e.target.value)} type="number" step="0.01" className="max-w-[180px] h-8" />
        <Button size="sm" variant="outline" onClick={() => setOpeningBalance("office-petty", Number(opening) || 0)}>Save</Button>
      </div>
      <TransactionsTable rows={rows} exportName="office-petty.csv" ledgerWallet="office-petty" printTitle="Office Petty Cash Report" />
    </AppLayout>
  );
}
