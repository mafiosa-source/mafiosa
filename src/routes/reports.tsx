import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  useFinance,
  pettyCashBalance,
  cardUsage,
  candidateHoldingTotal,
  salaryHoldingTotal,
} from "@/lib/finance-store";
import { CARD_META } from "@/lib/finance-types";
import { exportCsv, today } from "@/lib/format";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Finance Control" },
      { name: "description", content: "Downloadable financial reports." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const s = useFinance();

  const reports: { title: string; description: string; onExport: () => void }[] = [
    {
      title: "Daily Financial Position",
      description: "Snapshot of cash, cards, holdings and CBQ.",
      onExport: () => {
        const office = pettyCashBalance(s, "office");
        const dumonde = pettyCashBalance(s, "dumonde");
        exportCsv(`daily-position-${today()}.csv`, [
          { metric: "Office petty cash balance", amount: office.balance },
          { metric: "Du Monde petty cash balance", amount: dumonde.balance },
          { metric: "Candidate money held", amount: candidateHoldingTotal(s) },
          { metric: "Salary money held", amount: salaryHoldingTotal(s) },
          { metric: "CBQ balance", amount: s.cbqBalance },
          ...(["maryam", "yousef", "maha", "limit"] as const).map((k) => ({
            metric: `${CARD_META[k].name} used`,
            amount: cardUsage(s, k).total,
          })),
        ]);
      },
    },
    {
      title: "Candidate Money Holding Report",
      description: "All candidate holdings with money location and status.",
      onExport: () => exportCsv(`candidate-holdings-${today()}.csv`, s.candidates),
    },
    {
      title: "Housemaid Salary Holding Report",
      description: "Returned salaries, releases, and remaining balance.",
      onExport: () =>
        exportCsv(
          `salary-holdings-${today()}.csv`,
          s.salaries.map((x) => ({
            date: x.date,
            housemaid: x.housemaidName,
            passport: x.passport,
            prev_sponsor: x.previousSponsor,
            new_sponsor: x.newSponsor,
            amount: x.amount,
            released: x.releases.reduce((a, r) => a + r.amount, 0),
            location: x.currentLocation,
            status: x.status,
          })),
        ),
    },
    {
      title: "Card Closing Report",
      description: "Amount used and needed to restore limit for each card.",
      onExport: () =>
        exportCsv(
          `card-closing-${today()}.csv`,
          (["maryam", "yousef", "maha", "limit"] as const).map((k) => {
            const used = cardUsage(s, k).total;
            const m = CARD_META[k];
            return {
              card: m.name,
              last4: m.last4,
              limit: m.limit,
              used,
              needed_to_close: used,
              remaining: m.limit - used,
            };
          }),
        ),
    },
    {
      title: "Petty Cash Report",
      description: "All petty cash entries (office + Du Monde).",
      onExport: () => exportCsv(`petty-cash-${today()}.csv`, s.pettyCash),
    },
    {
      title: "Monthly Reconciliation Report",
      description: "All balances across modules.",
      onExport: () => {
        const office = pettyCashBalance(s, "office");
        const dumonde = pettyCashBalance(s, "dumonde");
        exportCsv(`reconciliation-${today()}.csv`, [
          { metric: "Office opening", amount: office.opening },
          { metric: "Office received", amount: office.received },
          { metric: "Office paid", amount: office.paid },
          { metric: "Office balance", amount: office.balance },
          { metric: "Du Monde opening", amount: dumonde.opening },
          { metric: "Du Monde received", amount: dumonde.received },
          { metric: "Du Monde paid", amount: dumonde.paid },
          { metric: "Du Monde balance", amount: dumonde.balance },
          { metric: "Candidate held", amount: candidateHoldingTotal(s) },
          { metric: "Salary held", amount: salaryHoldingTotal(s) },
          { metric: "CBQ balance", amount: s.cbqBalance },
          ...(["maryam", "yousef", "maha", "limit"] as const).map((k) => ({
            metric: `${CARD_META[k].name} used`,
            amount: cardUsage(s, k).total,
          })),
        ]);
      },
    },
    {
      title: "Company Expense Report",
      description: "All company expenses across cards.",
      onExport: () =>
        exportCsv(
          `company-expenses-${today()}.csv`,
          s.cardTxns.filter((t) => t.card !== "limit" || t.limitBranch === "company"),
        ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader title="Reports" description="Download data as CSV." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardHeader>
              <CardTitle className="text-base">{r.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{r.description}</p>
              <Button size="sm" variant="outline" onClick={r.onExport}>
                <Download className="h-4 w-4" /> Download CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}
