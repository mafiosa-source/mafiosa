import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useAppUser } from "@/lib/app-user";
import { NameConfirmDialog } from "@/components/NameConfirmDialog";
import { listCandidates, type Candidate } from "@/lib/cv-management";
import { createSponsor, deleteSponsor, listSponsors, updateSponsor, type Sponsor } from "@/lib/recruitment";
import { HousemaidLink } from "@/components/HousemaidLink";

export const Route = createFileRoute("/recruitment/sponsors")({
  head: () => ({
    meta: [
      { title: "Sponsors Directory · Alhakeem Group ERP" },
      { name: "description", content: "Qatar sponsors with QID, phone and the housemaids linked to them." },
      { property: "og:title", content: "Sponsors Directory · Alhakeem Group ERP" },
      { property: "og:description", content: "Qatar sponsors with QID, phone and the housemaids linked to them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SponsorsPage,
});

type Draft = { fullName: string; qid: string; phone: string; address: string; notes: string };
const empty: Draft = { fullName: "", qid: "", phone: "", address: "", notes: "" };

function SponsorsPage() {
  const { isAdmin } = useAppUser();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Sponsor | null | "new">(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([listSponsors(), listCandidates()]);
      setSponsors(s);
      setCandidates(c);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load sponsors");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  const linked = useMemo(() => {
    const m = new Map<string, Candidate[]>();
    for (const c of candidates) if (c.sponsorId) m.set(c.sponsorId, [...(m.get(c.sponsorId) ?? []), c]);
    return m;
  }, [candidates]);

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return sponsors;
    return sponsors.filter(
      (s) =>
        s.fullName.toLowerCase().includes(k) ||
        (s.qid ?? "").includes(k) ||
        (s.phone ?? "").includes(k) ||
        (linked.get(s.id) ?? []).some((c) => c.fullName.toLowerCase().includes(k)),
    );
  }, [sponsors, q, linked]);

  function openNew() {
    setDraft(empty);
    setEditing("new");
  }
  function openEdit(s: Sponsor) {
    setDraft({ fullName: s.fullName, qid: s.qid ?? "", phone: s.phone ?? "", address: s.address ?? "", notes: s.notes ?? "" });
    setEditing(s);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.fullName.trim()) return toast.error("Sponsor full name is required");
    const dupQid = draft.qid.trim() && sponsors.some((s) => s.qid === draft.qid.trim() && (editing === "new" || s.id !== (editing as Sponsor).id));
    if (dupQid) return toast.error("A sponsor with this QID already exists");
    const dupName = sponsors.some(
      (s) => s.fullName.trim().toLowerCase() === draft.fullName.trim().toLowerCase() && (editing === "new" || s.id !== (editing as Sponsor).id),
    );
    if (dupName && editing === "new") toast.warning("A sponsor with the same name already exists — check the QID before saving.");
    setConfirm(true);
  }

  async function save() {
    setConfirm(false);
    setSaving(true);
    try {
      if (editing === "new") {
        await createSponsor(draft);
        toast.success("Sponsor added");
      } else if (editing) {
        await updateSponsor(editing.id, draft);
        toast.success("Sponsor updated");
      }
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save sponsor");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: Sponsor) {
    const n = linked.get(s.id)?.length ?? 0;
    if (n) return toast.error(`Cannot delete: ${n} housemaid(s) are linked to this sponsor`);
    if (!window.confirm(`Delete sponsor "${s.fullName}"?`)) return;
    try {
      await deleteSponsor(s.id);
      toast.success("Sponsor deleted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete sponsor");
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Sponsors Directory"
        description="Every sponsor once. Names must match the QID exactly."
        action={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> New sponsor
          </Button>
        }
      />
      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search name, QID, phone or housemaid…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sponsor</TableHead>
                <TableHead>QID</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Housemaids</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No sponsors yet.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">{s.qid ?? "—"}</TableCell>
                  <TableCell>{s.phone ?? "—"}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{s.address ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(linked.get(s.id) ?? []).map((c) => (
                        <Badge key={c.id} variant="outline" className="font-normal">
                          <HousemaidLink name={c.fullName} className="text-inherit" />
                        </Badge>
                      ))}
                      {!(linked.get(s.id) ?? []).length && <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button size="icon" variant="ghost" onClick={() => remove(s)} title="Delete (admin)">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === "new" ? "New sponsor" : "Edit sponsor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Full name (as on QID) *</Label>
              <Input value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>QID</Label>
                <Input value={draft.qid} onChange={(e) => setDraft({ ...draft, qid: e.target.value })} placeholder="11 digits" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <NameConfirmDialog
        open={confirm}
        name={draft.fullName.trim()}
        entity="sponsor"
        documentLabel="Qatar ID"
        onConfirm={save}
        onCancel={() => setConfirm(false)}
      />
    </AppLayout>
  );
}
