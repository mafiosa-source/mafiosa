import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFinance } from "@/lib/finance-store";
import { listCandidates, type Candidate } from "@/lib/cv-management";
import { listSponsors, type Sponsor } from "@/lib/recruitment";
import { POLO_FEE_AMOUNT } from "@/lib/polo-fee";
import {
  buildPoloRows,
  listPoloEvents,
  markRefunded,
  nameKey,
  walletName,
  type PoloEvent,
  type PoloListRow,
} from "@/lib/polo-batches";
import { qar, today } from "@/lib/format";

export const Route = createFileRoute("/polo/refunds")({
  head: () => ({
    meta: [
      { title: "POLO Refund Queue · Alhakeem Group ERP" },
      {
        name: "description",
        content: "Cancelled workers whose QAR 160 POLO fee was never approved and is still owed back to the sponsor.",
      },
      { property: "og:title", content: "POLO Refund Queue · Alhakeem Group ERP" },
      {
        property: "og:description",
        content: "See which sponsors are owed the fee back and record the refund in the ledger.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RefundQueuePage,
});

function RefundQueuePage() {
  const s = useFinance();
  const [events, setEvents] = useState<PoloEvent[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [ev, cs, sp] = await Promise.all([listPoloEvents(), listCandidates(), listSponsors()]);
      setEvents(ev);
      setCandidates(cs);
      setSponsors(sp);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the refund queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const candidateFor = (workerId?: string, workerName?: string) =>
    candidates.find((x) => x.id === workerId) ??
    candidates.find((x) => nameKey(x.fullName) === nameKey(workerName));

  const sponsorNameFor = (workerId?: string, workerName?: string) => {
    const c = candidateFor(workerId, workerName);
    if (!c?.sponsorId) return undefined;
    return sponsors.find((x) => x.id === c.sponsorId)?.fullName;
  };

  const rows = useMemo(() => {
    const all = buildPoloRows(events, s.transactions, sponsorNameFor);
    return all.filter((r) => {
      const c = candidateFor(r.workerId, r.workerName);
      const cancelled = c?.pipelineStatus === "CANCELLED";
      return cancelled && r.status !== "Approved";
    });
  }, [events, s.transactions, candidates, sponsors]);

  const refund = async (row: PoloListRow) => {
    setBusy(row.workerName);
    try {
      markRefunded(row, today());
      toast.success(`Refund of ${qar(POLO_FEE_AMOUNT)} recorded for ${row.workerName}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record the refund.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="POLO Refund Queue"
        description="Cancelled workers whose contract was never approved — the fee is still owed back to the sponsor."
        action={
          <Button size="sm" variant="outline" asChild>
            <Link to="/polo">Back to POLO list</Link>
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Sponsor</TableHead>
              <TableHead>Last status</TableHead>
              <TableHead>Fee location</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Nothing to refund right now.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.workerId ?? r.workerName}>
                  <TableCell className="font-medium">{r.workerName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.sponsorName ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{r.statusLabel}</Badge></TableCell>
                  <TableCell className="text-xs">{walletName(r.location)}</TableCell>
                  <TableCell className="text-right tabular">{qar(r.amount)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">Worker cancelled / replaced</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" disabled={busy === r.workerName} onClick={() => void refund(r)}>
                      {busy === r.workerName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Mark refunded
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
