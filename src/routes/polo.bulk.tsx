import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, Download, Loader2, Printer, Upload } from "lucide-react";
import { toast } from "sonner";
import { MultiSelect } from "@/components/MultiSelect";
import { useFinance } from "@/lib/finance-store";
import { fileToBase64 } from "@/lib/dumonde-ops";
import { POLO_FEE_AMOUNT } from "@/lib/polo-fee";
import {
  createBulk,
  FEE_SOURCE_WALLETS,
  HOLDING_WALLET,
  listBulkItems,
  listBulkTransfers,
  nextBulkRef,
  refundToPetty,
  signBulkItem,
  transferableFees,
  walletName,
  type BulkItem,
  type BulkTransfer,
} from "@/lib/polo-batches";
import type { WalletKey } from "@/lib/finance-types";
import { exportCsv, qar, today } from "@/lib/format";

export const Route = createFileRoute("/polo/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk Transfer to Holding · Alhakeem Group ERP" },
      {
        name: "description",
        content:
          "Group POLO fees sitting in a company account into one bulk transfer to the holding wallet and sign each worker in.",
      },
      { property: "og:title", content: "Bulk Transfer to Holding · Alhakeem Group ERP" },
      {
        property: "og:description",
        content: "Create bulk transfers of the QAR 160 fee and confirm receipt worker by worker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BulkPage,
});

