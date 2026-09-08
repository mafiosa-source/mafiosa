import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useAppUser } from "@/lib/app-user";
import { useFinance } from "@/lib/finance-store";
import { qar } from "@/lib/format";
import { cn } from "@/lib/utils";
import { agentName, countryFlag, countryName, listAgents, listCandidates, type Agent, type Candidate } from "@/lib/cv-management";
import {
  STATUS_LABEL,
  STATUS_TONE,
  expenseFolder,
  folderTotals,
  isTerminal,
  listSponsors,
  statusLabel,
  stepIndex,
  type Sponsor,
} from "@/lib/recruitment";

export const Route = createFileRoute("/recruitment/")({
  head: () => ({
    meta: [
      { title: "Recruitment Pipeline · Alhakeem Group ERP" },
      { name: "description", content: "Track every housemaid from CV to arrival, with sponsor, stage and running cost." },
      { property: "og:title", content: "Recruitment Pipeline · Alhakeem Group ERP" },
      { property: "og:description", content: "Track every housemaid from CV to arrival, with sponsor, stage and running cost." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const navigate = useNavigate();
  const { agentScope } = useAppUser();
  const fin = useFinance();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("all");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    (async () => {
      try {
        const [c, a, s] = await Promise.all([listCandidates(), listAgents(), listSponsors()]);
        setCandidates(agentScope.length ? c.filter((x) => x.agentId && agentScope.includes(x.agentId)) : c);
        setAgents(a);
        setSponsors(s);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load pipeline");
      } finally {
        setLoading(false);
      }
    })();
  }, [agentScope]);

  const sponsorName = (id?: string) => sponsors.find((s) => s.id === id)?.fullName;

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    return candidates
      .filter((c) => country === "all" || c.countryCode === country)
      .filter((c) => {
        if (status === "all") return true;
        if (status === "active") return !isTerminal(c.pipelineStatus);
        if (status === "arrived") return c.pipelineStatus === "ARRIVED";
        if (status === "stopped") return isTerminal(c.pipelineStatus) && c.pipelineStatus !== "ARRIVED";
        return c.pipelineStatus === status;
      })
      .filter(
        (c) =>
          !k ||
          c.fullName.toLowerCase().includes(k) ||
          (c.candidateCode ?? "").toLowerCase().includes(k) ||
          (c.passportNumber ?? "").toLowerCase().includes(k) ||
          (sponsorName(c.sponsorId) ?? "").toLowerCase().includes(k),
      )
      .map((c) => ({ c, cost: folderTotals(expenseFolder(fin.transactions, c)), step: stepIndex(c) }));
  }, [candidates, country, status, q, fin.transactions, sponsors]);

  const countries = useMemo(() => Array.from(new Set(candidates.map((c) => c.countryCode))).sort(), [candidates]);
  const counts = useMemo(() => {
    const active = candidates.filter((c) => !isTerminal(c.pipelineStatus));
    return {
      active: active.length,
      awaitingSponsor: active.filter((c) => c.pipelineStatus === "CV_UPLOADED").length,
      arrived: candidates.filter((c) => c.pipelineStatus === "ARRIVED").length,
      totalCost: rows.reduce((a, r) => a + r.cost.total, 0),
    };
  }, [candidates, rows]);

  return (
    <AppLayout>
      <PageHeader title="Recruitment Pipeline" description="One line per housemaid — where she is, who her sponsor is and what she has cost so far." />

      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <Stat label="In process" value={String(counts.active)} />
        <Stat label="Awaiting sponsor" value={String(counts.awaitingSponsor)} />
        <Stat label="Arrived" value={String(counts.arrived)} />
        <Stat label="Cost of shown rows" value={qar(counts.totalCost)} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Name, code, passport, sponsor…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All nationalities</SelectItem>
            {countries.map((cc) => (
              <SelectItem key={cc} value={cc}>
                {countryFlag(cc)} {countryName(cc)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">In process</SelectItem>
            <SelectItem value="arrived">Arrived</SelectItem>
            <SelectItem value="stopped">Unfit / cancelled</SelectItem>
            <SelectItem value="all">All</SelectItem>
            {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((k) => (
              <SelectItem key={k} value={k}>
                {STATUS_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Housemaid</TableHead>
                <TableHead>Nationality</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="w-40">Progress</TableHead>
                <TableHead className="text-right">Cost so far</TableHead>
                <TableHead className="text-right">Sponsor owes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    No housemaids match these filters.
                  </TableCell>
                </TableRow>
              )}
              {rows.map(({ c, cost, step }) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate({ to: "/recruitment/$id", params: { id: c.id } })}
                >
                  <TableCell className="font-mono text-xs text-destructive">{c.candidateCode ?? "—"}</TableCell>
                  <TableCell className="font-medium">{c.fullName}</TableCell>
                  <TableCell>
                    {countryFlag(c.countryCode)} {c.nationality}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{agentName(agents, c.agentId)}</TableCell>
                  <TableCell>{sponsorName(c.sponsorId) ?? <span className="text-muted-foreground">Not selected</span>}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("font-normal whitespace-nowrap", STATUS_TONE[c.pipelineStatus])}>
                      {statusLabel(c.pipelineStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={((step.index + 1) / step.total) * 100} className="h-1.5" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {step.index + 1}/{step.total}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{qar(cost.total)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", cost.sponsorDebt > 0 && "text-destructive font-medium")}>
                    {cost.sponsorDebt ? qar(cost.sponsorDebt) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
