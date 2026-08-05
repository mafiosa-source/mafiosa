import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer } from "lucide-react";
import { useFinance, walletBalance, cardUsage, sortByDateDesc } from "@/lib/finance-store";
import { walletLedger } from "@/lib/finance-derived";
import {
  WALLETS, CARD_WALLETS, COMPANY_ACCOUNT_WALLETS, PETTY_WALLETS, COMPANIES, COMPANY_LABEL, WALLET_BY_KEY,
} from "@/lib/finance-types";
import type { Company, Transaction } from "@/lib/finance-types";
import { qar, exportCsv, printAccountingReport, today } from "@/lib/format";
import type { PrintReportRow } from "@/lib/format";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports · AHG Finance Core" },
      { name: "description", content: "Reports generated live from the master ledger." },
      { property: "og:title", content: "Reports · AHG Finance Core" },
      { property: "og:description", content: "Printable accounting reports generated live from Master Transactions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsPage,
});

const ALL = "__all__";
const NO_COMPANY = "__none__";

/** Converts master transactions to printable cash-book rows (Money In / Money Out). */
function toPrintRows(rows: Transaction[]): PrintReportRow[] {
  return toDirectionalPrintRows(rows);
}

/** Cash-book rows for a single wallet statement. */
function toWalletRows(rows: Transaction[], wallet: WalletKey): PrintReportRow[] {
  return toLedgerPrintRows(rows, wallet);
}

