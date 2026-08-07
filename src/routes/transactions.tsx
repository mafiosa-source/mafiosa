import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { useFinance } from "@/lib/finance-store";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type TxSearch = { status?: string; company?: string };

export const Route = createFileRoute("/transactions")({
  validateSearch: (search: Record<string, unknown>): TxSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    company: typeof search.company === "string" ? search.company : undefined,
  }),
  head: () => ({
    meta: [
      { title: "All Transactions · Alhakeem Expenses ERP" },
      { name: "description", content: "The master ledger. Every movement of money in one place." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const s = useFinance();
  const { status, company } = Route.useSearch();
  return (
    <AppLayout>
      <PageHeader
        title="Master Transactions"
        description="Every movement of money is recorded here exactly once."
        action={<TransactionDialog trigger={<Button size="sm"><Plus className="h-4 w-4" /> New transaction</Button>} />}
      />
      <TransactionsTable
        rows={s.transactions}
        exportName="transactions.csv"
        initialStatus={status}
        initialCompany={company}
      />
    </AppLayout>
  );
}
