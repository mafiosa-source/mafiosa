import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Banknote,
  Coffee,
  Landmark,
  CreditCard,
  UsersRound,
  HandCoins,
  Hourglass,
  FileText,
  Plus,
  ArrowRight,
  TriangleAlert,
  ArrowLeftRight,
  ClipboardCheck,
  PiggyBank,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { DrillDownStat } from "@/components/DrillDownStat";
import {
  useFinance, walletBalance, cardUsage, candidateHoldingTotal, salariesHeldTotal, pendingCompanyTransfer,
  sortByDateDesc, salaryLedger, candidateLedger,
} from "@/lib/finance-store";
import { housemaidHoldingLedger } from "@/lib/finance-derived";
import { CARD_WALLETS, WALLET_BY_KEY, COMPANY_LABEL } from "@/lib/finance-types";
import type { WalletKey, Company } from "@/lib/finance-types";
import { qar } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TransactionDialog } from "@/components/TransactionDialog";
import { SalaryReleaseDialog } from "@/components/SalaryReleaseDialog";
import { HoldingReleaseDialog } from "@/components/HoldingReleaseDialog";
import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/components/TransactionsTable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alhakeem Expenses ERP · Control Center" },
      { name: "description", content: "Live position of every riyal across wallets, cards and held funds." },
      { property: "og:title", content: "Alhakeem Expenses ERP · Control Center" },
      { property: "og:description", content: "Cash, bank, held funds and pending transfers in one control center." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

/** Section wrapper — gives the dashboard a clear top-to-bottom hierarchy. */
function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground/80">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type Alert = { text: string; tone: "danger" | "warning"; to: string; search?: Record<string, string> };

function Dashboard() {
  const s = useFinance();
  const office = walletBalance(s, "office-petty");
  const dumonde = walletBalance(s, "dumonde-petty");
  const cbq = walletBalance(s, "cbq");
  const held = candidateHoldingTotal(s);
  const salaries = salariesHeldTotal(s);
  const holdingWallet = walletBalance(s, "housemaid-holding");

  const salaryRows = salaryLedger(s)
    .filter((e) => Math.abs(e.balance) > 0.001)
    .map((e) => ({
      housemaid: e.name,
      company: e.company ? COMPANY_LABEL[e.company] : "—",
      particulars: `Received ${qar(e.received)} · Released ${qar(e.released)}`,
      amount: e.balance,
    }));
  const candidateRows = candidateLedger(s)
    .filter((e) => Math.abs(e.balance) > 0.001)
    .map((e) => ({
      housemaid: e.candidate,
      company: e.company ? COMPANY_LABEL[e.company] : "—",
      particulars: e.sponsor ? `Sponsor · ${e.sponsor}` : "—",
      amount: e.balance,
    }));
  const holdingRows = housemaidHoldingLedger(s)
    .filter((e) => Math.abs(e.balance) > 0.001)
    .map((e) => ({
      housemaid: e.name,
      company: e.company ? COMPANY_LABEL[e.company] : "—",
      particulars: e.sponsor ? `Sponsor · ${e.sponsor}` : "—",
      amount: e.balance,
    }));

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
  const cardExposure = cards.reduce((a, c) => a + c.used, 0);

  const alerts: Alert[] = [];
  for (const c of cards) {
    if (c.limit > 0 && c.used >= c.limit) {
      alerts.push({
        tone: "danger",
        text: `${c.meta.name} has reached its limit (${qar(c.used)} of ${qar(c.limit)}).`,
        to: "/cards",
      });
    } else if (c.limit > 0 && c.used / c.limit >= 0.8) {
      alerts.push({
        tone: "warning",
        text: `${c.meta.name} is at ${Math.round((c.used / c.limit) * 100)}% of its limit.`,
        to: "/cards",
      });
    }
  }
  for (const w of [
    { name: "Office Petty Cash", b: office.balance, to: "/petty-cash" },
    { name: "Du Monde Petty Cash", b: dumonde.balance, to: "/du-monde" },
    { name: "CBQ", b: cbq.balance, to: "/transfers" },
  ]) {
    if (w.b < 0) {
      alerts.push({ tone: "danger", text: `${w.name} is negative (${qar(w.b)}) — check for a missing receipt.`, to: w.to });
    }
  }
  for (const p of pending) {
    if (p.amount > 0) {
      alerts.push({
        tone: "warning",
        text: `${COMPANY_LABEL[p.company]} account holds ${qar(p.amount)} awaiting transfer to CBQ.`,
        to: "/transfers",
        search: { company: p.company },
      });
    }
  }
  if (pendingActions.length > 0) {
    alerts.push({
      tone: "warning",
      text: `${pendingActions.length} pending transaction(s) awaiting approval.`,
      to: "/transactions",
      search: { status: "Pending" },
    });
  }

  return (
    <AppLayout>
      <header className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground">Alhakeem Expenses ERP</h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <TransactionDialog
            trigger={<Button size="sm"><Plus className="h-4 w-4" /> New Transaction</Button>}
          />
          <TransactionDialog
            defaults={{ type: "Salary Holding", fromWallet: "external", toWallet: "salary-wallet", purposeCategory: "Salary" }}
            trigger={<Button size="sm" variant="outline"><HandCoins className="h-4 w-4" /> Salary Received</Button>}
          />
          <SalaryReleaseDialog
            trigger={<Button size="sm" variant="outline"><ArrowRight className="h-4 w-4" /> Release Salary</Button>}
          />
          <HoldingReleaseDialog
            mode="receipt"
            trigger={<Button size="sm" variant="outline"><PiggyBank className="h-4 w-4" /> Candidate Money</Button>}
          />
          <TransactionDialog
            defaults={{ type: "Transfer", fromWallet: "fast-acct", toWallet: "cbq", paymentMethod: "Company Account" }}
            trigger={<Button size="sm" variant="outline"><ArrowLeftRight className="h-4 w-4" /> Transfer to CBQ</Button>}
          />
          <Button size="sm" variant="outline" asChild>
            <Link to="/reconciliation"><ClipboardCheck className="h-4 w-4" /> Reconciliation</Link>
          </Button>
        </div>
      </header>

      <Section title="Cash & Bank" hint="Company funds available to spend right now.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Office Petty Cash" value={office.balance} icon={Banknote} to="/petty-cash" cta="View ledger" />
          <StatCard label="Du Monde Petty Cash" value={dumonde.balance} icon={Coffee} to="/du-monde" cta="View ledger" />
          <StatCard label="CBQ Balance" value={cbq.balance} icon={Landmark} tone="info" to="/transfers" cta="View bank transactions" />
          <StatCard
            label="Total Card Exposure"
            value={cardExposure}
            icon={CreditCard}
            to="/cards"
            caption="Spent on company cards"
            cta="Manage cards"
          />
        </div>
      </Section>

      <Section title="Held Funds" hint="Money held on behalf of housemaids, candidates and sponsors — not company money.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <DrillDownStat
            label="Housemaid Salaries Held"
            value={salaries}
            icon={HandCoins}
            tone="warning"
            caption="Received − released"
            title="Housemaids making up the held salary balance"
            description="Click a name to open that housemaid's full financial profile."
            columns={["housemaid", "company", "particulars", "amount"]}
            rows={salaryRows}
            empty="No salary money is being held."
          />
          <DrillDownStat
            label="Candidate Money Held"
            value={held}
            icon={UsersRound}
            tone="warning"
            caption="Remaining sponsor funds"
            title="Candidates with remaining sponsor money"
            columns={["housemaid", "company", "particulars", "amount"]}
            rows={candidateRows}
            empty="No candidate money is being held."
          />
          <DrillDownStat
            label="Housemaid Holding Wallet"
            value={holdingWallet.balance}
            icon={PiggyBank}
            tone="warning"
            caption="Carry-forward balance"
            title="Sponsor money held per housemaid"
            columns={["housemaid", "company", "particulars", "amount"]}
            rows={holdingRows}
            empty="The holding wallet is empty."
          />
        </div>
      </Section>

      <Section title="Operations" hint="Activity across the master ledger.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            label="Transactions Logged"
            value={s.transactions.length}
            icon={FileText}
            format="raw"
            caption="Master ledger entries"
            to="/transactions"
            cta="Open all transactions"
          />
          <StatCard
            label="Pending Actions"
            value={pendingActions.length}
            icon={Hourglass}
            tone={pendingActions.length ? "danger" : "default"}
            format="raw"
            caption="Awaiting approval"
            to="/transactions"
            search={{ status: "Pending" }}
            cta="Review pending"
          />
        </div>
      </Section>

      <Section title="Pending Transfers" hint="Company account money not yet moved to CBQ.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {pending.map((p) => (
            <StatCard
              key={p.company}
              label={`${COMPANY_LABEL[p.company]} Pending`}
              value={p.amount}
              tone={p.amount > 0 ? "danger" : "default"}
              icon={ArrowLeftRight}
              caption="Awaiting transfer to CBQ"
              to="/transfers"
              search={{ company: p.company }}
              cta="View transfers"
            />
          ))}
        </div>
      </Section>

      {alerts.length > 0 && (
        <Section title="Finance Alerts" hint="Everything that needs a decision today.">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {alerts.map((a, i) => (
              <Link
                key={`${a.text}-${i}`}
                to={a.to}
                search={a.search as never}
                className="group flex items-center gap-3 border-b px-4 py-3 text-sm transition-colors last:border-b-0 hover:bg-accent/50"
              >
                <span
                  className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: a.tone === "danger" ? "var(--destructive)" : "var(--warning)",
                  }}
                />
                <TriangleAlert
                  className="h-4 w-4 shrink-0"
                  style={{ color: a.tone === "danger" ? "var(--destructive)" : "var(--warning)" }}
                />
                <span className="min-w-0 flex-1">{a.text}</span>
                <ArrowRight className="h-4 w-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </Section>
      )}

      <Section title="Card Balances" hint="Usage against each card limit.">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => {
            const pct = c.limit ? Math.min(100, (c.used / c.limit) * 100) : 0;
            return (
              <Link key={c.key} to="/cards" className="group">
                <Card className="h-full rounded-xl shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:shadow-lg">
                  <CardContent className="space-y-3 pt-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.meta.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">****{c.meta.last4}</span>
                    </div>
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
              </Link>
            );
          })}
        </div>
      </Section>

      <Section
        title="Recent Transactions"
        hint="The last eight entries in the master ledger."
        action={
          <Button size="sm" variant="ghost" asChild>
            <Link to="/transactions">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        }
      >
        <TransactionsTable rows={recent} empty="No transactions yet — create the first one." />
      </Section>
    </AppLayout>
  );
}
