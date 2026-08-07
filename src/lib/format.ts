export const qar = (n: number) =>
  new Intl.NumberFormat("en-QA", { style: "currency", currency: "QAR", maximumFractionDigits: 2 }).format(n || 0);

export const num = (n: number) =>
  new Intl.NumberFormat("en-QA", { maximumFractionDigits: 2 }).format(n || 0);

export const today = () => new Date().toISOString().slice(0, 10);

/** Day of week, derived automatically from an ISO date (never entered by hand). */
export function dayOfWeek(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { weekday: "long" });
}

/** The signed-in operator, shown as a small secondary audit detail on reports. */
let reportUserLabel = "";
export function setReportUser(label: string | null | undefined) {
  reportUserLabel = label ?? "";
}
export function getReportUser() {
  return reportUserLabel;
}

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

// ============================================================
// Printable accounting report (Print / Save as PDF)
// Clean Excel-style layout: Date · Company · Particulars · Amount · Wallet
// ============================================================
export type PrintReportRow = {
  date: string;
  company?: string;
  particulars?: string;
  amount: number;
  /** Ledger mode: money received into the account. */
  moneyIn?: number;
  /** Ledger mode: money paid out of the account. */
  moneyOut?: number;
  /** Running balance (wallet statements). */
  balance?: number;
  wallet?: string;
};

export type PrintReportOptions = {
  title: string;
  subtitle?: string;
  from?: string;
  to?: string;
  company?: string;
  rows: PrintReportRow[];
  /** "inout" renders separate Money In / Money Out columns (cash-book style). */
  columns?: "single" | "inout";
  /** Adds a running Balance column (wallet / card statements). */
  showBalance?: boolean;
  /** Optional carry-forward style summary shown above the table. */
  summary?: { label: string; value: string }[];
  /** Small explanatory note printed under the table. */
  note?: string;
};


