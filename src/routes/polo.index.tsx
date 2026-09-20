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
import { AlertTriangle, ArrowUpDown, CheckCircle2, Loader2, ScanLine, Search } from "lucide-react";
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
  feeRows,
  listPoloEvents,
  markApproved,
  nameKey,
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

type SortKey = "date" | "worker" | "status" | "attempt" | "location";

function PoloListPage() {
  const s = useFinance();
  const [events, setEvents] = useState<PoloEvent[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("all");
  const [alertOnly, setAlertOnly] = useState(false);
  const [wallet, setWallet] = useState("all");
  const [attempt, setAttempt] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [asc, setAsc] = useState(false);
  const [open, setOpen] = useState<PoloListRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [ev, cs, sp] = await Promise.all([listPoloEvents(), listCandidates(), listSponsors()]);
      setEvents(ev);
      setCandidates(cs);
      setSponsors(sp);
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

  const rows = useMemo(
    () => buildPoloRows(events, s.transactions, sponsorNameFor),
    [events, s.transactions, candidates, sponsors],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (alertOnly && !r.alert) return false;
      if (wallet !== "all" && r.location !== wallet) return false;
      if (attempt !== "all" && String(r.attempt) !== attempt) return false;
      if (needle) {
        const hay = [r.workerName, r.sponsorName, r.referenceCode, r.statusLabel].join(" ").toLowerCase();
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
          return a.statusLabel.localeCompare(b.statusLabel) * dir;
        case "attempt":
          return (a.attempt - b.attempt) * dir;
        case "location":
          return walletName(a.location).localeCompare(walletName(b.location)) * dir;
        default:
          return a.date.localeCompare(b.date) * dir;
      }
    });
  }, [rows, status, alertOnly, wallet, attempt, q, sort, asc]);

  const attempts = useMemo(
    () => Array.from(new Set(rows.map((r) => r.attempt))).sort((a, b) => a - b),
    [rows],
  );
  const alerts = rows.filter((r) => r.alert).length;

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
        description={`Every worker's contract submissions, returns and where the QAR ${POLO_FEE_AMOUNT} fee is sitting right now.`}
        action={
          <div className="flex flex-wrap gap-2">
            <ScanButton type="submitted" candidates={candidates} transactions={s.transactions} sponsorNameFor={sponsorNameFor} onDone={load} />
            <ScanButton type="returned" candidates={candidates} transactions={s.transactions} sponsorNameFor={sponsorNameFor} onDone={load} />
            <Button size="sm" variant="outline" asChild>
              <Link to="/polo/bulk">Bulk transfer</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/polo/refunds">Refund queue</Link>
            </Button>
          </div>
        }
      />

      {alerts > 0 ? (
        <Card className="mb-4 border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-4 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {alerts} worker{alerts === 1 ? " has" : "s have"} a submitted contract while the fee is still sitting in a
            company account. Collect it or record the bulk transfer.
          </CardContent>
        </Card>
      ) : null}

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
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Submitted">Submitted</SelectItem>
            <SelectItem value="Returned">Returned</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
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
        <Select value={attempt} onValueChange={setAttempt}>
          <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All attempts</SelectItem>
            {attempts.map((a) => (
              <SelectItem key={a} value={String(a)}>Attempt {a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={alertOnly} onCheckedChange={(v) => setAlertOnly(v === true)} />
          Alerts only
        </label>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <SortHead label="Date" active={sort === "date"} onClick={() => toggleSort("date")} />
              <SortHead label="Worker" active={sort === "worker"} onClick={() => toggleSort("worker")} />
              <TableHead>Sponsor</TableHead>
              <SortHead label="Status" active={sort === "status"} onClick={() => toggleSort("status")} />
              <SortHead label="Attempt" active={sort === "attempt"} onClick={() => toggleSort("attempt")} />
              <SortHead label="Fee location" active={sort === "location"} onClick={() => toggleSort("location")} />
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Alert</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                  No scanned sheets yet. Use “Scan submission sheet” to start.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r, i) => (
                <TableRow
                  key={`${r.workerId ?? r.workerName}-${i}`}
                  onClick={() => setOpen(r)}
                  className={r.alert ? "cursor-pointer bg-destructive/10 hover:bg-destructive/15" : "cursor-pointer"}
                >
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
                    <Badge variant={r.status === "Approved" ? "default" : "outline"}>{r.statusLabel}</Badge>
                  </TableCell>
                  <TableCell>{r.attempt}</TableCell>
                  <TableCell className="text-xs">{walletName(r.location)}</TableCell>
                  <TableCell className="text-right tabular">{qar(r.amount)}</TableCell>
                  <TableCell>
                    {r.alert ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" /> Collect
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{r.note ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RowDrawer row={open} onClose={() => setOpen(null)} onChanged={load} />
    </AppLayout>
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
