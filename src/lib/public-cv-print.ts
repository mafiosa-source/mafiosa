// Public "View PDF" — renders the exact ERP CV layout (Recruitment > CV / Workers)
// with the BROKER letterhead. The ONLY difference from the ERP sheet is that the
// "Contact number" row is hidden for public visitors.
import brokerLetterhead from "@/assets/letterheads/broker-letterhead.png.asset.json";
import { countryArabicName, countryName, formatDate } from "@/lib/cv-management";
import type { PublicCv } from "./public-cvs";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const CV_SKILLS: ReadonlyArray<readonly [string, string, string, string]> = [
  ["Ironing", "كوي الملابس", "Baby Sitting", "رعاية الأطفال"],
  ["Cooking", "الطبخ", "Children Care", "رعاية الأطفال"],
  ["Arabic Cooking", "الطبخ العربي", "Tutoring", "تعليم الأطفال"],
  ["Driving", "القيادة", "Cleaning", "التنظيف"],
  ["Computer", "استخدام الكمبيوتر", "Washing", "الغسيل"],
];

const ALIASES: Record<string, string[]> = {
  Computer: ["Computer", "Computer Skills"],
  "Baby Sitting": ["Baby Sitting", "Babysitting"],
  "Children Care": ["Children Care", "Childcare"],
  Washing: ["Washing", "Laundry"],
};

const hasSkill = (skills: string[], label: string) =>
  (ALIASES[label] ?? [label]).some((name) => skills.some((s) => s.toLowerCase() === name.toLowerCase()));

const CV_STYLES = `
body { margin: 0; background: #fff; }
.okunade-page { width: 200mm; max-width: 100%; min-height: 287mm; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-size: 8.2pt; line-height: 1; box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.okunade-page * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
.okunade-letterhead { width: 100%; height: 31mm; display: flex; overflow: hidden; }
.okunade-letterhead img { display: block; width: 100%; min-width: 100%; height: 100%; object-fit: fill; }
.okunade-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.okunade-table th, .okunade-table td { border: 0.75pt solid #111; padding: 1.2mm 1mm; height: 7mm; vertical-align: middle; text-align: center; overflow-wrap: anywhere; }
.okunade-table th { font-weight: 700; }
.col-left-label { width: 15.5%; } .col-left-value { width: 17%; } .col-left-arabic { width: 16.5%; }
.col-right-label { width: 17.5%; } .col-right-value { width: 20%; } .col-right-arabic { width: 13.5%; }
.full-name { text-align: left !important; font-size: 9.5pt; }
.serial { color: #d00000; font-size: 10.5pt; white-space: nowrap; }
.label-cell { font-size: 7.2pt; font-weight: 400; }
.value-cell { font-size: 8.8pt; font-weight: 700; }
.arabic-cell { direction: rtl; font-size: 7.2pt; font-weight: 700; }
.agent-code { color: #d00000; font-size: 8.6pt; white-space: nowrap; }
.photo-cell { height: 138mm !important; padding: 0 3mm 2mm !important; vertical-align: top !important; overflow: hidden; }
.country-title { height: 16mm; display: flex; align-items: center; justify-content: space-around; gap: 2mm; font-family: Georgia, 'Times New Roman', serif; font-size: 18pt; font-weight: 700; color: #555; white-space: nowrap; }
.photo-frame { height: 120mm; display: flex; align-items: flex-start; justify-content: center; overflow: hidden; }
.photo-frame img { width: 100%; height: 100%; display: block; object-fit: contain; object-position: center top; }
.empty-photo { width: 100%; height: 100%; display: grid; place-items: center; background: #f5f5f5; color: #777; }
.section-title { height: 7mm !important; font-size: 8.6pt; font-weight: 700; }
.section-title span { float: right; margin-right: 16%; }
.job-head { height: 7mm !important; font-size: 7.5pt; }
.skills-row td { height: 7mm !important; }
.skill-label { font-size: 7.5pt; }
.skill-answer { font-size: 8.5pt; font-weight: 700; }
.remarks { min-height: 12mm; line-height: 1.25; text-align: left !important; color: #d00000; font-size: 8pt; text-transform: uppercase; }
@media print {
  @page { size: A4 portrait; margin: 5mm; }
  html, body { width: 210mm; height: 297mm; margin: 0 !important; padding: 0 !important; background: #fff !important; overflow: hidden !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
  .okunade-page { width: 200mm; max-width: none; min-height: 0; height: 287mm; overflow: hidden; break-after: avoid-page; break-inside: avoid-page; page-break-after: avoid; page-break-inside: avoid; }
  .okunade-table { page-break-inside: avoid; break-inside: avoid-page; }
}
`;

const labelRow = (label: string, arabic: string, value: string) =>
  `<td class="label-cell">${esc(label)}</td><td class="value-cell">${esc(value)}</td><td class="arabic-cell" dir="rtl">${arabic}</td>`;

const sectionRow = (label: string, arabic: string) =>
  `<tr><td colspan="3" class="section-title">${esc(label)}<span dir="rtl">${arabic}</span></td></tr>`;

function letterheadUrl(): string {
  const url = brokerLetterhead.url;
  if (typeof window === "undefined" || /^https?:/i.test(url)) return url;
  return `${window.location.origin}${url}`;
}

