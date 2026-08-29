import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { HousemaidLink } from "@/components/HousemaidLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { useFinance, walletBalance, pendingCompanyTransfer } from "@/lib/finance-store";
import type { Company } from "@/lib/finance-types";
import {
  COMPANY_ACCOUNT_BY_COMPANY,
  COMPANY_ACCOUNT_WALLETS,
  COMPANY_LABEL,
  WALLET_BY_KEY,
} from "@/lib/finance-types";
import { qar } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transfers")({
  validateSearch: (search: Record<string, unknown>): { company?: string } => ({
    company: typeof search.company === "string" ? search.company : undefined,
  }),
  head: () => ({
    meta: [
      { title: "CBQ Transfers · Alhakeem Group ERP" },
      { name: "description", content: "Transfers between company accounts and CBQ." },
    ],
  }),
  component: TransfersPage,
});

function TransfersPage() {
  const s = useFinance();
  const { company: companyFilter } = Route.useSearch();
  const [statementWallet, setStatementWallet] = useState<WalletKey | null>(null);
  const rows = s.transactions.filter(
    (t) =>
      t.type === "Transfer" &&
      (t.fromWallet === "cbq" ||
        t.toWallet === "cbq" ||
        COMPANY_ACCOUNT_WALLETS.includes(t.fromWallet) ||
        COMPANY_ACCOUNT_WALLETS.includes(t.toWallet)),
  );
  const companies: Exclude<Company, "AHG">[] = ["FAST", "BROKER", "SKILL", "DANET"];
  const cbq = walletBalance(s, "cbq");

  // All transactions that make up the selected wallet balance (same rule as
  // walletBalance): any active transaction moving money into or out of the
  // wallet, chronological.
  const statement = useMemo(() => {
    if (!statementWallet) return null;
    const { opening, balance } = walletBalance(s, statementWallet);
    const list = s.transactions
      .filter(
        (t) =>
          t.status !== "Cancelled" && t.status !== "Refunded" &&
          ((t.toWallet === statementWallet && t.fromWallet !== statementWallet) ||
            (t.fromWallet === statementWallet && t.toWallet !== statementWallet)),
      )
      .slice()
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
      );
    let running = opening;
    const statementRows = list.map((t) => {
      const moneyIn = t.toWallet === statementWallet ? t.amount : 0;
      const moneyOut = t.fromWallet === statementWallet ? t.amount : 0;
      running += moneyIn - moneyOut;
      return { t, moneyIn, moneyOut, running };
    });
    return {
      opening,
      balance,
      rows: statementRows,
      totalIn: statementRows.reduce((a, r) => a + r.moneyIn, 0),
      totalOut: statementRows.reduce((a, r) => a + r.moneyOut, 0),
    };
  }, [s, statementWallet]);

  return (
    <AppLayout>
      <PageHeader
        title="CBQ Transfers"
        description="Money flowing between company accounts and CBQ."
        action={
          <TransactionDialog
            trigger={<Button size="sm"><Plus className="h-4 w-4" /> New transfer</Button>}
            defaults={{ type: "Transfer", fromWallet: "fast-acct", toWallet: "cbq", paymentMethod: "Company Account" }}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <button
          type="button"
          onClick={() => setStatementOpen(true)}
          className="text-left rounded-lg transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          title="View CBQ statement"
        >
          <StatCard label="CBQ balance" value={cbq.balance} tone="info" />
        </button>
        <StatCard label="Transfers logged" value={rows.length} format="raw" />
        <StatCard label="Received (CBQ in)" value={rows.filter((r) => r.toWallet === "cbq").reduce((a, r) => a + r.amount, 0)} tone="success" />
        <StatCard label="Sent from CBQ" value={rows.filter((r) => r.fromWallet === "cbq").reduce((a, r) => a + r.amount, 0)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {companies.map((c) => {
          const bal = walletBalance(s, COMPANY_ACCOUNT_BY_COMPANY[c] ?? "fast-acct").balance;
          const pending = pendingCompanyTransfer(s, c);
          return (
            <div key={c} className="rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">{c} account</div>
              <div className="text-lg font-semibold tabular">{bal.toFixed(2)}</div>
              <div className="text-xs text-rose-600 mt-1">Pending → CBQ: {pending.toFixed(2)}</div>
            </div>
          );
        })}
      </div>

      <TransactionsTable rows={rows} exportName="cbq-transfers.csv" initialCompany={companyFilter} />

      <Dialog open={statementOpen} onOpenChange={setStatementOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CBQ Statement</DialogTitle>
          </DialogHeader>

          <div className="mb-4 flex flex-wrap gap-4 rounded-lg border bg-card p-4 text-sm">
            <span className="text-muted-foreground">
              Opening balance <span className="tabular font-medium text-foreground">{qar(cbq.opening)}</span>
            </span>
            <span className="text-muted-foreground">
              Total in <span className="tabular font-medium text-[color:var(--success)]">{qar(totalIn)}</span>
            </span>
            <span className="text-muted-foreground">
              Total out <span className="tabular font-medium text-[color:var(--destructive)]">{qar(totalOut)}</span>
            </span>
            <span className="ml-auto text-muted-foreground">
              Current balance <span className="tabular font-semibold text-foreground">{qar(cbq.balance)}</span>
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Housemaid / Candidate</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="text-right">Money In</TableHead>
                  <TableHead className="text-right">Money Out</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="text-muted-foreground">—</TableCell>
                  <TableCell className="italic text-muted-foreground">Opening balance</TableCell>
                  <TableCell className="text-right tabular text-muted-foreground">—</TableCell>
                  <TableCell className="text-right tabular text-muted-foreground">—</TableCell>
                  <TableCell className="text-right tabular font-medium">{qar(cbq.opening)}</TableCell>
                </TableRow>
                {statementRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No CBQ movements recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  statementRows.map(({ t, moneyIn, moneyOut, running }) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                      <TableCell>
                        <HousemaidLink name={t.candidate} onNavigate={() => setStatementOpen(false)} />
                      </TableCell>
                      <TableCell>
                        {t.company ? (
                          <Badge variant="outline">{COMPANY_LABEL[t.company] ?? t.company}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <Link
                          to="/transactions/$id"
                          params={{ id: t.id }}
                          onClick={() => setStatementOpen(false)}
                          className="text-primary hover:underline"
                        >
                          {t.purpose || t.description || t.type}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet} →{" "}
                          {WALLET_BY_KEY[t.toWallet]?.name ?? t.toWallet}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular text-[color:var(--success)]">
                        {moneyIn ? qar(moneyIn) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular text-[color:var(--destructive)]">
                        {moneyOut ? qar(moneyOut) : "—"}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular font-medium",
                          running < 0 && "text-[color:var(--destructive)]",
                        )}
                      >
                        {qar(running)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
