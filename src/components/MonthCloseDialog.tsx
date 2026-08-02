import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { useFinance, closeMonth, closingFor } from "@/lib/finance-store";
import { monthReconciliation, monthLabel } from "@/lib/finance-derived";
import { qar } from "@/lib/format";
import { COMPANY_LABEL } from "@/lib/finance-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function MonthCloseDialog({
  year,
  month,
  trigger,
}: {
  year: number;
  month: number;
  trigger?: ReactNode;
}) {
  const s = useFinance();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const recon = useMemo(() => monthReconciliation(s, year, month), [s, year, month]);
  const closing = closingFor(s, year, month);
  const alreadyClosed = closing?.status === "Closed";

  function confirm() {
    closeMonth({
      year,
      month,
      exceptions: recon.exceptions,
      notes: notes || undefined,
      snapshot: {
        lines: recon.lines,
        salaryWallet: recon.salaryWallet,
        candidateHeld: recon.candidateHeld,
        cbqPending: recon.cbqPending,
        outstandingPayables: recon.outstandingPayables,
        income: recon.income,
        expenses: recon.expenses,
      },
    });
    toast.success(`${monthLabel(year, month)} closed`, {
      description: recon.exceptions.length
        ? `Recorded with ${recon.exceptions.length} outstanding exception(s). No transaction was changed.`
        : "Reconciliation complete. No transaction was changed.",
    });
    setOpen(false);
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant={recon.ready ? "default" : "outline"}>
            <Lock className="h-4 w-4" /> Close Month
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Close {monthLabel(year, month)}</DialogTitle>
          <DialogDescription>
            Closing only marks reconciliation as completed. No transaction is created, changed or deleted, and no
            money is transferred — all top-ups stay manual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border">
            <div className="px-3 py-2 border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider">
              Reconciliation targets
            </div>
            <div className="divide-y">
              {recon.lines.map((l) => (
                <div key={l.wallet} className="flex items-center justify-between px-3 py-2">
                  <span className="flex items-center gap-2">
                    {l.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    {l.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className={cn("tabular", !l.ok && "text-amber-700")}>{qar(l.balance)}</span>
                    <span className="text-xs text-muted-foreground">target {qar(l.target ?? 0)}</span>
                    {l.topUp ? <Badge variant="outline">top-up {qar(l.topUp)}</Badge> : null}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Line label="Housemaid Salary Wallet" value={qar(recon.salaryWallet)} />
            <Line label="Candidate money held" value={qar(recon.candidateHeld)} />
            <Line label="Outstanding payables" value={qar(recon.outstandingPayables)} />
            <Line label="Pending CBQ transfers" value={qar(recon.cbqPending)} />
            <Line label="Total monthly income" value={qar(recon.income)} />
            <Line label="Total monthly expenses" value={qar(recon.expenses)} />
          </div>

          {recon.companyPending.length > 0 && (
            <div className="rounded-lg border p-3">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2">Pending company transfers</div>
              <ul className="space-y-1">
                {recon.companyPending.map((c) => (
                  <li key={c.company} className="flex justify-between">
                    <span>{COMPANY_LABEL[c.company]}</span>
                    <span className="tabular">{qar(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recon.negativeSalaries.length > 0 && (
            <div className="rounded-lg border border-rose-300 bg-rose-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-rose-700">
                Negative salary balances
              </div>
              <ul className="space-y-1 text-rose-700">
                {recon.negativeSalaries.map((n) => (
                  <li key={n.name} className="flex justify-between">
                    <span>{n.name}</span>
                    <span className="tabular">{qar(n.balance)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recon.exceptions.length > 0 ? (
            <div className="rounded-lg border border-amber-400/50 bg-amber-500/5 p-3">
              <div className="flex items-center gap-2 font-medium text-amber-700 mb-2">
                <AlertTriangle className="h-4 w-4" /> Reconciliation is incomplete
              </div>
              <ul className="space-y-1 text-sm">
                {recon.exceptions.map((e) => (
                  <li key={e} className="flex gap-2">
                    <span className="text-amber-600">•</span>
                    <span>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/5 p-3 flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> All reconciliation targets are met — this month is ready to close.
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Closing notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {alreadyClosed && (
            <p className="text-xs text-muted-foreground">
              This month is already marked closed{closing?.closedWithExceptions ? " with exceptions" : ""}. Closing
              again simply refreshes the reconciliation snapshot.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant={recon.ready ? "default" : "destructive"} onClick={confirm}>
            {recon.ready ? "Close Month" : "Close Anyway"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="tabular font-semibold">{value}</div>
    </div>
  );
}
