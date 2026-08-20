import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import type { Transaction } from "@/lib/finance-types";
import { COMPANY_LABEL, WALLET_BY_KEY } from "@/lib/finance-types";
import { qar } from "@/lib/format";
import { TransactionDialog } from "./TransactionDialog";

/**
 * Read-only Transaction Details modal, opened by clicking a transaction row.
 * Controlled by the parent via `open` / `onOpenChange`.
 */
export function TransactionDetailsDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = transaction;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-card p-5 mb-4">
          <div className="text-xs text-muted-foreground">Amount</div>
          <div className="text-3xl font-semibold tabular">{qar(t.amount)}</div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline">{t.status}</Badge>
            {t.voucherNumber ? (
              <span className="font-mono text-xs text-muted-foreground">{t.voucherNumber}</span>
            ) : null}
            <span className="text-xs text-muted-foreground">{t.type} · {t.date}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Row label="Date" value={t.date} />
          <Row label="Type" value={t.type} />
          <Row label="Company" value={t.company ? (COMPANY_LABEL[t.company as keyof typeof COMPANY_LABEL] ?? t.company) : "—"} />
          <Row label="Classification" value={t.classification ?? "—"} />
          <Row label="Candidate / Housemaid" value={t.candidate ?? "—"} />
          <Row label="Sponsor / Party" value={t.sponsor ?? "—"} />
          <Row label="Purpose category" value={t.purposeCategory ?? "—"} />
          <Row label="Purpose" value={t.purpose ?? "—"} />
          <Row label="From wallet" value={WALLET_BY_KEY[t.fromWallet]?.name ?? t.fromWallet} />
          <Row label="To wallet" value={WALLET_BY_KEY[t.toWallet]?.name ?? t.toWallet} />
          <Row label="Current location" value={t.currentLocation ? (WALLET_BY_KEY[t.currentLocation]?.name ?? t.currentLocation) : "—"} />
          <Row label="Notes" value={t.description ?? "—"} />
          {t.vehicle ? <Row label="Vehicle" value={t.vehicle} /> : null}
          {t.plateNumber ? <Row label="Plate" value={t.plateNumber} /> : null}
          {t.driver ? <Row label="Driver" value={t.driver} /> : null}
          {t.station ? <Row label="Station" value={t.station} /> : null}
          {(t.kmAfter ?? t.kmBefore) != null ? <Row label="Odometer" value={String(t.kmAfter ?? t.kmBefore)} /> : null}
          {t.kmReading != null ? <Row label="KM reading" value={String(t.kmReading)} /> : null}
          <Row label="Recorded" value={new Date(t.createdAt).toLocaleString()} />
          <Row label="Entered by" value={t.createdBy || "—"} />
          <Row label="Last updated" value={new Date(t.updatedAt).toLocaleString()} />
          <Row label="Last edited by" value={t.lastEditedBy || "—"} />
        </div>

        <DialogFooter className="mt-4">
          <TransactionDialog
            editing={t}
            onSaved={() => setOpen(false)}
            trigger={
              <Button size="sm">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            }
          />
          <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm break-words">{value}</div>
    </div>
  );
}
