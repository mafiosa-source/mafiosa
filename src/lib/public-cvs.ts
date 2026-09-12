// Public agency website CV listings (table: public.cvs, bucket: cv-pdfs).
// Independent of the internal finance ledger.
import { supabase } from "@/integrations/supabase/client";

export type PublicCv = {
  id: string;
  name: string;
  country: string;
  position: string;
  experience: string | null;
  cvUrl: string | null;
  isAvailable: boolean;
  phoneOverride: string | null;
  createdAt: string;
};

export const CV_COUNTRIES = ["PHP", "KEN", "ETH", "NIG", "TZ", "UG", "IND"] as const;

export const COUNTRY_NAME: Record<string, string> = {
  PHP: "Philippines",
  KEN: "Kenya",
  ETH: "Ethiopia",
  NIG: "Nigeria",
  TZ: "Tanzania",
  UG: "Uganda",
  IND: "India",
};

export const AGENCY_PHONES = ["+97455830003", "+97466772778"] as const;

/** Even positions use the first line, odd positions the second, unless the CV overrides it. */
export function phoneForCv(cv: PublicCv, index: number): string {
  const override = cv.phoneOverride?.trim();
  if (override) return override;
  return AGENCY_PHONES[index % 2]!;
}

export function whatsappLink(cv: PublicCv, index: number): string {
  const phone = phoneForCv(cv, index).replace(/[^0-9]/g, "");
  const text = `Hello Broker, interested in ${cv.name} ${cv.id} ${cv.position} ${cv.country}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function callLink(cv: PublicCv, index: number): string {
  return `tel:${phoneForCv(cv, index).replace(/[^0-9+]/g, "")}`;
}

type Row = {
  id: string;
  name: string;
  country: string;
  position: string;
  experience: string | null;
  cv_url: string | null;
  is_available: boolean;
  phone_override: string | null;
  created_at: string;
};

const mapRow = (r: Row): PublicCv => ({
  id: r.id,
  name: r.name,
  country: r.country,
  position: r.position,
  experience: r.experience,
  cvUrl: r.cv_url,
  isAvailable: r.is_available,
  phoneOverride: r.phone_override,
  createdAt: r.created_at,
});

/** Public site: only CVs marked available. */
export async function listAvailableCvs(): Promise<PublicCv[]> {
  const { data, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("is_available", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapRow);
}

/** Admin panel: every CV, available or reserved. */
export async function listAllCvs(): Promise<PublicCv[]> {
  const { data, error } = await supabase
    .from("cvs")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(mapRow);
}

export type CvInput = {
  id: string;
  name: string;
  country: string;
  position: string;
  experience?: string;
  cvUrl?: string | null;
  isAvailable: boolean;
  phoneOverride?: string | null;
};

function toRow(input: CvInput) {
  return {
    id: input.id.trim().toUpperCase(),
    name: input.name.trim(),
    country: input.country,
    position: input.position.trim(),
    experience: input.experience?.trim() || null,
    cv_url: input.cvUrl || null,
    is_available: input.isAvailable,
    phone_override: input.phoneOverride?.trim() || null,
  };
}

export async function createCv(input: CvInput): Promise<void> {
  const { error } = await supabase.from("cvs").insert(toRow(input) as never);
  if (error) {
    if (error.code === "23505") throw new Error("That CV ID already exists");
    throw error;
  }
}

export async function updateCv(id: string, input: CvInput): Promise<void> {
  const { error } = await supabase.from("cvs").update(toRow(input) as never).eq("id", id);
  if (error) throw error;
}

export async function setCvAvailability(id: string, isAvailable: boolean): Promise<void> {
  const { error } = await supabase.from("cvs").update({ is_available: isAvailable } as never).eq("id", id);
  if (error) throw error;
}

export async function deleteCv(id: string): Promise<void> {
  const { error } = await supabase.from("cvs").delete().eq("id", id);
  if (error) throw error;
}

/** Uploads the PDF and returns the stored object path. */
export async function uploadCvPdf(file: File, cvId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${cvId.trim().toUpperCase()}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("cv-pdfs").upload(path, file, {
    contentType: file.type || "application/pdf",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

/** Turns a stored path into a link the visitor can open. */
export async function cvFileLink(cvUrl: string): Promise<string> {
  if (/^https?:\/\//i.test(cvUrl)) return cvUrl;
  const { data, error } = await supabase.storage.from("cv-pdfs").createSignedUrl(cvUrl, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
