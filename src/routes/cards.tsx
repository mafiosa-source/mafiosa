import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Printer, Check, ArrowRight } from "lucide-react";
import { useFinance, walletBalance, walletTarget, setWalletTarget } from "@/lib/finance-store";
import { CARD_WALLETS, WALLET_BY_KEY } from "@/lib/finance-types";
import type { WalletKey } from "@/lib/finance-types";
import { qar, printAccountingReport } from "@/lib/format";
import { cardReconciliation } from "@/lib/wallet-rules";
import { toBalanceLedgerRows } from "@/lib/report-filters";
import { PeriodSelect } from "@/components/PeriodSelect";
import { currentMonthPeriod } from "@/lib/period";
import { toast } from "sonner";

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Company Cards · Alhakeem Group ERP" },
      { name: "description", content: "Maryam, Yousef, Maha Petrol and Limit card ledger with month-end reconciliation." },
      { property: "og:title", content: "Company Cards · Alhakeem Group ERP" },
      { property: "og:description", content: "Card limits, available balance, usage and printable card statements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  const s = useFinance();
  const [period, setPeriod] = useState(currentMonthPeriod);
  const from = period.from;
  const to = period.to;

  const cardRows = useMemo(
    () => s.transactions.filter((t) => CARD_WALLETS.includes(t.fromWallet) || CARD_WALLETS.includes(t.toWallet)),
    [s.transactions],
  );

  return (
    <AppLayout>
      <PageHeader
        title="Company Cards"
        description="Top-ups received from petty cash are Money In on the card. Card spending is Money Out. A top-up is never a company expense."
        action={
          <TransactionDialog
            trigger={<Button size="sm"><Plus className="h-4 w-4" /> New card expense</Button>}
            defaults={{ type: "Card Expense", fromWallet: "maryam-card", toWallet: "external", paymentMethod: "Card" }}
          />
        }
      />

      <div className="mb-5 rounded-lg border bg-card p-4 space-y-2">
        <PeriodSelect period={period} onChange={setPeriod} />
        <p className="text-xs text-muted-foreground max-w-2xl">
          Statements follow this period and default to the current month. Opening balance is everything before the start
          date. Money moved from petty cash into a card is Money In on the card and Money Out on petty cash — it is never
          a new company expense.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {CARD_WALLETS.map((k) => (
          <CardTile key={k} wallet={k} from={from} to={to} />
        ))}
      </div>

      <TransactionsTable
        rows={cardRows}
        exportName="cards.csv"
        printTitle="Company Cards Report"
      />
    </AppLayout>
  );
}

