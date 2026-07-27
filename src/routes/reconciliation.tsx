import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useFinance,
  pettyCashBalance,
  cardUsage,
  candidateHoldingTotal,
  salaryHoldingTotal,
  pendingTransferToCBQ,
} from "@/lib/finance-store";
import { CARD_META } from "@/lib/finance-types";
import { qar, exportCsv } from "@/lib/format";
import { Download } from "lucide-react";

export const Route = createFileRoute("/reconciliation")({
  head: () => ({
    meta: [
      { title: "Monthly Reconciliation · Finance Control" },
      { name: "description", content: "Monthly closing overview and variance." },
    ],
  }),
  component: Reconciliation,
});

function Reconciliation() {
  const s = useFinance();
  const office = pettyCashBalance(s, "office");
  const dumonde = pettyCashBalance(s, "dumonde");
  const candidatesHeld = candidateHoldingTotal(s);
  const salariesHeld = salaryHoldingTotal(s);
  const pendingCBQ = pendingTransferToCBQ(s);
  const cardUsages = (["maryam", "yousef", "maha", "limit"] as const).map((k) => ({
    key: k,
    name: CARD_META[k].name,
    used: cardUsage(s, k).total,
  }));

  const totalReceived = office.received + dumonde.received;
  const totalPaid = office.paid + dumonde.paid;
  const cashBalance = office.balance + dumonde.balance;
  const cardTotal = cardUsages.reduce((a, c) => a + c.used, 0);

  const rows = [
    { section: "Opening", metric: "Office petty cash opening", amount: office.opening },
    { section: "Opening", metric: "Du Monde petty cash opening", amount: dumonde.opening },
    { section: "Received", metric: "Office petty cash received", amount: office.received },
    { section: "Received", metric: "Du Monde petty cash received", amount: dumonde.received },
    { section: "Paid", metric: "Office petty cash paid", amount: office.paid },
    { section: "Paid", metric: "Du Monde petty cash paid", amount: dumonde.paid },
    { section: "Balance", metric: "Office petty cash balance", amount: office.balance },
    { section: "Balance", metric: "Du Monde petty cash balance", amount: dumonde.balance },
    ...cardUsages.map((c) => ({ section: "Cards", metric: `${c.name} used`, amount: c.used })),
    { section: "Holdings", metric: "Candidate money held", amount: candidatesHeld },
    { section: "Holdings", metric: "Salary money held", amount: salariesHeld },
    { section: "Bank", metric: "Pending transfer to CBQ", amount: pendingCBQ },
    { section: "Bank", metric: "CBQ balance (manual)", amount: s.cbqBalance },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Monthly Reconciliation"
        description="Closing summary across all modules."
        action={
          <Button variant="outline" size="sm" onClick={() => exportCsv("monthly-reconciliation.csv", rows)}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecCard title="Cash Position">
          <Line label="Office opening balance" v={office.opening} />
          <Line label="Office received" v={office.received} tone="success" />
          <Line label="Office paid" v={-office.paid} tone="danger" />
          <Line label="Office balance" v={office.balance} bold />
          <div className="my-2 border-t" />
          <Line label="Du Monde opening" v={dumonde.opening} />
          <Line label="Du Monde received" v={dumonde.received} tone="success" />
          <Line label="Du Monde paid" v={-dumonde.paid} tone="danger" />
          <Line label="Du Monde balance" v={dumonde.balance} bold />
          <div className="my-2 border-t" />
          <Line label="Total cash balance" v={cashBalance} bold />
        </RecCard>

        <RecCard title="Card Balances">
          {cardUsages.map((c) => (
            <Line key={c.key} label={`${c.name} used`} v={c.used} />
          ))}
          <div className="my-2 border-t" />
          <Line label="Total card exposure" v={cardTotal} bold />
        </RecCard>

        <RecCard title="Money Held">
          <Line label="Candidate money held" v={candidatesHeld} tone="warning" />
          <Line label="Housemaid salary held" v={salariesHeld} tone="warning" />
          <div className="my-2 border-t" />
          <Line label="Total held" v={candidatesHeld + salariesHeld} bold />
        </RecCard>

        <RecCard title="Bank & Transfers">
          <Line label="CBQ balance" v={s.cbqBalance} />
          <Line label="Pending transfer to CBQ" v={pendingCBQ} tone="danger" />
          <div className="my-2 border-t" />
          <Line label="Total received this period" v={totalReceived} tone="success" />
          <Line label="Total paid this period" v={-totalPaid} tone="danger" />
        </RecCard>
      </div>
    </AppLayout>
  );
}

function RecCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">{children}</CardContent>
    </Card>
  );
}

function Line({
  label,
  v,
  tone,
  bold,
}: {
  label: string;
  v: number;
  tone?: "success" | "danger" | "warning";
  bold?: boolean;
}) {
  const toneCls =
    tone === "success" ? "text-[color:var(--success)]" :
    tone === "danger" ? "text-[color:var(--destructive)]" :
    tone === "warning" ? "text-[color:var(--warning)]" : "";
  return (
    <div className="flex justify-between">
      <span className={"text-muted-foreground " + (bold ? "text-foreground font-semibold" : "")}>{label}</span>
      <span className={"tabular " + toneCls + (bold ? " font-semibold" : "")}>{qar(v)}</span>
    </div>
  );
}
