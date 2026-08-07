import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReactNode } from "react";
import {
  TXN_TYPES, COMPANIES, VOUCHER_COMPANIES, CLASSIFICATIONS, PURPOSE_CATEGORIES,
  PAYMENT_METHODS, STATUSES, WALLETS,
} from "@/lib/finance-types";
import type {
  Transaction, TxnType, Company, Classification, PurposeCategory,
  PaymentMethod, Status, WalletKey, CardCategory,
} from "@/lib/finance-types";
import { addTransaction, updateTransaction, isVoucherNumberTaken, nextVoucherNumber, findMatchingHoldings, getState } from "@/lib/finance-store";
import { today, dayOfWeek } from "@/lib/format";
import { toast } from "sonner";

type Draft = Partial<Transaction>;

function newDraft(): Draft {
  return {
    date: today(),
    type: "Payment Voucher",
    amount: 0,
    fromWallet: "external",
    toWallet: "office-petty",
    status: "Completed",
    paymentMethod: "Cash",
    classification: "Company Expense",
    purposeCategory: "Other",
  };
}

export function TransactionDialog({
  trigger,
  editing,
  defaults,
  onSaved,
}: {
  trigger?: ReactNode;
  editing?: Transaction;
  defaults?: Partial<Transaction>;
  onSaved?: (t: Transaction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(editing ?? { ...newDraft(), ...defaults });

  const isVoucher = draft.type === "Receipt Voucher" || draft.type === "Payment Voucher";
  const isLimitCard = draft.fromWallet === "limit-card" || draft.toWallet === "limit-card";
  const isFuel = draft.type === "Fuel Expense" || draft.purposeCategory === "Fuel";
  const isSalaryRelease = draft.type === "Salary Release";

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  function onOpen(v: boolean) {
    setOpen(v);
    if (v && !editing) setDraft({ ...newDraft(), ...defaults });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.amount || draft.amount <= 0) return toast.error("Amount required");
    if (!draft.fromWallet || !draft.toWallet) return toast.error("Choose wallets");
    if (draft.fromWallet === draft.toWallet) return toast.error("From and To wallets must differ");
    if (isVoucher && !draft.company) return toast.error("Select company");
    if (isFuel && (!draft.vehicle || !draft.plateNumber || !draft.driver || draft.kmBefore == null || draft.kmAfter == null)) {
      return toast.error("Fuel entries require vehicle, number plate, driver and odometer readings");
    }
    if (isVoucher && draft.company === "AHG") return toast.error("AHG cannot use vouchers");
    if (isVoucher && draft.voucherNumber && isVoucherNumberTaken(draft.voucherNumber, editing?.id)) {
      return toast.error("Voucher number already used");
    }
    const payload: Omit<Transaction, "id" | "createdAt" | "updatedAt"> = {
      date: draft.date ?? today(),
      type: draft.type as TxnType,
      amount: Number(draft.amount),
      fromWallet: draft.fromWallet as WalletKey,
      toWallet: draft.toWallet as WalletKey,
      status: (draft.status as Status) ?? "Completed",
      company: draft.company,
      classification: draft.classification,
      voucherNumber: draft.voucherNumber,
      candidate: draft.candidate,
      sponsor: draft.sponsor,
      passport: draft.passport,
      purpose: draft.purpose,
      purposeCategory: draft.purposeCategory,
      paymentMethod: draft.paymentMethod,
      description: draft.description,
      referenceNumber: draft.referenceNumber,
      attachment: draft.attachment,
      cardCategory: draft.cardCategory,
      driver: draft.driver,
      vehicle: draft.vehicle,
      plateNumber: draft.plateNumber,
      station: draft.station,
      kmBefore: draft.kmBefore ? Number(draft.kmBefore) : undefined,
      kmAfter: draft.kmAfter ? Number(draft.kmAfter) : undefined,
      parentTxnId: draft.parentTxnId,
      currentLocation: draft.toWallet as WalletKey,
    };
    // Rule 2: on outgoing sponsor-expense-style payments referencing a candidate,
    // check for a matching Candidate Holding and inform the operator.
    const isOutgoingForCandidate =
      payload.toWallet === "external" &&
      payload.fromWallet !== "external" &&
      !!payload.candidate &&
      payload.type !== "Adjustment";
    if (isOutgoingForCandidate) {
      const matches = findMatchingHoldings(getState(), {
        candidate: payload.candidate,
        sponsor: payload.sponsor,
        company: payload.company,
        purposeCategory: payload.purposeCategory,
      });
      if (matches.length === 0) {
        toast.warning("No matching Candidate Holding found.", {
          description: `${payload.candidate} has no open holding with a remaining balance. Recording payment anyway.`,
        });
      } else if (matches.length > 1) {
        toast.info(`${matches.length} matching holdings for ${payload.candidate}`, {
          description: "Payment recorded; balances will apply to open holdings by FIFO on the ledger.",
        });
      }
    }

    if (editing) {
      updateTransaction(editing.id, payload);
      toast.success("Transaction updated");
      onSaved?.({ ...editing, ...payload });
    } else {
      const t = addTransaction(payload);
      toast.success(`Saved${t.voucherNumber ? ` · ${t.voucherNumber}` : ""}`);
      onSaved?.(t);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm">New transaction</Button>}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit transaction" : "New transaction"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="grid grid-cols-2 gap-3">
            <F label="Date">
              <Input type="date" value={draft.date ?? ""} onChange={(e) => patch({ date: e.target.value })} required />
            </F>
            <F label="Transaction type">
              <Sel value={draft.type} onChange={(v) => {
                patch({ type: v as TxnType, voucherNumber: undefined });
              }} options={TXN_TYPES} />
            </F>

            {isVoucher && (
              <>
                <F label="Company">
                  <Sel value={draft.company} onChange={(v) => {
                    const company = v as Company;
                    let voucherNumber = draft.voucherNumber;
                    if (!editing && company !== "AHG") {
                      voucherNumber = nextVoucherNumber(company, draft.type as "Receipt Voucher" | "Payment Voucher");
                    }
                    patch({ company, voucherNumber });
                  }} options={VOUCHER_COMPANIES} />
                </F>
                <F label="Voucher number">
                  <Input value={draft.voucherNumber ?? ""} onChange={(e) => patch({ voucherNumber: e.target.value })} placeholder="Auto-assigned" />
                </F>
                <F label="Expense classification">
                  <Sel value={draft.classification} onChange={(v) => patch({ classification: v as Classification })} options={CLASSIFICATIONS} />
                </F>
              </>
            )}
            {!isVoucher && (
              <>
                <F label="Company (optional)">
                  <Sel value={draft.company ?? ""} onChange={(v) => patch({ company: v === "__none" ? undefined : (v as Company) })} options={COMPANIES} allowEmpty />
                </F>
                <F label="Is this a company expense or a sponsor expense?">
                  <Sel value={draft.classification} onChange={(v) => patch({ classification: v as Classification })} options={CLASSIFICATIONS} />
                </F>
              </>
            )}


            <F label="Amount (QAR)">
              <Input type="number" step="0.01" value={draft.amount ?? ""} onChange={(e) => patch({ amount: Number(e.target.value) })} required />
            </F>
            <F label="Payment method">
              <Sel value={draft.paymentMethod} onChange={(v) => patch({ paymentMethod: v as PaymentMethod })} options={PAYMENT_METHODS} />
            </F>

            <F label="From wallet">
              <WalletSel value={draft.fromWallet} onChange={(v) => patch({ fromWallet: v })} />
            </F>
            <F label="To wallet">
              <WalletSel value={draft.toWallet} onChange={(v) => patch({ toWallet: v })} />
            </F>

            <F label="Candidate / Housemaid">
              <Input value={draft.candidate ?? ""} onChange={(e) => patch({ candidate: e.target.value })} />
            </F>
            <F label="Sponsor / Party">
              <Input value={draft.sponsor ?? ""} onChange={(e) => patch({ sponsor: e.target.value })} />
            </F>
            <F label="Passport number">
              <Input value={draft.passport ?? ""} onChange={(e) => patch({ passport: e.target.value })} />
            </F>
            <F label="Purpose category">
              <Sel value={draft.purposeCategory} onChange={(v) => patch({ purposeCategory: v as PurposeCategory })} options={PURPOSE_CATEGORIES} />
            </F>
            <F label="Purpose / Description">
              <Input value={draft.purpose ?? ""} onChange={(e) => patch({ purpose: e.target.value })} />
            </F>
            <F label="Status">
              <Sel value={draft.status} onChange={(v) => patch({ status: v as Status })} options={STATUSES} />
            </F>
            <F label="Reference number">
              <Input value={draft.referenceNumber ?? ""} onChange={(e) => patch({ referenceNumber: e.target.value })} />
            </F>
            <F label="Attachment (URL/note)">
              <Input value={draft.attachment ?? ""} onChange={(e) => patch({ attachment: e.target.value })} />
            </F>

            {isLimitCard && (
              <F label="Limit card category">
                <Sel value={draft.cardCategory} onChange={(v) => patch({ cardCategory: v as CardCategory })}
                  options={["Personal", "Company Expense", "Factory Catering"]} />
              </F>
            )}

            {isFuel && (
              <>
                <F label="Day (auto)">
                  <Input value={dayOfWeek(draft.date ?? today())} readOnly className="bg-muted/40" />
                </F>
                <F label="Driver *"><Input required value={draft.driver ?? ""} onChange={(e) => patch({ driver: e.target.value })} /></F>
                <F label="Vehicle *"><Input required value={draft.vehicle ?? ""} onChange={(e) => patch({ vehicle: e.target.value })} /></F>
                <F label="Number plate *"><Input required value={draft.plateNumber ?? ""} onChange={(e) => patch({ plateNumber: e.target.value })} /></F>
                <F label="Station"><Input value={draft.station ?? ""} onChange={(e) => patch({ station: e.target.value })} /></F>
                <F label="Odometer / KM before *"><Input required type="number" value={draft.kmBefore ?? ""} onChange={(e) => patch({ kmBefore: Number(e.target.value) })} /></F>
                <F label="Odometer / KM after *"><Input required type="number" value={draft.kmAfter ?? ""} onChange={(e) => patch({ kmAfter: Number(e.target.value) })} /></F>
                <F label="Kilometres travelled (auto)">
                  <Input
                    readOnly
                    className="bg-muted/40"
                    value={
                      draft.kmAfter != null && draft.kmBefore != null
                        ? String(Math.max(0, Number(draft.kmAfter) - Number(draft.kmBefore)))
                        : ""
                    }
                  />
                </F>
              </>
            )}


            {isSalaryRelease && (
              <F label="Linked holding ID (optional)">
                <Input value={draft.parentTxnId ?? ""} onChange={(e) => patch({ parentTxnId: e.target.value })} />
              </F>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={draft.description ?? ""} onChange={(e) => patch({ description: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">{editing ? "Save changes" : "Save transaction"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Sel<T extends string>({
  value, onChange, options, allowEmpty,
}: { value?: T | ""; onChange: (v: string) => void; options: readonly T[] | T[]; allowEmpty?: boolean }) {
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none">-- None --</SelectItem>}
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function WalletSel({ value, onChange }: { value?: WalletKey; onChange: (v: WalletKey) => void }) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v as WalletKey)}>
      <SelectTrigger><SelectValue placeholder="Select wallet..." /></SelectTrigger>
      <SelectContent>
        {WALLETS.map((w) => <SelectItem key={w.key} value={w.key}>{w.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
