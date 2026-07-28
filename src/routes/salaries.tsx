import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useFinance, salariesHeldTotal } from "@/lib/finance-store";

export const Route = createFileRoute("/salaries")({
  head: () => ({
    meta: [
      { title: "Housemaid Salaries · AHG Finance Core" },
      { name: "description", content: "Salary holdings and releases as master transactions." },
    ],
  }),
  component: SalariesPage,
});

function SalariesPage() {
  const s = useFinance();
  const held = salariesHeldTotal(s);
  const rows = s.transactions.filter((t) => t.type === "Salary Holding" || t.type === "Salary Release");
  const holdings = rows.filter((t) => t.type === "Salary Holding");
  const releases = rows.filter((t) => t.type === "Salary Release");

  return (
    <AppLayout>
      <PageHeader
        title="Housemaid Salaries"
        description="Salaries received on behalf of housemaids and their releases."
        action={
          <div className="flex gap-2">
            <TransactionDialog
              trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4" /> Release</Button>}
              defaults={{ type: "Salary Release", fromWallet: "cbq", toWallet: "external", purposeCategory: "Salary" }}
            />
            <TransactionDialog
              trigger={<Button size="sm"><Plus className="h-4 w-4" /> Hold salary</Button>}
              defaults={{ type: "Salary Holding", fromWallet: "external", toWallet: "cbq", purposeCategory: "Salary" }}
            />
          </div>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Currently Held" value={held} tone="warning" />
        <StatCard label="Total Received" value={holdings.reduce((a, r) => a + r.amount, 0)} tone="success" />
        <StatCard label="Total Released" value={releases.reduce((a, r) => a + r.amount, 0)} />
        <StatCard label="Records" value={rows.length} format="raw" />
      </div>
      <TransactionsTable rows={rows} exportName="salaries.csv" />
    </AppLayout>
  );
}
