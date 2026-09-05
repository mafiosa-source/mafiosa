// Candidate (housemaid) bio-data profiles used by the CV Generator.
// Purely additive: the finance ledger and its tables are untouched.
import { supabase } from "@/integrations/supabase/client";

export type SkillKey =
  | "ironing"
  | "cooking"
  | "arabicCooking"
  | "driving"
  | "computer"
  | "babySitting"
  | "childrenCare"
  | "tutoring"
  | "cleaning"
  | "washing";

export const SKILLS: { key: SkillKey; label: string; arabic: string; column: "left" | "right" }[] = [
  { key: "ironing", label: "Ironing", arabic: "كوي الملابس", column: "left" },
  { key: "cooking", label: "Cooking", arabic: "الطبخ", column: "left" },
  { key: "arabicCooking", label: "Arabic Cooking", arabic: "الطبخ العربي", column: "left" },
  { key: "driving", label: "Driving", arabic: "القيادة", column: "left" },
  { key: "computer", label: "Computer", arabic: "استخدام الكمبيوتر", column: "left" },
  { key: "babySitting", label: "Baby Sitting", arabic: "رعاية الأطفال", column: "right" },
  { key: "childrenCare", label: "Children Care", arabic: "عناية بالأطفال", column: "right" },
  { key: "tutoring", label: "Tutoring", arabic: "تعليم الأطفال", column: "right" },
  { key: "cleaning", label: "Cleaning", arabic: "التنظيف", column: "right" },
  { key: "washing", label: "Washing", arabic: "الغسيل", column: "right" },
];

export const NATIONALITIES = [
  "PHILIPPINE",
  "INDIAN",
  "ETHIOPIAN",
  "KENYAN",
  "UGANDAN",
  "SRI LANKAN",
  "NEPALESE",
  "BANGLADESHI",
  "INDONESIAN",
  "GHANAIAN",
  "NIGERIAN",
  "TANZANIAN",
  "MYANMAR",
] as const;

export const CIVIL_STATUSES = ["SINGLE", "MARRIED", "WIDOWED", "DIVORCED", "SEPARATED"] as const;
export const RELIGIONS = ["ROMAN CATHOLIC", "MUSLIM", "CHRISTIAN", "HINDU", "BUDDHIST", "ORTHODOX", "OTHER"] as const;
export const EDUCATION_LEVELS = ["PRIMARY", "HIGH SCHOOL", "COLLEGE", "UNIVERSITY", "VOCATIONAL", "NONE"] as const;
export const YES_NO = ["YES", "NO"] as const;

export type PreviousJob = { period: string; position: string; place: string };

export type CandidateProfile = {
  id: string;
  fullName: string;
  referenceCode?: string;
  photoUrl?: string;
  religion?: string;
  height?: string;
  weight?: string;
  positionApplied: string;
  monthlySalary?: string;
  contractPeriod?: string;
  passportNo?: string;
  nationality?: string;
  contactNumber?: string;
  address?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  civilStatus?: string;
  children?: string;
  english?: string;
  arabic?: string;
  education?: string;
  company?: string;
  sponsor?: string;
  skills: Partial<Record<SkillKey, "YES" | "NO">>;
  previousJobs: PreviousJob[];
  remarks?: string;
  createdAt?: string;
};

type Row = Record<string, unknown>;

export const profileNameKey = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

/** Age in whole years, always derived from the date of birth. */
export function ageFromDob(dob?: string): string {
  if (!dob) return "";
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? String(age) : "";
}

/** 19 MAR 1995 — the bio-data date style. */
export function bioDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/\./g, "")
    .toUpperCase();
}

