import { createFileRoute } from "@tanstack/react-router";
import {
  Wallet,
  Coffee,
  Landmark,
  CreditCard,
  UsersRound,
  HandCoins,
  ArrowLeftRight,
  Banknote,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import {
  useFinance,
  pettyCashBalance,
  cardUsage,
  limitCardBreakdown,
  candidateHoldingTotal,
  salaryHoldingTotal,
  pendingTransferToCBQ,
} from "@/lib/finance-store";
import { CARD_META } from "@/lib/finance-types";
import { qar } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Finance Control" },
      { name: "description", content: "Live overview of cash, cards, and candidate money." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useFinance();
  const office = pettyCashBalance(s, "office");
  const dumonde = pettyCashBalance(s, "dumonde");
  const candidatesHeld = candidateHoldingTotal(s);
  const salariesHeld = salaryHoldingTotal(s);
  const pendingCBQ = pendingTransferToCBQ(s);

  const totalCash = office.balance + dumonde.balance;

  const cardKeys = ["maryam", "yousef", "maha", "limit"] as const;
  const cards = cardKeys.map((k) => {
    const { total } = cardUsage(s, k);
    const meta = CARD_META[k];
    return { key: k, meta, used: total, remaining: meta.limit - total, needed: total };
  });

  return (
    <AppLayout>
      <PageHeader
        title="Financial Overview"
        description="Where is every riyal right now?"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Cash Available" value={totalCash} icon={Wallet} tone="success" />
        <StatCard label="Candidate Money Held" value={candidatesHeld} icon={UsersRound} tone="warning" />
        <StatCard label="Salary Money Held" value={salariesHeld} icon={HandCoins} tone="warning" />
        <StatCard label="CBQ Balance" value={s.cbqBalance} icon={Landmark} tone="info" />
        <StatCard label="Pending Transfer to CBQ" value={pendingCBQ} icon={ArrowLeftRight} tone="danger" />
        <StatCard label="Office Petty Cash" value={office.balance} icon={Wallet} />
        <StatCard label="Du Monde Petty Cash" value={dumonde.balance} icon={Coffee} />
        <StatCard
          label="Total Card Exposure"
          value={cards.reduce((a, c) => a + c.used, 0)}
          icon={CreditCard}
        />
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Card Balances
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => {
            const pct = Math.min(100, (c.used / c.meta.limit) * 100);
            return (
              <Card key={c.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>{c.meta.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">****{c.meta.last4}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Used</div>
                    <div className="text-lg font-semibold tabular">{qar(c.used)}</div>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Limit {qar(c.meta.limit)}</span>
                    <span className="font-medium">Needed to close: {qar(c.needed)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sponsor Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outstanding</span>
              <span className="font-semibold tabular">
                {qar(s.sponsors.reduce((a, r) => a + Math.max(0, r.totalAmount - r.deposit), 0))}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Deposits received</span>
              <span className="font-semibold tabular">
                {qar(s.sponsors.reduce((a, r) => a + r.deposit, 0))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Counts</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <Row label="Petty cash entries" value={s.pettyCash.length} />
            <Row label="Card transactions" value={s.cardTxns.length} />
            <Row label="Candidate holdings" value={s.candidates.length} />
            <Row label="Salary holdings" value={s.salaries.length} />
            <Row label="Vouchers issued" value={s.vouchers.length} />
            <Row label="Transfers logged" value={s.transfers.length} />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between border-b border-border/50 pb-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular">{value}</span>
    </div>
  );
}
