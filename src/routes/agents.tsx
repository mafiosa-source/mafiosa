import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  COUNTRIES,
  type Agent,
} from "@/lib/cv-management";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agents · Alhakeem Group ERP" },
      { name: "description", content: "Manage recruitment agents grouped by country." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      setAgents(await listAgents());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load agents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Agent[]>();
    for (const agent of agents) {
      const list = map.get(agent.country) ?? [];
      list.push(agent);
      map.set(agent.country, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [agents]);

  function startCreate() {
    setEditing(null);
    setName("");
    setAgentCode("");
    setCountry("");
    setPhone("");
    setContactPerson("");
    setOpen(true);
  }

  function startEdit(agent: Agent) {
    setEditing(agent);
    setName(agent.name);
    setAgentCode(agent.agentCode);
    setCountry(agent.country);
    setPhone(agent.phone ?? "");
    setContactPerson(agent.contactPerson ?? "");
    setOpen(true);
  }

  async function save() {
    if (!name.trim() || !agentCode.trim() || !country) {
      toast.error("Name, agent code, and country are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateAgent(editing.id, { name: name.trim(), agentCode, country, phone, contactPerson });
        toast.success("Agent updated");
      } else {
        await createAgent({ name: name.trim(), agentCode, country, phone, contactPerson });
        toast.success("Agent added");
      }
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save agent");
    } finally {
      setSaving(false);
    }
  }

  async function remove(agent: Agent) {
    if (!window.confirm(`Delete ${agent.name}? Candidates assigned to this agent will remain safe.`)) return;
    try {
      await deleteAgent(agent.id);
      toast.success("Agent deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete agent");
    }
  }

  return (
    <AppLayout>
      <PageHeader
        title="Agents"
        description="Recruitment agents grouped by country. Agent codes are used in candidate serial numbers."
        action={<Button size="sm" onClick={startCreate}><Plus className="h-4 w-4" /> Add Agent</Button>}
      />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : grouped.length === 0 ? (
        <div className="rounded-lg border bg-card py-16 text-center text-muted-foreground">No agents found.</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([group, rows]) => (
            <Card key={group}>
              <CardHeader className="pb-3"><CardTitle className="text-base">{group}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Agent code</TableHead><TableHead>Name</TableHead><TableHead>Contact person</TableHead><TableHead>Phone</TableHead><TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{rows.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-mono text-sm">{agent.agentCode}</TableCell>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell>{agent.contactPerson || "—"}</TableCell>
                      <TableCell>{agent.phone || "—"}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(agent)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => void remove(agent)}><Trash2 className="h-4 w-4" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit agent" : "Add agent"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Agent code</Label><Input value={agentCode} onChange={(e) => setAgentCode(e.target.value)} placeholder="AG11" /></div>
            <div className="space-y-1.5"><Label>Country</Label><Select value={country} onValueChange={setCountry}><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{COUNTRIES.map((c) => <SelectItem key={c.code} value={c.name}>{c.flag} {c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Contact person</Label><Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => void save()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
