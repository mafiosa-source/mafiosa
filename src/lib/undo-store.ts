// Undo / Redo history for reversible finance actions.
// Purely additive: mutations register an entry here, nothing else changes.
// Reversals never hard-delete financial history — every step is written to the
// append-only audit trail (see audit-log.ts) before it is applied.
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { logAudit, type AuditEntry } from "./audit-log";

export type UndoEntry = {
  id: string;
  label: string;
  at: string;
  /** Reverses the action. */
  undo: () => void;
  /** Re-applies the action after an undo. */
  redo: () => void;
  /** Audit context recorded when the entry is undone / redone. */
  audit?: Omit<AuditEntry, "action">;
};

const MAX_HISTORY = 50;

let undoStack: UndoEntry[] = [];
let redoStack: UndoEntry[] = [];

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((l) => l());
}

type Snapshot = { canUndo: boolean; canRedo: boolean; lastLabel?: string; nextLabel?: string };
let snapshot: Snapshot = { canUndo: false, canRedo: false };
function refresh() {
  snapshot = {
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    lastLabel: undoStack[undoStack.length - 1]?.label,
    nextLabel: redoStack[redoStack.length - 1]?.label,
  };
  notify();
}

export function useUndoState(): Snapshot {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
    () => snapshot,
  );
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

/** Registers a reversible action and shows a small Undo notification. */
export function pushUndo(entry: Omit<UndoEntry, "id" | "at">, options?: { notify?: boolean }) {
  const full: UndoEntry = { ...entry, id: uid(), at: new Date().toISOString() };
  undoStack = [...undoStack, full].slice(-MAX_HISTORY);
  redoStack = [];
  refresh();
  if (options?.notify !== false) {
    toast(full.label, {
      description: "Ctrl+Z to undo",
      action: { label: "Undo", onClick: () => undoLast() },
    });
  }
}

export function undoLast() {
  const entry = undoStack[undoStack.length - 1];
  if (!entry) {
    toast.info("Nothing left to undo");
    return;
  }
  undoStack = undoStack.slice(0, -1);
  try {
    entry.undo();
    redoStack = [...redoStack, entry].slice(-MAX_HISTORY);
    logAudit({
      action: "undo",
      entity: entry.audit?.entity ?? "unknown",
      entityId: entry.audit?.entityId,
      label: entry.label,
      before: entry.audit?.after,
      after: entry.audit?.before,
    });
    toast.success(`Undone: ${entry.label}`, {
      description: "Ctrl+Shift+Z to redo",
      action: { label: "Redo", onClick: () => redoLast() },
    });
  } catch (e) {
    console.error("[undo] failed", e);
    undoStack = [...undoStack, entry];
    toast.error("Could not undo that action");
  }
  refresh();
}

export function redoLast() {
  const entry = redoStack[redoStack.length - 1];
  if (!entry) {
    toast.info("Nothing to redo");
    return;
  }
  redoStack = redoStack.slice(0, -1);
  try {
    entry.redo();
    undoStack = [...undoStack, entry].slice(-MAX_HISTORY);
    logAudit({
      action: "redo",
      entity: entry.audit?.entity ?? "unknown",
      entityId: entry.audit?.entityId,
      label: entry.label,
      before: entry.audit?.before,
      after: entry.audit?.after,
    });
    toast.success(`Redone: ${entry.label}`);
  } catch (e) {
    console.error("[redo] failed", e);
    redoStack = [...redoStack, entry];
    toast.error("Could not redo that action");
  }
  refresh();
}

export function clearUndoHistory() {
  undoStack = [];
  redoStack = [];
  refresh();
}
