import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useFinance, candidateHoldingTotal, candidateSummaries } from "@/lib/finance-store";
import { qar } from "@/lib/format";

export const Route = createFileRoute("/candidates")({
  head: () => ({
    meta: [
      { title: "Candidate Holdings · AHG Finance Core" },
      { name: "description", content: "Sponsor-Expense transactions grouped per candidate." },
    ],
  }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const s = useFinance();
  const held = candidateHoldingTotal(s);
  const summaries = candidateSummaries(s);
  const rows = s.transactions.filter((t) => t.classification === "Sponsor Expense");

  return (
    <AppLayout>
      <PageHeader
        title="Candidate Holdings"
        description='Automatic ledger of every "Sponsor Expense" transaction.'
        action={
          <TransactionDialog
            trigger={<Button size="sm"><Plus className="h-4 w-4" /> New candidate transaction</Button>}
            defaults={{ type: "Receipt Voucher", classification: "Sponsor Expense", fromWallet: "external", toWallet: "cbq" }}
          />
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Held" value={held} tone="warning" />
        <StatCard label="Candidates on file" value={summaries.length} format="raw" />
        <StatCard label="Sponsor-Expense Txns" value={rows.length} format="raw" />
        <StatCard label="Received (all)" value={summaries.reduce((a, c) => a + c.received, 0)} tone="success" />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2"><CardTitle className="text-base">By Candidate</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summaries.length === 0 ? (
              <div className="text-sm text-muted-foreground">No candidate holdings yet.</div>
            ) : summaries.map((c) => (
              <div key={c.candidate} className="rounded-md border p-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>{c.candidate}</span>
                  <span className="tabular">{qar(c.balance)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{c.sponsor ?? "—"} · {c.company ?? "—"}</div>
                <div className="mt-1 text-xs flex justify-between">
                  <span className="text-emerald-600">In {qar(c.received)}</span>
                  <span className="text-rose-600">Out {qar(c.paid)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TransactionsTable rows={rows} exportName="candidate-holdings.csv" />
    </AppLayout>
  );
}
