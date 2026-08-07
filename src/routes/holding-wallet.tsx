import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, Plus, ArrowDownToLine } from "lucide-react";
import { HoldingReleaseDialog } from "@/components/HoldingReleaseDialog";
import { TransactionsTable } from "@/components/TransactionsTable";
import { DrillDownStat } from "@/components/DrillDownStat";
import { HousemaidLink } from "@/components/HousemaidLink";
import { useFinance, walletBalance } from "@/lib/finance-store";
import { housemaidHoldingLedger, walletLedger } from "@/lib/finance-derived";
import { COMPANY_LABEL, WALLET_BY_KEY } from "@/lib/finance-types";
import { qar, exportCsv, printAccountingReport, today } from "@/lib/format";

export const Route = createFileRoute("/holding-wallet")({
  head: () => ({
    meta: [
      { title: "Housemaid Holding Wallet · Alhakeem Expenses ERP" },
      {
        name: "description",
        content:
          "Sponsor money held on behalf of each housemaid — running balance, releases and carry-forward reconciliation.",
      },
      { property: "og:title", content: "Housemaid Holding Wallet · Alhakeem Expenses ERP" },
      {
        property: "og:description",
        content: "Track sponsor money held per housemaid, separate from company operating funds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HoldingWalletPage,
});

function HoldingWalletPage() {
  const s = useFinance();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const balance = walletBalance(s, "housemaid-holding");
  const perHousemaid = useMemo(() => housemaidHoldingLedger(s), [s]);
  const led = useMemo(
    () => walletLedger(s, "housemaid-holding", { start: from || undefined, end: to || undefined }),
    [s, from, to],
  );
  const rows = useMemo(() => s.transactions.filter(
    (t) => t.fromWallet === "housemaid-holding" || t.toWallet === "housemaid-holding",
  ), [s]);

  const holdingDrill = (pick: (e: (typeof perHousemaid)[number]) => number) =>
    perHousemaid
      .map((e) => ({
        housemaid: e.name,
        company: e.company ? COMPANY_LABEL[e.company] : "—",
        particulars: e.sponsor ? `Sponsor · ${e.sponsor}` : "—",
        amount: pick(e),
      }))
      .filter((r) => Math.abs(r.amount) > 0.001)
      .sort((a, b) => b.amount - a.amount);

  function csv() {
    exportCsv(
      `housemaid-holding-wallet-${today()}.csv`,
      led.rows.map((r) => ({
        date: r.date,
        company: r.company ? COMPANY_LABEL[r.company] : "",
        housemaid: r.txn.candidate ?? "",
        sponsor: r.txn.sponsor ?? "",
        particulars: r.particulars,
        received: r.debit,
        released: r.credit,
        running: r.running,
        destination: WALLET_BY_KEY[r.txn.toWallet]?.name ?? r.txn.toWallet,
      })),
    );
  }

  function print() {
    printAccountingReport({
      title: "Housemaid Holding Wallet Statement",
      subtitle: "Sponsor money held on behalf of housemaids (carry-forward wallet)",
      from,
      to,
      columns: "inout",
      rows: led.rows.map((r) => ({
        date: r.date,
        company: r.company ? COMPANY_LABEL[r.company] : "—",
        particulars: [r.txn.candidate, r.particulars].filter(Boolean).join(" · "),
        amount: r.credit > 0 ? r.credit : r.debit,
        moneyIn: r.debit,
        moneyOut: r.credit,
        wallet:
          r.credit > 0
            ? WALLET_BY_KEY[r.txn.toWallet]?.name ?? r.txn.toWallet
            : WALLET_BY_KEY[r.txn.fromWallet]?.name ?? r.txn.fromWallet,
      })),
      summary: [
        { label: "Opening Balance", value: qar(led.opening) },
        { label: "Money Received", value: qar(led.debit) },
        { label: "Money Released", value: qar(led.credit) },
        { label: "Closing Balance (Carry Forward)", value: qar(led.closing) },
      ],
    });
  }

  return (
    <AppLayout>
      <PageHeader
        title="Housemaid Holding Wallet"
        description="Sponsor money held for a specific housemaid until it is released. Kept completely separate from Office Petty Cash, Du Monde Petty Cash and the Salary Wallet."
        action={
          <div className="flex gap-2">
            <HoldingReleaseDialog
              mode="receipt"
              trigger={<Button size="sm" variant="outline"><ArrowDownToLine className="h-4 w-4" /> Receive money</Button>}
            />
            <HoldingReleaseDialog
              mode="release"
              trigger={<Button size="sm"><Plus className="h-4 w-4" /> Release holding</Button>}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Opening balance" value={qar(balance.opening)} />
        <DrillDownStat
          label="Money received"
          value={balance.inflow}
          tone="success"
          caption="Sponsor money in"
          title="Money received per housemaid"
          columns={["housemaid", "company", "particulars", "amount"]}
          rows={holdingDrill((e) => e.received)}
        />
        <DrillDownStat
          label="Money released"
          value={balance.outflow}
          tone="warning"
          caption="Released to expenses"
          title="Money released per housemaid"
          columns={["housemaid", "company", "particulars", "amount"]}
          rows={holdingDrill((e) => e.released)}
        />
        <DrillDownStat
          label="Closing balance (C/F)"
          value={balance.balance}
          tone="info"
          caption="Carried forward"
          title="Housemaids making up the held balance"
          description="Sponsor money still held for each housemaid."
          columns={["housemaid", "company", "particulars", "amount"]}
          rows={holdingDrill((e) => e.balance)}
        />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex flex-wrap items-center gap-2">
            <span>Wallet statement</span>
            <span className="ml-auto flex flex-wrap items-center gap-2 text-xs font-normal">
              <span className="text-muted-foreground">From</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[150px]" />
              <span className="text-muted-foreground">To</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[150px]" />
              <Button size="sm" variant="outline" onClick={csv}><Download className="h-4 w-4" /> CSV</Button>
              <Button size="sm" variant="outline" onClick={print}><Printer className="h-4 w-4" /> Print Report</Button>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/30 p-3 mb-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <Line label="Opening Balance" value={qar(led.opening)} />
            <Line label="+ Money Received" value={qar(led.debit)} />
            <Line label="− Money Released" value={qar(led.credit)} />
            <Line label="= Closing (Carry Forward)" value={qar(led.closing)} bold />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Housemaid</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Released</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {led.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No holding wallet movements yet.
                  </TableCell>
                </TableRow>
              ) : (
                led.rows.map((r) => (
                  <TableRow key={r.txn.id}>
                    <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                    <TableCell>
                      <HousemaidLink name={r.txn.candidate} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.txn.sponsor ?? "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm">{r.txn.purposeCategory ?? "—"}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[220px]">{r.particulars}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.credit > 0
                        ? WALLET_BY_KEY[r.txn.toWallet]?.name
                        : WALLET_BY_KEY[r.txn.fromWallet]?.name}
                    </TableCell>
                    <TableCell className="text-right tabular text-emerald-600">{r.debit ? qar(r.debit) : "—"}</TableCell>
                    <TableCell className="text-right tabular text-rose-600">{r.credit ? qar(r.credit) : "—"}</TableCell>
                    <TableCell className="text-right tabular font-medium">{qar(r.running)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <h2 className="text-sm font-semibold mb-3">Held per housemaid</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {perHousemaid.length === 0 ? (
          <p className="text-sm text-muted-foreground">No housemaid holdings yet.</p>
        ) : (
          perHousemaid.map((e) => (
            <Card key={e.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="truncate"><HousemaidLink name={e.name} /></span>
                  <Badge variant="outline" className={e.balance > 0.001 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""}>
                    {e.balance > 0.001 ? "Holding" : "Cleared"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {e.sponsor ? <div className="text-xs text-muted-foreground">Sponsor · {e.sponsor}</div> : null}
                <Line label="Received" value={qar(e.received)} />
                <Line label="Released" value={qar(e.released)} />
                <div className="border-t my-1" />
                <Line label="Balance" value={qar(e.balance)} bold />
                <div className="pt-2">
                  <HoldingReleaseDialog
                    presetName={e.name}
                    trigger={<Button size="sm" variant="outline">Release</Button>}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <h2 className="text-sm font-semibold mb-3">Search, filter & audit history</h2>
      <TransactionsTable rows={rows} ledgerWallet="housemaid-holding" printTitle="Housemaid Holding Wallet Report" exportName="housemaid-holding-transactions.csv" empty="No holding wallet transactions yet." />
    </AppLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-1 text-xl tabular ${tone ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