function ReportsPage() {
  const s = useFinance();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [company, setCompany] = useState(ALL);

  const companyLabel =
    company === ALL ? undefined : company === NO_COMPANY ? "No company assigned" : COMPANY_LABEL[company as Company];

  const scoped = useMemo(() => {
    return s.transactions.filter((t) => {
      if (from && t.date < from) return false;
      if (to && t.date > to) return false;
      if (company === NO_COMPANY) return !t.company;
      if (company !== ALL && t.company !== company) return false;
      return true;
    });
  }, [s.transactions, from, to, company]);

  const meta = { from, to, company: companyLabel };

  const walletRows = () =>
    WALLETS.filter((w) => w.key !== "external").map((w) => {
      const led = walletLedger(s, w.key, { start: from || undefined, end: to || undefined });
      return { wallet: w.name, kind: w.kind, opening: led.opening, in: led.debit, out: led.credit, closing: led.closing };
    });

  const reports: {
    title: string;
    desc: string;
    csv: () => void;
    print: () => void;
  }[] = [
    {
      title: "Daily Cash Position",
      desc: "Snapshot of every wallet: opening, in, out and closing.",
      csv: () => exportCsv(`daily-cash-position-${today()}.csv`, walletRows()),
      print: () =>
        printAccountingReport({
          title: "Daily Cash Position",
          subtitle: "Closing balance of every wallet",
          ...meta,
          company: undefined,
          rows: walletRows().map((r) => ({
            date: to || today(),
            company: "—",
            particulars: `${r.wallet} — opening ${qar(r.opening)}, in ${qar(r.in)}, out ${qar(r.out)}`,
            amount: r.closing,
            wallet: r.wallet,
          })),
        }),
    },
    {
      title: "Candidate Holdings",
      desc: "All Sponsor Expense transactions.",
      csv: () =>
        exportCsv(
          `candidate-holdings-${today()}.csv`,
          sortByDateDesc(scoped.filter((t) => t.classification === "Sponsor Expense")) as unknown as Record<string, unknown>[],
        ),
      print: () =>
        printAccountingReport({
          title: "Candidate Holdings Report",
          subtitle: "Sponsor money received and utilised",
          ...meta,
          columns: "inout",
          rows: toPrintRows(scoped.filter((t) => t.classification === "Sponsor Expense")),
        }),
    },
    {
      title: "Housemaid Holding Wallet",
      desc: "Sponsor money held per housemaid — carry-forward wallet.",
      csv: () =>
        exportCsv(
          `housemaid-holding-${today()}.csv`,
          sortByDateDesc(
            scoped.filter((t) => t.fromWallet === "housemaid-holding" || t.toWallet === "housemaid-holding"),
          ) as unknown as Record<string, unknown>[],
        ),
      print: () => {
        const led = walletLedger(s, "housemaid-holding", { start: from || undefined, end: to || undefined });
        printAccountingReport({
          title: "Housemaid Holding Wallet Statement",
          subtitle: "Opening + Received − Released = Closing (Carry Forward)",
          ...meta,
          columns: "inout",
          rows: toWalletRows(led.rows.map((r) => r.txn), "housemaid-holding"),
          summary: [
            { label: "Opening Balance", value: qar(led.opening) },
            { label: "Money Received", value: qar(led.debit) },
            { label: "Money Released", value: qar(led.credit) },
            { label: "Closing Balance (Carry Forward)", value: qar(led.closing) },
          ],
        });
      },
    },
    {
      title: "Housemaid Salary Wallet",
      desc: "Salary money received and released — carry-forward wallet.",
      csv: () =>
        exportCsv(
          `salary-wallet-${today()}.csv`,
          sortByDateDesc(
            scoped.filter((t) => t.type === "Salary Holding" || t.type === "Salary Release"),
          ) as unknown as Record<string, unknown>[],
        ),
      print: () => {
        const led = walletLedger(s, "salary-wallet", { start: from || undefined, end: to || undefined });
        printAccountingReport({
          title: "Housemaid Salary Wallet Statement",
          subtitle: "Opening + Received − Released = Closing (Carry Forward)",
          ...meta,
          columns: "inout",
          rows: toWalletRows(scoped.filter((t) => t.type === "Salary Holding" || t.type === "Salary Release"), "salary-wallet"),
          summary: [
            { label: "Opening Balance", value: qar(led.opening) },
            { label: "Money Received", value: qar(led.debit) },
            { label: "Money Released", value: qar(led.credit) },
            { label: "Closing Balance (Carry Forward)", value: qar(led.closing) },
          ],
        });
      },
    },
    {
      title: "Company Expenses",
      desc: "All Company Expense transactions.",
      csv: () =>
        exportCsv(
          `company-expenses-${today()}.csv`,
          sortByDateDesc(scoped.filter((t) => t.classification === "Company Expense")) as unknown as Record<string, unknown>[],
        ),
      print: () =>
        printAccountingReport({
          title: "Company Expenses Report",
          ...meta,
          columns: "inout",
          rows: toPrintRows(scoped.filter((t) => t.classification === "Company Expense")),
        }),
    },
    {
      title: "CBQ Transfers",
      desc: "Movements involving CBQ or company accounts.",
      csv: () =>
        exportCsv(
          `cbq-transfers-${today()}.csv`,
          sortByDateDesc(
            scoped.filter(
              (t) =>
                t.fromWallet === "cbq" || t.toWallet === "cbq" ||
                COMPANY_ACCOUNT_WALLETS.includes(t.fromWallet) || COMPANY_ACCOUNT_WALLETS.includes(t.toWallet),
            ),
          ) as unknown as Record<string, unknown>[],
        ),
      print: () =>
        printAccountingReport({
          title: "CBQ & Company Account Transfers",
          ...meta,
          columns: "inout",
          rows: toPrintRows(
            scoped.filter(
              (t) =>
                t.fromWallet === "cbq" || t.toWallet === "cbq" ||
                COMPANY_ACCOUNT_WALLETS.includes(t.fromWallet) || COMPANY_ACCOUNT_WALLETS.includes(t.toWallet),
            ),
          ),
        }),
    },
    {
      title: "Petty Cash",
      desc: "Office + Du Monde petty cash ledger.",
      csv: () =>
        exportCsv(
          `petty-cash-${today()}.csv`,
          sortByDateDesc(
            scoped.filter((t) => PETTY_WALLETS.includes(t.fromWallet) || PETTY_WALLETS.includes(t.toWallet)),
          ) as unknown as Record<string, unknown>[],
        ),
      print: () =>
        printAccountingReport({
          title: "Petty Cash Report",
          subtitle: "Office Petty Cash and Du Monde Petty Cash",
          ...meta,
          columns: "inout",
          rows: toPrintRows(
            scoped.filter((t) => PETTY_WALLETS.includes(t.fromWallet) || PETTY_WALLETS.includes(t.toWallet)),
          ),
        }),
    },
    {
      title: "Company Cards",
      desc: "Card usage, remaining and amount to restore.",
      csv: () =>
        exportCsv(
          `cards-report-${today()}.csv`,
          CARD_WALLETS.map((k) => {
            const u = cardUsage(s, k);
            const m = WALLETS.find((w) => w.key === k)!;
            return { card: m.name, last4: m.last4, limit: u.limit, used: u.used, remaining: u.remaining, toRestore: u.used };
          }),
        ),
      print: () =>
        printAccountingReport({
          title: "Company Cards Report",
          subtitle: "Usage against limit and amount to restore",
          ...meta,
          company: undefined,
          rows: CARD_WALLETS.map((k) => {
            const u = cardUsage(s, k);
            const m = WALLETS.find((w) => w.key === k)!;
            return {
              date: to || today(),
              company: "—",
              particulars: `${m.name} (••${m.last4}) — limit ${qar(u.limit)}, remaining ${qar(u.remaining)}`,
              amount: u.used,
              wallet: m.name,
            };
          }),
        }),
    },
    {
      title: "Monthly Closing",
      desc: "Full wallet closing snapshot for the selected range.",
      csv: () => exportCsv(`monthly-closing-${today()}.csv`, walletRows()),
      print: () =>
        printAccountingReport({
          title: "Monthly Closing Report",
          subtitle: "Opening + In − Out = Closing, per wallet",
          ...meta,
          company: undefined,
          rows: walletRows().map((r) => ({
            date: to || today(),
            company: "—",
            particulars: `${r.wallet} — opening ${qar(r.opening)}, in ${qar(r.in)}, out ${qar(r.out)}`,
            amount: r.closing,
            wallet: r.wallet,
          })),
        }),
    },
    {
      title: "Full Transaction Report",
      desc: "Every transaction matching the filters above.",
      csv: () => exportCsv(`transactions-${today()}.csv`, sortByDateDesc(scoped) as unknown as Record<string, unknown>[]),
      print: () =>
        printAccountingReport({ title: "Transaction Report", ...meta, rows: toPrintRows(scoped) }),
    },
  ];

  return (
    <AppLayout>
      <PageHeader title="Reports" description="All reports are generated live from Master Transactions." />

      <div className="mb-5 rounded-lg border bg-card p-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 w-[160px]" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Company</Label>
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All companies</SelectItem>
              <SelectItem value={NO_COMPANY}>-- None --</SelectItem>
              {COMPANIES.map((c) => <SelectItem key={c} value={c}>{COMPANY_LABEL[c]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {scoped.length} transactions in scope ·{" "}
          <span className="tabular font-medium text-foreground">
            {qar(scoped.reduce((a, t) => a + t.amount, 0))}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.title}>
            <CardHeader><CardTitle className="text-base">{r.title}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{r.desc}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={r.csv}><Download className="h-4 w-4" /> CSV</Button>
                <Button size="sm" onClick={r.print}><Printer className="h-4 w-4" /> Print Report</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-lg border bg-card p-4 text-xs text-muted-foreground">
        Master ledger contains {s.transactions.length} transactions across {WALLETS.length - 1} wallets.
        Balance across all internal wallets:{" "}
        <span className="tabular font-medium text-foreground">
          {qar(WALLETS.filter((w) => w.key !== "external").reduce((a, w) => a + walletBalance(s, w.key).balance, 0))}
        </span>
      </div>
    </AppLayout>
  );
}
