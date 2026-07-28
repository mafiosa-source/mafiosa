import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { useFinance } from "@/lib/finance-store";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "All Transactions · AHG Finance Core" },
      { name: "description", content: "The master ledger. Every movement of money in one place." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const s = useFinance();
  return (
    <AppLayout>
      <PageHeader
        title="Master Transactions"
        description="Every movement of money is recorded here exactly once."
        action={<TransactionDialog trigger={<Button size="sm"><Plus className="h-4 w-4" /> New transaction</Button>} />}
      />
      <TransactionsTable rows={s.transactions} exportName="transactions.csv" />
    </AppLayout>
  );
}
