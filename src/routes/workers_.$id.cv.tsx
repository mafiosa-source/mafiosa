import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import brokerLetterhead from "@/assets/letterheads/broker-letterhead.png.asset.json";
import skillLetterhead from "@/assets/letterheads/skill-letterhead.png.asset.json";
import danetLetterhead from "@/assets/letterheads/danet-letterhead.png.asset.json";
import fastLetterhead from "@/assets/letterheads/fast-letterhead.png.asset.json";
import {
  candidateSerialCode,
  countryArabicName,
  countryName,
  formatDate,
  getCandidate,
  type Candidate,
} from "@/lib/cv-management";

export const Route = createFileRoute("/workers_/$id/cv")({
  head: () => ({
    meta: [
      { title: "Candidate CV · Alhakeem Group ERP" },
      { name: "description", content: "Printable candidate CV." },
    ],
  }),
  component: CandidateCVPage,
});

type Letterhead = {
  id: string;
  name: string;
  imageUrl: string;
};

const LETTERHEADS: Letterhead[] = [
  { id: "broker", name: "BROKER", imageUrl: brokerLetterhead.url },
  { id: "skill", name: "SKILL", imageUrl: skillLetterhead.url },
  { id: "danet", name: "DANET AL DOHA", imageUrl: danetLetterhead.url },
  { id: "fast", name: "FAST", imageUrl: fastLetterhead.url },
];

const CV_SKILLS = [
  ["Ironing", "كوي الملابس", "Baby Sitting", "رعاية الأطفال"],
  ["Cooking", "الطبخ", "Children Care", "رعاية الأطفال"],
  ["Arabic Cooking", "الطبخ العربي", "Tutoring", "تعليم الأطفال"],
  ["Driving", "القيادة", "Cleaning", "التنظيف"],
  ["Computer", "استخدام الكمبيوتر", "Washing", "الغسيل"],
] as const;

const hasSkill = (skills: string[], label: string) => {
  const aliases: Record<string, string[]> = {
    Computer: ["Computer", "Computer Skills"],
    "Baby Sitting": ["Baby Sitting", "Babysitting"],
    "Children Care": ["Children Care", "Childcare"],
    Washing: ["Washing", "Laundry"],
  };
  const accepted = aliases[label] ?? [label];
  return accepted.some((name) => skills.some((skill) => skill.toLowerCase() === name.toLowerCase()));
};

