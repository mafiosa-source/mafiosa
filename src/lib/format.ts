export const qar = (n: number) =>
  new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", maximumFractionDigits: 2 }).format(n || 0);

export const num = (n: number) =>
  new Intl.NumberFormat("en-QA", { maximumFractionDigits: 2 }).format(n || 0);

export const today = () => new Date().toISOString().slice(0, 10);

export function exportCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    const blob = new Blob(["(empty)"], { type: "text/csv" });
    triggerDownload(blob, filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