function toProfile(r: Row): CandidateProfile {
  return {
    id: String(r.id),
    fullName: String(r.full_name ?? ""),
    referenceCode: (r.reference_code as string) ?? undefined,
    photoUrl: (r.photo_url as string) ?? undefined,
    religion: (r.religion as string) ?? undefined,
    height: (r.height as string) ?? undefined,
    weight: (r.weight as string) ?? undefined,
    positionApplied: String(r.position_applied ?? "HOUSEMAID"),
    monthlySalary: (r.monthly_salary as string) ?? undefined,
    contractPeriod: (r.contract_period as string) ?? undefined,
    passportNo: (r.passport_no as string) ?? undefined,
    nationality: (r.nationality as string) ?? undefined,
    contactNumber: (r.contact_number as string) ?? undefined,
    address: (r.address as string) ?? undefined,
    dateOfBirth: (r.date_of_birth as string) ?? undefined,
    placeOfBirth: (r.place_of_birth as string) ?? undefined,
    civilStatus: (r.civil_status as string) ?? undefined,
    children: (r.children as string) ?? undefined,
    english: (r.english as string) ?? undefined,
    arabic: (r.arabic as string) ?? undefined,
    education: (r.education as string) ?? undefined,
    company: (r.company as string) ?? undefined,
    sponsor: (r.sponsor as string) ?? undefined,
    skills: (r.skills ?? {}) as CandidateProfile["skills"],
    previousJobs: Array.isArray(r.previous_jobs) ? (r.previous_jobs as PreviousJob[]) : [],
    remarks: (r.remarks as string) ?? undefined,
    createdAt: (r.created_at as string) ?? undefined,
  };
}

function toRow(p: Partial<CandidateProfile>): Row {
  const row: Row = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) row[k] = v === "" ? null : v;
  };
  set("full_name", p.fullName);
  if (p.fullName !== undefined) row["name_key"] = profileNameKey(p.fullName);
  set("reference_code", p.referenceCode);
  set("photo_url", p.photoUrl);
  set("religion", p.religion);
  set("height", p.height);
  set("weight", p.weight);
  set("position_applied", p.positionApplied);
  set("monthly_salary", p.monthlySalary);
  set("contract_period", p.contractPeriod);
  set("passport_no", p.passportNo);
  set("nationality", p.nationality);
  set("contact_number", p.contactNumber);
  set("address", p.address);
  set("date_of_birth", p.dateOfBirth);
  set("place_of_birth", p.placeOfBirth);
  set("civil_status", p.civilStatus);
  set("children", p.children);
  set("english", p.english);
  set("arabic", p.arabic);
  set("education", p.education);
  set("company", p.company);
  set("sponsor", p.sponsor);
  if (p.skills !== undefined) row["skills"] = p.skills;
  if (p.previousJobs !== undefined) row["previous_jobs"] = p.previousJobs;
  set("remarks", p.remarks);
  return row;
}

export async function listCandidateProfiles(): Promise<CandidateProfile[]> {
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => toProfile(r as Row));
}

export async function getCandidateProfile(id: string): Promise<CandidateProfile | null> {
  const { data, error } = await supabase.from("candidate_profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toProfile(data as Row) : null;
}

export async function createCandidateProfile(
  p: Partial<CandidateProfile> & { fullName: string; photoUrl: string },
  actor?: string,
): Promise<CandidateProfile> {
  const { data, error } = await supabase
    .from("candidate_profiles")
    .insert({ ...toRow(p), created_by: actor ?? null } as never)
    .select("*")
    .single();
  if (error) throw error;
  return toProfile(data as Row);
}

export async function updateCandidateProfile(
  id: string,
  patch: Partial<CandidateProfile>,
  actor?: string,
): Promise<void> {
  const { error } = await supabase
    .from("candidate_profiles")
    .update({ ...toRow(patch), last_edited_by: actor ?? null } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCandidateProfile(id: string): Promise<void> {
  const { error } = await supabase.from("candidate_profiles").delete().eq("id", id);
  if (error) throw error;
}

/** Reads a chosen photo and shrinks it to a passport-sized JPEG data URL. */
export function readPhotoAsDataUrl(file: File, maxWidth = 520): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => {
      const src = String(reader.result ?? "");
      const img = new Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        const scale = Math.min(1, maxWidth / (img.width || maxWidth));
        const w = Math.max(1, Math.round((img.width || maxWidth) * scale));
        const h = Math.max(1, Math.round((img.height || maxWidth) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
