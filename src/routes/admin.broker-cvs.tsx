import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, FileText, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAppUser } from "@/lib/app-user";
import {
  listCandidates,
  updateCandidate,
  candidateSerialCode,
  countryName,
  countryFlag,
  type Candidate,
} from "@/lib/cv-management";

export const Route = createFileRoute("/admin/broker-cvs")({
  head: () => ({
    meta: [
      { title: "Broker Website CVs · Alhakeem Group ERP" },
      {
        name: "description",
        content:
          "Choose which recruitment CVs appear on the Broker Recruitment Agency website: Available shows them, Reserved hides them.",
      },
      { property: "og:title", content: "Broker Website CVs · Alhakeem Group ERP" },
      { property: "og:description", content: "Show or hide recruitment CVs on the Broker website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerCvsAdmin,
});

function BrokerCvsAdmin() {
  const { isAdmin } = useAppUser();
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function reload() {
    setLoading(true);
    try {
      setRows(await listCandidates());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load CVs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [candidateSerialCode(r), r.fullName, r.position, r.nationality, countryName(r.countryCode)]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  const liveCount = filtered.filter((r) => r.status === "Available").length;

  async function toggle(c: Candidate, next: boolean) {
    const status: Candidate["status"] = next ? "Available" : "Reserved";
    setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, status } : r)));
    try {
      await updateCandidate(c.id, { status, availabilityStatus: next ? "Available" : "Reserved" });
      toast.success(next ? `${c.fullName} is now visible on the website` : `${c.fullName} is marked reserved`);
    } catch (e) {
      setRows((prev) => prev.map((r) => (r.id === c.id ? { ...r, status: c.status } : r)));
      toast.error(e instanceof Error ? e.message : "Could not change availability");
    }
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <PageHeader title="Broker Website CVs" description="Administrator access only." />
        <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          Only the administrator can choose which CVs are published on the Broker website.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Broker Website CVs"
        description="Every recruitment CV is listed here automatically. Available shows the worker on the public website, Reserved hides them instantly."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, name, position…"
            className="pl-9"
          />
        </div>
        <div className="rounded-lg bg-muted px-3 py-2 text-sm">
          {liveCount} live of {filtered.length}
        </div>
        <Button variant="outline" onClick={() => void reload()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading CVs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No recruitment CVs yet. Add workers in Recruitment and they appear here automatically.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Experience</th>
                <th className="px-4 py-3">CV</th>
                <th className="px-4 py-3">Website</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs">{candidateSerialCode(c)}</td>
                  <td className="px-4 py-3 font-medium">{c.fullName}</td>
                  <td className="px-4 py-3">
                    {countryFlag(c.countryCode)} {countryName(c.countryCode)}
                  </td>
                  <td className="px-4 py-3">{c.position}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.experienceYears ? `${c.experienceYears} yr${c.experienceCountry ? ` · ${c.experienceCountry}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/workers/$id/cv" params={{ id: c.id }}>
                        <FileText className="mr-1 h-4 w-4" /> View
                      </Link>
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.status === "Available"}
                        onCheckedChange={(v) => void toggle(c, v)}
                      />
                      <span className={c.status === "Available" ? "text-emerald-600" : "text-muted-foreground"}>
                        {c.status === "Available" ? "Available" : "Reserved"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
