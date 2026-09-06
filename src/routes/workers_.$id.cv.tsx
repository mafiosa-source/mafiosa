import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  agentName,
  candidateSerialCode,
  countryArabicName,
  countryName,
  formatDate,
  getCandidate,
  listAgents,
  type Agent,
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
  english: string;
  arabic: string;
  file: string;
};

const LETTERHEADS: Letterhead[] = [
  { id: "broker", name: "BROKER", english: "BROKER", arabic: "بروكر", file: "/letterheads/BROKER_HEAR_LETTER_NEW_(1).docx" },
  { id: "skill", name: "SKILL", english: "SKILL", arabic: "سكيل", file: "/letterheads/SKILL_HEAD_LETTER_NEW_(1).docx" },
  { id: "danet", name: "DANET AL DOHA", english: "DANET AL DOHA", arabic: "دانيت الدوحة", file: "/letterheads/DANET_AL_DOHA_HEAD_LETTER_NEW_(1).docx" },
  { id: "fast", name: "FAST", english: "FAST", arabic: "فاست", file: "/letterheads/FAST_RECRUITMENT_LETTER_HEAD_NEW_(1).doc" },
];

function CandidateCVPage() {
  const { id } = useParams({ from: "/workers/$id/cv" });
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [companyId, setCompanyId] = useState("fast");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [loadedCandidate, loadedAgents] = await Promise.all([getCandidate(id), listAgents()]);
        setCandidate(loadedCandidate);
        setAgents(loadedAgents);
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
  const agent = agentName(agents, candidate.agentId);
  const serial = candidateSerialCode(candidate);
  const age = candidate.age == null ? "—" : String(candidate.age);
  const languages = candidate.languages.join(" / ") || "—";
  const education = candidate.education || "—";
  const photo = candidate.photoUrl || candidate.galleryUrls[0];

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
          <div className="brand-mark">{letterhead.id === "fast" ? "FAST" : letterhead.english}</div>
          <div className="brand-rule" />
          <div className="brand-arabic">{letterhead.arabic}</div>
          <div className="brand-subtitle">{letterhead.id === "fast" ? "RECRUITMENT AGENCY" : "RECRUITMENT AGENCY"}</div>
          <div className="brand-arabic-subtitle">لجلب الأيدي العاملة</div>
          <div className="letterhead-file" aria-hidden="true">{letterhead.file}</div>
        </div>

        <table className="okunade-table">
          <tbody>
            <tr>
              <th colSpan={5} className="full-name">FULLNAME: {candidate.fullName.toUpperCase()}</th>
              <th className="serial">{serial}</th>
              <th className="arabic-label">الاسم</th>
            </tr>
            <tr>
              <TopCell label="Religion" arabic="الديانة" value={candidate.religion || "—"} />
              <TopCell label="Height" arabic="الطول" value={candidate.height || "—"} />
              <TopCell label="Weight" arabic="الوزن" value={candidate.weight || "—"} />
              <TopCell label="Position Applied" arabic="الوظيفة" value={candidate.position.toUpperCase()} />
              <TopCell label="Monthly Salary" arabic="الراتب الشهري" value="—" />
              <TopCell label="Contract Period" arabic="مدة العقد" value="—" />
              <TopCell label="Passport No." arabic="رقم جواز السفر" value={candidate.passportNumber || "—"} />
            </tr>
            <tr className="photo-row">
              <td colSpan={3} rowSpan={10} className="photo-cell">
                <div className="country-title"><span>{country}</span><span dir="rtl">{arabicCountry}</span></div>
                {photo ? <img src={photo} alt={candidate.fullName} /> : <div className="empty-photo">PHOTO</div>}
              </td>
              <TopCell label="Details of Application" arabic="" value="" heading />
              <TopCell label="Nationality" arabic="جنسية" value={candidate.nationality.toUpperCase()} />
              <TopCell label="Contact number" arabic="رقم التواصل" value="—" />
              <TopCell label="Address" arabic="العنوان" value="—" />
            </tr>
            <tr><Cell label="Date of Birth" arabic="تاريخ الميلاد" value={formatDate(candidate.dateOfBirth)} /><Cell label="Age" arabic="العمر" value={age} /></tr>
            <tr><Cell label="Place of Birth" arabic="مكان الميلاد" value="—" /><Cell label="Civil Status" arabic="الحالة الاجتماعية" value={(candidate.maritalStatus || "—").toUpperCase()} /></tr>
            <tr><Cell label="No. of Children" arabic="عدد الاولاد" value={String(candidate.childrenCount)} /><Cell label="Languages & Education" arabic="اللغة والتعليم" value="" heading /></tr>
            <tr><Cell label="Languages" arabic="إنجليزي" value={languages} /><Cell label="Education" arabic="المستوى الدراسي" value={education.toUpperCase()} /></tr>
            <tr><Cell label="Previous Employment Abroad" arabic="خبرة خارج البلاد" value={`${candidate.experienceYears} YEARS`} /><Cell label="Agent" arabic="الوكيل" value={agent} /></tr>
            <tr><Cell label="Passport Issue" arabic="تاريخ الإصدار" value={formatDate(candidate.passportIssueDate)} /><Cell label="Passport Expiry" arabic="تاريخ الانتهاء" value={formatDate(candidate.passportExpiryDate)} /></tr>
            <tr><Cell label="Serial / Old Code" arabic="الرقم" value={serial} /><Cell label="Old red code" arabic="الرمز السابق" value={candidate.candidateCode} /></tr>
            <tr><Cell label="Skills" arabic="المهارات" value={candidate.skills.slice(0, 3).join(" / ") || "—"} /><Cell label="Status" arabic="الحالة" value={candidate.status.toUpperCase()} /></tr>
            <tr><Cell label="Country of CV" arabic="بلد السيرة الذاتية" value={`${country} / ${arabicCountry}`} /><Cell label="Uploaded" arabic="تاريخ الإضافة" value={formatDate(candidate.createdAt.slice(0, 10))} /></tr>
            <tr><td colSpan={7} className="section-title">Skills &amp; Experience <span dir="rtl">خبرة العمل</span></td></tr>
            <tr className="skills-head"><th>Skill</th><th>YES / NO</th><th>المهارات</th><th>Skill</th><th>YES / NO</th><th>المهارات</th><th>—</th></tr>
            <SkillRow left={candidate.skills[0] || "Ironing"} right={candidate.skills[1] || "Baby Sitting"} />
            <SkillRow left={candidate.skills[2] || "Cooking"} right={candidate.skills[3] || "Children Care"} />
            <SkillRow left={candidate.skills[4] || "Arabic Cooking"} right={candidate.skills[5] || "Tutoring"} />
            <SkillRow left={candidate.skills[6] || "Tailor"} right={candidate.skills[7] || "Cleaning"} />
            <SkillRow left={candidate.skills[8] || "Driving"} right={candidate.skills[9] || "Washing"} />
            <tr><td colSpan={7} className="remarks"><strong>REMARKS</strong><br />{candidate.notes || `${candidate.fullName.toUpperCase()} HAS ${candidate.experienceYears} YEARS EXPERIENCE.`}</td></tr>
          </tbody>
        </table>
      </div>

      <style>{`
        .okunade-page { width: 790px; max-width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.08; }
        .okunade-letterhead { height: 120px; position: relative; border-bottom: 3px solid #111; overflow: hidden; }
        .brand-mark { position: absolute; left: 34px; top: 18px; font-size: 42px; font-weight: 900; letter-spacing: -2px; }
        .brand-rule { position: absolute; left: 333px; top: 8px; width: 150px; height: 34px; border-top: 7px solid #111; transform: skew(-32deg); }
        .brand-arabic { position: absolute; right: 38px; top: 7px; font-size: 35px; font-weight: 900; direction: rtl; }
        .brand-subtitle { position: absolute; left: 0; bottom: 3px; font-size: 25px; font-weight: 900; letter-spacing: -1.5px; }
        .brand-arabic-subtitle { position: absolute; right: 0; bottom: 2px; font-size: 24px; font-weight: 900; direction: rtl; }
        .letterhead-file { display: none; }
        .okunade-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .okunade-table th, .okunade-table td { border: 1px solid #111; padding: 4px 3px; height: 25px; vertical-align: middle; text-align: center; }
        .okunade-table th { font-weight: 700; }
        .full-name { text-align: left !important; font-size: 15px; width: 67%; }
        .serial { color: #e00000; font-size: 17px; width: 16%; }
        .arabic-label { direction: rtl; width: 17%; }
        .photo-row { height: 580px; }
        .photo-cell { padding: 0 !important; vertical-align: top !important; width: 49%; }
        .photo-cell img { width: 82%; height: 500px; margin: 20px auto 0; display: block; object-fit: cover; object-position: center top; }
        .country-title { height: 76px; display: flex; align-items: center; justify-content: space-around; gap: 8px; font-family: Georgia, 'Times New Roman', serif; font-size: 36px; font-weight: 700; color: #555; white-space: nowrap; }
        .country-title span:first-child { text-shadow: 1px 1px #ddd; }
        .empty-photo { height: 500px; margin: 20px; display: grid; place-items: center; background: #f5f5f5; color: #777; }
        .section-title { height: 26px !important; font-size: 14px; font-weight: 700; }
        .section-title span { float: right; margin-right: 18%; }
        .skills-head th { height: 26px !important; }
        .remarks { height: 70px !important; text-align: left !important; color: #df0000; font-size: 14px; text-transform: uppercase; }
        .remarks strong { text-decoration: underline; }
        @media print { @page { size: A4 portrait; margin: 5mm; } body { background: white !important; } .okunade-page { width: 100%; max-width: none; } .okunade-letterhead { height: 112px; } .okunade-table { font-size: 10px; } .okunade-table th, .okunade-table td { padding: 3px 2px; } .photo-row { height: 535px; } .photo-cell img { height: 455px; } .country-title { font-size: 30px; height: 68px; } .brand-mark { font-size: 37px; } .brand-subtitle { font-size: 21px; } .brand-arabic, .brand-arabic-subtitle { font-size: 22px; } }
      `}</style>
    </AppLayout>
  );
}

function Cell({ label, arabic, value, heading = false }: { label: string; arabic: string; value: string; heading?: boolean }) {
  if (heading) return <td colSpan={2} className="section-title">{label} <span dir="rtl">{arabic}</span></td>;
  return <td colSpan={2}><div>{label}</div><strong>{value}</strong><small dir="rtl">{arabic}</small></td>;
}

function TopCell({ label, arabic, value, heading = false }: { label: string; arabic: string; value: string; heading?: boolean }) {
  if (heading) return <td className="section-title">{label} <span dir="rtl">{arabic}</span></td>;
  return <td><div>{label}</div><strong>{value}</strong><small dir="rtl">{arabic}</small></td>;
}

function SkillRow({ left, right }: { left: string; right: string }) {
  return <tr><td><strong>{left}</strong></td><td>YES</td><td dir="rtl">—</td><td><strong>{right}</strong></td><td>YES</td><td dir="rtl">—</td><td> </td></tr>;
}
