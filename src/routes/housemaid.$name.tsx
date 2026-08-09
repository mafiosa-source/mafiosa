import { useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Printer, Download, HandCoins, PiggyBank, Receipt, Scale } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { DrillDownStat } from "@/components/DrillDownStat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useFinance, housemaidProfile, housemaidDirection, housemaidModule,
} from "@/lib/finance-store";
import { COMPANY_LABEL, WALLET_BY_KEY } from "@/lib/finance-types";
import type { Transaction } from "@/lib/finance-types";
import { qar, exportExcel, printAccountingReport } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/housemaid/$name")({
  head: () => ({
    meta: [
      { title: "Housemaid Financial Profile · Alhakeem Expenses ERP" },
      {
        name: "description",
        content: "Complete 360° financial history for one housemaid: salary, candidate money, visa, POLO and every expense.",
      },
      { property: "og:title", content: "Housemaid Financial Profile · Alhakeem Expenses ERP" },
      { property: "og:description", content: "One chronological statement of every riyal received and spent for a housemaid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HousemaidProfilePage,
});

const ALL = "__all__";

function HousemaidProfilePage() {
  const { name } = useParams({ from: "/housemaid/$name" });
  const s = useFinance();
  const p = housemaidProfile(s, name);

  const [module, setModule] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const modules = useMemo(
    () => Array.from(new Set(p.timeline.map(housemaidModule))).sort(),
    [p.timeline],
  );

  const filtered = useMemo(
    () =>
      p.timeline.filter((t) => {
        if (module !== ALL && housemaidModule(t) !== module) return false;
        if (from && t.date < from) return false;
        if (to && t.date > to) return false;
        return true;
      }),
    [p.timeline, module, from, to],
  );

  // Running balance over the filtered statement.
  const rows = useMemo(() => {
    let running = 0;
    return filtered.map((t) => {
      const dir = housemaidDirection(t);
      const inAmt = dir === "in" ? t.amount : 0;
      const outAmt = dir === "out" ? t.amount : 0;
      running += inAmt - outAmt;
      return { t, inAmt, outAmt, running };
    });
  }, [filtered]);

  const totalIn = rows.reduce((a, r) => a + r.inAmt, 0);
  const totalOut = rows.reduce((a, r) => a + r.outAmt, 0);

  const drill = (list: Transaction[]) =>
    list.map((t) => ({
      date: t.date,
      company: t.company ? COMPANY_LABEL[t.company] : "—",
      particulars: t.purpose || t.description || t.type,
      wallet: `${WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet} → ${WALLET_BY_KEY[t.toWallet]?.name ?? t.toWallet}`,
      amount: t.amount,
    }));

  const handlePrint = () => {
    printAccountingReport({
      title: `Housemaid Statement — ${p.name}`,
      subtitle: [
        p.company ? `Company: ${COMPANY_LABEL[p.company]}` : null,
        p.sponsor ? `Sponsor: ${p.sponsor}` : null,
        p.passport ? `Passport: ${p.passport}` : null,
      ].filter(Boolean).join("  ·  "),
      from: from || undefined,
      to: to || undefined,
      columns: "inout",
      rows: rows.map((r) => ({
        date: r.t.date,
        company: r.t.company ? COMPANY_LABEL[r.t.company] : "",
        particulars: `${housemaidModule(r.t)} — ${r.t.purpose || r.t.description || r.t.type}`,
        amount: r.t.amount,
        moneyIn: r.inAmt,
        moneyOut: r.outAmt,
        wallet: `${WALLET_BY_KEY[r.t.fromWallet]?.name ?? r.t.fromWallet} → ${WALLET_BY_KEY[r.t.toWallet]?.name ?? r.t.toWallet}`,
      })),
      summary: [
        { label: "Total received", value: qar(totalIn) },
        { label: "Total paid / released", value: qar(totalOut) },
        { label: "Net movement", value: qar(totalIn - totalOut) },
        { label: "Salary currently held", value: qar(p.salaryHeld) },
        { label: "Candidate money held", value: qar(p.candidateHeld) },
      ],
    });
  };

  const handleExport = () =>
    exportExcel(
      `housemaid-${p.key.replace(/\s+/g, "-")}.csv`,
      rows.map((r) => ({
        Date: r.t.date,
        Module: housemaidModule(r.t),
        Type: r.t.type,
        Company: r.t.company ? COMPANY_LABEL[r.t.company] : "",
        Particulars: r.t.purpose || r.t.description || "",
        "Money In": r.inAmt || "",
        "Money Out": r.outAmt || "",
        Balance: r.running,
        Wallet: `${WALLET_BY_KEY[r.t.fromWallet]?.name ?? r.t.fromWallet} → ${WALLET_BY_KEY[r.t.toWallet]?.name ?? r.t.toWallet}`,
        Status: r.t.status,
      })),
      `Housemaid Statement — ${p.name}`,
    );

  return (
    <AppLayout>
      <PageHeader
        title={p.name}
        description="Housemaid financial profile — every module, one chronological statement."
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/salaries"><ArrowLeft className="h-4 w-4" /> Housemaids</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print Housemaid Statement
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {p.company ? <Badge variant="secondary">{COMPANY_LABEL[p.company]}</Badge> : null}
        <span>
          Most Recent Sponsor:{" "}
          <span className={p.sponsor ? "text-foreground font-medium" : "italic"}>
            {p.sponsor ?? "No Sponsor Linked"}
          </span>
        </span>
        {p.passport ? <span>Passport: <span className="font-mono text-foreground">{p.passport}</span></span> : null}
        <span>{p.timeline.length} linked transaction(s)</span>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DrillDownStat
          label="Total Received"
          value={p.received}
          icon={HandCoins}
          tone="success"
          caption="Salary + sponsor money in"
          title={`Money received — ${p.name}`}
          columns={["date", "company", "particulars", "wallet", "amount"]}
          rows={drill(p.incoming)}
        />
        <DrillDownStat
          label="Total Paid / Released"
          value={p.paid}
          icon={Receipt}
          tone="warning"
          caption="Releases and expenses"
          title={`Money paid — ${p.name}`}
          columns={["date", "company", "particulars", "wallet", "amount"]}
          rows={drill(p.outgoing)}
        />
        <DrillDownStat
          label="Salary Held"
          value={p.salaryHeld}
          icon={PiggyBank}
          tone="warning"
          caption="Received − released"
          title={`Salary movements — ${p.name}`}
          columns={["date", "company", "particulars", "wallet", "amount"]}
          rows={drill(p.timeline.filter((t) => t.type === "Salary Holding" || t.type === "Salary Release"))}
        />
        <DrillDownStat
          label="Net Position"
          value={p.outstanding}
          icon={Scale}
          tone={p.outstanding < 0 ? "danger" : "info"}
          caption="Received − paid"
          title={`Full statement — ${p.name}`}
          columns={["date", "company", "particulars", "wallet", "amount"]}
          rows={drill(p.timeline)}
        />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
        <Select value={module} onValueChange={setModule}>
          <SelectTrigger><SelectValue placeholder="All modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All modules</SelectItem>
            {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="text-muted-foreground">In <span className="tabular text-foreground">{qar(totalIn)}</span></span>
          <span className="text-muted-foreground">Out <span className="tabular text-foreground">{qar(totalOut)}</span></span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Particulars</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead className="text-right">Money In</TableHead>
              <TableHead className="text-right">Money Out</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No transactions linked to this housemaid for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ t, inAmt, outAmt, running }) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{housemaidModule(t)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <Link to="/transactions/$id" params={{ id: t.id }} className="text-primary hover:underline">
                      {t.purpose || t.description || t.type}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet} → {WALLET_BY_KEY[t.toWallet]?.name ?? t.toWallet}
                  </TableCell>
                  <TableCell className="text-right tabular text-[color:var(--success)]">
                    {inAmt ? qar(inAmt) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular text-[color:var(--destructive)]">
                    {outAmt ? qar(outAmt) : "—"}
                  </TableCell>
                  <TableCell className={cn("text-right tabular font-medium", running < 0 && "text-[color:var(--destructive)]")}>
                    {qar(running)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
