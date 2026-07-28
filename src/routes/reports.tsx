import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useFinance, walletBalance, cardUsage, sortByDateDesc } from "@/lib/finance-store";
import { WALLETS, CARD_WALLETS, COMPANY_ACCOUNT_WALLETS, PETTY_WALLETS } from "@/lib/finance-types";
import { qar, exportCsv, today } from "@/lib/format";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports · AHG Finance Core" },
      { name: "description", content: "Reports generated live from the master ledger." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const s = useFinance();

  function daily() {
    const rows = WALLETS.filter((w) => w.key !== "external").map((w) => {
      const b = walletBalance(s, w.key);
      return { wallet: w.name, opening: b.opening, inflow: b.inflow, outflow: b.outflow, balance: b.balance };
    });
    exportCsv(`daily-cash-position-${today()}.csv`, rows);
  }

  function cardsReport() {
    const rows = CARD_WALLETS.map((k) => {
      const u = cardUsage(s, k);
      const meta = WALLETS.find((w) => w.key === k)!;
      return { card: meta.name, last4: meta.last4, limit: u.limit, used: u.used, remaining: u.remaining, toRestore: u.used };
    });
    exportCsv(`cards-report-${today()}.csv`, rows);
  }

  function candidatesReport() {
    const rows = sortByDateDesc(s.transactions.filter((t) => t.classification === "Sponsor Expense"));
    exportCsv(`candidate-holdings-${today()}.csv`, rows as unknown as Record<string, unknown>[]);
  }

  function companyExpenses() {
    const rows = sortByDateDesc(s.transactions.filter((t) => t.classification === "Company Expense"));
    exportCsv(`company-expenses-${today()}.csv`, rows as unknown as Record<string, unknown>[]);
  }

  function cbqReport() {
    const rows = sortByDateDesc(s.transactions.filter(
      (t) => t.fromWallet === "cbq" || t.toWallet === "cbq" ||
        COMPANY_ACCOUNT_WALLETS.includes(t.fromWallet) || COMPANY_ACCOUNT_WALLETS.includes(t.toWallet),
    ));
    exportCsv(`cbq-transfers-${today()}.csv`, rows as unknown as Record<string, unknown>[]);
  }

  function pettyReport() {
    const rows = sortByDateDesc(s.transactions.filter(
      (t) => PETTY_WALLETS.includes(t.fromWallet) || PETTY_WALLETS.includes(t.toWallet),
    ));
    exportCsv(`petty-cash-${today()}.csv`, rows as unknown as Record<string, unknown>[]);
  }

  function monthlyClosing() {
    const rows = WALLETS.filter((w) => w.key !== "external").map((w) => {
      const b = walletBalance(s, w.key);
      return { wallet: w.name, kind: w.kind, opening: b.opening, in: b.inflow, out: b.outflow, closing: b.balance };
    });
    exportCsv(`monthly-closing-${today()}.csv`, rows);
  }

  const reports = [
    { title: "Daily Cash Position", desc: "Snapshot of every wallet balance.", run: daily },
    { title: "Candidate Holdings", desc: "All Sponsor Expense transactions.", run: candidatesReport },
    { title: "Housemaid / Company Expenses", desc: "All Company Expense transactions.", run: companyExpenses },
    { title: "CBQ Transfers", desc: "Movements involving CBQ or company accounts.", run: cbqReport },
    { title: "Petty Cash", desc: "Office + Du Monde petty cash ledger.", run: pettyReport },
    { title: "Company Cards", desc: "Card usage, remaining and amount to restore.", run: cardsReport },
    { title: "Monthly Closing", desc: "Full wallet closing snapshot.", run: monthlyClosing },
  ];

  return (
    <AppLayout>
      <PageHeader title="Reports" description="All reports are generated live from Master Transactions." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardHeader><CardTitle className="text-base">{r.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{r.desc}</p>
              <Button size="sm" onClick={r.run}><Download className="h-4 w-4" /> Download CSV</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-lg border bg-card p-4 text-xs text-muted-foreground">
        Master ledger contains {s.transactions.length} transactions across {WALLETS.length - 1} wallets.
        Balance across all internal wallets:{" "}
        <span className="tabular font-medium text-foreground">
          {qar(WALLETS.filter((w) => w.key !== "external").reduce((a, w) => a + walletBalance(s, w.key).balance, 0))}
        </span>
      </div>
    </AppLayout>
  );
}
