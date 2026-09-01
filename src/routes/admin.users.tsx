// Admin → Users. Create users, assign module permissions, hand out temporary passwords.
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MODULES, type ModuleKey } from "@/lib/permissions";
import {
  clearTempPassword,
  createAppUser,
  listAppUsers,
  resetUserPassword,
  saveAppUser,
} from "@/lib/users.functions";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
  head: () => ({
    meta: [
      { title: "Admin Users · Alhakeem Group ERP" },
      { name: "description", content: "Create ERP users, assign module permissions and issue temporary passwords." },
      { property: "og:title", content: "Admin Users · Alhakeem Group ERP" },
      { property: "og:description", content: "Manage ERP user access and module permissions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Row = Awaited<ReturnType<typeof listAppUsers>>[number];

function AdminUsersPage() {
  const load = useServerFn(listAppUsers);
  const save = useServerFn(saveAppUser);
  const create = useServerFn(createAppUser);
  const reset = useServerFn(resetUserPassword);
  const clearTemp = useServerFn(clearTempPassword);

  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("");

  const refresh = useCallback(() => {
    load({ data: undefined as never })
      .then((r) => setRows(r as Row[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load users"));
  }, [load]);

  useEffect(refresh, [refresh]);

  const togglePermission = async (row: Row, key: ModuleKey) => {
    const next = row.permissions.includes(key)
      ? row.permissions.filter((p) => p !== key)
      : [...row.permissions, key];
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, permissions: next } : r)));
    try {
      await save({ data: { id: row.id, permissions: next } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save permissions");
      refresh();
    }
  };

  const patch = async (row: Row, data: Partial<{ fullAccess: boolean; status: "active" | "disabled"; role: "admin" | "user" }>) => {
    try {
      await save({ data: { id: row.id, ...data } });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save user");
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Users & Permissions"
        description="Create users, choose exactly which modules they may open, and hand out their temporary password."
      />

      <div className="mb-6 rounded-xl border bg-card p-4 shadow-sm">
        <Label htmlFor="new-user" className="text-sm">Add a user</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          <Input
            id="new-user"
            className="max-w-xs"
            placeholder="Full name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            disabled={busy || newName.trim().length < 2}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await create({ data: { name: newName.trim(), permissions: [] } });
                toast.success(`User created. Temporary password: ${res.tempPassword}`);
                setNewName("");
                refresh();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Could not create user");
              } finally {
                setBusy(false);
              }
            }}
          >
            Create user
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          The temporary password is shown in the table below until you mark it as handed over.
        </p>
      </div>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground shadow-sm">
            No users registered yet.
          </div>
        ) : null}
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{row.name}</span>
                  <Badge variant={row.role === "admin" ? "default" : "outline"}>{row.role}</Badge>
                  <Badge variant={row.status === "active" ? "secondary" : "destructive"}>{row.status}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Last sign-in: {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "never"}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => patch(row, { status: row.status === "active" ? "disabled" : "active" })}
                >
                  {row.status === "active" ? "Disable" : "Enable"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const res = await reset({ data: { id: row.id } });
                      toast.success(`New temporary password: ${res.tempPassword}`);
                      refresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not reset password");
                    }
                  }}
                >
                  Reset password
                </Button>
              </div>
            </div>

            {row.tempPassword ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 px-3 py-2 text-sm">
                <span>
                  Temporary password: <span className="font-mono font-semibold">{row.tempPassword}</span>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(row.tempPassword ?? "");
                    toast.success("Copied");
                  }}
                >
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await clearTemp({ data: { id: row.id } });
                      refresh();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not hide password");
                    }
                  }}
                >
                  I have handed it over
                </Button>
              </div>
            ) : null}

            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={row.fullAccess}
                  onCheckedChange={(v) => patch(row, { fullAccess: Boolean(v) })}
                />
                Full system access
              </label>
              {!row.fullAccess ? (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {MODULES.map((m) => (
                    <label key={m.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={row.permissions.includes(m.key)}
                        onCheckedChange={() => void togglePermission(row, m.key)}
                      />
                      <span className="text-foreground">{m.label}</span>
                      <span className="text-xs">· {m.group}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Modules allowed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.role === "admin" || r.fullAccess
                    ? "Everything"
                    : r.permissions.length
                      ? r.permissions.map((p) => MODULES.find((m) => m.key === p)?.label ?? p).join(", ")
                      : "None yet"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
