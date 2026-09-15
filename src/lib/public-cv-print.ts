// Print-ready public CV built ONLY from website-safe fields.
// Never includes phone numbers, passport numbers or home addresses.
import type { PublicCv } from "./public-cvs";
import { AGENCY_ADDRESS, AGENCY_PHONES, COUNTRY_NAME, experienceLabel } from "./public-cvs";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const PUBLIC_CV_STYLES = `
body{margin:0;background:#fff;color:#0f172a;font-family:Arial,Helvetica,sans-serif}
.sheet{width:210mm;min-height:297mm;padding:14mm;box-sizing:border-box}
.top{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0b5fff;padding-bottom:6mm}
.brand{font-size:20pt;font-weight:800;color:#0b5fff;letter-spacing:1px}
.brand small{display:block;font-size:8pt;letter-spacing:3px;color:#475569;font-weight:700}
.ref{font-size:11pt;font-weight:700;color:#0b5fff}
.main{display:flex;gap:8mm;margin-top:8mm}
.photo{width:55mm;height:70mm;border:1px solid #cbd5e1;object-fit:cover;object-position:50% 15%}
.nophoto{width:55mm;height:70mm;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:9pt;color:#94a3b8}
h1{margin:0;font-size:18pt}
.pos{margin:2mm 0 0;font-size:12pt;color:#0b5fff;font-weight:700}
table{width:100%;border-collapse:collapse;margin-top:6mm;font-size:10pt}
td{border:1px solid #e2e8f0;padding:2mm 3mm}
td.l{width:38%;color:#475569}
td.v{font-weight:700}
.band{margin-top:8mm;background:#0b5fff;color:#fff;padding:2mm 3mm;font-size:10pt;font-weight:700}
.tags{display:flex;flex-wrap:wrap;gap:2mm;margin-top:3mm}
.tag{border:1px solid #cbd5e1;border-radius:3mm;padding:1mm 3mm;font-size:9pt}
.foot{margin-top:10mm;border-top:1px solid #e2e8f0;padding-top:4mm;font-size:9pt;color:#475569}
@media print{@page{size:A4;margin:0}}
`;

function publicCvBody(cv: PublicCv): string {
  const row = (label: string, value: unknown) =>
    value === null || value === undefined || value === "" ? "" : `<tr><td class="l">${esc(label)}</td><td class="v">${esc(value)}</td></tr>`;

  return `
<div class="sheet">
  <div class="top">
    <div class="brand">BROKER<small>RECRUITMENT AGENCY</small></div>
    <div class="ref">${esc(cv.code)}</div>
  </div>
  <div class="main">
    ${cv.photoUrl ? `<img class="photo" src="${esc(cv.photoUrl)}" alt="${esc(cv.name)}" />` : `<div class="nophoto">No photo</div>`}
    <div style="flex:1">
      <h1>${esc(cv.name)}</h1>
      <div class="pos">${esc(cv.position)}</div>
      <table>
        ${row("Nationality", cv.nationality || COUNTRY_NAME[cv.country] || cv.country)}
        ${row("Age", cv.age)}
        ${row("Marital status", cv.maritalStatus)}
        ${row("Children", cv.childrenCount || null)}
        ${row("Religion", cv.religion)}
        ${row("Height", cv.height)}
        ${row("Weight", cv.weight)}
        ${row("Education", cv.education)}
        ${row("Experience", experienceLabel(cv))}
      </table>
    </div>
  </div>
  ${cv.languages.length ? `<div class="band">Languages</div><div class="tags">${cv.languages.map((l) => `<span class="tag">${esc(l)}</span>`).join("")}</div>` : ""}
  ${cv.skills.length ? `<div class="band">Skills &amp; Experience</div><div class="tags">${cv.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>` : ""}
  <div class="foot">
    ${esc(AGENCY_ADDRESS)}<br/>
    ${esc(AGENCY_PHONES.join(" · "))} · Licensed by the Ministry of Labour, State of Qatar
  </div>
</div>`;
}

/** Opens the public CV in a print window (use "Save as PDF" to download). */
export function printPublicCv(cv: PublicCv) {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) return;
  win.document.write(
    `<html><head><title>${esc(cv.name)} - ${esc(cv.code)}</title><style>${PUBLIC_CV_STYLES}</style></head><body>${publicCvBody(cv)}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
