// In-app notifications for official requests:
// admins see the pending count; requesters are told when a decision lands.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { countPendingRequests, listUnseenDecisions, markSeen, REQUEST_TYPE_LABEL } from "@/lib/recruitment-requests";

let toldPending = false;

export function useRequestNotifications(enabled: boolean, isAdmin: boolean): number {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    async function tick() {
      try {
        if (isAdmin) {
          const n = await countPendingRequests();
          if (!alive) return;
          setPending(n);
          if (n > 0 && !toldPending) {
            toldPending = true;
            toast.info(`${n} request${n > 1 ? "s" : ""} waiting for your approval`, { description: "Open Official Requests to decide." });
          }
        }
        const unseen = await listUnseenDecisions();
        if (!alive || !unseen.length) return;
        for (const r of unseen) {
          (r.status === "Approved" ? toast.success : toast.error)(
            `Request ${r.status.toLowerCase()}: ${REQUEST_TYPE_LABEL[r.type] ?? r.type}`,
            { description: r.decisionNote || undefined, duration: 8000 },
          );
        }
        await markSeen(unseen.map((r) => r.id));
      } catch {
        /* notifications are best-effort */
      }
    }
    void tick();
    const id = window.setInterval(tick, 60_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [enabled, isAdmin]);
  return pending;
}
