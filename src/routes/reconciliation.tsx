import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { PeriodSelect } from "@/components/PeriodSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance, walletBalance, walletTarget } from "@/lib/finance-store";
import { walletLedger } from "@/lib/finance-derived";
import { currentMonthPeriod } from "@/lib/period";
import { WALLETS, CARD_WALLETS } from "@/lib/finance-types";
import { qar } from "@/lib/format";

export const Route = createFileRoute("/reconciliation")({
  head: () => ({
    meta: [
      { title: "Reconciliation · Alhakeem Group ERP" },
      { name: "description", content: "Wallet reconciliation for the selected period, defaulting to the current month." },
      { property: "og:title", content: "Reconciliation · Alhakeem Group ERP" },
      { property: "og:description", content: "Opening balance, period movements and closing position for every wallet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReconciliationPage,
});

function ReconciliationPage() {
  const s = useFinance();
  const [period, setPeriod] = useState(currentMonthPeriod);

  const rows = useMemo(
    () =>
      WALLETS.filter((w) => w.key !== "external").map((w) => {
        const live = walletBalance(s, w.key);
        const led = walletLedger(s, w.key, { start: period.from || undefined, end: period.to || undefined });
        const isCard = CARD_WALLETS.includes(w.key);
        const limit = isCard ? walletTarget(s, w.key) : 0;
        const used = isCard ? Math.max(0, live.outflow - live.inflow) : 0;
        return {
          w,
          live,
          led,
          card: isCard ? { limit, used, remaining: Math.max(0, limit - used) } : null,
        };
      }),
    [s, period.from, period.to],
  );

  return (
    <AppLayout>
      <PageHeader
        title="Reconciliation"
        description="Every wallet with its opening balance, movements for the selected period and closing position — defaults to the current month."
      />

      <div className="mb-5 rounded-lg border bg-card p-4">
        <PeriodSelect period={period} onChange={setPeriod} />
        <p className="mt-2 text-xs text-muted-foreground">
          Opening balance is everything before the period start. Current balance is the wallet's real all-time position.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(({ w, live, led, card }) => (
          <Card key={w.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex justify-between">
                <span>{w.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{w.kind}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <Row label="Opening (period)" value={qar(led.opening)} />
              <Row label="Money In" value={qar(led.debit)} className="text-emerald-600" />
              <Row label="Money Out" value={qar(led.credit)} className="text-rose-600" />
              <div className="border-t my-1" />
              <Row label="Closing (period)" value={qar(led.closing)} className="font-semibold" />
              <Row label="Current balance (all time)" value={qar(live.balance)} className="text-muted-foreground" />
              {card && (
                <>
                  <div className="border-t my-1" />
                  <Row label="Card limit" value={qar(card.limit)} />
                  <Row label="Used" value={qar(card.used)} className="text-rose-600" />
                  <Row label="Balance remaining" value={qar(card.remaining)} className="font-semibold text-emerald-600" />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppLayout>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular ${className ?? ""}`}>{value}</span>
    </div>
  );
}
