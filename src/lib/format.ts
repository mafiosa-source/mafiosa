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

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Excel-readable workbook (SpreadsheetML-free HTML table — opens natively in Excel). */
export function exportExcel(filename: string, rows: Record<string, unknown>[], title?: string) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8" />
<style>table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:11pt}
th,td{border:1px solid #999;padding:4px 6px}th{background:#1f2937;color:#fff}</style></head><body>
${title ? `<h3 style="font-family:Arial">${esc(title)}</h3>` : ""}
<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
<tbody>${rows
    .map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
  triggerDownload(new Blob([html], { type: "application/vnd.ms-excel" }), filename.replace(/\.xlsx?$/, "") + ".xls");
}

/** Opens the browser print dialog for a report region — use "Save as PDF" to export. */
export function printReport(elementId: string, documentTitle?: string) {
  if (typeof document === "undefined") return;
  const node = document.getElementById(elementId);
  if (!node) return window.print();
  const win = window.open("", "_blank", "width=1000,height=800");
  if (!win) return window.print();
  win.document.write(`<html><head><title>${esc(documentTitle ?? document.title)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;padding:24px}
h1,h2,h3{margin:0 0 4px}
table{border-collapse:collapse;width:100%;margin-top:12px}
th,td{border:1px solid #bbb;padding:5px 7px;text-align:left}
th{background:#f1f5f9}
tfoot td,.total{font-weight:700}
.text-right,td.text-right{text-align:right}
button,[data-print-hide]{display:none !important}
</style></head><body>${node.innerHTML}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
