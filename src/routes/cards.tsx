import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Printer, Check } from "lucide-react";
import { useFinance, walletBalance, walletTarget, setWalletTarget } from "@/lib/finance-store";
import { CARD_WALLETS, WALLET_BY_KEY } from "@/lib/finance-types";
import type { WalletKey } from "@/lib/finance-types";
import { qar, printAccountingReport, today } from "@/lib/format";
import { cardReconciliation } from "@/lib/wallet-rules";
import { toLedgerPrintRows } from "@/lib/report-filters";
import { toast } from "sonner";

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Company Cards · Alhakeem Expenses ERP" },
      { name: "description", content: "Maryam, Yousef, Maha Petrol and Limit card ledger with month-end reconciliation." },
      { property: "og:title", content: "Company Cards · Alhakeem Expenses ERP" },
      { property: "og:description", content: "Card balances, configurable target balances and month-end variance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CardsPage,
});

const monthStart = () => `${today().slice(0, 7)}-01`;

function CardsPage() {
  const s = useFinance();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const cardRows = useMemo(
    () => s.transactions.filter((t) => CARD_WALLETS.includes(t.fromWallet) || CARD_WALLETS.includes(t.toWallet)),
    [s.transactions],
  );

  return (
    <AppLayout>
      <PageHeader
        title="Company Cards"
        description="Money In is a Top Up Balance, Money Out is card spending. Each card carries a configurable target balance."
        action={
          <TransactionDialog
            trigger={<Button size="sm"><Plus className="h-4 w-4" /> New card expense</Button>}
            defaults={{ type: "Card Expense", fromWallet: "maryam-card", toWallet: "external", paymentMethod: "Card" }}
          />
        }
      />

      <div className="mb-5 rounded-lg border bg-card p-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Statement from</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Statement to</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[160px]" />
        </div>
        <p className="text-xs text-muted-foreground max-w-md">
          The reconciliation figures below follow this period. Opening balance is everything before the start date.
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
  const target = walletTarget(s, wallet);
  const [draft, setDraft] = useState(String(target));

  const rows = useMemo(
    () => s.transactions.filter((t) => t.fromWallet === wallet || t.toWallet === wallet),
    [s.transactions, wallet],
  );

  const opening = s.openingBalances[wallet] ?? 0;
  const live = walletBalance(s, wallet);
  const recon = cardReconciliation(rows, wallet, target, opening, { start: from || undefined, end: to || undefined });
  const above = live.balance - target;

  function saveTarget() {
    setWalletTarget(wallet, Number(draft) || 0);
    toast.success(`${meta.name} target balance saved`);
  }

  function printStatement() {
    const scoped = rows.filter((t) => (!from || t.date >= from) && (!to || t.date <= to));
    printAccountingReport({
      title: `${meta.name} Statement`,
      subtitle: `Card ••${meta.last4 ?? "—"} · ${meta.purpose ?? "Company card"}`,
      from,
      to,
      company: undefined,
      columns: "inout",
      rows: toLedgerPrintRows(scoped, wallet),
      summary: [
        { label: "Opening Balance", value: qar(recon.opening) },
        { label: "Total Top Ups (Money In)", value: qar(recon.topUps) },
        { label: "Total Card Expenses (Money Out)", value: qar(recon.expenses) },
        { label: "Closing Balance", value: qar(recon.closing) },
        { label: "Target Balance", value: qar(recon.target) },
        {
          label: "Variance from Target",
          value: `${recon.variance >= 0 ? "+" : "−"}${qar(Math.abs(recon.variance))}`,
        },
      ],
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{meta.name}</span>
          <span className="font-mono text-xs text-muted-foreground">****{meta.last4}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">{meta.purpose}</div>

        <div className="space-y-1 text-xs">
          <Row label="Current balance" value={qar(live.balance)} strong />
          <Row label="Target balance" value={qar(target)} />
          {above < -0.005 ? (
            <Row label="Amount required to top up" value={qar(-above)} tone="warning" strong />
          ) : above > 0.005 ? (
            <Row label="Above target" value={qar(above)} tone="success" strong />
          ) : (
            <Row label="On target" value="—" tone="success" />
          )}
        </div>

        <div className="rounded-md border bg-muted/30 p-2 space-y-1 text-xs">
          <div className="font-medium text-[11px] uppercase tracking-wide text-muted-foreground">
            Selected period
          </div>
          <Row label="Opening balance" value={qar(recon.opening)} />
          <Row label="Total top ups" value={qar(recon.topUps)} tone="success" />
          <Row label="Card expenses" value={qar(recon.expenses)} tone="warning" />
          <Row label="Closing balance" value={qar(recon.closing)} strong />
          <Row
            label="Variance from target"
            value={`${recon.variance >= 0 ? "+" : "−"}${qar(Math.abs(recon.variance))}`}
            tone={Math.abs(recon.variance) < 0.005 ? "success" : recon.variance > 0 ? "success" : "warning"}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            type="number"
            step="0.01"
            className="h-8 text-xs"
            aria-label={`${meta.name} target balance`}
          />
          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={saveTarget} title="Save target balance">
            <Check className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" variant="outline" className="w-full" onClick={printStatement}>
          <Printer className="h-4 w-4" /> Print statement
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
  strong?: boolean;
}) {
  const color = tone === "success" ? "text-emerald-600" : tone === "warning" ? "text-amber-600" : "";
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular ${strong ? "font-semibold" : ""} ${color}`}>{value}</span>
    </div>
  );
}
