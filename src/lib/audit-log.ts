// Append-only audit trail for reversible actions (create / edit / delete / undo / redo).
// Writes are fire-and-forget: an audit failure must never block a finance action.
import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "create" | "update" | "delete" | "restore" | "undo" | "redo";

export type AuditEntry = {
  action: AuditAction;
  entity: string;
  entityId?: string;
  label?: string;
  before?: unknown;
  after?: unknown;
  actor?: string;
};

export function logAudit(entry: AuditEntry) {
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;
      await supabase.from("action_audit" as never).insert({
        user_id: userId,
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entityId ?? null,
        label: entry.label ?? null,
        before_data: (entry.before ?? null) as never,
        after_data: (entry.after ?? null) as never,
        actor: entry.actor ?? data.user?.email ?? null,
      } as never);
    } catch (e) {
      console.warn("[audit] could not record entry", e);
    }
  })();
}
