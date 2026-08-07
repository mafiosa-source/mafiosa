import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil } from "lucide-react";
import { useFinance } from "@/lib/finance-store";
import { COMPANY_LABEL, WALLET_BY_KEY } from "@/lib/finance-types";
import { qar } from "@/lib/format";
import type { ReactNode } from "react";

export const Route = createFileRoute("/transactions_/$id")({
  head: () => ({
    meta: [
      { title: "Transaction Summary · Alhakeem Expenses ERP" },
      { name: "description", content: "Full detail of a single master ledger transaction, including wallets, party and status." },
      { property: "og:title", content: "Transaction Summary · Alhakeem Expenses ERP" },
      { property: "og:description", content: "Full detail of a single master ledger transaction." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TransactionSummaryPage,
});

function TransactionSummaryPage() {
  const { id } = useParams({ from: "/transactions_/$id" });
  const s = useFinance();
  const t = s.transactions.find((x) => x.id === id);

  if (!t) {
    return (
      <AppLayout>
        <PageHeader title="Transaction not found" description="This record no longer exists in the master ledger." />
        <Link to="/transactions"><Button size="sm" variant="outline"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Transaction Summary"
        description={`${t.type} · ${t.date}`}
        action={
          <div className="flex gap-2">
            <Link to="/transactions">
              <Button size="sm" variant="outline"><ArrowLeft className="h-4 w-4" /> Ledger</Button>
            </Link>
            <TransactionDialog
              editing={t}
              trigger={<Button size="sm"><Pencil className="h-4 w-4" /> Edit</Button>}
            />
          </div>
        }
      />

      <div className="rounded-lg border bg-card p-5 mb-6">
        <div className="text-xs text-muted-foreground">Amount</div>
        <div className="text-3xl font-semibold tabular">{qar(t.amount)}</div>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline">{t.status}</Badge>
          {t.voucherNumber ? <span className="font-mono text-xs text-muted-foreground">{t.voucherNumber}</span> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Row label="Date" value={t.date} />
        <Row label="Type" value={t.type} />
        <Row label="Company" value={t.company ? COMPANY_LABEL[t.company] : "—"} />
        <Row label="Classification" value={t.classification ?? "—"} />
        <Row label="Candidate / Housemaid" value={t.candidate ?? "—"} />
        <Row label="Sponsor / Party" value={t.sponsor ?? "—"} />
        <Row label="Passport" value={t.passport ?? "—"} />
        <Row label="Purpose category" value={t.purposeCategory ?? "—"} />
        <Row label="Purpose" value={t.purpose ?? "—"} />
        <Row label="Payment method" value={t.paymentMethod ?? "—"} />
        <Row label="From wallet" value={WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet} />
        <Row label="To wallet" value={WALLET_BY_KEY[t.toWallet]?.name ?? t.toWallet} />
        <Row label="Current location" value={t.currentLocation ? (WALLET_BY_KEY[t.currentLocation]?.name ?? t.currentLocation) : "—"} />
        <Row label="Reference number" value={t.referenceNumber ?? "—"} />
        <Row label="Attachment" value={t.attachment ?? "—"} />
        <Row label="Notes" value={t.description ?? "—"} />
        <Row label="Recorded" value={new Date(t.createdAt).toLocaleString()} />
        <Row label="Last updated" value={new Date(t.updatedAt).toLocaleString()} />
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
