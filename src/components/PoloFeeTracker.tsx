import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, TriangleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { qar, today } from "@/lib/format";
import { useFinance } from "@/lib/finance-store";
import { WALLET_BY_KEY, type WalletKey } from "@/lib/finance-types";
import type { Candidate } from "@/lib/cv-management";
import {
  POLO_DOC_FLOW,
  POLO_DOC_LABEL,
  POLO_FEE_AMOUNT,
  POLO_RECEIPT_WALLETS,
  POLO_STEP_LABEL,
  POLO_STEP_ORDER,
  getPoloContract,
  nextPoloStep,
  poloMoneyState,
  recordPoloStep,
  setFirstTime,
  setPoloDocStatus,
  type PoloContract,
  type PoloDocStatus,
  type PoloMoneyStep,
} from "@/lib/polo-fee";

type Props = { candidate: Candidate; sponsorName?: string; onCandidateChange?: () => void };

const MONEY_STRIP: { key: PoloMoneyStep | "IN_ACCOUNT"; label: string }[] = [
  { key: "POLO_PAID", label: "Paid" },
  { key: "IN_ACCOUNT", label: "Account" },
  { key: "POLO_TO_WALLET", label: "Wallet" },
  { key: "POLO_FROM_WALLET", label: "Received" },
  { key: "POLO_TO_OFFICE", label: "Paid Office" },
  { key: "POLO_RETURNED", label: "Returned" },
];

