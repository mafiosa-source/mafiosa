import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { PeriodSelect } from "@/components/PeriodSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useFinance, walletBalance, setOpeningBalance } from "@/lib/finance-store";
import { walletLedger } from "@/lib/finance-derived";
import { currentMonthPeriod } from "@/lib/period";
import { qar } from "@/lib/format";
import { useMemo, useState } from "react";

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
  const [period, setPeriod] = useState(currentMonthPeriod);

  const led = useMemo(
    () => walletLedger(s, "office-petty", { start: period.from || undefined, end: period.to || undefined }),
    [s, period.from, period.to],
  );

  const rows = useMemo(
    () =>
      s.transactions.filter(
        (t) =>
          (t.fromWallet === "office-petty" || t.toWallet === "office-petty") &&
          (!period.from || t.date >= period.from) &&
          (!period.to || t.date <= period.to),
      ),
    [s.transactions, period.from, period.to],
  );

  return (
    <AppLayout>
      <PageHeader
        title="Office Petty Cash"
        description="Automatic ledger for the Office Petty Cash wallet. Period figures show this month's activity only — historical months stay in the system."
        action={
          <TransactionDialog
            trigger={<Button size="sm"><Plus className="h-4 w-4" /> New transaction</Button>}
            defaults={{ type: "Petty Cash", toWallet: "office-petty", fromWallet: "external" }}
          />
        }
      />
      <div className="mb-4 rounded-lg border bg-card p-4">
        <PeriodSelect period={period} onChange={setPeriod} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label={`Opening balance (${period.from || "start"})`} value={led.opening} />
        <StatCard label="Money In (period)" value={led.debit} tone="success" />
        <StatCard label="Money Out (period)" value={led.credit} tone="warning" />
        <StatCard label="Closing balance (period)" value={led.closing} tone={led.closing < 0 ? "danger" : "info"} />
      </div>
      <div className="mb-6 rounded-lg border bg-card p-3 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Actual current wallet balance (all history):{" "}
          <span className="tabular font-semibold text-foreground">{qar(b.balance)}</span>
        </span>
        <span className="ml-auto text-sm text-muted-foreground">Set opening balance</span>
        <Input value={opening} onChange={(e) => setOpening(e.target.value)} type="number" step="0.01" className="max-w-[180px] h-8" />
        <Button size="sm" variant="outline" onClick={() => setOpeningBalance("office-petty", Number(opening) || 0)}>Save</Button>
      </div>
      <TransactionsTable rows={rows} exportName="office-petty.csv" ledgerWallet="office-petty" printTitle="Office Petty Cash Report" />
    </AppLayout>
  );
}
