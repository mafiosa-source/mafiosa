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
import { COMPANIES, COMPANY_LABEL, WALLETS } from "@/lib/finance-types";
import type { Company, WalletKey, PaymentMethod } from "@/lib/finance-types";
import { addTransaction, salaryLedger, useFinance } from "@/lib/finance-store";
import { qar, today } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Salary releases are normally paid from the dedicated Housemaid Salary Wallet,
// but the operator may pick any wallet — the selected wallet is always the one debited.
const PAY_WALLETS: WalletKey[] = [
  "salary-wallet",
  "office-petty",
  "dumonde-petty",
  "cbq",
  "maryam-card",
  "yousef-card",
  "maha-card",
  "limit-card",
  "fast-acct",
  "broker-acct",
  "skill-acct",
  "danet-acct",
];

const DEFAULT_PAY_WALLET: WalletKey = "salary-wallet";

function methodFor(w: WalletKey): PaymentMethod {
  if (w === "cbq") return "CBQ";
  if (w.endsWith("-card")) return "Card";
  if (w.endsWith("-acct")) return "Company Account";
  return "Cash";
}

export function SalaryReleaseDialog({
  trigger,
  presetName,
}: {
  trigger?: ReactNode;
  presetName?: string;
}) {
  const s = useFinance();
  const ledger = useMemo(() => salaryLedger(s), [s]);

  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState(presetName ?? "");
  const [company, setCompany] = useState<Company | undefined>(undefined);
  const [amount, setAmount] = useState<string>("");
  const [wallet, setWallet] = useState<WalletKey>(DEFAULT_PAY_WALLET);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);

  const selected = useMemo(
    () => ledger.find((e) => e.name.trim().toLowerCase() === name.trim().toLowerCase()),
    [ledger, name],
  );
  const balance = selected?.balance ?? 0;
  const value = Number(amount) || 0;
  const newBalance = balance - value;
  const exceeds = value > balance + 0.001;

  function pick(entry: { name: string; company?: Company }) {
    setName(entry.name);
    if (entry.company) setCompany(entry.company);
    setPickerOpen(false);
    setConfirming(false);
  }

  function reset() {
    setName(presetName ?? "");
    setCompany(undefined);
    setAmount("");
    setWallet(DEFAULT_PAY_WALLET);
    setDate(today());
    setNotes("");
    setConfirming(false);
    setQuery("");
  }

  function save() {
    addTransaction({
      date,
      type: "Salary Release",
      amount: value,
      candidate: name.trim(),
      company,
      purposeCategory: "Salary",
      purpose: "Housemaid salary release",
      paymentMethod: methodFor(wallet),
      fromWallet: wallet,
      toWallet: "external",
      status: "Completed",
      description: notes || undefined,
      currentLocation: "external",
    });
    toast.success(`Salary released · ${qar(value)}`, {
      description: `${name.trim()} · new balance ${qar(newBalance)}`,
    });
    setOpen(false);
    reset();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Select a housemaid");
    if (!value || value <= 0) return toast.error("Enter an amount");
    if (exceeds && !confirming) {
      setConfirming(true);
      return;
    }
    save();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) reset();
      }}
    >
      <DialogTrigger asChild>{trigger ?? <Button size="sm">Release salary</Button>}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Release housemaid salary</DialogTitle>
          <DialogDescription>
            Balances are calculated automatically from the salary ledger.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label className="text-xs">Housemaid name</Label>
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
                          onClick={() => pick({ name: query.trim() })}
                        >
                          Use "{query.trim()}" as a new housemaid
                        </button>
                      ) : (
                        "No housemaids yet."
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {ledger.map((e) => (
                        <CommandItem key={e.name} value={e.name} onSelect={() => pick(e)}>
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
                <span className="text-muted-foreground">Salary received</span>
                <span className="tabular">{qar(selected?.received ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already released</span>
                <span className="tabular">{qar(selected?.released ?? 0)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Current balance</span>
                <span className={cn("tabular", balance < 0 && "text-rose-400")}>{qar(balance)}</span>
              </div>
              {value > 0 && (
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>New balance</span>
                  <span className={cn("tabular", newBalance < 0 && "text-rose-400")}>{qar(newBalance)}</span>
                </div>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Company</Label>
              <Select value={company ?? ""} onValueChange={(v) => setCompany(v as Company)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {COMPANIES.map((c) => <SelectItem key={c} value={c}>{COMPANY_LABEL[c]}</SelectItem>)}
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
            <div className="space-y-1.5">
              <Label className="text-xs">Payment wallet</Label>
              <Select value={wallet} onValueChange={(v) => setWallet(v as WalletKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAY_WALLETS.map((k) => {
                    const w = WALLETS.find((x) => x.key === k)!;
                    return <SelectItem key={k} value={k}>{w.name}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          {exceeds && value > 0 && (
            <div className="rounded-md border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium">
                  Warning: This release exceeds the employee's available salary balance.
                </div>
                <div>
                  Continuing will create a temporary negative salary balance until additional salary is received.
                  New balance will be <span className="font-semibold tabular">{qar(newBalance)}</span>.
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant={exceeds && confirming ? "destructive" : "default"}>
              {exceeds ? (confirming ? "Proceed anyway" : "Release salary") : "Release salary"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
