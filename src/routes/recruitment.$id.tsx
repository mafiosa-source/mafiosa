import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRight, Check, Loader2, Plus, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAppUser } from "@/lib/app-user";
import { useFinance } from "@/lib/finance-store";
import { qar, today } from "@/lib/format";
import { cn } from "@/lib/utils";
import { COMPANIES, COMPANY_LABEL, WALLETS, type Company, type WalletKey } from "@/lib/finance-types";
import { agentName, countryFlag, formatDate, getCandidate, listAgents, type Agent, type Candidate } from "@/lib/cv-management";
import {
  EXPENSE_KINDS,
  SETTLEMENT_LABEL,
  STATUS_HINT,
  STATUS_TONE,
  UNFIT_ALTERNATIVE,
  changeStatus,
  expenseFolder,
  expenseKindLabel,
  flowFor,
  flowName,
  folderTotals,
  isTerminal,
  linkSponsor,
  listSponsors,
  listStatusHistory,
  nextStatus,
  recordExpense,
  statusLabel,
  updatePipelineFields,
  type ExpenseKind,
  type PaidBy,
  type Settlement,
  type Sponsor,
  type StatusCode,
  type StatusHistoryEntry,
} from "@/lib/recruitment";
import { TransactionDetailsDialog } from "@/components/TransactionDetailsDialog";
import type { Transaction } from "@/lib/finance-types";
import { REQUEST_TYPE_LABEL, autoRequestForStatus } from "@/lib/recruitment-requests";

