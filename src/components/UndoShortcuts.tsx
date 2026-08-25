import { useEffect } from "react";
import { Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { undoLast, redoLast, useUndoState } from "@/lib/undo-store";

/**
 * Global Ctrl+Z / Ctrl+Shift+Z (Cmd on macOS) handling plus a small floating
 * Undo control that only appears once there is something to reverse.
 * Purely additive — it never changes any existing workflow.
 */
export function UndoShortcuts() {
  const { canUndo, canRedo, lastLabel, nextLabel } = useUndoState();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const el = e.target as HTMLElement | null;
      // Never hijack text editing inside forms.
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      e.preventDefault();
      if (e.shiftKey) redoLast();
      else undoLast();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!canUndo && !canRedo) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-lg backdrop-blur print:hidden">
      <Button
        size="sm"
        variant="ghost"
        className="h-8 gap-1.5 text-xs"
        disabled={!canUndo}
        onClick={() => undoLast()}
        title={lastLabel ? `Undo: ${lastLabel} (Ctrl+Z)` : "Undo (Ctrl+Z)"}
      >
        <Undo2 className="h-3.5 w-3.5" /> Undo
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 gap-1.5 text-xs"
        disabled={!canRedo}
        onClick={() => redoLast()}
        title={nextLabel ? `Redo: ${nextLabel} (Ctrl+Shift+Z)` : "Redo (Ctrl+Shift+Z)"}
      >
        <Redo2 className="h-3.5 w-3.5" /> Redo
      </Button>
    </div>
  );
}
