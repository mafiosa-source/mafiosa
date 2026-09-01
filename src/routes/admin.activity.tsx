// Admin → Activity. Full audit trail with before → after values and deleted-record restore.
import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fetchDeletedTransactions, undeleteCloudTransaction } from "@/lib/finance-cloud";
import { hydrateFromCloud } from "@/lib/finance-store";
import { qar } from "@/lib/format";
import type { Transaction } from "@/lib/finance-types";

export const Route = createFileRoute("/admin/activity")({
  component: AdminActivityPage,
  head: () => ({
    meta: [
      { title: "Activity Log · Alhakeem Group ERP" },
      { name: "description", content: "Audit trail of every create, edit, delete and restore across the finance ERP." },
      { property: "og:title", content: "Activity Log · Alhakeem Group ERP" },
      { property: "og:description", content: "Who did what, when, with before and after values." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type AuditRow = {
  id: string;
  created_at: string;
  action: string;
  entity: string;
  entity_id: string | null;
  label: string | null;
  module: string | null;
  actor: string | null;
  actor_name: string | null;
  before_data: unknown;
  after_data: unknown;
};

const ALL = "__all__";

/** Field-level before → after diff, shown to the administrator. */
function diffOf(before: unknown, after: unknown): { field: string; from: string; to: string }[] {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));
  const fmt = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));
  return keys
    .filter((k) => fmt(b[k]) !== fmt(a[k]))
    .map((k) => ({ field: k, from: fmt(b[k]), to: fmt(a[k]) }));
}

function AdminActivityPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [deleted, setDeleted] = useState<{ txn: Transaction; deletedAt: string; deletedBy?: string }[]>([]);
  const [actor, setActor] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [entity, setEntity] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("action_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) toast.error(error.message);
      else setRows((data ?? []) as unknown as AuditRow[]);
      try {
        setDeleted(await fetchDeletedTransactions());
      } catch {
        /* deleted view is best-effort */
      }
    })();
  }, []);

  useEffect(refresh, [refresh]);

  const actors = useMemo(
    () => Array.from(new Set(rows.map((r) => r.actor_name || r.actor || "").filter(Boolean))).sort(),
    [rows],
  );
  const entities = useMemo(() => Array.from(new Set(rows.map((r) => r.entity))).sort(), [rows]);
  const actions = useMemo(() => Array.from(new Set(rows.map((r) => r.action))).sort(), [rows]);

  const filtered = rows.filter((r) => {
    const who = r.actor_name || r.actor || "";
    const day = r.created_at.slice(0, 10);
    if (actor !== ALL && who !== actor) return false;
    if (action !== ALL && r.action !== action) return false;
    if (entity !== ALL && r.entity !== entity) return false;
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });

  return (
    <AppLayout>
      <PageHeader
        title="Activity & Audit Log"
        description="Every create, edit, delete and restore — who did it, when, and exactly what changed."
      />

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
        <Select value={actor} onValueChange={setActor}>
          <SelectTrigger><SelectValue placeholder="All users" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All users</SelectItem>
            {actors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {actions.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={entity} onValueChange={setEntity}>
          <SelectTrigger><SelectValue placeholder="All modules" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All modules</SelectItem>
            {entities.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Record</TableHead>
              <TableHead className="text-right">Changes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No activity for the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const changes = diffOf(r.before_data, r.after_data);
                const expanded = open === r.id;
                return (
                  <Fragment key={r.id}>
                    <TableRow>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{r.actor_name || r.actor || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.module || r.entity}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm">{r.label || r.entity_id || "—"}</TableCell>
                      <TableCell className="text-right">
                        {changes.length ? (
                          <Button size="sm" variant="ghost" onClick={() => setOpen(expanded ? null : r.id)}>
                            {expanded ? "Hide" : `${changes.length} field(s)`}
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {expanded ? (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/40">
                          <div className="space-y-1 text-sm">
                            {changes.map((c) => (
                              <div key={c.field} className="flex flex-wrap gap-2">
                                <span className="font-medium text-foreground">{c.field}</span>
                                <span className="text-[color:var(--destructive)]">{c.from}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-[color:var(--success)]">{c.to}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold text-foreground">Deleted transactions</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Financial records are never erased. Deleted vouchers stay here and can be restored.
      </p>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Deleted</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Particulars</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Restore</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deleted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No deleted transactions.
                </TableCell>
              </TableRow>
            ) : (
              deleted.map((d) => (
                <TableRow key={d.txn.id}>
                  <TableCell className="whitespace-nowrap text-sm">{new Date(d.deletedAt).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{d.deletedBy || "—"}</TableCell>
                  <TableCell className="text-sm">{d.txn.date}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-sm">
                    {d.txn.purpose || d.txn.description || d.txn.type}
                  </TableCell>
                  <TableCell className="text-right tabular">{qar(d.txn.amount)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await undeleteCloudTransaction(d.txn.id);
                          await hydrateFromCloud();
                          toast.success("Transaction restored");
                          refresh();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Could not restore");
                        }
                      }}
                    >
                      Restore
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
