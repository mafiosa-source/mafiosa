/** Only these two professions keep the existing domestic YES/NO matrix. */
export function usesDomesticSkills(position: string): boolean {
  return ["housemaid", "driver"].includes(position.trim().toLowerCase());
}

/** Keep source summaries as ordinary skills entries in the existing cloud field. */
export function skillsFromText(text: string): string[] {
  return [...new Set(text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
}

export function scannedCvSkills(result: { position?: string; skills?: string[] }, currentPosition: string) {
  return {
    position: result.position?.trim() || currentPosition,
    skills: result.skills ? skillsFromText(result.skills.join("\n")) : [],
  };
}