import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useAppUser } from "@/lib/app-user";
import { useFinance } from "@/lib/finance-store";
import { qar } from "@/lib/format";
import { cn } from "@/lib/utils";
import { agentName, listAgents, listCandidates, type Agent, type Candidate } from "@/lib/cv-management";
import { SETTLEMENT_LABEL, listSponsors, statusLabel, type Settlement, type Sponsor } from "@/lib/recruitment";
import {
  REQUEST_TYPE_LABEL,
  computeFlags,
  createRequest,
  decideRequest,
  listRequests,
  markSeen,
  type RecruitmentRequest,
  type RequestStatus,
  type RequestType,
} from "@/lib/recruitment-requests";

export const Route = createFileRoute("/recruitment/requests")({
  head: () => ({
    meta: [
      { title: "Official Requests · Alhakeem Group ERP" },
      { name: "description", content: "Money and discount requests waiting for admin approval, with red flags." },
      { property: "og:title", content: "Official Requests · Alhakeem Group ERP" },
      { property: "og:description", content: "Money and discount requests waiting for admin approval, with red flags." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RequestsPage,
});

const STATUS_TONE: Record<RequestStatus, string> = {
  Pending: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Approved: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Rejected: "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

function RequestsPage() {
  const { isAdmin, user } = useAppUser();
  const fin = useFinance();
  const [requests, setRequests] = useState<RecruitmentRequest[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"Pending" | "Approved" | "Rejected" | "all">("Pending");
  const [newOpen, setNewOpen] = useState(false);
  const [deciding, setDeciding] = useState<{ r: RecruitmentRequest; decision: "Approved" | "Rejected" } | null>(null);

  async function load() {
    try {
      const [r, c, a, s] = await Promise.all([listRequests(), listCandidates(), listAgents(), listSponsors()]);
      setRequests(r);
      setCandidates(c);
      setAgents(a);
      setSponsors(s);
      const unseen = r.filter((x) => x.status !== "Pending" && !x.seenByRequester && x.requestedBy === user?.name);
      if (unseen.length) void markSeen(unseen.map((x) => x.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load requests");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cand = (id?: string) => candidates.find((c) => c.id === id);
  const rows = useMemo(() => requests.filter((r) => tab === "all" || r.status === tab), [requests, tab]);
  const counts = {
    Pending: requests.filter((r) => r.status === "Pending").length,
    Approved: requests.filter((r) => r.status === "Approved").length,
    Rejected: requests.filter((r) => r.status === "Rejected").length,
    flagged: requests.filter((r) => r.status === "Pending" && r.flags.length).length,
  };

  return (
    <AppLayout>
      <PageHeader
        title="Official Requests"
        description={isAdmin ? "Approve or reject money and discount requests. Red flags are shown before you decide." : "Your requests and their decisions."}
        action={
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4" /> New request
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <Stat label="Pending" value={String(counts.Pending)} />
        <Stat label="Pending with red flags" value={String(counts.flagged)} danger={counts.flagged > 0} />
        <Stat label="Approved" value={String(counts.Approved)} />
        <Stat label="Rejected" value={String(counts.Rejected)} />
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-3">
        <TabsList>
          <TabsTrigger value="Pending">Pending ({counts.Pending})</TabsTrigger>
          <TabsTrigger value="Approved">Approved</TabsTrigger>
          <TabsTrigger value="Rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Housemaid</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Red flags</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-40" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-10 text-muted-foreground">
                    Nothing here.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const c = cand(r.candidateId);
                return (
                  <TableRow key={r.id} className={cn(r.status === "Pending" && r.flags.length && "bg-rose-500/5")}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(r.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="font-medium">{REQUEST_TYPE_LABEL[r.type] ?? r.type}</div>
                      <div className="text-xs text-muted-foreground max-w-[260px] truncate">{r.reason}</div>
                      {r.autoCreated && <Badge variant="secondary" className="mt-1 text-[10px]">auto</Badge>}
                    </TableCell>
                    <TableCell>
                      {c ? (
                        <Link to="/recruitment/$id" params={{ id: c.id }} className="text-primary hover:underline">
                          {c.fullName}
                        </Link>
                      ) : (
                        "—"
                      )}
                      {c && <div className="text-xs text-muted-foreground">{statusLabel(c.pipelineStatus)}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{agentName(agents, r.agentId ?? c?.agentId)}</TableCell>
                    <TableCell>{r.requestedBy ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.amount != null ? qar(r.amount) : "—"}</TableCell>
                    <TableCell>
                      {r.flags.length ? (
                        <ul className="space-y-0.5">
                          {r.flags.map((f) => (
                            <li key={f} className="flex items-start gap-1 text-xs text-destructive">
                              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_TONE[r.status]}>
                        {r.status}
                      </Badge>
                      {r.decidedBy && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {r.decidedBy} · {r.decidedAt ? new Date(r.decidedAt).toLocaleDateString() : ""}
                        </div>
                      )}
                      {r.settlementStatus && <div className="text-[10px] text-muted-foreground">{SETTLEMENT_LABEL[r.settlementStatus as Settlement] ?? r.settlementStatus}</div>}
                      {r.decisionNote && <div className="text-xs mt-1">{r.decisionNote}</div>}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {r.status === "Pending" && (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" onClick={() => setDeciding({ r, decision: "Approved" })}>
                              <Check className="h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setDeciding({ r, decision: "Rejected" })}>
                              <X className="h-4 w-4" /> Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <NewRequestDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        candidates={candidates}
        sponsors={sponsors}
        existing={requests}
        onCreated={load}
      />
      {deciding && (
        <DecideDialog
          req={deciding.r}
          decision={deciding.decision}
          candidate={cand(deciding.r.candidateId)}
          onClose={() => setDeciding(null)}
          onDone={load}
        />
      )}
    </AppLayout>
  );
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("text-xl font-semibold tabular-nums", danger && "text-destructive")}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NewRequestDialog({
  open,
  onClose,
  candidates,
  sponsors,
  existing,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  candidates: Candidate[];
  sponsors: Sponsor[];
  existing: RecruitmentRequest[];
  onCreated: () => Promise<void>;
}) {
  const fin = useFinance();
  const [type, setType] = useState<RequestType>("DISCOUNT");
  const [candidateId, setCandidateId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const candidate = candidates.find((c) => c.id === candidateId) ?? null;
  const flags = useMemo(
    () => (candidateId ? computeFlags(type, candidate, Number(amount) || undefined, fin.transactions, existing) : []),
    [type, candidate, candidateId, amount, fin.transactions, existing],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!candidateId) return toast.error("Choose the housemaid");
    if (!reason.trim()) return toast.error("Give a reason");
    setBusy(true);
    try {
      await createRequest({ type, candidate, amount: Number(amount) || undefined, reason, flags });
      toast.success("Request sent to Admin");
      setAmount("");
      setReason("");
      onClose();
      await onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New request</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as RequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {REQUEST_TYPE_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Housemaid</Label>
            <Select value={candidateId} onValueChange={setCandidateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.candidateCode ? `${c.candidateCode} · ` : ""}
                    {c.fullName}
                    {c.sponsorId ? ` — ${sponsors.find((s) => s.id === c.sponsorId)?.fullName ?? ""}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount (QAR)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Reason *</Label>
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {flags.length > 0 && (
            <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive space-y-0.5">
              {flags.map((f) => (
                <div key={f} className="flex gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {f}
                </div>
              ))}
              <div className="text-muted-foreground pt-1">Admin will see these flags. You can still send the request.</div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send to Admin
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DecideDialog({
  req,
  decision,
  candidate,
  onClose,
  onDone,
}: {
  req: RecruitmentRequest;
  decision: "Approved" | "Rejected";
  candidate?: Candidate;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(req.amount != null ? String(req.amount) : "");
  const [settlement, setSettlement] = useState<Settlement>("COMPANY_PAID");
  const [busy, setBusy] = useState(false);
  const isMoney = req.type !== "DISCOUNT";

  async function confirm() {
    if (decision === "Rejected" && !note.trim()) return toast.error("Give a reason for rejecting");
    setBusy(true);
    try {
      await decideRequest(req.id, decision, {
        note,
        amount: decision === "Approved" && amount ? Number(amount) : undefined,
        settlementStatus: decision === "Approved" && isMoney ? settlement : undefined,
      });
      toast.success(`Request ${decision.toLowerCase()}`);
      onClose();
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save decision");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {decision === "Approved" ? "Approve" : "Reject"} — {REQUEST_TYPE_LABEL[req.type]}
          </DialogTitle>
        </DialogHeader>
        <div className="text-sm">
          <div>
            <span className="text-muted-foreground">Housemaid:</span> {candidate?.fullName ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Requested by:</span> {req.requestedBy ?? "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Reason:</span> {req.reason ?? "—"}
          </div>
        </div>
        {req.flags.length > 0 && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive space-y-0.5">
            {req.flags.map((f) => (
              <div key={f} className="flex gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" /> {f}
              </div>
            ))}
          </div>
        )}
        {decision === "Approved" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Approved amount (QAR)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            {isMoney && (
              <div>
                <Label>Settlement</Label>
                <Select value={settlement} onValueChange={(v) => setSettlement(v as Settlement)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY_PAID">{SETTLEMENT_LABEL.COMPANY_PAID}</SelectItem>
                    <SelectItem value="SPONSOR_WILL_PAY_LATER">{SETTLEMENT_LABEL.SPONSOR_WILL_PAY_LATER}</SelectItem>
                    <SelectItem value="SPONSOR_PAID">{SETTLEMENT_LABEL.SPONSOR_PAID}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
        <div>
          <Label>{decision === "Rejected" ? "Reason for rejection *" : "Note (optional)"}</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {decision === "Approved" && isMoney && (
          <p className="text-xs text-muted-foreground">
            Approval does not move money. Record the actual payment in the housemaid's expense folder or as a voucher when it is paid.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={decision === "Rejected" ? "destructive" : "default"} onClick={confirm} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm {decision.toLowerCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
