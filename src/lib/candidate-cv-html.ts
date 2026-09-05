// A4 bio-data CV markup — one shared source for the on-screen preview,
// the print window and "Save as PDF", so all three look identical.
import { SKILLS, ageFromDob, bioDate, type CandidateProfile } from "./candidate-profiles";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const CV_STYLES = `
.cv-sheet{width:210mm;min-height:297mm;padding:8mm;background:#fff;color:#000;
  font-family:Arial,Helvetica,sans-serif;font-size:9.5pt;box-sizing:border-box}
.cv-sheet *{box-sizing:border-box}
.cv-head{display:flex;align-items:center;justify-content:space-between;border:1.5px solid #000;padding:4mm 5mm;margin-bottom:2mm}
.cv-brand{font-size:22pt;font-weight:800;letter-spacing:1px;line-height:1}
.cv-brand small{display:block;font-size:8pt;font-weight:700;letter-spacing:3px;margin-top:2px}
.cv-mark{font-size:20pt}
.cv-ar{text-align:right;direction:rtl;font-size:18pt;font-weight:800;line-height:1.2}
.cv-ar small{display:block;font-size:8.5pt;font-weight:600}
.cv-box{border:1.5px solid #000}
.cv-name{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #000;padding:2mm 3mm;font-weight:700}
.cv-ref{color:#c00;font-weight:700}
.cv-cols{display:flex;border-bottom:1px solid #000}
.cv-left{width:47%;border-right:1px solid #000}
.cv-right{width:53%}
table.cv-t{width:100%;border-collapse:collapse}
table.cv-t td{border:1px solid #000;padding:1.4mm 2mm;vertical-align:middle}
.cv-lbl{width:38%;font-size:8.5pt}
.cv-val{font-weight:700;text-align:center}
.cv-arl{width:26%;text-align:right;direction:rtl;font-size:8pt}
.cv-band{background:#fff;text-align:center;font-weight:700;border:1px solid #000;padding:1.4mm}
.cv-photo{height:78mm;display:flex;align-items:center;justify-content:center;overflow:hidden;border-top:1px solid #000}
.cv-photo img{max-width:100%;max-height:78mm;object-fit:cover}
.cv-photo .cv-empty{font-size:8pt;color:#666}
.cv-skills{display:flex}
.cv-skills > div{width:50%}
.cv-remarks{border-top:1px solid #000;padding:2mm 3mm}
.cv-remarks b{display:block;text-decoration:underline;margin-bottom:1mm}
.cv-remarks p{margin:0;white-space:pre-wrap;min-height:12mm}
@media print{
  @page{size:A4;margin:0}
  body{margin:0}
  .cv-sheet{width:210mm;padding:7mm;page-break-after:avoid}
}
`;

const row = (label: string, value: unknown, arabic: string) =>
  `<tr><td class="cv-lbl">${esc(label)}</td><td class="cv-val">${esc(value)}</td><td class="cv-arl">${arabic}</td></tr>`;

