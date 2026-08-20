import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useFinance, walletBalance, pendingCompanyTransfer } from "@/lib/finance-store";
import type { Company } from "@/lib/finance-types";
import { COMPANY_ACCOUNT_BY_COMPANY, COMPANY_ACCOUNT_WALLETS } from "@/lib/finance-types";

export const Route = createFileRoute("/transfers")({
  validateSearch: (search: Record<string, unknown>): { company?: string } => ({
    company: typeof search.company === "string" ? search.company : undefined,
  }),
  head: () => ({
    meta: [
      { title: "CBQ Transfers · Alhakeem Group ERP" },
      { name: "description", content: "Transfers between company accounts and CBQ." },
    ],
  }),
  component: TransfersPage,
});

function TransfersPage() {
  const s = useFinance();
  const { company: companyFilter } = Route.useSearch();
  const rows = s.transactions.filter(
    (t) =>
      t.type === "Transfer" &&
      (t.fromWallet === "cbq" ||
        t.toWallet === "cbq" ||
        COMPANY_ACCOUNT_WALLETS.includes(t.fromWallet) ||
        COMPANY_ACCOUNT_WALLETS.includes(t.toWallet)),
  );
  const companies: Exclude<Company, "AHG">[] = ["FAST", "BROKER", "SKILL", "DANET"];
  const cbq = walletBalance(s, "cbq");

  return (
    <AppLayout>
      <PageHeader
        title="CBQ Transfers"
        description="Money flowing between company accounts and CBQ."
        action={
          <TransactionDialog
            trigger={<Button size="sm"><Plus className="h-4 w-4" /> New transfer</Button>}
            defaults={{ type: "Transfer", fromWallet: "fast-acct", toWallet: "cbq", paymentMethod: "Company Account" }}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="CBQ balance" value={cbq.balance} tone="info" />
        <StatCard label="Transfers logged" value={rows.length} format="raw" />
        <StatCard label="Received (CBQ in)" value={rows.filter((r) => r.toWallet === "cbq").reduce((a, r) => a + r.amount, 0)} tone="success" />
        <StatCard label="Sent from CBQ" value={rows.filter((r) => r.fromWallet === "cbq").reduce((a, r) => a + r.amount, 0)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {companies.map((c) => {
          const bal = walletBalance(s, COMPANY_ACCOUNT_BY_COMPANY[c] ?? "fast-acct").balance;
          const pending = pendingCompanyTransfer(s, c);
          return (
            <div key={c} className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">{c} account</div>
              <div className="text-lg font-semibold tabular">{bal.toFixed(2)}</div>
              <div className="text-xs text-rose-600 mt-1">Pending → CBQ: {pending.toFixed(2)}</div>
            </div>
          );
        })}
      </div>

      <TransactionsTable rows={rows} exportName="cbq-transfers.csv" initialCompany={companyFilter} />
    </AppLayout>
  );
}
