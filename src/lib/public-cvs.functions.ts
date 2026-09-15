// Public Broker website feed. Derived directly from the recruitment candidates
// (public.candidates) — no separate website table. Only safe, non-sensitive
// columns are ever returned to anonymous visitors.
import { createServerFn } from "@tanstack/react-start";

export type PublicCvRow = {
  id: string;
  code: string;
  name: string;
  country: string;
  nationality: string;
  position: string;
  experienceYears: number;
  experienceCountry: string | null;
  age: number | null;
  maritalStatus: string | null;
  childrenCount: number;
  height: string | null;
  weight: string | null;
  religion: string | null;
  education: string | null;
  skills: string[];
  languages: string[];
  photoUrl: string | null;
  createdAt: string;
  candidateCode: string;
  passportNumber: string | null;
  address: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  monthlySalary: string | null;
  remarks: string | null;
  galleryUrls: string[];
  agentCode: string | null;
};

export const listPublicCvs = createServerFn({ method: "GET" }).handler(async (): Promise<PublicCvRow[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("candidates")
    .select(
      "id,candidate_code,full_name,country_code,nationality,position,experience_years,experience_country,age,marital_status,children_count,height,weight,religion,education,skills,languages,photo_url,gallery_urls,passport_number,address,date_of_birth,place_of_birth,monthly_salary,remarks,created_at,agents(agent_code)",
    )
    .eq("status", "Available")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    code: String(r.candidate_code ?? ""),
    name: String(r.full_name ?? ""),
    country: String(r.country_code ?? ""),
    nationality: String(r.nationality ?? ""),
    position: String(r.position ?? ""),
    experienceYears: Number(r.experience_years ?? 0),
    experienceCountry: (r.experience_country as string) ?? null,
    age: r.age == null ? null : Number(r.age),
    maritalStatus: (r.marital_status as string) || null,
    childrenCount: Number(r.children_count ?? 0),
    height: (r.height as string) || null,
    weight: (r.weight as string) || null,
    religion: (r.religion as string) || null,
    education: (r.education as string) || null,
    skills: Array.isArray(r.skills) ? (r.skills as string[]) : [],
    languages: Array.isArray(r.languages) ? (r.languages as string[]) : [],
    photoUrl: (r.photo_url as string) || null,
    createdAt: String(r.created_at ?? ""),
    candidateCode: String(r.candidate_code ?? ""),
    passportNumber: (r.passport_number as string) || null,
    address: (r.address as string) || null,
    dateOfBirth: (r.date_of_birth as string) || null,
    placeOfBirth: (r.place_of_birth as string) || null,
    monthlySalary: (r.monthly_salary as string) || null,
    remarks: (r.remarks as string) || null,
    galleryUrls: Array.isArray(r.gallery_urls) ? (r.gallery_urls as string[]) : [],
    agentCode: ((r.agents as { agent_code?: string } | null)?.agent_code as string) || null,
  }));
});

