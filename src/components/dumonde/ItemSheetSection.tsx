import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Paperclip, Pencil } from "lucide-react";
import { toast } from "sonner";
import { qar } from "@/lib/format";
import { LocationInput } from "./LocationInput";
import { ScanUpload } from "./ScanUpload";
import {
  deleteLpo,
  deleteSale,
  duMondeFileUrl,
  duMondeLocations,
  inPeriod,
  saveLpo,
  saveSale,
  uploadDuMondeFile,
  useDuMonde,
  type DmLpo,
  type DmSale,
} from "@/lib/dumonde-ops";

type Row = { name: string; qty: number; unit?: string; price: number; total: number };

const emptyRow = (): Row => ({ name: "", qty: 1, unit: "", price: 0, total: 0 });
const today = () => new Date().toISOString().slice(0, 10);

export function ItemSheetSection({
  mode,
  from,
  to,
}: {
  mode: "lpo" | "sales";
  from?: string;
  to?: string;
}) {
  const s = useDuMonde();
  const isLpo = mode === "lpo";
  const locations = duMondeLocations(s);
  const records = useMemo(
    () =>
      (isLpo ? s.lpos : s.sales).filter((r) => inPeriod(r.date, from, to)),
    [s.lpos, s.sales, isLpo, from, to],
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DmLpo | DmSale | null>(null);
  const [date, setDate] = useState(today());
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [file, setFile] = useState<File | null>(null);
  const [attachment, setAttachment] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const total = rows.reduce((n, r) => n + (r.total || r.qty * r.price), 0);

  const reset = () => {
    setEditing(null);
    setDate(today());
    setLocation(locations[0] ?? "");
    setNotes("");
    setRows([emptyRow()]);
    setFile(null);
    setAttachment(undefined);
  };

  const startEdit = (rec: DmLpo | DmSale) => {
    setEditing(rec);
    setDate(rec.date);
    setLocation(rec.location);
    setNotes(rec.notes ?? "");
    setAttachment(rec.attachmentUrl);
    setFile(null);
    setRows(
      rec.items.length
        ? rec.items.map((i) =>
            "unitCost" in i
              ? { name: i.name, qty: i.qty, unit: i.unit ?? "", price: i.unitCost, total: i.total }
              : { name: i.name, qty: i.qty, unit: "", price: i.unitPrice, total: i.total },
          )
        : [emptyRow()],
    );
    setOpen(true);
  };

  const setRow = (idx: number, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const next = { ...r, ...patch };
        if (patch.qty !== undefined || patch.price !== undefined) next.total = next.qty * next.price;
        return next;
      }),
    );

  const submit = async () => {
    const clean = rows.filter((r) => r.name.trim());
    if (!location.trim()) return toast.error("Enter the location.");
    if (!clean.length) return toast.error("Add at least one item.");
    setSaving(true);
    try {
      let attachmentUrl = attachment;
      if (file) attachmentUrl = await uploadDuMondeFile(file, mode);
      if (isLpo) {
        await saveLpo(
          {
            date,
            location: location.trim(),
            notes: notes.trim() || undefined,
            attachmentUrl,
            items: clean.map((r) => ({
              name: r.name.trim(),
              qty: r.qty,
              unit: r.unit?.trim() || undefined,
              unitCost: r.price,
              total: r.total || r.qty * r.price,
            })),
          },
          editing?.id,
        );
      } else {
        await saveSale(
          {
            date,
            location: location.trim(),
            notes: notes.trim() || undefined,
            attachmentUrl,
            items: clean.map((r) => ({
              name: r.name.trim(),
              qty: r.qty,
              unitPrice: r.price,
              total: r.total || r.qty * r.price,
            })),
          },
          editing?.id,
        );
      }
      toast.success(isLpo ? "LPO saved." : "Sales saved.");
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(isLpo ? "Delete this LPO and its linked cost?" : "Delete this sales entry?")) return;
    try {
      await (isLpo ? deleteLpo(id) : deleteSale(id));
      toast.success("Deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete.");
    }
  };

  const openAttachment = async (path: string) => {
    const url = await duMondeFileUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("File not available.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {isLpo
            ? "Items needed for tomorrow, per location. Costs flow into Expenses automatically."
            : "Sales sheets per day and location, item by item."}
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
              <Plus className="h-4 w-4" /> {isLpo ? "New LPO" : "New sales entry"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isLpo ? "Purchase order (LPO)" : "Sales entry"}</DialogTitle>
              <DialogDescription>
                Scan a sheet to fill the lines automatically, or type them in. You can correct anything before saving.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Location</Label>
                <LocationInput value={location} onChange={setLocation} options={locations} id={`${mode}-loc`} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ScanUpload
                kind={isLpo ? "lpo" : "sales"}
                onResult={(res, f) => {
                  setFile(f);
                  if (res.date) setDate(res.date);
                  if (res.location && !location) setLocation(res.location);
                  const parsed = res.lines
                    .filter((l) => l.name)
                    .map<Row>((l) => {
                      const qty = l.qty ?? 1;
                      const price = (isLpo ? l.unitCost : l.unitPrice) ?? (l.total && qty ? l.total / qty : 0);
                      return {
                        name: (l.name ?? "").toUpperCase(),
                        qty,
                        unit: l.unit ?? "",
                        price,
                        total: l.total ?? qty * price,
                      };
                    });
                  if (parsed.length) setRows(parsed);
                }}
              />
              {file ? <span className="text-xs text-muted-foreground">{file.name}</span> : null}
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-20">Qty</TableHead>
                    {isLpo ? <TableHead className="w-24">Unit</TableHead> : null}
                    <TableHead className="w-28">{isLpo ? "Unit cost" : "Unit price"}</TableHead>
                    <TableHead className="w-28 text-right">Total</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input
                          value={r.name}
                          onChange={(e) => setRow(i, { name: e.target.value })}
                          placeholder="Item name"
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={r.qty}
                          onChange={(e) => setRow(i, { qty: Number(e.target.value) || 0 })}
                          className="h-8"
                        />
                      </TableCell>
                      {isLpo ? (
                        <TableCell>
                          <Input
                            value={r.unit ?? ""}
                            onChange={(e) => setRow(i, { unit: e.target.value })}
                            placeholder="kg"
                            className="h-8"
                          />
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={r.price}
                          onChange={(e) => setRow(i, { price: Number(e.target.value) || 0 })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular">{qar(r.total || r.qty * r.price)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((_, x) => x !== i)))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t p-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setRows((p) => [...p, emptyRow()])}>
                  <Plus className="h-4 w-4" /> Add line
                </Button>
                <span className="text-sm font-semibold tabular">Total {qar(total)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nothing recorded for this period yet.
                </TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular">{r.date}</TableCell>
                  <TableCell>{r.location}</TableCell>
                  <TableCell className="max-w-[380px] truncate text-muted-foreground">
                    {r.items.map((i) => `${i.name} x${i.qty}`).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular font-medium">{qar(r.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.attachmentUrl ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void openAttachment(r.attachmentUrl!)}>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void remove(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
