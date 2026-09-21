import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowUpDown, CheckCircle2, Loader2, ScanLine, Search, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { useFinance } from "@/lib/finance-store";
import { listCandidates, type Candidate } from "@/lib/cv-management";
import { listSponsors, type Sponsor } from "@/lib/recruitment";
import { fileToBase64 } from "@/lib/dumonde-ops";
import { scanPoloSheet } from "@/lib/polo-scan.functions";
import { POLO_FEE_AMOUNT } from "@/lib/polo-fee";
import {
  buildPoloRows,
  createScanBatch,
  feeLocationLabel,
  feeRows,
  isReturned,
  listPoloEvents,
  markApproved,
  markReturned,
  nameKey,
  simpleStatusOf,
  walletName,
  type PoloEvent,
  type PoloListRow,
} from "@/lib/polo-batches";

import { qar, today } from "@/lib/format";
import { WALLETS } from "@/lib/finance-types";

export const Route = createFileRoute("/polo/")({
  head: () => ({
    meta: [
      { title: "POLO Tracking · Alhakeem Group ERP" },
      {
        name: "description",
        content:
          "Track every worker's POLO contract submission, returns, attempt count and where the QAR 160 fee currently sits.",
      },
      { property: "og:title", content: "POLO Tracking · Alhakeem Group ERP" },
      {
        property: "og:description",
        content: "Submission and return sheets, attempt history and fee location alerts in one list.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PoloListPage,
});

type SortKey = "date" | "worker" | "status" | "location";

type Decorated = PoloListRow & {
  simpleStatus: ReturnType<typeof simpleStatusOf>;
  returned: boolean;
  locationLabel: string;
  rowKey: string;
};

function PoloListPage() {
  const s = useFinance();
  const [events, setEvents] = useState<PoloEvent[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("all");
  const [returnedFilter, setReturnedFilter] = useState("all");
  const [wallet, setWallet] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [asc, setAsc] = useState(false);
  const [open, setOpen] = useState<PoloListRow | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [returnTarget, setReturnTarget] = useState<Decorated[] | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [ev, cs, sp] = await Promise.all([listPoloEvents(), listCandidates(), listSponsors()]);
      setEvents(ev);
      setCandidates(cs);
      setSponsors(sp);
      setSelected([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const sponsorNameFor = (workerId?: string, workerName?: string) => {
    const c =
      candidates.find((x) => x.id === workerId) ??
      candidates.find((x) => nameKey(x.fullName) === nameKey(workerName));
    if (!c?.sponsorId) return undefined;
    return sponsors.find((x) => x.id === c.sponsorId)?.fullName;
  };

  const rows = useMemo<Decorated[]>(() => {
    const now = today();
    return buildPoloRows(events, s.transactions, sponsorNameFor).map((r) => {
      const simpleStatus = simpleStatusOf(r, now);
      return {
        ...r,
        simpleStatus,
        returned: isReturned(r),
        locationLabel: feeLocationLabel(r, simpleStatus),
        rowKey: r.workerId ?? `name:${nameKey(r.workerName)}`,
      };
    });
  }, [events, s.transactions, candidates, sponsors]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (status !== "all" && r.simpleStatus !== status) return false;
      if (returnedFilter === "yes" && !r.returned) return false;
      if (returnedFilter === "no" && r.returned) return false;
      if (wallet !== "all" && r.location !== wallet) return false;
      if (needle) {
        const hay = [r.workerName, r.sponsorName, r.referenceCode, r.simpleStatus].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    const dir = asc ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sort) {
        case "worker":
          return a.workerName.localeCompare(b.workerName) * dir;
        case "status":
          return a.simpleStatus.localeCompare(b.simpleStatus) * dir;
        case "location":
          return a.locationLabel.localeCompare(b.locationLabel) * dir;
        default:
          return a.date.localeCompare(b.date) * dir;
      }
    });
  }, [rows, status, returnedFilter, wallet, q, sort, asc]);

  const selectable = filtered.filter((r) => !r.returned);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.includes(r.rowKey));
  const chosen = filtered.filter((r) => selected.includes(r.rowKey) && !r.returned);

  const toggleSort = (key: SortKey) => {
    if (sort === key) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(true);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="POLO Tracking"
        description={`Every worker's contract submission and where the QAR ${POLO_FEE_AMOUNT} fee is sitting right now.`}
        action={
          <div className="flex flex-wrap gap-2">
            <ScanButton candidates={candidates} transactions={s.transactions} sponsorNameFor={sponsorNameFor} onDone={load} />
            <Button size="sm" variant="outline" disabled={chosen.length === 0} onClick={() => setReturnTarget(chosen)}>
              <Undo2 className="h-4 w-4" /> Mark selected as returned{chosen.length ? ` (${chosen.length})` : ""}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/polo/bulk">Bulk transfer</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/polo/refunds">Refund queue</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border bg-card px-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search worker, sponsor, code…"
            className="h-9 w-56 border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={returnedFilter} onValueChange={setReturnedFilter}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Returned: any</SelectItem>
            <SelectItem value="yes">Returned: yes</SelectItem>
            <SelectItem value="no">Returned: no</SelectItem>
          </SelectContent>
        </Select>
        <Select value={wallet} onValueChange={setWallet}>
          <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fee locations</SelectItem>
            {WALLETS.map((w) => (
              <SelectItem key={w.key} value={w.key}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => setSelected(v === true ? selectable.map((r) => r.rowKey) : [])}
                />
              </TableHead>
              <TableHead className="w-10">#</TableHead>
              <SortHead label="Date" active={sort === "date"} onClick={() => toggleSort("date")} />
              <SortHead label="Worker" active={sort === "worker"} onClick={() => toggleSort("worker")} />
              <TableHead>Sponsor</TableHead>
              <SortHead label="Status" active={sort === "status"} onClick={() => toggleSort("status")} />
              <SortHead label="Fee location" active={sort === "location"} onClick={() => toggleSort("location")} />
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Returned?</TableHead>
              <TableHead>Note</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                  No submissions yet. Use “Scan submission sheet” to start.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r, i) => (
                <TableRow
                  key={`${r.rowKey}-${i}`}
                  onClick={() => setOpen(r)}
                  className={r.returned ? "cursor-pointer bg-destructive/5" : "cursor-pointer"}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      disabled={r.returned}
                      checked={selected.includes(r.rowKey)}
                      onCheckedChange={(v) =>
                        setSelected((prev) =>
                          v === true ? [...new Set([...prev, r.rowKey])] : prev.filter((k) => k !== r.rowKey),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.date || "—"}</TableCell>
                  <TableCell className="font-medium">
                    {r.workerId ? (
                      <Link
                        to="/recruitment/$id"
                        params={{ id: r.workerId }}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.workerName}
                      </Link>
                    ) : (
                      r.workerName
                    )}
                    {r.referenceCode ? (
                      <div className="text-xs text-muted-foreground">{r.referenceCode}</div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.sponsorName ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.simpleStatus === "Approved"
                          ? "default"
                          : r.simpleStatus === "Returned"
                            ? "destructive"
                            : "outline"
                      }
                    >
                      {r.simpleStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{r.locationLabel}</TableCell>
                  <TableCell className="text-right tabular">{qar(r.amount)}</TableCell>
                  <TableCell className="text-xs">{r.returned ? "Yes" : "No"}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{r.note ?? "—"}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {r.returned ? null : (
                      <Button size="sm" variant="ghost" onClick={() => setReturnTarget([r])}>
                        Return
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ReturnDialog rows={returnTarget} onClose={() => setReturnTarget(null)} onDone={load} />
      <RowDrawer row={open} onClose={() => setOpen(null)} onChanged={load} />
    </AppLayout>
  );
}

function ReturnDialog({
  rows,
  onClose,
  onDone,
}: {
  rows: Decorated[] | null;
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rows) {
      setDate(today());
      setNote("");
    }
  }, [rows]);

  const save = async () => {
    if (!rows?.length) return;
    setSaving(true);
    try {
      for (const r of rows) await markReturned(r, date, note || undefined);
      toast.success(`${rows.length} submission(s) marked as returned — added to the refund queue.`);
      onClose();
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the return.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!rows?.length} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as returned</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {rows?.map((r) => r.workerName).join(", ")}
          </p>
          <div className="space-y-1.5">
            <Label>Returned on</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for return" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Mark returned
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SortHead({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <TableHead>
      <button type="button" onClick={onClick} className="flex items-center gap-1 hover:text-foreground">
        {label}
        <ArrowUpDown className={active ? "h-3 w-3" : "h-3 w-3 opacity-30"} />
      </button>
    </TableHead>
  );
}


function ScanButton({
  type,
  candidates,
  transactions,
  sponsorNameFor,
  onDone,
}: {
  type: "submitted" | "returned";
  candidates: Candidate[];
  transactions: ReturnType<typeof useFinance>["transactions"];
  sponsorNameFor: (workerId?: string, workerName?: string) => string | undefined;
  onDone: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [image, setImage] = useState<string | undefined>();

  const label = type === "submitted" ? "Scan submission sheet" : "Scan return sheet";

  const handle = async (file: File) => {
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await scanPoloSheet({ data: { imageBase64: base64, mimeType: file.type || "image/jpeg" } });
      setImage(`data:${file.type || "image/jpeg"};base64,${base64}`);
      setLines(result.workers.map((w) => [w.name, w.referenceCode].filter(Boolean).join(" | ")).join("\n"));
      setDate(today());
      setNote("");
      setOpen(true);
      if (result.workers.length) toast.success(`Read ${result.workers.length} name(s) — please check them.`);
      else toast.warning("No names could be read. Type them in by hand.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that photo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const save = async () => {
    const workers = lines
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [name, code] = l.split("|").map((p) => p.trim());
        return code ? { name, referenceCode: code } : { name };
      })
      .filter((w) => !!w.name);
    if (workers.length === 0) {
      toast.error("Add at least one worker name.");
      return;
    }
    setSaving(true);
    try {
      const res = await createScanBatch({
        type,
        scanDate: date,
        image,
        note: note || undefined,
        workers,
        candidates,
        transactions,
        sponsorNameFor,
      });
      toast.success(
        `Saved ${res.saved} worker(s)${res.moved ? `, moved ${res.moved} × ${POLO_FEE_AMOUNT} back to the holding wallet` : ""}.`,
      );
      setOpen(false);
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the sheet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handle(file);
        }}
      />
      <Button size="sm" variant={type === "submitted" ? "default" : "outline"} disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        {busy ? "Reading…" : label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{type === "submitted" ? "Submission sheet" : "Return sheet"} — check the names</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Sheet date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Workers — one per line, optional code after “|”</Label>
              <Textarea rows={10} value={lines} onChange={(e) => setLines(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RowDrawer({
  row,
  onClose,
  onChanged,
}: {
  row: PoloListRow | null;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const s = useFinance();
  const [busy, setBusy] = useState(false);
  const fees = useMemo(
    () => (row ? feeRows(s.transactions, row.workerId, row.workerName) : []),
    [row, s.transactions],
  );

  const approve = async () => {
    if (!row) return;
    setBusy(true);
    try {
      await markApproved(row, today());
      toast.success("Marked as approved.");
      onClose();
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={!!row} onOpenChange={(v) => (v ? null : onClose())}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {row ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {row.workerName}
                <Badge variant="outline">{row.statusLabel}</Badge>
                {row.alert ? <Badge variant="destructive">Collect from wallet</Badge> : null}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4 px-4 pb-6">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Info label="Sponsor" value={row.sponsorName ?? "—"} />
                <Info label="Reference code" value={row.referenceCode ?? "—"} />
                <Info label="Attempt" value={String(row.attempt)} />
                <Info label="Fee location" value={walletName(row.location)} />
              </div>

              {row.status !== "Approved" ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void approve()}>
                  <CheckCircle2 className="h-4 w-4" /> Mark approved
                </Button>
              ) : null}

              <Tabs defaultValue="timeline">
                <TabsList>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="fees">Fee history</TabsTrigger>
                </TabsList>
                <TabsContent value="timeline" className="space-y-2 pt-3">
                  {row.events.map((e) => (
                    <div key={e.id} className="rounded-md border bg-card p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium capitalize">
                          Attempt {e.attemptNo} · {e.eventType}
                        </span>
                        <span className="text-xs text-muted-foreground">{e.eventDate}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Fee at: {walletName(e.feeLocation)}
                        {e.note ? ` · ${e.note}` : ""}
                      </div>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="fees" className="pt-3">
                  {fees.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No fee records for this worker yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {fees.map((t) => (
                        <div key={t.id} className="rounded-md border bg-card p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{qar(t.amount)}</span>
                            <span className="text-xs text-muted-foreground">{t.date}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{t.purpose}</div>
                          <div className="mt-1 text-xs">
                            {walletName(t.fromWallet)} → {walletName(t.currentLocation ?? t.toWallet)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
