import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useFinance } from "@/lib/finance-store";

export const Route = createFileRoute("/sponsors")({
  head: () => ({
    meta: [
      { title: "Sponsor Receivables · Alhakeem Expenses ERP" },
      { name: "description", content: "Receipt vouchers received from sponsors." },
    ],
  }),
  component: SponsorsPage,
});

function SponsorsPage() {
  const s = useFinance();
  const rows = s.transactions.filter(
    (t) => t.type === "Receipt Voucher" && t.classification === "Sponsor Expense",
  );
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const pending = rows.filter((r) => r.status === "Pending").reduce((a, r) => a + r.amount, 0);

  return (
    <AppLayout>
      <PageHeader
        title="Sponsor Receivables"
        description="Money received from sponsors on behalf of candidates."
        action={
          <TransactionDialog
            trigger={<Button size="sm"><Plus className="h-4 w-4" /> New receipt</Button>}
            defaults={{ type: "Receipt Voucher", classification: "Sponsor Expense", fromWallet: "external", toWallet: "cbq" }}
          />
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total received" value={total} tone="success" />
        <StatCard label="Pending" value={pending} tone="warning" />
        <StatCard label="Receipts" value={rows.length} format="raw" />
      </div>
      <TransactionsTable rows={rows} exportName="sponsor-receivables.csv" />
    </AppLayout>
  );
}