export function PoloFeeTracker({ candidate, sponsorName, onCandidateChange }: Props) {
  const fin = useFinance();
  const state = useMemo(() => poloMoneyState(fin.transactions, candidate.id), [fin.transactions, candidate.id]);
  const next = nextPoloStep(state);

  const [contract, setContract] = useState<PoloContract | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<PoloMoneyStep | null>(null);
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState(String(POLO_FEE_AMOUNT));
  const [account, setAccount] = useState<WalletKey>("fast-acct");
  const [note, setNote] = useState("");
  const [docOpen, setDocOpen] = useState<PoloDocStatus | null>(null);
  const [reason, setReason] = useState("");
  const [submitDate, setSubmitDate] = useState(today());

  async function loadContract() {
    try {
      setContract(await getPoloContract(candidate.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the POLO contract status");
    }
  }
  useEffect(() => {
    void loadContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.id]);

  function openStep(s: PoloMoneyStep) {
    setStep(s);
    setDate(today());
    setAmount(String(state.done.POLO_PAID?.amount ?? POLO_FEE_AMOUNT));
    setAccount(state.account ?? "fast-acct");
    setNote("");
  }

  function saveStep() {
    if (!step) return;
    const value = Number(amount);
    if (!value || value <= 0) return toast.error("Enter the amount");
    setBusy(true);
    try {
      recordPoloStep(candidate, sponsorName, state, { step, date, amount: value, account, note });
      toast.success(`${POLO_STEP_LABEL[step]} recorded`);
      setStep(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record the step");
    } finally {
      setBusy(false);
    }
  }

  async function saveDoc(status: PoloDocStatus, resubmit = false) {
    setBusy(true);
    try {
      await setPoloDocStatus(candidate.id, status, {
        submittedDate: status === "SUBMITTED" ? submitDate : undefined,
        rejectionReason: status === "REJECTED" ? reason : undefined,
        resubmit,
      });
      toast.success(`Contract status: ${POLO_DOC_LABEL[status]}`);
      setDocOpen(null);
      setReason("");
      await loadContract();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the status");
    } finally {
      setBusy(false);
    }
  }

  const docStatus: PoloDocStatus = contract?.status ?? "PAID";
  const docIndex = POLO_DOC_FLOW.indexOf(docStatus);

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">POLO fee — QAR {POLO_FEE_AMOUNT}</CardTitle>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            First-time housemaid
            <Switch
              checked={candidate.isFirstTime}
              onCheckedChange={async (v) => {
                try {
                  await setFirstTime(candidate.id, v);
                  onCandidateChange?.();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not save");
                }
              }}
            />
          </span>
          <Badge variant="outline" className="font-normal whitespace-nowrap">
            {state.location}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {state.alert && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Paid office without receiving from wallet! Collect {qar(state.toCollect)}</div>
              <div className="text-xs">Record “Received from wallet” to clear this alert.</div>
            </div>
          </div>
        )}

        {/* Money strip */}
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Money</div>
          <div className="flex flex-wrap items-center gap-2">
            {MONEY_STRIP.map((s, i) => {
              const done =
                s.key === "IN_ACCOUNT" ? !!state.done.POLO_PAID : !!state.done[s.key as PoloMoneyStep];
              const alert = s.key === "POLO_TO_OFFICE" && state.alert;
              const current = !alert && !done && next === s.key;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                      done && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                      current && "border-primary bg-primary/10 text-primary font-medium",
                      alert && "border-destructive/50 bg-destructive/10 text-destructive font-medium",
                    )}
                  >
                    {alert ? (
                      <TriangleAlert className="h-3 w-3" />
                    ) : done ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="text-[10px]">{i + 1}</span>
                    )}
                    {s.label}
                  </div>
                  {i < MONEY_STRIP.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {POLO_STEP_ORDER.filter((s) => !state.done[s]).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={next === s ? "default" : "outline"}
                onClick={() => openStep(s)}
                disabled={next !== s && !(s === "POLO_RETURNED" && !!state.done.POLO_TO_OFFICE)}
              >
                {POLO_STEP_LABEL[s]}
              </Button>
            ))}
            {!next && <span className="text-xs text-muted-foreground">All money steps recorded.</span>}
          </div>
          {state.rows.length > 0 && (
            <ul className="mt-3 divide-y rounded border text-sm">
              {state.rows.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-medium">{POLO_STEP_LABEL[t.expenseKind as PoloMoneyStep]}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.date} · {WALLET_BY_KEY[t.fromWallet]?.name} → {WALLET_BY_KEY[t.toWallet]?.name}
                      {t.voucherNumber ? ` · ${t.voucherNumber}` : ""}
                    </div>
                  </div>
                  <div className="tabular-nums font-semibold whitespace-nowrap">{qar(t.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Document strip */}
        <div className="border-t pt-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            POLO contract {contract && contract.attempt > 1 ? `· attempt ${contract.attempt}` : ""}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {POLO_DOC_FLOW.map((s, i) => {
              const done = docStatus !== "REJECTED" && i < docIndex;
              const current = docStatus !== "REJECTED" && i === docIndex;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                      done && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
                      current && "border-primary bg-primary/10 text-primary font-medium",
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{i + 1}</span>}
                    {POLO_DOC_LABEL[s]}
                  </div>
                  {i < POLO_DOC_FLOW.length - 1 && <span className="text-muted-foreground">→</span>}
                </div>
              );
            })}
            {docStatus === "REJECTED" && (
              <div className="flex items-center gap-1.5 rounded-full border border-destructive/50 bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                <XCircle className="h-3 w-3" /> Rejected
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {contract?.submittedDate ? `Submitted ${contract.submittedDate}` : "Not submitted yet"}
            {contract?.expectedDate ? ` · result expected by ${contract.expectedDate}` : ""}
            {contract?.approvedDate ? ` · approved ${contract.approvedDate}` : ""}
            {contract?.rejectionReason ? ` · reason: ${contract.rejectionReason}` : ""}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setDocOpen("SUBMITTED")}>
              {docStatus === "REJECTED" ? "Resubmit" : "Mark submitted"}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void saveDoc("IN_REVIEW")}>
              In review
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void saveDoc("APPROVED")}>
              Approved
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setDocOpen("REJECTED")}>
              Rejected
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Money step dialog */}
      <Dialog open={!!step} onOpenChange={(o) => !o && setStep(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{step ? POLO_STEP_LABEL[step] : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Amount (QAR)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            {step === "POLO_PAID" && (
              <div>
                <Label>Received into</Label>
                <Select value={account} onValueChange={(v) => setAccount(v as WalletKey)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POLO_RECEIPT_WALLETS.map((w) => (
                      <SelectItem key={w} value={w}>
                        {WALLET_BY_KEY[w].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Note (optional)</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStep(null)}>
              Cancel
            </Button>
            <Button onClick={saveStep} disabled={busy}>
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document dialog */}
      <Dialog open={!!docOpen} onOpenChange={(o) => !o && setDocOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{docOpen === "REJECTED" ? "Contract rejected" : "Contract submitted"}</DialogTitle>
          </DialogHeader>
          {docOpen === "SUBMITTED" && (
            <div className="space-y-3">
              <div>
                <Label>Submission date</Label>
                <Input type="date" value={submitDate} onChange={(e) => setSubmitDate(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">The result date is set automatically to 7 days after submission.</p>
            </div>
          )}
          {docOpen === "REJECTED" && (
            <div>
              <Label>Reason</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocOpen(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() => docOpen && void saveDoc(docOpen, docOpen === "SUBMITTED" && docStatus === "REJECTED")}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
