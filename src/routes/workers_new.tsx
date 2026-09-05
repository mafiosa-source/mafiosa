import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Loader2, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAppUser } from "@/lib/app-user";
import {
  listAgents,
  createCandidate,
  uploadCandidatePhoto,
  uploadPassportScan,
  ageFromDob,
  COUNTRIES,
  COUNTRY_CODE_BY_NAME,
  POSITIONS,
  AVAILABILITY_STATUSES,
  MARITAL_STATUSES,
  RELIGIONS,
  COMMON_SKILLS,
  COMMON_LANGUAGES,
  type Agent,
  type CandidateInput,
} from "@/lib/cv-management";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workers_new")({
  head: () => ({
    meta: [
      { title: "Add Candidate · Alhakeem Group ERP" },
      { name: "description", content: "Create a new domestic worker CV." },
    ],
  }),
  component: AddCandidatePage,
});

const NONE = "__none";

function AddCandidatePage() {
  const navigate = useNavigate();
  const { user } = useAppUser();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [position, setPosition] = useState("Housemaid");
  const [experienceYears, setExperienceYears] = useState("0");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [childrenCount, setChildrenCount] = useState("0");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [religion, setReligion] = useState("");
  const [education, setEducation] = useState("");
  const [agentId, setAgentId] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [passportNumber, setPassportNumber] = useState("");
  const [passportIssueDate, setPassportIssueDate] = useState("");
  const [passportExpiryDate, setPassportExpiryDate] = useState("");
  const [passportScanUrl, setPassportScanUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Available");
  const [availabilityStatus, setAvailabilityStatus] = useState("Available");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingPassport, setUploadingPassport] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setAgents(await listAgents());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load agents");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const countryCode = nationality ? (COUNTRY_CODE_BY_NAME[nationality] ?? "") : "";

  function toggleLanguage(lang: string) {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  }

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true);
    try {
      const url = await uploadCandidatePhoto(file);
      setPhotoUrl(url);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleGalleryUpload(files: FileList) {
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, 5)) {
        urls.push(await uploadCandidatePhoto(file));
      }
      setGalleryUrls((prev) => [...prev, ...urls].slice(0, 5));
      toast.success(`${urls.length} photo(s) uploaded`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingGallery(false);
    }
  }

  async function handlePassportUpload(file: File) {
    setUploadingPassport(true);
    try {
      const url = await uploadPassportScan(file);
      setPassportScanUrl(url);
      toast.success("Passport scan uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingPassport(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Full name is required");
    if (!photoUrl) return toast.error("A main photo is required");
    if (!nationality) return toast.error("Nationality is required");
    if (!agentId) return toast.error("Please select an agent");
    if (!countryCode) return toast.error("Could not determine country code");

    setSaving(true);
    try {
      const input: CandidateInput = {
        fullName: fullName.trim(),
        photoUrl,
        galleryUrls,
        nationality,
        countryCode,
        age: ageFromDob(dateOfBirth),
        dateOfBirth: dateOfBirth || undefined,
        position,
        experienceYears: Number(experienceYears) || 0,
        languages: selectedLanguages,
        availabilityStatus: availabilityStatus as CandidateInput["availabilityStatus"],
        maritalStatus: maritalStatus || undefined,
        childrenCount: Number(childrenCount) || 0,
        height: height || undefined,
        weight: weight || undefined,
        religion: religion || undefined,
        education: education || undefined,
        skills: selectedSkills,
        agentId,
        passportNumber: passportNumber || undefined,
        passportIssueDate: passportIssueDate || undefined,
        passportExpiryDate: passportExpiryDate || undefined,
        passportScanUrl: passportScanUrl || undefined,
        notes: notes || undefined,
        status: status as CandidateInput["status"],
      };
      const created = await createCandidate(input);
      toast.success(`Candidate created · ${created.candidateCode}`);
      navigate({ to: "/workers" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create candidate");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Add Candidate"
        description="Create a new domestic worker CV. The candidate code is auto-generated on save."
        action={
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/workers" })}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Personal Section */}
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Main photo */}
            <div className="space-y-2">
              <Label>Main Photo (required)</Label>
              <div className="flex items-start gap-4">
                <div className="h-32 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Main" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent">
                    {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
                    />
                  </label>
                  {photoUrl && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPhotoUrl("")}>
                      <X className="h-3 w-3" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Additional photos */}
            <div className="space-y-2">
              <Label>Additional Photos (up to 5)</Label>
              <div className="flex flex-wrap gap-2">
                {galleryUrls.map((url, i) => (
                  <div key={i} className="relative h-20 w-16 overflow-hidden rounded border">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setGalleryUrls((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-0 top-0 rounded-bl bg-black/60 p-0.5 text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {galleryUrls.length < 5 && (
                  <label className="flex h-20 w-16 cursor-pointer items-center justify-center rounded border border-dashed hover:bg-accent">
                    {uploadingGallery ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-muted-foreground" />}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && handleGalleryUpload(e.target.files)}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name *">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </Field>
              <Field label="Nationality *">
                <Select value={nationality} onValueChange={setNationality}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.name}>{c.flag} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date of Birth">
                <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </Field>
              <Field label="Position">
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Experience (years)">
                <Input type="number" step="0.1" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
              </Field>
              <Field label="Marital Status">
                <Select value={maritalStatus || NONE} onValueChange={(v) => setMaritalStatus(v === NONE ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {MARITAL_STATUSES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Children">
                <Input type="number" min="0" value={childrenCount} onChange={(e) => setChildrenCount(e.target.value)} />
              </Field>
              <Field label="Height">
                <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 165 cm" />
              </Field>
              <Field label="Weight">
                <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 60 kg" />
              </Field>
              <Field label="Religion">
                <Select value={religion || NONE} onValueChange={(v) => setReligion(v === NONE ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>—</SelectItem>
                    {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Education">
                <Input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. High School" />
              </Field>
            </div>

            {/* Languages */}
            <div className="space-y-2">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      selectedLanguages.includes(lang)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label>Skills</Label>
              <div className="flex flex-wrap gap-2">
                {COMMON_SKILLS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      selectedSkills.includes(skill)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passport Section */}
        <Card>
          <CardHeader><CardTitle className="text-base">Passport Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Passport Number">
                <Input value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} />
              </Field>
              <Field label="Issue Date">
                <Input type="date" value={passportIssueDate} onChange={(e) => setPassportIssueDate(e.target.value)} />
              </Field>
              <Field label="Expiry Date">
                <Input type="date" value={passportExpiryDate} onChange={(e) => setPassportExpiryDate(e.target.value)} />
              </Field>
            </div>
            <div className="space-y-2">
              <Label>Passport Scan (PDF/Image)</Label>
              <div className="flex items-center gap-3">
                {passportScanUrl ? (
                  <a href={passportScanUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                    View uploaded scan
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">No scan uploaded</span>
                )}
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent">
                  {uploadingPassport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Upload scan
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePassportUpload(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignment Section */}
        <Card>
          <CardHeader><CardTitle className="text-base">Assignment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Agent *">
                <Select value={agentId} onValueChange={setAgentId}>
                  <SelectTrigger><SelectValue placeholder="Select agent..." /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.agentCode} · {a.name} ({a.country})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Reserved">Reserved</SelectItem>
                    <SelectItem value="Deployed">Deployed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Uploaded by: <span className="font-medium text-foreground">{user?.name ?? "—"}</span>
              <span className="ml-2 text-xs">(set automatically, cannot be changed)</span>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any additional notes..." />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2 pb-8">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/workers" })}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Candidate
          </Button>
        </div>
      </form>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
