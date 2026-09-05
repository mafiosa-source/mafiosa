// ============================================================
// CV / Candidate Management — Phase 2, purely additive.
// No finance tables, logic, or pages are touched.
// ============================================================
import { supabase } from "@/integrations/supabase/client";

// ---------- Agents ----------
export type Agent = {
  id: string;
  name: string;
  agentCode: string;
  country: string;
  phone?: string;
  contactPerson?: string;
  createdAt: string;
};

// ---------- Candidates ----------
export type Candidate = {
  id: string;
  candidateCode: string;
  fullName: string;
  photoUrl: string;
  galleryUrls: string[];
  nationality: string;
  countryCode: string;
  age?: number;
  dateOfBirth?: string;
  position: string;
  experienceYears: number;
  languages: string[];
  availabilityStatus: "Available" | "Reserved" | "Unavailable";
  maritalStatus?: string;
  childrenCount: number;
  height?: string;
  weight?: string;
  religion?: string;
  education?: string;
  skills: string[];
  agentId?: string;
  uploadedByUserId: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportScanUrl?: string;
  notes?: string;
  status: "Available" | "Reserved" | "Deployed";
  createdAt: string;
};

// ---------- Country list ----------
export const COUNTRIES: { code: string; name: string; flag: string }[] = [
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "NP", name: "Nepal", flag: "🇳🇵" },
];

export const COUNTRY_CODE_BY_NAME: Record<string, string> = COUNTRIES.reduce(
  (acc, c) => ({ ...acc, [c.name]: c.code }),
  {} as Record<string, string>,
);

export const POSITIONS = [
  "Housemaid",
  "Nanny",
  "Cook",
  "Cleaner",
  "Caregiver",
  "Driver",
  "Babysitter",
  "Housekeeper",
  "Laundry",
  "Gardener",
  "Other",
] as const;

export const AVAILABILITY_STATUSES = ["Available", "Reserved", "Unavailable"] as const;
export const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed", "Separated"] as const;
export const RELIGIONS = ["Christian", "Muslim", "Hindu", "Buddhist", "Catholic", "Other"] as const;
export const COMMON_SKILLS = [
  "Cleaning",
  "Cooking",
  "Arabic Cooking",
  "Ironing",
  "Laundry",
  "Babysitting",
  "Childcare",
  "Elderly Care",
  "Driving",
  "Gardening",
  "Computer Skills",
  "First Aid",
  "Sewing",
  "Baking",
];
export const COMMON_LANGUAGES = ["English", "Arabic", "Hindi", "Urdu", "Tagalog", "Swahili", "Amharic", "French"];

// ---------- Row mappers ----------
type Row = Record<string, unknown>;

function agentFromRow(r: Row): Agent {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    agentCode: String(r.agent_code ?? ""),
    country: String(r.country ?? ""),
    phone: (r.phone as string) ?? undefined,
    contactPerson: (r.contact_person as string) ?? undefined,
    createdAt: String(r.created_at ?? ""),
  };
}