function BulkPage() {
  const s = useFinance();
  const [bulks, setBulks] = useState<BulkTransfer[]>([]);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [from, setFrom] = useState<WalletKey>("fast-acct");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [openBulk, setOpenBulk] = useState<BulkTransfer | null>(null);

  const load = async () => {
    try {
      const [b, i] = await Promise.all([listBulkTransfers(), listBulkItems()]);
      setBulks(b);
      setItems(i);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load bulk transfers.");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const available = useMemo(() => transferableFees(s.transactions, from, items), [s.transactions, from, items]);
  const ref = useMemo(() => nextBulkRef(from, bulks), [from, bulks]);
  const selected = available.filter((t) => picked.includes(t.id));
  const total = selected.reduce((sum, t) => sum + t.amount, 0);

  useEffect(() => {
    setPicked([]);
  }, [from]);

  const create = async () => {
    if (selected.length === 0) {
      toast.error("Choose at least one worker.");
      return;
    }
    setSaving(true);
    try {
      await createBulk({ fromAccount: from, ref, date, note: note || undefined, fees: selected });
      toast.success(`Bulk ${ref} created with ${selected.length} worker(s).`);
      setPicked([]);
      setNote("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the bulk transfer.");
    } finally {
      setSaving(false);
    }
  };

  const pending = bulks.filter((b) => b.status === "pending");
  const done = bulks.filter((b) => b.status === "completed");

  return (
    <AppLayout>
      <PageHeader
        title="Bulk Transfer to Holding"
        description={`Group the QAR ${POLO_FEE_AMOUNT} fees sitting in one company account and move them into the holding wallet once Mr Hassan signs each worker in.`}
        action={
          <Button size="sm" variant="outline" asChild>
            <Link to="/polo">Back to POLO list</Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">New bulk transfer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label>From account</Label>
              <Select value={from} onValueChange={(v) => setFrom(v as WalletKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEE_SOURCE_WALLETS.map((w) => (
                    <SelectItem key={w} value={w}>{walletName(w)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>To account</Label>
              <Input value={walletName(HOLDING_WALLET)} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input value={ref} readOnly />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Select workers</Label>
            <MultiSelect
              className="w-full max-w-md"
              allLabel="No workers selected"
              value={picked}
              onChange={setPicked}
              options={available.map((t) => ({
                value: t.id,
                label: `${t.candidate ?? "—"} · ${t.sponsor ?? "—"} · ${t.date} · ${qar(t.amount)}`,
              }))}
            />
            <p className="text-xs text-muted-foreground">
              {available.length} fee record{available.length === 1 ? "" : "s"} still in {walletName(from)}.
            </p>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Sponsor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      Nothing selected yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {selected.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.candidate ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{t.sponsor ?? "—"}</TableCell>
                        <TableCell>{t.date}</TableCell>
                        <TableCell className="text-right tabular">{qar(t.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="font-medium">
                        {selected.length} worker(s) × {qar(POLO_FEE_AMOUNT)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular">{qar(total)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} className="w-72" />
            </div>
            <Button disabled={saving} onClick={() => void create()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create bulk
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold">Pending signatures</h2>
      <BulkList bulks={pending} items={items} onOpen={setOpenBulk} empty="No bulk transfers waiting for a signature." />

      <h2 className="mb-3 mt-6 text-sm font-semibold">Completed bulks</h2>
      <BulkList bulks={done} items={items} onOpen={setOpenBulk} empty="No completed bulk transfers yet." />

      <BulkDialog bulk={openBulk} onClose={() => setOpenBulk(null)} onChanged={load} />
    </AppLayout>
  );
}

function BulkList({
  bulks,
  items,
  onOpen,
  empty,
}: {
  bulks: BulkTransfer[];
  items: BulkItem[];
  onOpen: (b: BulkTransfer) => void;
  empty: string;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead>Workers</TableHead>
            <TableHead>Signed</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bulks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">{empty}</TableCell>
            </TableRow>
          ) : (
            bulks.map((b) => {
              const own = items.filter((i) => i.bulkId === b.id);
              const signed = own.filter((i) => i.signStatus === "signed").length;
              return (
                <TableRow key={b.id} className="cursor-pointer" onClick={() => onOpen(b)}>
                  <TableCell className="font-medium">{b.ref}</TableCell>
                  <TableCell>{b.transferDate}</TableCell>
                  <TableCell className="text-xs">{walletName(b.fromAccount)}</TableCell>
                  <TableCell className="text-xs">{walletName(b.toAccount)}</TableCell>
                  <TableCell>{own.length}</TableCell>
                  <TableCell>{signed}/{own.length}</TableCell>
                  <TableCell className="text-right tabular">{qar(b.total)}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === "completed" ? "default" : "outline"}>{b.status}</Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function BulkDialog({
  bulk,
  onClose,
  onChanged,
}: {
  bulk: BulkTransfer | null;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const s = useFinance();
  const [items, setItems] = useState<BulkItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingItem = useRef<BulkItem | null>(null);

  const load = async () => {
    if (!bulk) return;
    setItems(await listBulkItems(bulk.id));
  };

  useEffect(() => {
    void load();
  }, [bulk?.id]);

  const sign = async (item: BulkItem, proof?: string) => {
    if (!bulk) return;
    setBusy(item.id);
    try {
      const fee = s.transactions.find((t) => t.id === item.feeTransactionId);
      await signBulkItem({ bulk, item, fee, proof, date: today() });
      toast.success(`${item.workerName ?? "Worker"} signed in — fee moved to the holding wallet.`);
      await load();
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign this worker in.");
    } finally {
      setBusy(null);
    }
  };

  const statement = () =>
    items.map((i, idx) => ({
      index: idx + 1,
      date: bulk?.transferDate ?? "",
      sponsor: i.sponsorName ?? "",
      worker: i.workerName ?? "",
      in: i.amount,
      signIn: i.signStatus === "signed" ? (i.signedBy ?? "signed") : "",
      proof: i.proof ? "yes" : "",
      out: "",
      signOut: "",
    }));

  const print = () => {
    const rows = statement();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${bulk?.ref ?? "Bulk"} statement</title>
      <style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #999;padding:6px;text-align:left}th{background:#eee}</style></head><body>
      <h2>Bulk transfer statement — ${bulk?.ref ?? ""}</h2>
      <p>${walletName(bulk?.fromAccount)} → ${walletName(bulk?.toAccount)} · ${bulk?.transferDate ?? ""} · Total ${qar(bulk?.total ?? 0)}</p>
      <table><thead><tr><th>Index</th><th>Date</th><th>Sponsor</th><th>Worker</th><th>In</th><th>Sign In</th><th>Proof</th><th>Out</th><th>Sign Out</th></tr></thead><tbody>
      ${rows
        .map(
          (r) =>
            `<tr><td>${r.index}</td><td>${r.date}</td><td>${r.sponsor}</td><td>${r.worker}</td><td>${r.in}</td><td>${r.signIn}</td><td>${r.proof}</td><td></td><td></td></tr>`,
        )
        .join("")}
      </tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Dialog open={!!bulk} onOpenChange={(v) => (v ? null : onClose())}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        {bulk ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {bulk.ref}
                <Badge variant={bulk.status === "completed" ? "default" : "outline"}>{bulk.status}</Badge>
                <span className="text-sm font-normal text-muted-foreground">
                  {walletName(bulk.fromAccount)} → {walletName(bulk.toAccount)} · {qar(bulk.total)}
                </span>
              </DialogTitle>
            </DialogHeader>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                const item = pendingItem.current;
                if (!file || !item) return;
                const base64 = await fileToBase64(file);
                await sign(item, `data:${file.type || "image/jpeg"};base64,${base64}`);
                pendingItem.current = null;
                if (fileRef.current) fileRef.current.value = "";
              }}
            />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Sponsor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Sign in</TableHead>
                  <TableHead>Proof</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i, idx) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>{i.workerName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.sponsorName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular">{qar(i.amount)}</TableCell>
                    <TableCell>
                      {i.signStatus === "signed" ? (
                        <Badge variant="outline" className="gap-1">
                          <Check className="h-3 w-3" /> {i.signDate}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{i.proof ? "Attached" : "—"}</TableCell>
                    <TableCell className="text-right">
                      {i.signStatus === "signed" ? null : (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === i.id}
                            onClick={() => {
                              pendingItem.current = i;
                              fileRef.current?.click();
                            }}
                          >
                            <Upload className="h-3.5 w-3.5" /> Proof
                          </Button>
                          <Button size="sm" disabled={busy === i.id} onClick={() => void sign(i)}>
                            {busy === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Confirm & sign in
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <DialogFooter className="flex-wrap gap-2">
              {bulk.status === "completed" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    for (const i of items) {
                      refundToPetty(
                        { workerName: i.workerName ?? "—", workerId: i.workerId, sponsorName: i.sponsorName } as never,
                        today(),
                        i.amount,
                      );
                    }
                    toast.success("Petty cash refund recorded for this bulk.");
                  }}
                >
                  Refund to petty cash
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => exportCsv(`${bulk.ref}-statement.csv`, statement())}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={print}>
                <Printer className="h-4 w-4" /> Print statement
              </Button>
              <Button size="sm" onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
