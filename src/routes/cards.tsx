import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { TransactionsTable } from "@/components/TransactionsTable";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useFinance, cardUsage } from "@/lib/finance-store";
import { CARD_WALLETS, WALLET_BY_KEY } from "@/lib/finance-types";
import type { WalletKey } from "@/lib/finance-types";
import { qar } from "@/lib/format";

export const Route = createFileRoute("/cards")({
  head: () => ({
    meta: [
      { title: "Company Cards · AHG Finance Core" },
      { name: "description", content: "Maryam, Yousef, Maha Petrol and Limit card ledger." },
    ],
  }),
  component: CardsPage,
});

function CardsPage() {
  const s = useFinance();

  return (
    <AppLayout>
      <PageHeader
        title="Company Cards"
        description="Card wallets and their monthly closing position."
        action={
          <TransactionDialog
            trigger={<Button size="sm"><Plus className="h-4 w-4" /> New card expense</Button>}
            defaults={{ type: "Card Expense", fromWallet: "maryam-card", toWallet: "external", paymentMethod: "Card" }}
          />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {CARD_WALLETS.map((k: WalletKey) => {
          const meta = WALLET_BY_KEY[k];
          const u = cardUsage(s, k);
          const pct = u.limit ? Math.min(100, (u.used / u.limit) * 100) : 0;
          return (
            <Card key={k}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{meta.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">****{meta.last4}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">{meta.purpose}</div>
                <Progress value={pct} className="h-1.5" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Used</span>
                  <span className="tabular font-medium">{qar(u.used)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="tabular font-medium">{qar(u.remaining)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Limit</span>
                  <span className="tabular">{qar(u.limit)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">To restore</span>
                  <span className="tabular font-semibold">{qar(u.used)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TransactionsTable
        rows={s.transactions.filter((t) => CARD_WALLETS.includes(t.fromWallet) || CARD_WALLETS.includes(t.toWallet))}
        exportName="cards.csv"
        printTitle="Company Cards Report"
      />
    </AppLayout>
  );
}