function candidateFromRow(r: Row): Candidate {
  return {
    id: String(r.id),
    candidateCode: String(r.candidate_code ?? ""),
    fullName: String(r.full_name ?? ""),
    photoUrl: String(r.photo_url ?? ""),
    galleryUrls: Array.isArray(r.gallery_urls) ? (r.gallery_urls as string[]) : [],
    nationality: String(r.nationality ?? ""),
    countryCode: String(r.country_code ?? ""),
    age: r.age == null ? undefined : Number(r.age),
    dateOfBirth: (r.date_of_birth as string) ?? undefined,
    position: String(r.position ?? "Housemaid"),
    experienceYears: Number(r.experience_years ?? 0),
    languages: Array.isArray(r.languages) ? (r.languages as string[]) : [],
    availabilityStatus: (r.availability_status as Candidate["availabilityStatus"]) ?? "Available",
    maritalStatus: (r.marital_status as string) ?? undefined,
    childrenCount: Number(r.children_count ?? 0),
    height: (r.height as string) ?? undefined,
    weight: (r.weight as string) ?? undefined,
    religion: (r.religion as string) ?? undefined,
    education: (r.education as string) ?? undefined,
    skills: Array.isArray(r.skills) ? (r.skills as string[]) : [],
    agentId: (r.agent_id as string) ?? undefined,
    uploadedByUserId: String(r.uploaded_by_user_id ?? ""),
    passportNumber: (r.passport_number as string) ?? undefined,
    passportIssueDate: (r.passport_issue_date as string) ?? undefined,
    passportExpiryDate: (r.passport_expiry_date as string) ?? undefined,
    passportScanUrl: (r.passport_scan_url as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    status: (r.status as Candidate["status"]) ?? "Available",
    createdAt: String(r.created_at ?? ""),
  };
}

// ---------- Agent CRUD ----------
export async function listAgents(): Promise<Agent[]> {
  const { data, error } = await supabase.from("agents").select("*").order("country", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => agentFromRow(r as Row));
}

export async function createAgent(input: {
  name: string;
  agentCode: string;
  country: string;
  phone?: string;
  contactPerson?: string;
}): Promise<Agent> {
  const { data, error } = await supabase
    .from("agents")
    .insert({
      name: input.name,
      agent_code: input.agentCode.toUpperCase(),
      country: input.country,
      phone: input.phone || null,
      contact_person: input.contactPerson || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return agentFromRow(data as Row);
}

export async function updateAgent(id: string, patch: Partial<Omit<Agent, "id" | "createdAt">>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.agentCode !== undefined) row.agent_code = patch.agentCode.toUpperCase();
  if (patch.country !== undefined) row.country = patch.country;
  if (patch.phone !== undefined) row.phone = patch.phone || null;
  if (patch.contactPerson !== undefined) row.contact_person = patch.contactPerson || null;
  const { error } = await supabase.from("agents").update(row as never).eq("id", id);
  if (error) throw error;
}

export async function deleteAgent(id: string): Promise<void> {
  const { error } = await supabase.from("agents").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Candidate CRUD ----------
export type CandidateInput = {
  fullName: string;
  photoUrl: string;
  galleryUrls: string[];
  nationality: string;
  countryCode: string;
  age?: number;
  dateOfBirth?: string;
  position: string;
  experienceYears: number;
  languages: string[];
  availabilityStatus: Candidate["availabilityStatus"];
  maritalStatus?: string;
  childrenCount: number;
  height?: string;
  weight?: string;
  religion?: string;
  education?: string;
  skills: string[];
  agentId?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  passportScanUrl?: string;
  notes?: string;
  status: Candidate["status"];
};

export async function listCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => candidateFromRow(r as Row));
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const { data, error } = await supabase.from("candidates").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? candidateFromRow(data as Row) : null;
}

export async function createCandidate(input: CandidateInput): Promise<Candidate> {
  const row: Record<string, unknown> = {
    full_name: input.fullName,
    photo_url: input.photoUrl,
    gallery_urls: input.galleryUrls,
    nationality: input.nationality,
    country_code: input.countryCode,
    position: input.position,
    experience_years: input.experienceYears,
    languages: input.languages,
    availability_status: input.availabilityStatus,
    children_count: input.childrenCount,
    skills: input.skills,
    status: input.status,
  };
  if (input.age != null) row.age = input.age;
  if (input.dateOfBirth) row.date_of_birth = input.dateOfBirth;
  if (input.maritalStatus) row.marital_status = input.maritalStatus;
  if (input.height) row.height = input.height;
  if (input.weight) row.weight = input.weight;
  if (input.religion) row.religion = input.religion;
  if (input.education) row.education = input.education;
  if (input.agentId) row.agent_id = input.agentId;
  if (input.passportNumber) row.passport_number = input.passportNumber;
  if (input.passportIssueDate) row.passport_issue_date = input.passportIssueDate;
  if (input.passportExpiryDate) row.passport_expiry_date = input.passportExpiryDate;
  if (input.passportScanUrl) row.passport_scan_url = input.passportScanUrl;
  if (input.notes) row.notes = input.notes;

  const { data, error } = await supabase.from("candidates").insert(row as never).select("*").single();
  if (error) throw error;
  return candidateFromRow(data as Row);
}

export async function updateCandidate(id: string, patch: Partial<CandidateInput>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
  if (patch.galleryUrls !== undefined) row.gallery_urls = patch.galleryUrls;
  if (patch.nationality !== undefined) row.nationality = patch.nationality;
  if (patch.countryCode !== undefined) row.country_code = patch.countryCode;
  if (patch.age !== undefined) row.age = patch.age;
  if (patch.dateOfBirth !== undefined) row.date_of_birth = patch.dateOfBirth;
  if (patch.position !== undefined) row.position = patch.position;
  if (patch.experienceYears !== undefined) row.experience_years = patch.experienceYears;
  if (patch.languages !== undefined) row.languages = patch.languages;
  if (patch.availabilityStatus !== undefined) row.availability_status = patch.availabilityStatus;
  if (patch.maritalStatus !== undefined) row.marital_status = patch.maritalStatus;
  if (patch.childrenCount !== undefined) row.children_count = patch.childrenCount;
  if (patch.height !== undefined) row.height = patch.height;
  if (patch.weight !== undefined) row.weight = patch.weight;
  if (patch.religion !== undefined) row.religion = patch.religion;
  if (patch.education !== undefined) row.education = patch.education;
  if (patch.skills !== undefined) row.skills = patch.skills;
  if (patch.agentId !== undefined) row.agent_id = patch.agentId || null;
  if (patch.passportNumber !== undefined) row.passport_number = patch.passportNumber;
  if (patch.passportIssueDate !== undefined) row.passport_issue_date = patch.passportIssueDate;
  if (patch.passportExpiryDate !== undefined) row.passport_expiry_date = patch.passportExpiryDate;
  if (patch.passportScanUrl !== undefined) row.passport_scan_url = patch.passportScanUrl;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.status !== undefined) row.status = patch.status;

  const { error } = await supabase.from("candidates").update(row as never).eq("id", id);
  if (error) throw error;
}

export async function deleteCandidate(id: string): Promise<void> {
  const { error } = await supabase.from("candidates").delete().eq("id", id);
  if (error) throw error;
}

// ---------- File uploads ----------
const BUCKET = "candidate-files";

export async function uploadCandidateFile(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
  if (!data?.signedUrl) throw new Error("Could not generate file URL");
  return data.signedUrl;
}

export async function uploadCandidatePhoto(file: File): Promise<string> {
  return uploadCandidateFile(file, "photos");
}

export async function uploadPassportScan(file: File): Promise<string> {
  return uploadCandidateFile(file, "passports");
}

// ---------- Uploader name lookup ----------
export async function getUploaderName(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("app_users")
    .select("name")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error || !data) return "Unknown";
  return (data as Record<string, unknown>).name as string;
}

// ---------- Helpers ----------
export function ageFromDob(dob?: string): number | undefined {
  if (!dob) return undefined;
  const d = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : undefined;
}

export function maskPassport(num?: string): string {
  if (!num) return "—";
  if (num.length <= 4) return "•".repeat(num.length);
  return num.slice(0, 2) + "•".repeat(Math.max(0, num.length - 4)) + num.slice(-2);
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function countryFlag(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.flag ?? "🏳️";
}

export function agentName(agents: Agent[], id?: string): string {
  if (!id) return "—";
  return agents.find((a) => a.id === id)?.name ?? "—";
}
