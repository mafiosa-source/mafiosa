import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance, walletBalance, cardUsage } from "@/lib/finance-store";
import { WALLETS, CARD_WALLETS } from "@/lib/finance-types";
import { qar } from "@/lib/format";

export const Route = createFileRoute("/reconciliation")({
  head: () => ({
    meta: [
      { title: "Reconciliation · Alhakeem Expenses ERP" },
      { name: "description", content: "Live wallet balances derived from Master Transactions." },
    ],
  }),
  component: ReconciliationPage,
});

function ReconciliationPage() {
  const s = useFinance();
  const rows = WALLETS.filter((w) => w.key !== "external").map((w) => {
    const b = walletBalance(s, w.key);
    const isCard = CARD_WALLETS.includes(w.key);
    const cardInfo = isCard ? cardUsage(s, w.key) : null;
    return { w, b, cardInfo };
  });

  return (
    <AppLayout>
      <PageHeader
        title="Reconciliation"
        description="Every wallet, its opening balance, movements and current position — computed live from the master ledger."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map(({ w, b, cardInfo }) => (
          <Card key={w.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex justify-between">
                <span>{w.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{w.kind}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <Row label="Opening" value={qar(b.opening)} />
              <Row label="In" value={qar(b.inflow)} className="text-emerald-600" />
              <Row label="Out" value={qar(b.outflow)} className="text-rose-600" />
              <div className="border-t my-1" />
              <Row label="Balance" value={qar(b.balance)} className="font-semibold" />
              {cardInfo && (
                <>
                  <div className="border-t my-1" />
                  <Row label="Card limit" value={qar(cardInfo.limit)} />
                  <Row label="Used" value={qar(cardInfo.used)} />
                  <Row label="To restore" value={qar(cardInfo.used)} className="font-semibold" />
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