export function cvBody(p: CandidateProfile): string {
  const detail = (l: string, v: unknown, a: string) => row(l, v, a);
  const left = SKILLS.filter((s) => s.column === "left");
  const right = SKILLS.filter((s) => s.column === "right");
  const skillRows = (list: typeof SKILLS) =>
    list
      .map(
        (s) =>
          `<tr><td class="cv-lbl">${esc(s.label)}</td><td class="cv-val">${esc(p.skills[s.key] ?? "NO")}</td><td class="cv-arl">${s.arabic}</td></tr>`,
      )
      .join("");

  const jobs = p.previousJobs.length
    ? p.previousJobs
        .map(
          (j) =>
            `<tr><td class="cv-val">${esc(j.period)}</td><td class="cv-val">${esc(j.position)}</td><td class="cv-val">${esc(j.place)}</td></tr>`,
        )
        .join("")
    : `<tr><td class="cv-val">&nbsp;</td><td class="cv-val">&nbsp;</td><td class="cv-val">&nbsp;</td></tr>`;

  return `
<div class="cv-sheet">
  <div class="cv-head">
    <div class="cv-brand">BROKER<small>RECRUITMENT AGENCY</small></div>
    <div class="cv-mark">&#9883;</div>
    <div class="cv-ar">&#1576;&#1585;&#1608;&#1603;&#1585;<small>&#1604;&#1580;&#1604;&#1576; &#1575;&#1604;&#1571;&#1610;&#1583;&#1610; &#1575;&#1604;&#1593;&#1575;&#1605;&#1604;&#1577;</small></div>
  </div>

  <div class="cv-box">
    <div class="cv-name">
      <span>FULLNAME:&nbsp;&nbsp;${esc(p.fullName)}</span>
      <span class="cv-ref">${esc(p.referenceCode ?? "")}</span>
    </div>

    <div class="cv-cols">
      <div class="cv-left">
        <table class="cv-t">
          ${row("Religion", p.religion, "&#1575;&#1604;&#1583;&#1610;&#1575;&#1606;&#1577;")}
          ${row("Height", p.height, "&#1575;&#1604;&#1591;&#1608;&#1604;")}
          ${row("Weight", p.weight, "&#1575;&#1604;&#1608;&#1586;&#1606;")}
        </table>
        <div class="cv-photo">
          ${p.photoUrl ? `<img src="${esc(p.photoUrl)}" alt="${esc(p.fullName)} photo" />` : `<span class="cv-empty">Photo required</span>`}
        </div>
      </div>
      <div class="cv-right">
        <table class="cv-t">
          ${row("Position Applied", p.positionApplied, "&#1575;&#1604;&#1608;&#1592;&#1610;&#1601;&#1577; &#1575;&#1604;&#1605;&#1591;&#1604;&#1608;&#1576;&#1577;")}
          ${row("Monthly Salary", p.monthlySalary, "&#1575;&#1604;&#1585;&#1575;&#1578;&#1576; &#1575;&#1604;&#1588;&#1607;&#1585;&#1610;")}
          ${row("Contract Period", p.contractPeriod, "&#1605;&#1583;&#1577; &#1575;&#1604;&#1593;&#1602;&#1583;")}
          ${row("Passport No.", p.passportNo, "&#1585;&#1602;&#1605; &#1580;&#1608;&#1575;&#1586; &#1575;&#1604;&#1587;&#1601;&#1585;")}
          <tr><td colspan="3" class="cv-band">Details of Application</td></tr>
          ${detail("Nationality", p.nationality, "&#1575;&#1604;&#1580;&#1606;&#1587;&#1610;&#1577;")}
          ${detail("Contact number", p.contactNumber, "&#1585;&#1602;&#1605; &#1575;&#1604;&#1575;&#1578;&#1589;&#1575;&#1604;")}
          ${detail("Address", p.address, "&#1575;&#1604;&#1593;&#1606;&#1608;&#1575;&#1606;")}
          ${detail("Date of Birth", bioDate(p.dateOfBirth), "&#1578;&#1575;&#1585;&#1610;&#1582; &#1575;&#1604;&#1605;&#1610;&#1604;&#1575;&#1583;")}
          ${detail("Age", ageFromDob(p.dateOfBirth), "&#1575;&#1604;&#1593;&#1605;&#1585;")}
          ${detail("Place of Birth", p.placeOfBirth, "&#1605;&#1603;&#1575;&#1606; &#1575;&#1604;&#1605;&#1610;&#1604;&#1575;&#1583;")}
          ${detail("Civil Status", p.civilStatus, "&#1575;&#1604;&#1581;&#1575;&#1604;&#1577; &#1575;&#1604;&#1575;&#1580;&#1578;&#1605;&#1575;&#1593;&#1610;&#1577;")}
          ${detail("No. of Children", p.children, "&#1593;&#1583;&#1583; &#1575;&#1604;&#1571;&#1591;&#1601;&#1575;&#1604;")}
          <tr><td colspan="3" class="cv-band">Languages &amp; Education</td></tr>
          ${detail("English", p.english, "&#1575;&#1604;&#1573;&#1606;&#1580;&#1604;&#1610;&#1586;&#1610;&#1577;")}
          ${detail("Arabic", p.arabic, "&#1575;&#1604;&#1593;&#1585;&#1576;&#1610;&#1577;")}
          ${detail("Educational Attainment", p.education, "&#1575;&#1604;&#1605;&#1587;&#1578;&#1608;&#1609; &#1575;&#1604;&#1583;&#1585;&#1575;&#1587;&#1610;")}
          <tr><td colspan="3" class="cv-band">Previous Employment Abroad</td></tr>
          <tr><td class="cv-val">Period</td><td class="cv-val">Position</td><td class="cv-val">City, Country</td></tr>
          ${jobs}
        </table>
      </div>
    </div>

    <div class="cv-band">Skills &amp; Experience</div>
    <div class="cv-skills">
      <div><table class="cv-t">${skillRows(left)}</table></div>
      <div><table class="cv-t">${skillRows(right)}</table></div>
    </div>

    <div class="cv-remarks">
      <b>REMARKS</b>
      <p>${esc(p.remarks ?? "")}</p>
    </div>
  </div>
</div>`;
}

/** Opens the CV in a print window (use "Save as PDF" to download). */
export function printCv(p: CandidateProfile) {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=900,height=1200");
  if (!win) return;
  win.document.write(
    `<html><head><title>${esc(p.fullName)} - CV</title><style>body{margin:0;background:#fff}${CV_STYLES}</style></head><body>${cvBody(p)}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}