function publicCvBody(cv: PublicCv): string {
  const country = countryName(cv.country).toUpperCase();
  const arabicCountry = countryArabicName(cv.country);
  const photo = cv.photoUrl || cv.galleryUrls[0] || "";
  const english = cv.languages.some((l) => l.toLowerCase() === "english") ? "YES" : "NO";
  const arabic = cv.languages.some((l) => l.toLowerCase() === "arabic") ? "YES" : "NO";
  const experiencePeriod = cv.experienceYears ? `${cv.experienceYears} YEARS` : "—";

  const skillRows = CV_SKILLS.map(
    ([left, leftAr, right, rightAr]) =>
      `<tr class="skills-row"><td class="skill-label">${esc(left)}</td><td class="skill-answer">${
        hasSkill(cv.skills, left) ? "YES" : "NO"
      }</td><td class="arabic-cell" dir="rtl">${leftAr}</td><td class="skill-label">${esc(right)}</td><td class="skill-answer">${
        hasSkill(cv.skills, right) ? "YES" : "NO"
      }</td><td class="arabic-cell" dir="rtl">${rightAr}</td></tr>`,
  ).join("");

  return `
<div class="okunade-page">
  <div class="okunade-letterhead"><img src="${esc(letterheadUrl())}" alt="BROKER letterhead" /></div>
  <table class="okunade-table">
    <colgroup>
      <col class="col-left-label" /><col class="col-left-value" /><col class="col-left-arabic" />
      <col class="col-right-label" /><col class="col-right-value" /><col class="col-right-arabic" />
    </colgroup>
    <tbody>
      <tr>
        <th colspan="4" class="full-name">FULLNAME: ${esc(cv.name.toUpperCase())}</th>
        <th class="agent-code">${esc(cv.agentCode || "—")}</th>
        <th class="serial">${esc(cv.code)}</th>
      </tr>
      <tr>${labelRow("Religion", "الديانة", cv.religion || "—")}${labelRow("Position Applied", "الوظيفة المطلوبة", cv.position.toUpperCase())}</tr>
      <tr>${labelRow("Height", "الطول", cv.height || "—")}${labelRow("Monthly Salary", "الراتب الشهري", cv.monthlySalary || "—")}</tr>
      <tr>${labelRow("Weight", "الوزن", cv.weight || "—")}${labelRow("Contract Period", "مدة العقد", "2 YEARS")}</tr>
      <tr>
        <td colspan="3" rowspan="16" class="photo-cell">
          <div class="country-title"><span>${esc(country)}</span><span dir="rtl">${arabicCountry}</span></div>
          <div class="photo-frame">${photo ? `<img src="${esc(photo)}" alt="${esc(cv.name)}" />` : `<div class="empty-photo">PHOTO</div>`}</div>
        </td>
        ${labelRow("Passport No.", "رقم جواز السفر", cv.passportNumber || "—")}
      </tr>
      ${sectionRow("Details of Application", "تفاصيل الطلب")}
      <tr>${labelRow("Nationality", "الجنسية", cv.nationality.toUpperCase())}</tr>
      <tr>${labelRow("Address", "العنوان", cv.address || "—")}</tr>
      <tr>${labelRow("Date of Birth", "تاريخ الميلاد", formatDate(cv.dateOfBirth ?? undefined).toUpperCase())}</tr>
      <tr>${labelRow("Age", "العمر", cv.age == null ? "—" : String(cv.age))}</tr>
      <tr>${labelRow("Place of Birth", "مكان الميلاد", (cv.placeOfBirth || "—").toUpperCase())}</tr>
      <tr>${labelRow("Civil Status", "الحالة الاجتماعية", (cv.maritalStatus || "—").toUpperCase())}</tr>
      <tr>${labelRow("No. of Children", "عدد الأطفال", cv.childrenCount ? String(cv.childrenCount) : "NO CHILD")}</tr>
      ${sectionRow("Languages & Education", "اللغة والتعليم")}
      <tr>${labelRow("English", "الإنجليزية", english)}</tr>
      <tr>${labelRow("Arabic", "العربية", arabic)}</tr>
      <tr>${labelRow("Educational Attainment", "المستوى الدراسي", (cv.education || "—").toUpperCase())}</tr>
      ${sectionRow("Previous Employment Abroad", "خبرة خارج البلاد")}
      <tr><td class="job-head">Period</td><td class="job-head">Position</td><td class="job-head">City, Country</td></tr>
      <tr><td class="value-cell">${esc(experiencePeriod)}</td><td class="value-cell">${esc(cv.position.toUpperCase())}</td><td class="value-cell">${esc((cv.experienceCountry || cv.nationality).toUpperCase())}</td></tr>
      <tr><td colspan="6" class="section-title">Skills &amp; Experience <span dir="rtl">خبرة العمل</span></td></tr>
      ${skillRows}
      <tr><td colspan="6" class="remarks"><strong>REMARKS: </strong>${esc(cv.remarks ?? "")}</td></tr>
    </tbody>
  </table>
</div>`;
}

/** Opens the ERP-style CV (BROKER letterhead) in a print window. */
export function printPublicCv(cv: PublicCv) {
  if (typeof window === "undefined") return;
  const win = window.open("", "_blank", "width=1000,height=1300");
  if (!win) return;
  win.document.write(
    `<html><head><meta charset="utf-8" /><title>${esc(cv.name)} - ${esc(cv.code)}</title><style>${CV_STYLES}</style></head><body>${publicCvBody(cv)}</body></html>`,
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}