const nf = (n: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

/** Opens a print-ready accounting report in a new window (use "Save as PDF"). */
export function printAccountingReport(opts: PrintReportOptions) {
  if (typeof window === "undefined") return;
  const { title, subtitle, from, to, company, rows, summary, note, columns = "single", showBalance = false } = opts;
  const inout = columns === "inout";
  const bal = inout && showBalance;
  const total = rows.reduce((a, r) => a + (r.amount || 0), 0);
  const totalIn = rows.reduce((a, r) => a + (r.moneyIn || 0), 0);
  const totalOut = rows.reduce((a, r) => a + (r.moneyOut || 0), 0);
  const colCount = (inout ? 7 : 6) + (bal ? 1 : 0);
  const range =
    from || to ? `${from ? from : "Beginning"} to ${to ? to : "Date"}` : "All dates";
  const generated = new Date().toLocaleString("en-GB", { hour12: false });

  const amountCells = (r: PrintReportRow) =>
    (inout
      ? `<td class="r">${r.moneyIn ? nf(r.moneyIn) : ""}</td><td class="r">${r.moneyOut ? nf(r.moneyOut) : ""}</td>`
      : `<td class="r">${nf(r.amount)}</td>`) +
    (bal ? `<td class="r">${r.balance == null ? "" : nf(r.balance)}</td>` : "");

  const body = rows.length
    ? rows
        .map(
          (r, i) => `<tr>
<td class="c">${i + 1}</td>
<td class="nw">${esc(r.date)}</td>
<td>${esc(r.company ?? "—")}</td>
<td>${esc(r.particulars ?? "—")}</td>
${amountCells(r)}
<td>${esc(r.wallet ?? "—")}</td>
</tr>`,
        )
        .join("")
    : `<tr><td colspan="${colCount}" class="c muted">No transactions for the selected filters.</td></tr>`;


  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
@page { size: A4; margin: 14mm 12mm 20mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 0; }
.head { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px; }
.head h1 { font-size: 17px; margin: 0 0 2px; letter-spacing: .3px; }
.head .org { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #555; }
.head .sub { font-size: 11px; color: #333; margin-top: 3px; }
.meta { display: flex; flex-wrap: wrap; gap: 4px 28px; font-size: 10.5px; margin-bottom: 10px; }
.meta div span { color: #555; }
.meta div b { font-weight: 700; }
.sum { margin: 0 0 10px; border: 1px solid #999; border-collapse: collapse; }
.sum td { border: 1px solid #ccc; padding: 3px 8px; }
.sum td.k { color: #555; }
.sum td.v { text-align: right; font-weight: 700; }
table.grid { width: 100%; border-collapse: collapse; }
table.grid th, table.grid td { border: 1px solid #999; padding: 4px 6px; vertical-align: top; }
table.grid thead th { background: #e5e7eb; font-size: 10.5px; text-transform: uppercase; letter-spacing: .4px; }
table.grid tfoot td { background: #f3f4f6; font-weight: 700; font-size: 12px; }
thead { display: table-header-group; }
tfoot { display: table-footer-group; }
tr { page-break-inside: avoid; }
td.r, th.r { text-align: right; font-variant-numeric: tabular-nums; }
td.c, th.c { text-align: center; }
td.nw { white-space: nowrap; }
.muted { color: #777; padding: 14px 0; }
.note { margin-top: 8px; font-size: 9.5px; color: #555; font-style: italic; }
.audit { margin-top: 10px; font-size: 9.5px; color: #666; }
.pf { position: fixed; bottom: -12mm; left: 0; right: 0; font-size: 9.5px; color: #666;
      display: flex; justify-content: space-between; border-top: 1px solid #ccc; padding-top: 3px; }
.pf .pn::after { content: "Page " counter(page) " of " counter(pages); }
</style></head><body>
<div class="head">
  <div class="org">Alhakeem Expenses ERP</div>
  <h1>${esc(title)}</h1>
  ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ""}
</div>
<div class="meta">
  <div><span>Period:</span> <b>${esc(range)}</b></div>
  <div><span>Company:</span> <b>${esc(company ?? "All companies")}</b></div>
  <div><span>Entries:</span> <b>${rows.length}</b></div>
  <div><span>Generated:</span> <b>${esc(generated)}</b></div>
</div>
${
  summary && summary.length
    ? `<table class="sum">${summary
        .map((x) => `<tr><td class="k">${esc(x.label)}</td><td class="v">${esc(x.value)}</td></tr>`)
        .join("")}</table>`
    : ""
}
<table class="grid">
  <thead><tr>
    <th class="c" style="width:34px">#</th>
    <th style="width:78px">Date</th>
    <th style="width:90px">Company</th>
    <th>Particulars / Purpose</th>
    ${
      inout
        ? `<th class="r" style="width:95px">Money In (QAR)</th><th class="r" style="width:95px">Money Out (QAR)</th>`
        : `<th class="r" style="width:100px">Amount (QAR)</th>`
    }
    ${bal ? `<th class="r" style="width:95px">Balance (QAR)</th>` : ""}
    <th style="width:130px">Payment Wallet</th>
  </tr></thead>
  <tbody>${body}</tbody>
  <tfoot>${
    inout
      ? `<tr>
    <td colspan="4" class="r">TOTALS</td>
    <td class="r">${nf(totalIn)}</td>
    <td class="r">${nf(totalOut)}</td>
    ${bal ? `<td class="r">${rows.length && rows[rows.length - 1].balance != null ? nf(rows[rows.length - 1].balance as number) : ""}</td>` : ""}
    <td></td>
  </tr>
  <tr>
    <td colspan="4" class="r">NET MOVEMENT</td>
    <td colspan="${bal ? 3 : 2}" class="r">${nf(totalIn - totalOut)}</td>
    <td></td>
  </tr>`
      : `<tr>
    <td colspan="4" class="r">GRAND TOTAL</td>
    <td class="r">${nf(total)}</td>
    <td></td>
  </tr>`
  }</tfoot>
</table>
${note ? `<div class="note">${esc(note)}</div>` : ""}
<div class="pf"><span>${esc(title)} · Alhakeem Expenses ERP · Generated ${esc(generated)}</span><span class="pn"></span></div>
</body></html>`;

  const win = window.open("", "_blank", "width=1000,height=800");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

// ============================================================
// Fuel / vehicle report printing (its own column layout)
// ============================================================
export type FuelPrintRow = {
  date: string;
  day: string;
  company: string;
  vehicle: string;
  plateNumber: string;
  odometer?: number;
  km?: number;
  driver: string;
  amount: number;
  wallet: string;
};

export function printFuelReport(opts: {
  title: string;
  subtitle?: string;
  from?: string;
  to?: string;
  company?: string;
  rows: FuelPrintRow[];
}) {
  if (typeof window === "undefined") return;
  const { title, subtitle, from, to, company, rows } = opts;
  const totalAmount = rows.reduce((a, r) => a + (r.amount || 0), 0);
  const totalKm = rows.reduce((a, r) => a + (r.km || 0), 0);
  const generated = new Date().toLocaleString("en-GB", { hour12: false });
  const range = from || to ? `${from || "Beginning"} to ${to || "Date"}` : "All dates";

  const body = rows.length
    ? rows
        .map(
          (r, i) => `<tr>
<td class="c">${i + 1}</td><td class="nw">${esc(r.date)}</td><td>${esc(r.day)}</td>
<td>${esc(r.company)}</td><td>${esc(r.vehicle)}</td><td>${esc(r.plateNumber)}</td>
<td class="r">${r.odometer == null ? "" : nf(r.odometer)}</td>
<td class="r">${r.km == null ? "" : nf(r.km)}</td>
<td>${esc(r.driver)}</td><td class="r">${nf(r.amount)}</td><td>${esc(r.wallet)}</td>
</tr>`,
        )
        .join("")
    : `<tr><td colspan="11" class="c muted">No fuel transactions for the selected filters.</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${esc(title)}</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; margin: 0; }
.head { text-align: center; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px; }
.head h1 { font-size: 17px; margin: 0 0 2px; }
.head .org { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #555; }
.meta { display: flex; flex-wrap: wrap; gap: 4px 28px; font-size: 10.5px; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #999; padding: 4px 6px; }
thead th { background: #e5e7eb; text-transform: uppercase; font-size: 10px; }
tfoot td { background: #f3f4f6; font-weight: 700; }
td.r, th.r { text-align: right; font-variant-numeric: tabular-nums; }
td.c { text-align: center; }
td.nw { white-space: nowrap; }
.muted { color: #777; padding: 12px 0; }
.audit { margin-top: 10px; font-size: 9.5px; color: #666; }
</style></head><body>
<div class="head"><div class="org">Alhakeem Expenses ERP</div><h1>${esc(title)}</h1>
${subtitle ? `<div>${esc(subtitle)}</div>` : ""}</div>
<div class="meta">
  <div><span>Period:</span> <b>${esc(range)}</b></div>
  <div><span>Company:</span> <b>${esc(company ?? "All companies")}</b></div>
  <div><span>Fuel transactions:</span> <b>${rows.length}</b></div>
</div>
<table>
<thead><tr><th class="c">#</th><th>Date</th><th>Day</th><th>Company</th><th>Vehicle</th>
<th>Number Plate</th><th class="r">Odometer</th><th class="r">KM</th><th>Driver</th>
<th class="r">Amount (QAR)</th><th>Payment Wallet</th></tr></thead>
<tbody>${body}</tbody>
<tfoot>
<tr><td colspan="6" class="r">TOTALS</td><td></td><td class="r">${nf(totalKm)}</td><td></td><td class="r">${nf(totalAmount)}</td><td></td></tr>
<tr><td colspan="6" class="r">TOTAL FUEL EXPENSE</td><td colspan="5" class="r">${nf(totalAmount)}</td></tr>
<tr><td colspan="6" class="r">TOTAL KM</td><td colspan="5" class="r">${nf(totalKm)}</td></tr>
<tr><td colspan="6" class="r">NUMBER OF FUEL TRANSACTIONS</td><td colspan="5" class="r">${rows.length}</td></tr>
</tfoot>
</table>
</body></html>`;

  const win = window.open("", "_blank", "width=1100,height=800");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
