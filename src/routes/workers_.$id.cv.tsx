import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import {
  getCandidate,
  listAgents,
  getUploaderName,
  countryFlag,
  countryName,
  formatDate,
  maskPassport,
  agentName,
  type Candidate,
  type Agent,
} from "@/lib/cv-management";

export const Route = createFileRoute("/workers_/$id/cv")({
  head: () => ({
    meta: [
      { title: "Candidate CV · Alhakeem Group ERP" },
      { name: "description", content: "Printable CV for a domestic worker." },
    ],
  }),
  component: CandidateCVPage,
});

function CandidateCVPage() {
  const { id } = useParams({ from: "/workers/$id/cv" });
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [uploader, setUploader] = useState("—");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [c, a] = await Promise.all([getCandidate(id), listAgents()]);
        setCandidate(c);
        setAgents(a);
        if (c) {
          setUploader(await getUploaderName(c.uploadedByUserId));
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load CV");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!candidate) {
    return (
      <AppLayout>
        <div className="rounded-lg border bg-card p-10 text-center">
          <h2 className="text-lg font-semibold">Candidate not found</h2>
          <Button size="sm" variant="outline" className="mt-4" asChild>
            <Link to="/workers"><ArrowLeft className="h-4 w-4" /> Back to workers</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  const allPhotos = [candidate.photoUrl, ...candidate.galleryUrls].filter(Boolean);
  const agent = agents.find((a) => a.id === candidate.agentId);

  return (
    <AppLayout>
      {/* Toolbar — hidden when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Button size="sm" variant="outline" asChild>
          <Link to="/workers"><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Download className="h-4 w-4" /> Save as PDF
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      {/* CV Document */}
      <div className="cv-document mx-auto max-w-[820px] bg-white text-black shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black px-8 py-5">
          <div>
            <div className="text-2xl font-extrabold tracking-wide">ALHAKEEM GROUP</div>
            <div className="text-xs font-semibold tracking-[3px] text-gray-600">RECRUITMENT AGENCY</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">{candidate.candidateCode}</div>
            <div className="text-xs text-gray-600">{formatDate(candidate.createdAt.slice(0, 10))}</div>
          </div>
        </div>

        {/* Body */}
        <div className="flex gap-6 px-8 py-6">
          {/* Left column — photos */}
          <div className="w-48 shrink-0 space-y-3">
            <div className="aspect-[3/4] overflow-hidden rounded border-2 border-gray-300">
              <img src={allPhotos[0]} alt={candidate.fullName} className="h-full w-full object-cover" />
            </div>
            {allPhotos.length > 1 && (
              <div className="grid grid-cols-3 gap-1.5">
                {allPhotos.slice(1, 4).map((url, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded border border-gray-300">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column — details */}
          <div className="min-w-0 flex-1 space-y-5">
            {/* Name + status */}
            <div>
              <h1 className="text-2xl font-bold">{candidate.fullName}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-gray-600">{countryFlag(candidate.countryCode)} {candidate.nationality}</span>
                <span className="inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {candidate.status}
                </span>
              </div>
            </div>

            {/* Personal details */}
            <Section title="Personal Information">
              <CVRow label="Date of Birth" value={formatDate(candidate.dateOfBirth)} />
              <CVRow label="Age" value={candidate.age ? `${candidate.age} years` : "—"} />
              <CVRow label="Position" value={candidate.position} />
              <CVRow label="Experience" value={`${candidate.experienceYears} years`} />
              <CVRow label="Marital Status" value={candidate.maritalStatus ?? "—"} />
              <CVRow label="Children" value={String(candidate.childrenCount)} />
              <CVRow label="Height" value={candidate.height ?? "—"} />
              <CVRow label="Weight" value={candidate.weight ?? "—"} />
              <CVRow label="Religion" value={candidate.religion ?? "—"} />
              <CVRow label="Education" value={candidate.education ?? "—"} />
            </Section>

            {/* Languages + Skills */}
            <div className="grid grid-cols-2 gap-4">
              <Section title="Languages">
                {candidate.languages.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.languages.map((lang) => (
                      <span key={lang} className="rounded border px-2 py-0.5 text-xs">{lang}</span>
                    ))}
                  </div>
                ) : <span className="text-sm text-gray-400">—</span>}
              </Section>
              <Section title="Skills">
                {candidate.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill) => (
                      <span key={skill} className="rounded border px-2 py-0.5 text-xs">{skill}</span>
                    ))}
                  </div>
                ) : <span className="text-sm text-gray-400">—</span>}
              </Section>
            </div>

            {/* Assignment */}
            <Section title="Assignment">
              <CVRow label="Agent" value={agent ? `${agent.agentCode} · ${agent.name}` : "—"} />
              <CVRow label="Agent Country" value={agent?.country ?? "—"} />
              <CVRow label="Agent Contact" value={agent?.contactPerson ?? "—"} />
              <CVRow label="Agent Phone" value={agent?.phone ?? "—"} />
              <CVRow label="Uploaded By" value={uploader} />
            </Section>

            {/* Passport */}
            <Section title="Passport Details">
              <CVRow label="Number" value={maskPassport(candidate.passportNumber)} />
              <CVRow label="Issue Date" value={formatDate(candidate.passportIssueDate)} />
              <CVRow label="Expiry Date" value={formatDate(candidate.passportExpiryDate)} />
            </Section>

            {/* Notes */}
            {candidate.notes && (
              <Section title="Notes">
                <p className="text-sm">{candidate.notes}</p>
              </Section>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 px-8 py-3 text-center text-xs text-gray-500">
          Alhakeem Group ERP · {candidate.candidateCode} · Generated {formatDate(new Date().toISOString().slice(0, 10))}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { background: white !important; }
          .cv-document { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; }
        }
      `}</style>
    </AppLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 border-b border-gray-200 pb-1 text-xs font-bold uppercase tracking-wider text-gray-600">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function CVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
