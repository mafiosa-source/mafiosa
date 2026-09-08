import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/dumonde-ops";
import { scanDuMondeDocument, type ScanResult } from "@/lib/dumonde-scan.functions";

/** Upload a photo/PDF/spreadsheet and let the system read it, for review before saving. */
export function ScanUpload({
  kind,
  onResult,
  label = "Scan / upload file",
}: {
  kind: "lpo" | "sales" | "bank";
  onResult: (result: ScanResult, file: File) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handle = async (file: File) => {
    setBusy(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const result = await scanDuMondeDocument({
        data: { fileBase64, mimeType: file.type || "image/jpeg", kind },
      });
      onResult(result, file);
      if (result.lines.length) toast.success(`Read ${result.lines.length} line${result.lines.length === 1 ? "" : "s"} — please check them.`);
      else toast.warning("Nothing could be read from that file. Add the lines by hand.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,.csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handle(file);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
        {busy ? "Reading..." : label}
      </Button>
    </>
  );
}
