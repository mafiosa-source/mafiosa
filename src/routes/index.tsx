import { createFileRoute } from "@tanstack/react-router";
import { Wallet, Coffee, Landmark, CreditCard, UsersRound, HandCoins, ArrowLeftRight, ListOrdered, AlertTriangle } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import {
  useFinance, walletBalance, cardUsage, candidateHoldingTotal, salariesHeldTotal, pendingCompanyTransfer,
  sortByDateDesc,
} from "@/lib/finance-store";
import { CARD_WALLETS, WALLET_BY_KEY } from "@/lib/finance-types";
import type { WalletKey, Company } from "@/lib/finance-types";
import { qar } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TransactionsTable } from "@/components/TransactionsTable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · AHG Finance Core" },
      { name: "description", content: "Live position of every riyal across wallets, cards and holdings." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useFinance();
  const office = walletBalance(s, "office-petty");
  const dumonde = walletBalance(s, "dumonde-petty");
  const cbq = walletBalance(s, "cbq");
  const held = candidateHoldingTotal(s);
  const salaries = salariesHeldTotal(s);

  const pending: { company: Exclude<Company, "AHG">; amount: number }[] = [
    { company: "FAST", amount: pendingCompanyTransfer(s, "FAST") },
    { company: "BROKER", amount: pendingCompanyTransfer(s, "BROKER") },
    { company: "SKILL", amount: pendingCompanyTransfer(s, "SKILL") },
    { company: "DANET", amount: pendingCompanyTransfer(s, "DANET") },
  ];

  const cards = CARD_WALLETS.map((k: WalletKey) => {
    const meta = WALLET_BY_KEY[k];
    const u = cardUsage(s, k);
    return { key: k, meta, used: u.used, limit: u.limit, remaining: u.remaining };
  });

  const recent = sortByDateDesc(s.transactions).slice(0, 8);
  const pendingActions = s.transactions.filter((t) => t.status === "Pending");

  const alerts: string[] = [];
  for (const c of cards) {
    if (c.limit > 0 && c.used >= c.limit) alerts.push(`${c.meta.name} has reached its limit (${qar(c.used)} of ${qar(c.limit)}).`);
    else if (c.limit > 0 && c.used / c.limit >= 0.8) alerts.push(`${c.meta.name} is at ${Math.round((c.used / c.limit) * 100)}% of its limit.`);
  }
  for (const w of [
    { name: "Office Petty Cash", b: office.balance },
    { name: "Du Monde Petty Cash", b: dumonde.balance },
    { name: "CBQ", b: cbq.balance },
  ]) {
    if (w.b < 0) alerts.push(`${w.name} is negative (${qar(w.b)}) — check for a missing receipt.`);
  }
  for (const p of pending) {
    if (p.amount > 0) alerts.push(`${p.company} account holds ${qar(p.amount)} not yet transferred to CBQ.`);
  }
  if (pendingActions.length > 0) alerts.push(`${pendingActions.length} transaction(s) still marked Pending.`);


  return (
    <AppLayout>
      <PageHeader
        title="Financial Overview"
        description="AHG Finance Core · single source of truth"
        action={
          <TransactionDialog trigger={<Button size="sm"><Plus className="h-4 w-4" /> New transaction</Button>} />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Office Petty Cash" value={office.balance} icon={Wallet} />
        <StatCard label="Du Monde Petty Cash" value={dumonde.balance} icon={Coffee} />
        <StatCard label="CBQ Balance" value={cbq.balance} icon={Landmark} tone="info" />
        <StatCard label="Candidate Money Held" value={held} icon={UsersRound} tone="warning" />
        <StatCard label="Housemaid Salaries Held" value={salaries} icon={HandCoins} tone="warning" />
        <StatCard label="Total Card Exposure" value={cards.reduce((a, c) => a + c.used, 0)} icon={CreditCard} />
        <StatCard label="Transactions Logged" value={s.transactions.length} icon={ListOrdered} format="raw" />
        <StatCard label="Pending Actions" value={pendingActions.length} icon={ArrowLeftRight} tone="danger" format="raw" />
      </div>

      {alerts.length > 0 && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Needs attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {alerts.map((a) => (
                <li key={a} className="flex gap-2">
                  <span className="text-amber-600">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}



      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Pending Transfers to CBQ</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pending.map((p) => (
            <StatCard key={p.company} label={`${p.company} Pending`} value={p.amount} tone={p.amount > 0 ? "danger" : undefined} />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Card Balances</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => {
            const pct = c.limit ? Math.min(100, (c.used / c.limit) * 100) : 0;
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
                    <span className="text-muted-foreground">Limit {qar(c.limit)}</span>
                    <span className="font-medium">Needed: {qar(c.used)}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Transactions</h2>
        <TransactionsTable rows={recent} empty="No transactions yet — create the first one." />
      </div>
    </AppLayout>
  );
}
