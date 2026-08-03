import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { COMPANIES, COMPANY_LABEL, WALLETS, HOLDING_RELEASE_PURPOSES } from "@/lib/finance-types";
import type { Company, WalletKey, PurposeCategory, PaymentMethod } from "@/lib/finance-types";
import { addTransaction, useFinance } from "@/lib/finance-store";
import { housemaidHoldingLedger } from "@/lib/finance-derived";
import { qar, today } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Where released holding money can go. */
const DESTINATIONS: WalletKey[] = [
  "external",
  "office-petty",
  "dumonde-petty",
  "cbq",
  "salary-wallet",
  "maryam-card",
  "yousef-card",
  "maha-card",
  "limit-card",
];

function methodFor(w: WalletKey): PaymentMethod {
  if (w === "cbq") return "CBQ";
  if (w.endsWith("-card")) return "Card";
  if (w.endsWith("-acct")) return "Company Account";
  return "Cash";
}

const NONE = "__none";

export function HoldingReleaseDialog({
  trigger,
  presetName,
  mode = "release",
}: {
  trigger?: ReactNode;
  presetName?: string;
  mode?: "release" | "receipt";
}) {
  const s = useFinance();
  const ledger = useMemo(() => housemaidHoldingLedger(s), [s]);
  const isRelease = mode === "release";

  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState(presetName ?? "");
  const [sponsor, setSponsor] = useState("");
  const [company, setCompany] = useState<Company | undefined>(undefined);
  const [purpose, setPurpose] = useState<PurposeCategory>("Visa");
  const [particulars, setParticulars] = useState("");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState<WalletKey>("external");
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);

  const selected = useMemo(
    () => ledger.find((e) => e.name.trim().toLowerCase() === name.trim().toLowerCase()),
    [ledger, name],
  );
  const balance = selected?.balance ?? 0;
  const value = Number(amount) || 0;
  const newBalance = isRelease ? balance - value : balance + value;
  const exceeds = isRelease && value > balance + 0.001;

  function reset() {
    setName(presetName ?? "");
    setSponsor("");
    setCompany(undefined);
    setPurpose(isRelease ? "Visa" : "Other");
    setParticulars("");
    setAmount("");
    setDestination("external");
    setDate(today());
    setNotes("");
    setConfirming(false);
    setQuery("");
  }

  function save() {
    addTransaction({
      date,
      type: isRelease ? "Holding Release" : "Housemaid Holding",
      amount: value,
      candidate: name.trim(),
      sponsor: sponsor.trim() || selected?.sponsor,
      company: company ?? selected?.company,
      classification: "Sponsor Expense",
      purposeCategory: purpose,
      purpose: particulars.trim() || (isRelease ? `Holding released for ${purpose}` : "Sponsor money received into holding"),
      paymentMethod: methodFor(isRelease ? destination : "office-petty"),
      fromWallet: isRelease ? "housemaid-holding" : "external",
      toWallet: isRelease ? destination : "housemaid-holding",
      currentLocation: isRelease ? destination : "housemaid-holding",
      status: "Completed",
      description: notes || undefined,
    });
    toast.success(
      isRelease ? `Holding released · ${qar(value)}` : `Holding received · ${qar(value)}`,
      { description: `${name.trim()} · new holding balance ${qar(newBalance)}` },
    );
    setOpen(false);
    reset();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Enter the housemaid name");
    if (!value || value <= 0) return toast.error("Enter an amount");
    if (isRelease && destination === "housemaid-holding") return toast.error("Choose a destination outside the holding wallet");
    if (exceeds && !confirming) {
      setConfirming(true);
      return;
    }
    save();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">{isRelease ? "Release holding" : "Receive holding"}</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isRelease ? "Release from Housemaid Holding Wallet" : "Receive into Housemaid Holding Wallet"}</DialogTitle>
          <DialogDescription>
            {isRelease
              ? "Money leaves the holding wallet for an approved purpose. The balance decreases automatically."
              : "Sponsor money is held for a specific housemaid until it is released."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label className="text-xs">Housemaid</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {name || "Search housemaid..."}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Type a name..." value={query} onValueChange={setQuery} />
                  <CommandList>
                    <CommandEmpty>
                      {query.trim() ? (
                        <button
                          type="button"
                          className="text-sm underline"
                          onClick={() => { setName(query.trim()); setPickerOpen(false); setConfirming(false); }}
                        >
                          Use "{query.trim()}" as a new housemaid
                        </button>
                      ) : (
                        "No holdings yet."
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {ledger.map((e) => (
                        <CommandItem
                          key={e.name}
                          value={e.name}
                          onSelect={() => {
                            setName(e.name);
                            if (e.sponsor) setSponsor(e.sponsor);
                            if (e.company) setCompany(e.company);
                            setPickerOpen(false);
                            setConfirming(false);
                          }}
                        >
                          <Check className={cn("h-4 w-4", selected?.name === e.name ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1">{e.name}</span>
                          <span className={cn("tabular text-xs", e.balance < 0 ? "text-rose-400" : "text-muted-foreground")}>
                            {qar(e.balance)}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {name.trim() ? (
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Held for this housemaid</span>
                <span className="tabular">{qar(selected?.received ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already released</span>
                <span className="tabular">{qar(selected?.released ?? 0)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Current holding balance</span>
                <span className={cn("tabular", balance < 0 && "text-rose-400")}>{qar(balance)}</span>
              </div>
              {value > 0 && (
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>New holding balance</span>
                  <span className={cn("tabular", newBalance < 0 && "text-rose-400")}>{qar(newBalance)}</span>
                </div>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sponsor</Label>
              <Input value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="Sponsor name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company</Label>
              <Select value={company ?? NONE} onValueChange={(v) => setCompany(v === NONE ? undefined : (v as Company))}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-- None --</SelectItem>
                  {COMPANIES.map((c) => <SelectItem key={c} value={c}>{COMPANY_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Purpose</Label>
              <Select value={purpose} onValueChange={(v) => setPurpose(v as PurposeCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOLDING_RELEASE_PURPOSES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (QAR)</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setConfirming(false); }}
                required
              />
            </div>
            {isRelease && (
              <div className="space-y-1.5">
                <Label className="text-xs">Destination</Label>
                <Select value={destination} onValueChange={(v) => setDestination(v as WalletKey)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DESTINATIONS.map((k) => {
                      const w = WALLETS.find((x) => x.key === k)!;
                      return <SelectItem key={k} value={k}>{w.name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Particulars</Label>
            <Input value={particulars} onChange={(e) => setParticulars(e.target.value)} placeholder="e.g. Visa stamping fee" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {exceeds && value > 0 && (
            <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium">This release exceeds the amount held for this housemaid.</div>
                <div>
                  Continuing creates a negative holding balance of{" "}
                  <span className="font-semibold tabular">{qar(newBalance)}</span> until more sponsor money is received.
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant={exceeds && confirming ? "destructive" : "default"}>
              {exceeds && confirming ? "Proceed anyway" : isRelease ? "Release holding" : "Receive holding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
