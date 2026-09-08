import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { qar } from "@/lib/format";
import { LocationInput } from "./LocationInput";
import { DuMondeEntryDialog, type DuMondeEntry } from "./DuMondeEntryDialog";
import {
  DM_EXPENSE_CATEGORIES,
  deleteExpense,
  duMondeLocations,
  inPeriod,
  postExpenseToLedger,
  saveExpense,
  useDuMonde,
  type DmExpense,
} from "@/lib/dumonde-ops";

const today = () => new Date().toISOString().slice(0, 10);

export function ExpensesSection({ from, to }: { from?: string; to?: string }) {
  const s = useDuMonde();
  const locations = duMondeLocations(s);
  const rows = useMemo(() => s.expenses.filter((e) => inPeriod(e.date, from, to)), [s.expenses, from, to]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DmExpense | null>(null);
  const [date, setDate] = useState(today());
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [particulars, setParticulars] = useState("");
  const [amount, setAmount] = useState("0");
  const [saving, setSaving] = useState(false);
  const [entry, setEntry] = useState<DuMondeEntry | null>(null);

  const reset = () => {
    setEditing(null);
    setDate(today());
    setLocation(locations[0] ?? "");
    setCategory("Other");
    setParticulars("");
    setAmount("0");
  };

  const startEdit = (e: DmExpense) => {
    setEditing(e);
    setDate(e.date);
    setLocation(e.location);
    setCategory(e.category);
    setParticulars(e.particulars ?? "");
    setAmount(String(e.amount));
    setOpen(true);
  };

  const submit = async () => {
    if (!location.trim()) return toast.error("Enter the location.");
    setSaving(true);
    try {
      await saveExpense(
        {
          date,
          location: location.trim(),
          category,
          particulars: particulars.trim() || undefined,
          amount: Number(amount) || 0,
        },
        editing?.id,
      );
      toast.success("Expense saved.");
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const salesFor = (e: DmExpense) =>
    s.sales.filter((x) => x.date === e.date && x.location === e.location).reduce((n, x) => n + x.total, 0);

  const total = rows.reduce((n, e) => n + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          LPO costs appear here automatically. Each cost is matched to the sales of the same date and location.
        </p>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> New expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Du Monde expense</DialogTitle>
              <DialogDescription>Other running costs besides the LPO items.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <LocationInput value={location} onChange={setLocation} options={locations} id="exp-loc" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DM_EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Amount</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Particulars</Label>
                <Input value={particulars} onChange={(e) => setParticulars(e.target.value)} className="h-9" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Particulars</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Sales same day</TableHead>
              <TableHead className="w-36 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No expenses in this period yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((e) => (
                <TableRow
                  key={e.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() =>
                    setEntry({
                      kind: "Expense",
                      date: e.date,
                      location: e.location,
                      category: e.category,
                      notes: e.particulars,
                      total: e.amount,
                    })
                  }
                >
                  <TableCell className="tabular">{e.date}</TableCell>
                  <TableCell>{e.location}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {e.category}
                      {e.lpoId ? <Badge variant="secondary">from LPO</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">{e.particulars ?? "—"}</TableCell>
                  <TableCell className="text-right tabular font-medium">{qar(e.amount)}</TableCell>
                  <TableCell className="text-right tabular text-muted-foreground">{qar(salesFor(e))}</TableCell>
                  <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {e.txnId ? (
                        <Badge variant="outline">In ledger</Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          title="Also record in Du Monde petty cash"
                          onClick={() => {
                            void postExpenseToLedger(e)
                              .then(() => toast.success("Added to Du Monde petty cash."))
                              .catch((err) => toast.error(err instanceof Error ? err.message : "Could not post."));
                          }}
                        >
                          <ArrowUpRight className="h-4 w-4" /> Post
                        </Button>
                      )}
                      {e.lpoId ? null : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {e.lpoId ? null : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (window.confirm("Delete this expense?"))
                              void deleteExpense(e.id).catch((err) =>
                                toast.error(err instanceof Error ? err.message : "Could not delete."),
                              );
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex justify-end border-t p-3 text-sm font-semibold tabular">Total {qar(total)}</div>
      </div>

      <DuMondeEntryDialog entry={entry} open={!!entry} onOpenChange={(v) => { if (!v) setEntry(null); }} />
    </div>
  );
}
