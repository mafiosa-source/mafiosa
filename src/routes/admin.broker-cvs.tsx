import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, FileText, Search } from "lucide-react";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppUser } from "@/lib/app-user";
import {
  listAllCvs,
  createCv,
  updateCv,
  deleteCv,
  setCvAvailability,
  uploadCvPdf,
  cvFileLink,
  CV_COUNTRIES,
  COUNTRY_NAME,
  type PublicCv,
  type CvInput,
} from "@/lib/public-cvs";

export const Route = createFileRoute("/admin/broker-cvs")({
  head: () => ({
    meta: [
      { title: "Broker Website CVs · Alhakeem Group ERP" },
      {
        name: "description",
        content: "Manage the CVs published on the Broker Recruitment Agency website: add, edit, reserve or remove.",
      },
      { property: "og:title", content: "Broker Website CVs · Alhakeem Group ERP" },
      { property: "og:description", content: "Publish and reserve worker CVs shown on the Broker website." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrokerCvsAdmin,
});

const EMPTY: CvInput = {
  id: "",
  name: "",
  country: "PHP",
  position: "",
  experience: "",
  cvUrl: null,
  isAvailable: true,
  phoneOverride: "",
};

function BrokerCvsAdmin() {
  const { isAdmin } = useAppUser();
  const [rows, setRows] = useState<PublicCv[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CvInput>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      setRows(await listAllCvs());
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
      [r.id, r.name, r.position, r.experience ?? "", COUNTRY_NAME[r.country] ?? r.country]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, query]);

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setFile(null);
    setOpen(true);
  }

  function startEdit(cv: PublicCv) {
    setEditingId(cv.id);
    setForm({
      id: cv.id,
      name: cv.name,
      country: cv.country,
      position: cv.position,
      experience: cv.experience ?? "",
      cvUrl: cv.cvUrl,
      isAvailable: cv.isAvailable,
      phoneOverride: cv.phoneOverride ?? "",
    });
    setFile(null);
    setOpen(true);
  }

  async function save() {
    if (!form.id.trim()) return toast.error("Enter a CV ID, for example PHP-024");
    if (!form.name.trim()) return toast.error("Enter the worker name");
    if (!form.position.trim()) return toast.error("Enter the position");
    setSaving(true);
    try {
      let cvUrl = form.cvUrl ?? null;
      if (file) cvUrl = await uploadCvPdf(file, form.id);
      const payload: CvInput = { ...form, cvUrl };
      if (editingId) await updateCv(editingId, payload);
      else await createCv(payload);
      toast.success(editingId ? "CV updated" : "CV added to the website");
      setOpen(false);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save this CV");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(cv: PublicCv, next: boolean) {
    setRows((prev) => prev.map((r) => (r.id === cv.id ? { ...r, isAvailable: next } : r)));
    try {
      await setCvAvailability(cv.id, next);
      toast.success(next ? `${cv.name} is now visible on the website` : `${cv.name} is marked reserved`);
    } catch (e) {
      setRows((prev) => prev.map((r) => (r.id === cv.id ? { ...r, isAvailable: !next } : r)));
      toast.error(e instanceof Error ? e.message : "Could not change availability");
    }
  }

  async function remove(cv: PublicCv) {
    if (!window.confirm(`Delete ${cv.name} (${cv.id}) from the website? This cannot be undone.`)) return;
    try {
      await deleteCv(cv.id);
      toast.success("CV deleted");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete this CV");
    }
  }

  async function openFile(cv: PublicCv) {
    if (!cv.cvUrl) return toast.error("No file uploaded for this CV");
    try {
      window.open(await cvFileLink(cv.cvUrl), "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the file");
    }
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <PageHeader title="Broker Website CVs" description="Administrator access only." />
        <div className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          Only the administrator can manage the CVs published on the Broker website.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Broker Website CVs"
        description="These CVs appear on the public Broker Recruitment Agency website. Turn a worker off to hide them instantly."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ID, name, position…"
            className="pl-9"
          />
        </div>
        <div className="rounded-lg bg-muted px-3 py-2 text-sm">
          {filtered.length} {filtered.length === 1 ? "CV" : "CVs"}
        </div>
        <Button onClick={startAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add CV
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading CVs…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No CVs yet. Use “Add CV” to publish one.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Experience</th>
                <th className="px-4 py-3">Phone override</th>
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cv) => (
                <tr key={cv.id} className="border-t">
                  <td className="px-4 py-3 font-mono text-xs">{cv.id}</td>
                  <td className="px-4 py-3 font-medium">{cv.name}</td>
                  <td className="px-4 py-3">{COUNTRY_NAME[cv.country] ?? cv.country}</td>
                  <td className="px-4 py-3">{cv.position}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cv.experience ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cv.phoneOverride ?? "—"}</td>
                  <td className="px-4 py-3">
                    {cv.cvUrl ? (
                      <Button variant="ghost" size="sm" onClick={() => void openFile(cv)}>
                        <FileText className="mr-1 h-4 w-4" /> View
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={cv.isAvailable} onCheckedChange={(v) => void toggle(cv, v)} />
                      <span className={cv.isAvailable ? "text-emerald-600" : "text-muted-foreground"}>
                        {cv.isAvailable ? "Available" : "Reserved"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(cv)} aria-label="Edit CV">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => void remove(cv)} aria-label="Delete CV">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit CV" : "Add CV"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>CV ID</Label>
              <Input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="PHP-024"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CV_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {COUNTRY_NAME[c]} ({c})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Position</Label>
              <Input
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                placeholder="Housemaid"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Experience</Label>
              <Input
                value={form.experience ?? ""}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                placeholder="2 years Qatar"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>CV file (PDF or image)</Label>
              <Input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {form.cvUrl && !file ? (
                <p className="text-xs text-muted-foreground">A file is already attached. Choose a new one to replace it.</p>
              ) : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Phone override (optional)</Label>
              <Input
                value={form.phoneOverride ?? ""}
                onChange={(e) => setForm({ ...form, phoneOverride: e.target.value })}
                placeholder="+974…"
              />
            </div>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                checked={form.isAvailable}
                onCheckedChange={(v) => setForm({ ...form, isAvailable: v })}
              />
              <span className="text-sm">{form.isAvailable ? "Visible on the website" : "Reserved (hidden)"}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingId ? "Save changes" : "Add CV"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
