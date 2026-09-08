import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, HandCoins, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAppUser } from "@/lib/app-user";
import { useFinance } from "@/lib/finance-store";
import { qar, today } from "@/lib/format";
import { cn } from "@/lib/utils";
import { COMPANIES, COMPANY_LABEL, WALLETS, type Company, type Transaction, type WalletKey } from "@/lib/finance-types";
import { countryFlag, formatDate, listAgents, listCandidates, type Agent, type Candidate } from "@/lib/cv-management";
import { recordExpense, statusLabel } from "@/lib/recruitment";
import { listRequests, type RecruitmentRequest } from "@/lib/recruitment-requests";
import { agentRemittances, type AgentRemittance, type CandidateRemittance, type HalfState } from "@/lib/agent-remittance";
import { TransactionDetailsDialog } from "@/components/TransactionDetailsDialog";

export const Route = createFileRoute("/recruitment/remittance")({
  head: () => ({
    meta: [
      { title: "Agent Remittance · Alhakeem Group ERP" },
      { name: "description", content: "Agreed, due, paid and outstanding remittance per recruitment agent, with payment history." },
      { property: "og:title", content: "Agent Remittance · Alhakeem Group ERP" },
      { property: "og:description", content: "Agent remittance tracking with half payments and history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RemittancePage,
});

const PAY_WALLETS = WALLETS.filter((w) => w.key !== "external" && w.kind !== "holding");

const HALF_TONE: Record<HalfState, string> = {
  "Not due": "bg-muted text-muted-foreground",
  Due: "bg-amber-100 text-amber-900",
  Partial: "bg-sky-100 text-sky-900",
  Paid: "bg-emerald-100 text-emerald-900",
};

function RemittancePage() {
  const { transactions } = useFinance();
  const { isAdmin } = useAppUser();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [requests, setRequests] = useState<RecruitmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [payRow, setPayRow] = useState<CandidateRemittance | null>(null);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [a, c, r] = await Promise.all([listAgents(), listCandidates(), listRequests()]);
      setAgents(a);
      setCandidates(c);
      setRequests(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const data = useMemo(() => agentRemittances(agents, candidates, transactions, requests), [agents, candidates, transactions, requests]);
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return data;
    return data.filter(
      (d) =>
        d.agent.name.toLowerCase().includes(k) ||
        d.agent.agentCode.toLowerCase().includes(k) ||
        (d.agent.agencyName ?? "").toLowerCase().includes(k) ||
        d.agent.country.toLowerCase().includes(k) ||
        d.rows.some((r) => r.candidate.fullName.toLowerCase().includes(k)),
    );
  }, [data, q]);

  const totals = data.reduce(
    (a, d) => ({ agreed: a.agreed + d.agreed, due: a.due + d.due, paid: a.paid + d.paid, balance: a.balance + d.balance }),
    { agreed: 0, due: 0, paid: 0, balance: 0 },
  );
  const withBalance = data.filter((d) => d.balance > 0).length;

  return (
    <AppLayout>
      <PageHeader
        title="Agent Remittance"
        subtitle="Agreed amount per housemaid, paid in two halves — 50% when the visa is ready to print, 50% after arrival. Payments come from the master ledger."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-5">
        <Stat label="Total agreed" value={totals.agreed} />
        <Stat label="Due so far" value={totals.due} />
        <Stat label="Paid" value={totals.paid} tone="text-emerald-700" />
        <Stat label="Outstanding" value={totals.balance} tone={totals.balance > 0 ? "text-amber-700" : undefined} hint={`${withBalance} agent(s) with balance`} />
      </div>

      <div className="mb-4 flex items-center gap-3">
        <Input placeholder="Search agent, agency, country or housemaid…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {!loading && shown.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No remittance to show yet. Set the “Agreed agent remittance” on a housemaid’s recruitment file to start tracking.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {shown.map((d) => (
          <AgentCard
            key={d.agent.id}
            d={d}
            open={openAgent === d.agent.id}
            onToggle={() => setOpenAgent(openAgent === d.agent.id ? null : d.agent.id)}
            onPay={setPayRow}
            onDetail={setDetail}
            canPay={isAdmin}
          />
        ))}
      </div>

      {payRow && (
        <PayDialog
          row={payRow}
          agent={agents.find((a) => a.id === payRow.candidate.agentId)}
          onClose={() => setPayRow(null)}
        />
      )}
      <TransactionDetailsDialog transaction={detail} open={!!detail} onOpenChange={(o) => !o && setDetail(null)} />
    </AppLayout>
  );
}