export const Route = createFileRoute("/recruitment/$id")({
  head: () => ({
    meta: [
      { title: "Housemaid File · Alhakeem Group ERP" },
      { name: "description", content: "Recruitment stage, sponsor link, status history and expense folder for one housemaid." },
      { property: "og:title", content: "Housemaid File · Alhakeem Group ERP" },
      { property: "og:description", content: "Recruitment stage, sponsor link, status history and expense folder for one housemaid." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HousemaidFilePage,
});

const PAY_WALLETS = WALLETS.filter((w) => w.key !== "external" && w.kind !== "holding");

function HousemaidFilePage() {
  const { id } = Route.useParams();
  const { isAdmin } = useAppUser();
  const fin = useFinance();
  const [c, setC] = useState<Candidate | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [advance, setAdvance] = useState<StatusCode | null>(null);
  const [note, setNote] = useState("");
  const [poloDate, setPoloDate] = useState("");
  const [sponsorPick, setSponsorPick] = useState("");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [remit, setRemit] = useState("");

  async function load() {
    try {
      const [cand, a, s, h] = await Promise.all([getCandidate(id), listAgents(), listSponsors(), listStatusHistory(id)]);
      setC(cand);
      setRemit(cand?.agreedRemittance != null ? String(cand.agreedRemittance) : "");
      setAgents(a);
      setSponsors(s);
      setHistory(h);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load file");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sponsor = sponsors.find((s) => s.id === c?.sponsorId);
  const folder = useMemo(() => (c ? expenseFolder(fin.transactions, c) : []), [fin.transactions, c]);
  const totals = folderTotals(folder);
  const flow = c ? flowFor(c) : [];
  const next = c ? nextStatus(c) : null;
  const unfit = c ? UNFIT_ALTERNATIVE[c.pipelineStatus as StatusCode] : undefined;

  async function doAdvance(to: StatusCode) {
    if (!c) return;
    if (to !== "CANCELLED" && to !== "CV_UPLOADED" && !c.sponsorId && to !== "SELECTED") {
      return toast.error("Link the sponsor first");
    }
    if (to === "SELECTED" && !c.sponsorId) return toast.error("Select the sponsor before marking as selected");
    if (to === "POLO_COLLECTED" && !poloDate) return toast.error("Enter the POLO pickup date");
    setBusy(true);
    try {
      await changeStatus(c, to, { note, poloPickupDate: poloDate || undefined });
      toast.success(`Status: ${statusLabel(to)}`);
      try {
        const req = await autoRequestForStatus(c, to, fin.transactions);
        if (req) {
          toast.info(`Request sent to Admin: ${REQUEST_TYPE_LABEL[req.type]}`, {
            description: req.flags.length ? `${req.flags.length} red flag(s) noted` : undefined,
          });
        }
      } catch (err) {
        toast.error("Status saved, but the automatic request could not be created", {
          description: err instanceof Error ? err.message : undefined,
        });
      }
      setAdvance(null);
      setNote("");
      setPoloDate("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  async function saveSponsor() {
    if (!c || !sponsorPick) return;
    const s = sponsors.find((x) => x.id === sponsorPick);
    if (!s) return;
    if (!window.confirm(`Link ${c.fullName} to sponsor "${s.fullName}"? This link is permanent (only an admin can change it).`)) return;
    setBusy(true);
    try {
      await linkSponsor(c.id, sponsorPick);
      toast.success("Sponsor linked");
      setSponsorPick("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not link sponsor");
    } finally {
      setBusy(false);
    }
  }

  async function toggleAbroad(v: boolean) {
    if (!c) return;
    try {
      await updatePipelineFields(c.id, { experienceAbroad: v });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }
  if (!c) {
    return (
      <AppLayout>
        <PageHeader title="Housemaid not found" />
        <Link to="/recruitment">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-3">
        <Link to="/recruitment" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Recruitment pipeline
        </Link>
      </div>
      <PageHeader
        title={c.fullName}
        description={`${c.candidateCode ?? ""} · ${countryFlag(c.countryCode)} ${c.nationality} · Agent: ${agentName(agents, c.agentId)} · Passport ${c.passportNumber ?? "—"}`}
        action={
          <div className="flex gap-2">
            <Link to="/workers/$id/cv" params={{ id: c.id }}>
              <Button size="sm" variant="outline">
                View CV
              </Button>
            </Link>
            <Link to="/housemaid/$name" params={{ name: c.fullName }}>
              <Button size="sm" variant="outline">
                Financial statement
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Stage */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              Stage — {flowName(c.countryCode)}
              {c.countryCode.toUpperCase() === "PH" && (
                <span className="ml-3 inline-flex items-center gap-2 text-xs font-normal text-muted-foreground">
                  Experience abroad <Switch checked={c.experienceAbroad} onCheckedChange={toggleAbroad} disabled={isTerminal(c.pipelineStatus)} />
                </span>
              )}
            </CardTitle>
            <Badge variant="outline" className={cn(STATUS_TONE[c.pipelineStatus])}>
              {statusLabel(c.pipelineStatus)}
            </Badge>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-1 sm:grid-cols-2">
              {flow.map((s, i) => {
                const cur = flow.indexOf(c.pipelineStatus as StatusCode);
                const done = i < cur;
                const active = i === cur;
                return (
                  <li
                    key={s}
                    className={cn(
                      "flex items-center gap-2 rounded px-2 py-1 text-sm",
                      done && "text-muted-foreground",
                      active && "bg-primary/10 font-medium",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        done && "bg-emerald-500 border-emerald-500 text-white",
                        active && "border-primary text-primary",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    {statusLabel(s)}
                  </li>
                );
              })}
            </ol>
            {isTerminal(c.pipelineStatus) && c.pipelineStatus !== "ARRIVED" && (
              <p className="mt-3 text-sm text-destructive flex items-center gap-2">
                <XCircle className="h-4 w-4" /> This file is stopped ({statusLabel(c.pipelineStatus)}). A replacement housemaid should be selected.
              </p>
            )}
            {STATUS_HINT[c.pipelineStatus as StatusCode] && (
              <p className="mt-3 text-xs text-muted-foreground flex gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" /> {STATUS_HINT[c.pipelineStatus as StatusCode]}
              </p>
            )}
            {!isTerminal(c.pipelineStatus) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {next && (
                  <Button size="sm" onClick={() => setAdvance(next)}>
                    Mark as {statusLabel(next)} <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
                {unfit && (
                  <Button size="sm" variant="destructive" onClick={() => setAdvance(unfit)}>
                    {statusLabel(unfit)}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setAdvance("CANCELLED")}>
                  Cancel file
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sponsor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sponsor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {sponsor ? (
              <>
                <div className="text-lg font-semibold">{sponsor.fullName}</div>
                <Row label="QID" value={sponsor.qid ?? "—"} />
                <Row label="Phone" value={sponsor.phone ?? "—"} />
                <Row label="Address" value={sponsor.address ?? "—"} />
                <Row label="Selected on" value={c.selectedAt ? formatDate(c.selectedAt.slice(0, 10)) : "—"} />
                {c.poloPickupDate && <Row label="POLO pickup" value={formatDate(c.poloPickupDate)} />}
                {isAdmin ? (
                  <p className="text-xs text-muted-foreground pt-1">Admin: you may re-link below.</p>
                ) : (
                  <p className="text-xs text-muted-foreground pt-1">Link is permanent. Ask an admin to change it.</p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No sponsor linked yet.</p>
            )}
            {(!sponsor || isAdmin) && (
              <div className="flex gap-2 pt-2">
                <Select value={sponsorPick} onValueChange={setSponsorPick}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose sponsor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sponsors.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName} {s.qid ? `· ${s.qid}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={saveSponsor} disabled={!sponsorPick || busy}>
                  Link
                </Button>
              </div>
            )}
            <Link to="/recruitment/sponsors" className="text-xs text-primary hover:underline block pt-1">
              + Add a new sponsor in the directory
            </Link>
            <div className="border-t pt-3 mt-2">
              <Label className="text-xs">Agreed agent remittance (QAR)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  step="0.01"
                  value={remit}
                  onChange={(e) => setRemit(e.target.value)}
                  placeholder="e.g. 4000"
                  disabled={!isAdmin && c.agreedRemittance != null}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || (!isAdmin && c.agreedRemittance != null)}
                  onClick={async () => {
                    try {
                      await updatePipelineFields(c.id, { agreedRemittance: remit ? Number(remit) : null });
                      toast.success("Remittance saved");
                      await load();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not save");
                    }
                  }}
                >
                  Save
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Paid in two halves: 50% when the visa is ready to print, 50% after arrival — each as an Admin-approved request.
              </p>
            </div>
            <Link to="/recruitment/requests" className="text-xs text-primary hover:underline block pt-1">
              View requests for this housemaid
            </Link>
          </CardContent>
        </Card>

        {/* Expense folder */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Expense folder</CardTitle>
            <Button size="sm" onClick={() => setExpenseOpen(true)}>
              <Plus className="h-4 w-4" /> Add cost
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-sm">
              <Tot label="Total cost" value={totals.total} />
              <Tot label="Paid by sponsor" value={totals.sponsorPaid} />
              <Tot label="Company paid" value={totals.companyPaid} />
              <Tot label="Sponsor still owes" value={totals.sponsorDebt} danger={totals.sponsorDebt > 0} />
            </div>
            <div className="rounded border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Paid by</TableHead>
                    <TableHead>Settlement</TableHead>
                    <TableHead>Voucher</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Running</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {folder.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        No costs recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {folder.reduce<{ run: number; nodes: React.ReactNode[] }>(
                    (acc, t) => {
                      acc.run += t.amount;
                      acc.nodes.push(
                        <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetail(t)}>
                          <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                          <TableCell>
                            <div className="font-medium">{expenseKindLabel(t.expenseKind ?? t.purposeCategory)}</div>
                            <div className="text-xs text-muted-foreground max-w-[260px] truncate">{t.purpose ?? t.description}</div>
                          </TableCell>
                          <TableCell>{t.payableBy ?? (t.fromWallet === "external" ? "Sponsor" : "Company")}</TableCell>
                          <TableCell>
                            {t.settlementStatus ? (
                              <Badge
                                variant="outline"
                                className={cn("font-normal", t.settlementStatus === "SPONSOR_WILL_PAY_LATER" && "border-destructive/40 text-destructive")}
                              >
                                {SETTLEMENT_LABEL[t.settlementStatus as Settlement] ?? t.settlementStatus}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">{t.classification ?? "—"}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{t.voucherNumber ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{qar(t.amount)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{qar(acc.run)}</TableCell>
                        </TableRow>,
                      );
                      return acc;
                    },
                    { run: 0, nodes: [] },
                  ).nodes}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status history</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No changes yet — created as {statusLabel(c.pipelineStatus)}.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {[...history].reverse().map((h) => (
                  <li key={h.id} className="border-l-2 pl-3">
                    <div className="font-medium">{statusLabel(h.toStatus)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.changedAt).toLocaleString()} {h.changedBy ? `· ${h.changedBy}` : ""}
                    </div>
                    {h.note && <div className="text-xs mt-0.5">{h.note}</div>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advance dialog */}
      <Dialog open={!!advance} onOpenChange={(o) => !o && setAdvance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as {advance ? statusLabel(advance) : ""}</DialogTitle>
          </DialogHeader>
          {advance && STATUS_HINT[advance] && <p className="text-sm text-muted-foreground">{STATUS_HINT[advance]}</p>}
          {advance === "POLO_COLLECTED" && (
            <div>
              <Label>POLO pickup date *</Label>
              <Input type="date" value={poloDate} onChange={(e) => setPoloDate(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Note (optional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvance(null)}>
              Cancel
            </Button>
            <Button onClick={() => advance && doAdvance(advance)} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ExpenseDialog open={expenseOpen} onClose={() => setExpenseOpen(false)} candidate={c} sponsorName={sponsor?.fullName} />
      {detail && <TransactionDetailsDialog transaction={detail} open onOpenChange={(o) => !o && setDetail(null)} />}
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Tot({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("font-semibold tabular-nums", danger && "text-destructive")}>{qar(value)}</div>
    </div>
  );
}

function ExpenseDialog({
  open,
  onClose,
  candidate,
  sponsorName,
}: {
  open: boolean;
  onClose: () => void;
  candidate: Candidate;
  sponsorName?: string;
}) {
  const [date, setDate] = useState(today());
  const [kind, setKind] = useState<ExpenseKind>("POLO_FEE");
  const [amount, setAmount] = useState("160");
  const [paidBy, setPaidBy] = useState<PaidBy>("Sponsor");
  const [settlement, setSettlement] = useState<Settlement>("SPONSOR_PAID");
  const [fromWallet, setFromWallet] = useState<WalletKey>("office-petty");
  const [company, setCompany] = useState<Company | "">("");
  const [description, setDescription] = useState("");

  function pickKind(k: ExpenseKind) {
    setKind(k);
    const def = EXPENSE_KINDS.find((x) => x.key === k)!;
    if (def.defaultAmount) setAmount(String(def.defaultAmount));
    const payer = def.defaultPayer ?? "Company";
    setPaidBy(payer);
    setSettlement(payer === "Sponsor" ? "SPONSOR_PAID" : "SPONSOR_WILL_PAY_LATER");
  }
  function pickPayer(p: PaidBy) {
    setPaidBy(p);
    setSettlement(p === "Sponsor" ? "SPONSOR_PAID" : "SPONSOR_WILL_PAY_LATER");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (paidBy === "Company" && !company) return toast.error("Select the company that paid");
    try {
      recordExpense(candidate, sponsorName, {
        date,
        kind,
        amount: amt,
        paidBy,
        settlement: paidBy === "Sponsor" ? "SPONSOR_PAID" : settlement,
        fromWallet,
        company: company || undefined,
        description: description.trim() || undefined,
      });
      toast.success("Cost added to the expense folder");
      setDescription("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add cost — {candidate.fullName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Cost type</Label>
              <Select value={kind} onValueChange={(v) => pickKind(v as ExpenseKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_KINDS.map((k) => (
                    <SelectItem key={k.key} value={k.key}>
                      {k.label}
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
              <Label>Paid by</Label>
              <Select value={paidBy} onValueChange={(v) => pickPayer(v as PaidBy)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sponsor">Sponsor (paid directly)</SelectItem>
                  <SelectItem value="Company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {paidBy === "Company" && (
            <>
              <div>
                <Label>Settlement</Label>
                <Select value={settlement} onValueChange={(v) => setSettlement(v as Settlement)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SPONSOR_WILL_PAY_LATER">{SETTLEMENT_LABEL.SPONSOR_WILL_PAY_LATER}</SelectItem>
                    <SelectItem value="COMPANY_PAID">{SETTLEMENT_LABEL.COMPANY_PAID} (company bears the cost)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Company</Label>
                  <Select value={company} onValueChange={(v) => setCompany(v as Company)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANIES.map((co) => (
                        <SelectItem key={co} value={co}>
                          {COMPANY_LABEL[co]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Paid from wallet</Label>
                  <Select value={fromWallet} onValueChange={(v) => setFromWallet(v as WalletKey)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAY_WALLETS.map((w) => (
                        <SelectItem key={w.key} value={w.key}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
          <div>
            <Label>Details (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. receipt no., airline…" />
          </div>
          <p className="text-xs text-muted-foreground">
            Saved once in the master ledger and shown here, in the housemaid statement and in Candidate Holdings.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save cost</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
