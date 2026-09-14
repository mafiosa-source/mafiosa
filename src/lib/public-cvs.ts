// Public agency website listings.
// Source of truth = the recruitment candidates (public.candidates).
// status = "Available" -> shown on the website, anything else -> hidden.
import { COUNTRIES } from "@/lib/cv-management";
import type { PublicCvRow } from "@/lib/public-cvs.functions";

export type PublicCv = PublicCvRow;

export const CV_COUNTRIES = COUNTRIES.map((c) => c.code);

export const COUNTRY_NAME: Record<string, string> = COUNTRIES.reduce(
  (acc, c) => ({ ...acc, [c.code]: c.name }),
  {} as Record<string, string>,
);

export const AGENCY_PHONES = ["+97455830003", "+97466772778"] as const;
export const AGENCY_ADDRESS = "Broker Recruitment Agency, Al Bustan Building 37, Al Sadd, Doha, 4th floor, 404-A";
export const AGENCY_MAP_URL = "https://maps.google.com/?q=Al+Bustan+Building+37+Al+Sadd+Doha";
export const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/GExPmgL1ySzH1JvuRTORkt";

/** Even positions use the first line, odd positions the second. */
export function phoneForCv(_cv: PublicCv, index: number): string {
  return AGENCY_PHONES[index % 2]!;
}

export function whatsappLink(cv: PublicCv, index: number): string {
  const phone = phoneForCv(cv, index).replace(/[^0-9]/g, "");
  const text = `Hello Broker, interested in ${cv.name} ${cv.code} ${cv.position} ${
    COUNTRY_NAME[cv.country] ?? cv.country
  }`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function callLink(cv: PublicCv, index: number): string {
  return `tel:${phoneForCv(cv, index).replace(/[^0-9+]/g, "")}`;
}

export function experienceLabel(cv: PublicCv): string {
  if (!cv.experienceYears) return "No overseas experience";
  const where = cv.experienceCountry ? ` in ${cv.experienceCountry}` : "";
  return `${cv.experienceYears} year(s)${where}`;
}