function Stat({ label, value, tone, hint }: { label: string; value: number; tone?: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone)}>{qar(value)}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function AgentCard({
  d,
  open,
  onToggle,
  onPay,
  onDetail,
  canPay,
}: {
  d: AgentRemittance;
  open: boolean;
  onToggle: () => void;
  onPay: (r: CandidateRemittance) => void;
  onDetail: (t: Transaction) => void;
  canPay: boolean;
}) {
  const [tab, setTab] = useState<"housemaids" | "history">("housemaids");
  return (
    <Card>
      <button type="button" onClick={onToggle} className="w-full text-left">
        <CardHeader className="py-4 flex-row items-center gap-4 space-y-0">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <span>{countryFlag(d.agent.country)}</span>
              <span className="truncate">{d.agent.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{d.agent.agentCode}</span>
              {d.agent.agencyName && <Badge variant="outline" className="font-normal">{d.agent.agencyName}</Badge>}
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              {d.agent.country} · {d.rows.length} housemaid(s) · {d.payments.length} payment(s)
            </div>
          </div>
          <div className="hidden md:grid grid-cols-4 gap-6 text-right text-sm tabular-nums">
            <Mini label="Agreed" v={d.agreed} />
            <Mini label="Due" v={d.due} />
            <Mini label="Paid" v={d.paid} tone="text-emerald-700" />
            <Mini label="Balance" v={d.balance} tone={d.balance > 0 ? "text-amber-700 font-semibold" : undefined} />
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open ? "" : "-rotate-90")} />
        </CardHeader>
      </button>
      {open && (
        <CardContent className="pt-0">
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant={tab === "housemaids" ? "default" : "outline"} onClick={() => setTab("housemaids")}>
              Housemaids
            </Button>
            <Button size="sm" variant={tab === "history" ? "default" : "outline"} onClick={() => setTab("history")}>
              Payment history
            </Button>
          </div>
          {tab === "housemaids" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Housemaid</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Agreed</TableHead>
                  <TableHead>1st half</TableHead>
                  <TableHead>2nd half</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.rows.map((r) => (
                  <TableRow key={r.candidate.id}>
                    <TableCell>
                      <Link to="/recruitment/$id" params={{ id: r.candidate.id }} className="font-medium text-primary hover:underline">
                        {r.candidate.fullName}
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono">{r.candidate.candidateCode}</div>
                    </TableCell>
                    <TableCell className="text-sm">{statusLabel(r.candidate.pipelineStatus)}</TableCell>
                    <TableCell className="text-right tabular-nums">{qar(r.agreed)}</TableCell>
                    <TableCell><HalfBadge state={r.half1} approved={!!r.approved1} /></TableCell>
                    <TableCell><HalfBadge state={r.half2} approved={!!r.approved2} /></TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700">{qar(r.paid)}</TableCell>
                    <TableCell className={cn("text-right tabular-nums", r.balance > 0 && "text-amber-700 font-semibold")}>{qar(r.balance)}</TableCell>
                    <TableCell className="text-right">
                      {canPay && r.due > r.paid && (
                        <Button size="sm" variant="outline" onClick={() => onPay(r)}>
                          <HandCoins className="h-4 w-4" /> Record payment
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Housemaid</TableHead>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>From wallet</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {d.payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">No payments recorded yet.</TableCell>
                  </TableRow>
                )}
                {d.payments.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onDetail(t)}>
                    <TableCell>{formatDate(t.date)}</TableCell>
                    <TableCell>{t.candidate || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{t.voucherNumber || "—"}</TableCell>
                    <TableCell>{t.company ? COMPANY_LABEL[t.company] : "—"}</TableCell>
                    <TableCell>{WALLETS.find((w) => w.key === t.fromWallet)?.name ?? t.fromWallet}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{t.purpose}</TableCell>
                    <TableCell className="text-right tabular-nums">{qar(t.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function Mini({ label, v, tone }: { label: string; v: number; tone?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn(tone)}>{qar(v)}</div>
    </div>
  );
}

function HalfBadge({ state, approved }: { state: HalfState; approved: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("rounded px-2 py-0.5 text-xs", HALF_TONE[state])}>{state}</span>
      {approved && state !== "Paid" && <span className="text-[10px] text-emerald-700">approved</span>}
    </span>
  );
}

function PayDialog({ row, agent, onClose }: { row: CandidateRemittance; agent?: Agent; onClose: () => void }) {
  const remaining = Math.max(0, row.due - row.paid);
  const half = row.half1 === "Paid" ? 2 : 1;
  const approved = half === 1 ? row.approved1 : row.approved2;
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState(String(Math.min(row.half, remaining) || remaining));
  const [company, setCompany] = useState<Company | "">("");
  const [fromWallet, setFromWallet] = useState<WalletKey>("office-petty");
  const [note, setNote] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (!company) return toast.error("Select the paying company");
    try {
      recordExpense(row.candidate, undefined, {
        date,
        kind: "AGENT_REMITTANCE",
        amount: amt,
        paidBy: "Company",
        settlement: "COMPANY_PAID",
        fromWallet,
        company,
        description: `${half === 1 ? "1st half" : "2nd half"} to ${agent?.name ?? "agent"}${agent?.agentCode ? ` (${agent.agentCode})` : ""}${note.trim() ? ` — ${note.trim()}` : ""}`,
      });
      toast.success("Remittance payment recorded in the ledger");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record remittance — {row.candidate.fullName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <div>Agent: <span className="font-medium">{agent?.name ?? "—"}</span>{agent?.agencyName ? ` · ${agent.agencyName}` : ""}</div>
            <div>Agreed {qar(row.agreed)} · Paid {qar(row.paid)} · Remaining due <span className="font-semibold">{qar(remaining)}</span></div>
            <div>This payment: <span className="font-medium">{half === 1 ? "1st half (visa ready)" : "2nd half (arrived)"}</span></div>
            {!approved && (
              <div className="flex items-center gap-1 text-amber-700">
                <ShieldAlert className="h-3.5 w-3.5" /> No approved request for this half yet — see Official Requests.
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Amount (QAR)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Company</Label>
              <Select value={company} onValueChange={(v) => setCompany(v as Company)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {COMPANIES.map((co) => (
                    <SelectItem key={co} value={co}>{COMPANY_LABEL[co]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From wallet</Label>
              <Select value={fromWallet} onValueChange={(v) => setFromWallet(v as WalletKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAY_WALLETS.map((w) => (
                    <SelectItem key={w.key} value={w.key}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Note (optional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Transfer reference, remarks…" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save payment</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