function CardTile({ wallet, from, to }: { wallet: WalletKey; from: string; to: string }) {
  const s = useFinance();
  const meta = WALLET_BY_KEY[wallet];
  const limit = walletTarget(s, wallet);
  const [draft, setDraft] = useState(String(limit));
  const [statementOpen, setStatementOpen] = useState(false);

  const rows = useMemo(
    () => s.transactions.filter((t) => t.fromWallet === wallet || t.toWallet === wallet),
    [s.transactions, wallet],
  );

  const opening = s.openingBalances[wallet] ?? 0;
  const live = walletBalance(s, wallet);
  // Used = actual card spending, net of any repayments / top-ups back onto the card.
  const used = Math.max(0, live.outflow - live.inflow);
  // Balance remaining on the card = limit − used (e.g. limit 5,000 − used 50 = 4,950).
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
  const recon = cardReconciliation(rows, wallet, limit, opening, { start: from || undefined, end: to || undefined });


  const periodRows = useMemo(
    () => rows.filter((t) => (!from || t.date >= from) && (!to || t.date <= to)),
    [rows, from, to],
  );

  function saveLimit() {
    setWalletTarget(wallet, Number(draft) || 0);
    toast.success(`${meta.name} limit saved`);
  }

  function printStatement() {
    printAccountingReport({
      title: `${meta.name} Statement`,
      subtitle: `Card ••${meta.last4 ?? "—"} · ${meta.purpose ?? "Company card"}`,
      from,
      to,
      company: undefined,
      columns: "inout",
      showBalance: true,
      rows: toBalanceLedgerRows(periodRows, wallet, recon.opening, from || undefined),
      summary: [
        { label: "Opening Balance", value: qar(recon.opening) },
        { label: "Money In / Top Ups", value: qar(recon.topUps) },
        { label: "Actual Expenses (Money Out)", value: qar(recon.expenses) },
        { label: "Closing Balance", value: qar(recon.closing) },
        { label: "Card Limit", value: qar(limit) },
        { label: "Used (spent on card)", value: qar(used) },
        { label: "Balance Remaining (Limit − Used)", value: qar(remaining) },

      ],
      note: "Card top-ups are internal transfers of existing expense funds, not company expenses. Only actual card spending is a company expense.",
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span>{meta.name}</span>
            <span className="font-mono text-xs text-muted-foreground">****{meta.last4}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">{meta.purpose}</div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Card limit</div>
              <div className="text-sm font-medium tabular">{qar(limit)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Balance remaining</div>
              <div className="text-xl font-semibold tabular text-emerald-600">{qar(remaining)}</div>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
              aria-label={`${Math.round(pct)}% used`}
            />
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Used</span>
            <span className="tabular font-medium text-rose-600">{qar(used)}</span>
          </div>



          <div className="rounded-md border bg-muted/30 p-2 space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Period activity</div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Money In / Top Ups</span>
              <span className="tabular text-emerald-600">{qar(recon.topUps)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Money Out</span>
              <span className="tabular text-rose-600">{qar(recon.expenses)}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              type="number"
              step="0.01"
              className="h-8 text-xs"
              aria-label={`${meta.name} limit`}
            />
            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={saveLimit} title="Save card limit">
              <Check className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setStatementOpen(true)}>
              View Statement <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={printStatement}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={statementOpen} onOpenChange={setStatementOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {meta.name} Statement · {from || "Beginning"} to {to || "Date"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-2">
            <Stat label="Opening balance" value={qar(recon.opening)} />
            <Stat label="Money In / Top Ups" value={qar(recon.topUps)} tone="text-emerald-600" />
            <Stat label="Actual expenses" value={qar(recon.expenses)} tone="text-amber-600" />
            <Stat label="Closing balance" value={qar(recon.closing)} />
          </div>
          <StatementTable wallet={wallet} opening={recon.opening} rows={periodRows} from={from} />
          <div className="flex justify-end">
            <Button size="sm" onClick={printStatement}>
              <Printer className="h-4 w-4" /> Print Statement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`tabular font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function StatementTable({
  wallet,
  opening,
  rows,
  from,
}: {
  wallet: WalletKey;
  opening: number;
  rows: import("@/lib/finance-types").Transaction[];
  from?: string;
}) {
  const printRows = toBalanceLedgerRows(rows, wallet, opening, from || undefined);
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr className="text-left">
            <th className="px-2 py-2">Date</th>
            <th className="px-2 py-2">Particulars</th>
            <th className="px-2 py-2 text-right">Money In</th>
            <th className="px-2 py-2 text-right">Money Out</th>
            <th className="px-2 py-2 text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {printRows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="px-2 py-1.5 whitespace-nowrap">{r.date || "—"}</td>
              <td className="px-2 py-1.5">{r.particulars}</td>
              <td className="px-2 py-1.5 text-right tabular text-emerald-600">{r.moneyIn ? qar(r.moneyIn) : ""}</td>
              <td className="px-2 py-1.5 text-right tabular text-rose-600">{r.moneyOut ? qar(r.moneyOut) : ""}</td>
              <td className="px-2 py-1.5 text-right tabular font-medium">{r.balance == null ? "" : qar(r.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
