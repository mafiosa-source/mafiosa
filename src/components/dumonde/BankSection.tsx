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
import { Plus, Trash2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { qar } from "@/lib/format";
import { LocationInput } from "./LocationInput";
import { ScanUpload } from "./ScanUpload";
import {
  bankVsSales,
  deleteStatement,
  duMondeFileUrl,
  duMondeLocations,
  saveStatement,
  uploadDuMondeFile,
  useDuMonde,
  type DmBankLine,
} from "@/lib/dumonde-ops";

const today = () => new Date().toISOString().slice(0, 10);

export function BankSection({ from, to }: { from?: string; to?: string }) {
  const s = useDuMonde();
  const locations = duMondeLocations(s);
  const comparison = useMemo(() => bankVsSales(s, from, to), [s, from, to]);

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [lines, setLines] = useState<DmBankLine[]>([{ date: today(), direction: "in", amount: 0 }]);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setLabel("");
    setFromDate("");
    setToDate("");
    setLines([{ date: today(), direction: "in", amount: 0 }]);
    setFile(null);
  };

  const setLine = (idx: number, patch: Partial<DmBankLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const submit = async () => {
    const clean = lines.filter((l) => l.amount > 0);
    if (!label.trim()) return toast.error("Give the statement a name.");
    if (!clean.length) return toast.error("Add at least one line.");
    setSaving(true);
    try {
      const attachmentUrl = file ? await uploadDuMondeFile(file, "bank") : undefined;
      await saveStatement({
        label: label.trim(),
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        attachmentUrl,
        lines: clean,
      });
      toast.success("Statement saved.");
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const openAttachment = async (path: string) => {
    const url = await duMondeFileUrl(path);
    if (url) window.open(url, "_blank");
    else toast.error("File not available.");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Upload the bank statement, check the lines that were read, then compare the bank money in with the sales you entered.
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
              <Plus className="h-4 w-4" /> Upload statement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bank statement</DialogTitle>
              <DialogDescription>
                Upload a PDF, spreadsheet or photo. Correct anything before saving, and tag lines with a location so they
                can be compared against sales.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Statement name</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. CBQ August" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ScanUpload
                kind="bank"
                label="Scan / upload statement"
                onResult={(res, f) => {
                  setFile(f);
                  if (res.label && !label) setLabel(res.label);
                  if (res.fromDate) setFromDate(res.fromDate);
                  if (res.toDate) setToDate(res.toDate);
                  const parsed = res.lines
                    .filter((l) => l.amount !== undefined)
                    .map<DmBankLine>((l) => ({
                      date: l.date ?? today(),
                      description: l.description,
                      direction: l.direction === "out" ? "out" : "in",
                      amount: Math.abs(l.amount ?? 0),
                    }));
                  if (parsed.length) setLines(parsed);
                }}
              />
              {file ? <span className="text-xs text-muted-foreground">{file.name}</span> : null}
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-36">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-40">Location</TableHead>
                    <TableHead className="w-28">In / Out</TableHead>
                    <TableHead className="w-28">Amount</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input type="date" value={l.date} onChange={(e) => setLine(i, { date: e.target.value })} className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={l.description ?? ""}
                          onChange={(e) => setLine(i, { description: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <LocationInput
                          value={l.location ?? ""}
                          onChange={(v) => setLine(i, { location: v })}
                          options={locations}
                          id={`bank-loc-${i}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={l.direction} onValueChange={(v) => setLine(i, { direction: v as "in" | "out" })}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="in">Money In</SelectItem>
                            <SelectItem value="out">Money Out</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={l.amount}
                          onChange={(e) => setLine(i, { amount: Number(e.target.value) || 0 })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            setLines((prev) =>
                              prev.length === 1 ? [{ date: today(), direction: "in", amount: 0 }] : prev.filter((_, x) => x !== i),
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="border-t p-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLines((p) => [...p, { date: today(), direction: "in", amount: 0 }])}
                >
                  <Plus className="h-4 w-4" /> Add line
                </Button>
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
        <div className="border-b p-3 text-sm font-medium">Uploaded statements</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Statement</TableHead>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Money In</TableHead>
              <TableHead className="text-right">Money Out</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.statements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No statements uploaded yet.
                </TableCell>
              </TableRow>
            ) : (
              s.statements.map((st) => (
                <TableRow key={st.id}>
                  <TableCell>{st.label}</TableCell>
                  <TableCell className="tabular text-muted-foreground">
                    {st.fromDate || "—"} → {st.toDate || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {qar(st.lines.filter((l) => l.direction === "in").reduce((n, l) => n + l.amount, 0))}
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {qar(st.lines.filter((l) => l.direction === "out").reduce((n, l) => n + l.amount, 0))}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {st.attachmentUrl ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void openAttachment(st.attachmentUrl!)}>
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (window.confirm("Delete this statement?"))
                            void deleteStatement(st.id).catch((e) =>
                              toast.error(e instanceof Error ? e.message : "Could not delete."),
                            );
                        }}
                      >
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

      <div className="rounded-lg border bg-card">
        <div className="border-b p-3 text-sm font-medium">Bank money in vs sales entered</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Sales entered</TableHead>
              <TableHead className="text-right">Bank money in</TableHead>
              <TableHead className="text-right">Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Nothing to compare in this period yet.
                </TableCell>
              </TableRow>
            ) : (
              comparison.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="tabular">{r.date}</TableCell>
                  <TableCell>{r.location}</TableCell>
                  <TableCell className="text-right tabular">{qar(r.entered)}</TableCell>
                  <TableCell className="text-right tabular">{qar(r.bank)}</TableCell>
                  <TableCell className="text-right">
                    {Math.abs(r.variance) < 0.01 ? (
                      <Badge variant="secondary">Matches</Badge>
                    ) : (
                      <span className="tabular font-medium text-[color:var(--destructive)]">{qar(r.variance)}</span>
                    )}
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