function CandidateCVPage() {
  const { id } = useParams({ from: "/workers_/$id/cv" });
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [companyId, setCompanyId] = useState("broker");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setCandidate(await getCandidate(id));
      } catch {
        toast.error("Could not load the candidate CV.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></AppLayout>;
  }

  if (!candidate) {
    return <AppLayout><div className="rounded border bg-card p-10 text-center"><h2 className="font-semibold">Candidate not found</h2><Button className="mt-4" variant="outline" asChild><Link to="/workers"><ArrowLeft className="h-4 w-4" /> Back to workers</Link></Button></div></AppLayout>;
  }

  const letterhead = LETTERHEADS.find((item) => item.id === companyId) ?? LETTERHEADS[3];
  const country = countryName(candidate.countryCode).toUpperCase();
  const arabicCountry = countryArabicName(candidate.countryCode);
  const serial = candidateSerialCode(candidate);
  const age = candidate.age == null ? "—" : String(candidate.age);
  const education = candidate.education || "—";
  const photo = candidate.photoUrl || candidate.galleryUrls[0];
  const english = candidate.languages.some((language) => language.toLowerCase() === "english") ? "YES" : "NO";
  const arabic = candidate.languages.some((language) => language.toLowerCase() === "arabic") ? "YES" : "NO";
  const experiencePeriod = candidate.experienceYears ? `${candidate.experienceYears} YEARS` : "—";

  return (
    <AppLayout>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button size="sm" variant="outline" asChild><Link to="/workers"><ArrowLeft className="h-4 w-4" /> Back</Link></Button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Letterhead</span>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{LETTERHEADS.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => window.print()}><Download className="h-4 w-4" /> Save as PDF</Button>
          <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
        </div>
      </div>

      <div className="okunade-page mx-auto bg-white text-black">
        <div className="okunade-letterhead">
          <img src={letterhead.imageUrl} alt={`${letterhead.name} letterhead`} />
        </div>

        <table className="okunade-table">
          <colgroup>
            <col className="col-left-label" /><col className="col-left-value" /><col className="col-left-arabic" />
            <col className="col-right-label" /><col className="col-right-value" /><col className="col-right-arabic" />
          </colgroup>
          <tbody>
            <tr>
              <th colSpan={5} className="full-name">FULLNAME: {candidate.fullName.toUpperCase()}</th>
              <th className="serial">{serial}</th>
            </tr>
            <tr>
              <LabelCell label="Religion" arabic="الديانة" value={candidate.religion || "—"} />
              <LabelCell label="Position Applied" arabic="الوظيفة المطلوبة" value={candidate.position.toUpperCase()} />
            </tr>
            <tr><LabelCell label="Height" arabic="الطول" value={candidate.height || "—"} /><LabelCell label="Monthly Salary" arabic="الراتب الشهري" value="—" /></tr>
            <tr><LabelCell label="Weight" arabic="الوزن" value={candidate.weight || "—"} /><LabelCell label="Contract Period" arabic="مدة العقد" value="2 YEARS" /></tr>
            <tr>
              <td colSpan={3} rowSpan={14} className="photo-cell">
                <div className="country-title"><span>{country}</span><span dir="rtl">{arabicCountry}</span></div>
                <div className="photo-frame">
                  {photo ? <img src={photo} alt={candidate.fullName} /> : <div className="empty-photo">PHOTO</div>}
                </div>
              </td>
              <LabelCell label="Passport No." arabic="رقم جواز السفر" value={candidate.passportNumber || "—"} />
            </tr>
            <tr><SectionCell label="Details of Application" arabic="تفاصيل الطلب" /></tr>
            <tr><LabelCell label="Nationality" arabic="الجنسية" value={candidate.nationality.toUpperCase()} /></tr>
            <tr><LabelCell label="Contact number" arabic="رقم الاتصال" value="—" /></tr>
            <tr><LabelCell label="Address" arabic="العنوان" value="—" /></tr>
            <tr><LabelCell label="Date of Birth" arabic="تاريخ الميلاد" value={formatDate(candidate.dateOfBirth).toUpperCase()} /></tr>
            <tr><LabelCell label="Age" arabic="العمر" value={age} /></tr>
            <tr><LabelCell label="Place of Birth" arabic="مكان الميلاد" value="—" /></tr>
            <tr><LabelCell label="Civil Status" arabic="الحالة الاجتماعية" value={(candidate.maritalStatus || "—").toUpperCase()} /></tr>
            <tr><LabelCell label="No. of Children" arabic="عدد الأطفال" value={candidate.childrenCount ? String(candidate.childrenCount) : "NO CHILD"} /></tr>
            <tr><SectionCell label="Languages & Education" arabic="اللغة والتعليم" /></tr>
            <tr><LabelCell label="English" arabic="الإنجليزية" value={english} /></tr>
            <tr><LabelCell label="Arabic" arabic="العربية" value={arabic} /></tr>
            <tr><LabelCell label="Educational Attainment" arabic="المستوى الدراسي" value={education.toUpperCase()} /></tr>
            <tr><SectionCell label="Previous Employment Abroad" arabic="خبرة خارج البلاد" /></tr>
            <tr><td className="job-head">Period</td><td className="job-head">Position</td><td className="job-head">City, Country</td></tr>
            <tr><td className="value-cell">{experiencePeriod}</td><td className="value-cell">—</td><td className="value-cell">{candidate.nationality.toUpperCase()}</td></tr>
            <tr><td colSpan={6} className="section-title">Skills &amp; Experience <span dir="rtl">خبرة العمل</span></td></tr>
            {CV_SKILLS.map(([left, leftArabic, right, rightArabic]) => (
              <SkillRow key={left} label={left} value={hasSkill(candidate.skills, left) ? "YES" : "NO"} arabic={leftArabic} rightLabel={right} rightValue={hasSkill(candidate.skills, right) ? "YES" : "NO"} rightArabic={rightArabic} />
            ))}
            {candidate.notes ? <tr><td colSpan={6} className="remarks"><strong>REMARKS: </strong>{candidate.notes}</td></tr> : null}
          </tbody>
        </table>
      </div>

      <style>{`
        .okunade-page { width: 200mm; max-width: 100%; min-height: 287mm; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 8.2pt; line-height: 1; box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .okunade-page * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        .okunade-letterhead { height: 31mm; display: flex; align-items: flex-start; justify-content: center; overflow: hidden; }
        .okunade-letterhead img { display: block; width: 100%; height: 100%; object-fit: contain; object-position: center top; }
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
        .blank-cell { border-bottom: 0 !important; }
        .photo-cell { height: 114mm !important; padding: 0 3mm 2mm !important; vertical-align: top !important; overflow: hidden; }
        .country-title { height: 15mm; display: flex; align-items: center; justify-content: space-around; gap: 2mm; font-family: Georgia, 'Times New Roman', serif; font-size: 18pt; font-weight: 700; color: #555; white-space: nowrap; }
        .photo-frame { height: 96mm; display: flex; align-items: flex-start; justify-content: center; overflow: hidden; }
        .photo-frame img { width: 82%; height: 100%; display: block; object-fit: contain; object-position: center top; }
        .empty-photo { width: 82%; height: 100%; display: grid; place-items: center; background: #f5f5f5; color: #777; }
        .section-title { height: 7mm !important; font-size: 8.6pt; font-weight: 700; }
        .section-title span { float: right; margin-right: 16%; }
        .job-head { height: 7mm !important; font-size: 7.5pt; }
        .skills-row td { height: 7mm !important; }
        .skill-label { font-size: 7.5pt; }
        .skill-answer { font-size: 8.5pt; font-weight: 700; }
        .remarks { min-height: 9mm; text-align: left !important; color: #d00000; font-size: 8pt; text-transform: uppercase; }
        @media print {
          @page { size: A4 portrait; margin: 5mm; }
          html, body { width: 210mm; height: 297mm; margin: 0 !important; padding: 0 !important; background: #fff !important; overflow: hidden !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          body * { visibility: hidden; }
          .okunade-page, .okunade-page * { visibility: visible; }
          .okunade-page { position: fixed; inset: 0 auto auto 0; width: 200mm; max-width: none; min-height: 0; height: 287mm; overflow: hidden; break-after: avoid-page; break-inside: avoid-page; page-break-after: avoid; page-break-inside: avoid; }
          .okunade-letterhead img { visibility: visible !important; display: block !important; }
          .okunade-table { page-break-inside: avoid; break-inside: avoid-page; }
        }
      `}</style>
    </AppLayout>
  );
}

function LabelCell({ label, arabic, value }: { label: string; arabic: string; value: string }) {
  return <><td className="label-cell">{label}</td><td className="value-cell">{value}</td><td className="arabic-cell" dir="rtl">{arabic}</td></>;
}

function SectionCell({ label, arabic }: { label: string; arabic: string }) {
  return <td colSpan={3} className="section-title">{label}<span dir="rtl">{arabic}</span></td>;
}

function SkillRow({ label, value, arabic, rightLabel, rightValue, rightArabic }: { label: string; value: string; arabic: string; rightLabel: string; rightValue: string; rightArabic: string }) {
  return <tr className="skills-row"><td className="skill-label">{label}</td><td className="skill-answer">{value}</td><td className="arabic-cell" dir="rtl">{arabic}</td><td className="skill-label">{rightLabel}</td><td className="skill-answer">{rightValue}</td><td className="arabic-cell" dir="rtl">{rightArabic}</td></tr>;
}
