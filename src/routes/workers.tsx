import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Heart, Eye, FileText, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  listCandidates,
  listAgents,
  getCandidate,
  getUploaderName,
  countryFlag,
  countryName,
  formatDate,
  maskPassport,
  agentName,
  COUNTRIES,
  POSITIONS,
  type Candidate,
  type Agent,
} from "@/lib/cv-management";

export const Route = createFileRoute("/workers")({
  head: () => ({
    meta: [
      { title: "CV / Workers · Alhakeem Group ERP" },
      { name: "description", content: "Browse and manage domestic worker CVs." },
    ],
  }),
  component: WorkersPage,
});

const STATUS_DOT: Record<string, string> = {
  Available: "bg-emerald-500",
  Reserved: "bg-amber-500",
  Deployed: "bg-slate-400",
  Unavailable: "bg-rose-500",
};

function WorkersPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [c, a] = await Promise.all([listCandidates(), listAgents()]);
        setCandidates(c);
        setAgents(a);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load workers");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const countryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of candidates) {
      map[c.countryCode] = (map[c.countryCode] ?? 0) + 1;
    }
    return map;
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (selectedCountry && c.countryCode !== selectedCountry) return false;
      if (positionFilter !== "all" && c.position !== positionFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (q) {
        const hay = `${c.candidateCode} ${c.fullName} ${c.nationality}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [candidates, selectedCountry, positionFilter, statusFilter, search]);

  const detailCandidate = detailId ? candidates.find((c) => c.id === detailId) : null;

  function toggleShortlist(id: string) {
    setShortlisted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AppLayout>
      <PageHeader
        title="CV / Workers"
        description="Browse domestic worker CVs. Click any card to view full details."
        action={
          <Button size="sm" asChild>
            <Link to="/workers/new">
              <Plus className="h-4 w-4" /> Add Candidate
            </Link>
          </Button>
        }
      />

      <div className="flex gap-6">
        {/* Country sidebar */}
        <div className="w-56 shrink-0">
          <div className="rounded-lg border bg-card p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Countries
            </div>
            <button
              type="button"
              onClick={() => setSelectedCountry("")}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                !selectedCountry ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
            >
              <span>All Countries</span>
              <Badge variant="secondary" className="tabular">{candidates.length}</Badge>
            </button>
            {COUNTRIES.filter((c) => countryCounts[c.code]).map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setSelectedCountry(c.code)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                  selectedCountry === c.code ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{c.flag}</span>
                  {c.name}
                </span>
                <Badge variant="secondary" className="tabular">{countryCounts[c.code] ?? 0}</Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Main area */}
        <div className="min-w-0 flex-1">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, name, nationality..."
                className="pl-8"
              />
            </div>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Position" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All positions</SelectItem>
                {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Reserved">Reserved</SelectItem>
                <SelectItem value="Deployed">Deployed</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} of {candidates.length}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border bg-card py-20 text-center text-muted-foreground">
              No workers found. Try adjusting your filters or add a new candidate.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((c) => (
                <Card key={c.id} className="group overflow-hidden transition-all hover:shadow-lg">
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                    {c.photoUrl ? (
                      <img
                        src={c.photoUrl}
                        alt={c.fullName}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        No photo
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleShortlist(c.id)}
                      className={cn(
                        "absolute right-2 top-2 rounded-full p-1.5 transition-all",
                        shortlisted.has(c.id)
                          ? "bg-rose-500 text-white"
                          : "bg-white/80 text-muted-foreground hover:bg-white hover:text-rose-500",
                      )}
                      title="Shortlist"
                    >
                      <Heart className={cn("h-4 w-4", shortlisted.has(c.id) && "fill-current")} />
                    </button>
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                      <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[c.status] ?? "bg-slate-400")} />
                      <span className="text-xs font-medium text-white drop-shadow">{c.status}</span>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-1.5">
                    <div className="font-mono text-xs text-muted-foreground">{c.candidateCode}</div>
                    <div className="font-semibold text-sm truncate">{c.fullName}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {countryFlag(c.countryCode)} {c.nationality}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>{c.position}</span>
                      <span className="text-muted-foreground">
                        {c.age ? `${c.age} yrs` : "—"} · {c.experienceYears}y exp
                      </span>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                        onClick={() => setDetailId(c.id)}
                      >
                        <Eye className="h-3 w-3" /> Details
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                        <Link to="/workers/$id/cv" params={{ id: c.id }}>
                          <FileText className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailCandidate?.fullName ?? "—"}</SheetTitle>
          </SheetHeader>
          {detailCandidate && (
            <CandidateDetail
              candidate={detailCandidate}
              agents={agents}
              onShortlist={() => toggleShortlist(detailCandidate.id)}
              shortlisted={shortlisted.has(detailCandidate.id)}
            />
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

function CandidateDetail({
  candidate,
  agents,
  onShortlist,
  shortlisted,
}: {
  candidate: Candidate;
  agents: Agent[];
  onShortlist: () => void;
  shortlisted: boolean;
}) {
  const [uploader, setUploader] = useState("Loading...");
  const [activePhoto, setActivePhoto] = useState(0);
  const allPhotos = [candidate.photoUrl, ...candidate.galleryUrls].filter(Boolean);

  useEffect(() => {
    (async () => {
      const name = await getUploaderName(candidate.uploadedByUserId);
      setUploader(name);
    })();
  }, [candidate.uploadedByUserId]);

  return (
    <div className="mt-4 space-y-4">
      {/* Photo gallery */}
      <div className="space-y-2">
        <div className="aspect-[3/4] max-w-[240px] overflow-hidden rounded-lg border bg-muted">
          <img src={allPhotos[activePhoto]} alt={candidate.fullName} className="h-full w-full object-cover" />
        </div>
        {allPhotos.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {allPhotos.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActivePhoto(i)}
                className={cn(
                  "h-14 w-12 overflow-hidden rounded border-2 transition",
                  activePhoto === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cn("gap-1.5", candidate.status === "Available" && "border-emerald-500/30 text-emerald-600")}>
          <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[candidate.status])} />
          {candidate.status}
        </Badge>
        <span className="text-xs text-muted-foreground">Added {formatDate(candidate.createdAt.slice(0, 10))}</span>
      </div>

      <div className="font-mono text-xs text-muted-foreground">{candidate.candidateCode}</div>

      {/* Details list */}
      <div className="space-y-2 rounded-lg border p-3 text-sm">
        <DetailRow label="Age" value={candidate.age ? `${candidate.age} years` : "—"} />
        <DetailRow label="Nationality" value={`${countryFlag(candidate.countryCode)} ${candidate.nationality}`} />
        <DetailRow label="Position" value={candidate.position} />
        <DetailRow label="Experience" value={`${candidate.experienceYears} years`} />
        <DetailRow label="Languages" value={candidate.languages.join(", ") || "—"} />
        <DetailRow label="Availability" value={candidate.availabilityStatus} />
        <DetailRow label="Marital Status" value={candidate.maritalStatus ?? "—"} />
        <DetailRow label="Children" value={String(candidate.childrenCount)} />
        <DetailRow label="Height" value={candidate.height ?? "—"} />
        <DetailRow label="Weight" value={candidate.weight ?? "—"} />
        <DetailRow label="Religion" value={candidate.religion ?? "—"} />
        <DetailRow label="Education" value={candidate.education ?? "—"} />
        <DetailRow label="Skills" value={candidate.skills.join(", ") || "—"} />
        <DetailRow label="Agent" value={agentName(agents, candidate.agentId)} />
        <DetailRow label="Uploaded by" value={uploader} />
        <div className="border-t pt-2 mt-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Passport</div>
          <DetailRow label="Number" value={maskPassport(candidate.passportNumber)} />
          <DetailRow label="Issue Date" value={formatDate(candidate.passportIssueDate)} />
          <DetailRow label="Expiry Date" value={formatDate(candidate.passportExpiryDate)} />
        </div>
        {candidate.notes && (
          <div className="border-t pt-2 mt-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</div>
            <p className="text-sm">{candidate.notes}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" className="flex-1" asChild>
          <Link to="/workers/$id/cv" params={{ id: candidate.id }}>
            <FileText className="h-4 w-4" /> View Full CV
          </Link>
        </Button>
        <Button size="sm" variant={shortlisted ? "destructive" : "outline"} onClick={onShortlist}>
          <Heart className={cn("h-4 w-4", shortlisted && "fill-current")} />
          {shortlisted ? "Shortlisted" : "Shortlist"}
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
