export type CvRemarksProfile = {
  fullName: string;
  position: string;
  skills: string[];
  experienceYears?: number;
  experienceCountry?: string;
  languages?: string[];
  education?: string;
};

/** Enforce a brief overview rather than another skills list. */
export function briefCvRemarks(text: string): string {
  const sentences = text.trim().replace(/\s+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  const brief = sentences.slice(0, 2).join("").trim();
  const words = brief.split(/\s+/).filter(Boolean);
  if (words.length <= 60) return brief;
  return `${words.slice(0, 60).join(" ").replace(/[,:;.!?]+$/, "")}.`;
}

/** Safe empty-remarks fallback; never duplicate the full skills array. */
export function cvRemarksOverview(profile: CvRemarksProfile): string {
  const experience = profile.experienceYears && profile.experienceYears > 0
    ? ` with ${profile.experienceYears} year(s) of experience${profile.experienceCountry ? ` in ${profile.experienceCountry}` : ""}`
    : "";
  const languages = profile.languages?.length ? ` Speaks ${profile.languages.join(" and ")}.` : "";
  return briefCvRemarks(`${profile.fullName} is applying as ${profile.position}${experience}.${languages}`);
}