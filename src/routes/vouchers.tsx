import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useFinance } from "@/lib/finance-store";

export const Route = createFileRoute("/vouchers")({
  head: () => ({
    meta: [
      { title: "Vouchers · Alhakeem Expenses ERP" },
      { name: "description", content: "Receipt and Payment vouchers per company." },
    ],
  }),
  component: VouchersPage,
});

function VouchersPage() {
  const s = useFinance();
  const rows = s.transactions.filter((t) => t.type === "Receipt Voucher" || t.type === "Payment Voucher");
  const rv = rows.filter((r) => r.type === "Receipt Voucher");
  const pv = rows.filter((r) => r.type === "Payment Voucher");

  return (
    <AppLayout>
      <PageHeader
        title="Vouchers (RV / PV)"
        description="Unified voucher system. Voucher numbers are auto-assigned per company."
        action={
          <div className="flex gap-2">
            <TransactionDialog
              trigger={<Button size="sm" variant="outline"><Plus className="h-4 w-4" /> Payment Voucher</Button>}
              defaults={{ type: "Payment Voucher", fromWallet: "office-petty", toWallet: "external", classification: "Company Expense" }}
            />
            <TransactionDialog
              trigger={<Button size="sm"><Plus className="h-4 w-4" /> Receipt Voucher</Button>}
              defaults={{ type: "Receipt Voucher", fromWallet: "external", toWallet: "cbq", classification: "Sponsor Expense" }}
            />
          </div>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Receipt Vouchers" value={rv.length} format="raw" />
        <StatCard label="Payment Vouchers" value={pv.length} format="raw" />
        <StatCard label="Total received" value={rv.reduce((a, r) => a + r.amount, 0)} tone="success" />
        <StatCard label="Total paid" value={pv.reduce((a, r) => a + r.amount, 0)} tone="warning" />
      </div>
      <TransactionsTable rows={rows} exportName="vouchers.csv" />
    </AppLayout>
  );
}
