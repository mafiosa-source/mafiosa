import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, History } from "lucide-react";
import {
  useFinance,
  candidateHoldingTotal,
  candidateLedger,
  type CandidateLedgerEntry,
} from "@/lib/finance-store";
import { qar } from "@/lib/format";
import { WALLET_BY_KEY } from "@/lib/finance-types";

export const Route = createFileRoute("/candidates")({
  head: () => ({
    meta: [
      { title: "Candidate Holdings · AHG Finance Core" },
      {
        name: "description",
        content:
          "Live ledger of money received and utilized per candidate, calculated from the master transactions table.",
      },
    ],
  }),
  component: CandidatesPage,
});

const STATUS_TONE: Record<CandidateLedgerEntry["status"], string> = {
  Available: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Partially Utilized": "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Closed: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  Refunded: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

function CandidatesPage() {
  const s = useFinance();
  const ledger = candidateLedger(s);
  const held = candidateHoldingTotal(s);
  const rows = s.transactions.filter(
    (t) =>
      !!t.candidate &&
      (t.classification === "Sponsor Expense" ||
        (t.toWallet === "external" && t.fromWallet !== "external")),
  );
  const totalReceived = ledger.reduce((a, c) => a + c.received, 0);
  const totalUtilized = ledger.reduce((a, c) => a + c.utilized, 0);
  const [active, setActive] = useState<CandidateLedgerEntry | null>(null);

  return (
    <AppLayout>
      <PageHeader
        title="Candidate Holdings"
        description="Live ledger — balances are calculated from Receipt Vouchers minus every linked payment, refund, and adjustment."
        action={
          <TransactionDialog
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4" /> New candidate transaction
              </Button>
            }
            defaults={{
              type: "Receipt Voucher",
              classification: "Sponsor Expense",
              fromWallet: "external",
              toWallet: "cbq",
            }}
          />
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Remaining" value={held} tone="warning" />
        <StatCard label="Candidates on file" value={ledger.length} format="raw" />
        <StatCard label="Total Received" value={totalReceived} tone="success" />
        <StatCard label="Total Utilized" value={totalUtilized} />
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">By Candidate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ledger.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No candidate holdings yet.
              </div>
            ) : (
              ledger.map((c) => (
                <div
                  key={c.candidate}
                  className="rounded-md border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{c.candidate}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.sponsor ?? "—"} · {c.company ?? "—"}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={STATUS_TONE[c.status]}
                    >
                      {c.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Received</div>
                      <div className="tabular font-medium text-emerald-600">
                        {qar(c.received)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Utilized</div>
                      <div className="tabular font-medium text-rose-600">
                        {qar(c.utilized)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Remaining</div>
                      <div className="tabular font-semibold">
                        {qar(c.balance)}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs flex items-center justify-between border-t pt-2">
                    <span className="text-muted-foreground">
                      Location:{" "}
                      <span className="text-foreground font-medium">
                        {c.currentLocation}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => setActive(c)}
                    >
                      <History className="h-3.5 w-3.5" /> Timeline
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <TransactionsTable rows={rows} exportName="candidate-holdings.csv" />

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {active?.candidate} · Transaction history
            </DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-xs">
                <SummaryStat label="Received" value={active.received} tone="text-emerald-600" />
                <SummaryStat label="Utilized" value={active.utilized} tone="text-rose-600" />
                <SummaryStat label="Refunded" value={active.refunded} tone="text-blue-600" />
                <SummaryStat label="Remaining" value={active.balance} tone="font-semibold" />
              </div>
              <div className="rounded-md border divide-y">
                {active.timeline.map((t) => {
                  const incoming =
                    t.fromWallet === "external" && t.toWallet !== "external";
                  const sign = incoming ? "+" : "−";
                  const tone = incoming
                    ? "text-emerald-600"
                    : t.status === "Refunded"
                      ? "text-blue-600"
                      : "text-rose-600";
                  return (
                    <div
                      key={t.id}
                      className="p-3 flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular">
                            {t.date}
                          </span>
                          <span className="font-medium">{t.type}</span>
                          {t.voucherNumber && (
                            <span className="font-mono text-xs text-muted-foreground">
                              {t.voucherNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t.purposeCategory ?? "—"}
                          {t.purpose ? ` · ${t.purpose}` : ""} ·{" "}
                          {WALLET_BY_KEY[t.fromWallet]?.name} →{" "}
                          {WALLET_BY_KEY[t.toWallet]?.name}
                        </div>
                      </div>
                      <div className={`tabular font-semibold ${tone}`}>
                        {sign}
                        {qar(t.amount)}
                      </div>
                    </div>
                  );
                })}
                {active.timeline.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground">
                    No transactions.
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Current location:{" "}
                <span className="text-foreground font-medium">
                  {active.currentLocation}
                </span>
                {" · "}Status:{" "}
                <span className="text-foreground font-medium">
                  {active.status}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className={`tabular ${tone ?? ""}`}>{qar(value)}</div>
    </div>
  );
}
