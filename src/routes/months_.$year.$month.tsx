import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { MonthCloseDialog } from "@/components/MonthCloseDialog";
import { useFinance, closingFor } from "@/lib/finance-store";
import { monthReconciliation, monthSummary, companyMonthlySummary, monthLabel } from "@/lib/finance-derived";
import { qar, exportExcel, printReport } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/months_/$year/$month")({
  head: ({ params }) => ({
    meta: [
      { title: `Month ${params.month}/${params.year} · Alhakeem Expenses ERP` },
      { name: "description", content: "Monthly reconciliation, reports, transactions and closing status." },
      { property: "og:title", content: `Month ${params.month}/${params.year} · Alhakeem Expenses ERP` },
      { property: "og:description", content: "Reconciliation summary and full transaction list for the month." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MonthDetail,
});

function MonthDetail() {
  const { year: yearParam, month: monthParam } = Route.useParams();
  const year = Number(yearParam);
  const month = Number(monthParam);
  const s = useFinance();

  const summary = useMemo(() => monthSummary(s, year, month), [s, year, month]);
  const recon = useMemo(() => monthReconciliation(s, year, month), [s, year, month]);
  const companies = useMemo(() => companyMonthlySummary(s, year, month), [s, year, month]);
  const closing = closingFor(s, year, month);
  const label = monthLabel(year, month);

  return (
    <AppLayout>
      <PageHeader
        title={label}
        description={
          closing?.status === "Closed"
            ? `Closed on ${closing.closedAt.slice(0, 10)}${closing.closedWithExceptions ? " with exceptions" : ""}`
            : recon.ready
              ? "All reconciliation targets met — ready to close."
              : `${recon.exceptions.length} item(s) still need attention.`
        }
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/months"><ArrowLeft className="h-4 w-4" /> All months</Link>
            </Button>
            <MonthCloseDialog year={year} month={month} />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Monthly Income" value={summary.income} tone="info" />
        <StatCard label="Total Monthly Expenses" value={summary.expenses} tone="danger" />
        <StatCard label="Internal Transfers" value={summary.transfers} />
        <StatCard label="Transactions" value={summary.count} format="raw" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Reconciliation</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1.5">
            {recon.lines.map((l) => (
              <div key={l.wallet} className="flex justify-between">
                <span className="text-muted-foreground">{l.name}</span>
                <span className="flex items-center gap-2">
                  <span className={cn("tabular", !l.ok && "text-amber-700")}>{qar(l.balance)}</span>
                  {l.topUp ? <Badge variant="outline">top-up {qar(l.topUp)}</Badge> : null}
                </span>
              </div>
            ))}
            <div className="border-t my-1" />
            <div className="flex justify-between"><span className="text-muted-foreground">Housemaid Salary Wallet</span><span className="tabular">{qar(recon.salaryWallet)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Outstanding payables</span><span className="tabular">{qar(recon.outstandingPayables)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pending CBQ transfers</span><span className="tabular">{qar(recon.cbqPending)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Company summary</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => printReport("month-company-summary", `${label} · Company Summary`)}>
                <Printer className="h-4 w-4" /> Print
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  exportExcel(`company-summary-${year}-${month}`, companies.rows.map((r) => ({ Company: r.company, "Total Expenses": r.total })), `Monthly Company Summary · ${label}`)
                }
              >
                <Download className="h-4 w-4" /> Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div id="month-company-summary">
              <h3>Monthly Company Summary</h3>
              <div className="text-xs text-muted-foreground mb-2">{label}</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-1.5">Company</th>
                    <th className="py-1.5 text-right">Total Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.rows.map((r) => (
                    <tr key={r.company} className="border-b last:border-0">
                      <td className="py-1.5">{r.company}</td>
                      <td className="py-1.5 text-right tabular">{qar(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="py-1.5">Grand Total</td>
                    <td className="py-1.5 text-right tabular">{qar(companies.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {recon.exceptions.length > 0 && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Needs attention before closing</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {recon.exceptions.map((e) => (
                <li key={e} className="flex gap-2"><span className="text-amber-600">•</span><span>{e}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Transactions</h2>
      <TransactionsTable rows={summary.transactions} exportName={`transactions-${year}-${month}.csv`} empty="No transactions in this month." />
    </AppLayout>
  );
}
