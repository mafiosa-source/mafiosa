/** Only these two professions keep the existing domestic YES/NO matrix. */
export function usesDomesticSkills(position: string): boolean {
  return ["housemaid", "driver"].includes(position.trim().toLowerCase().replace(/\s+/g, ""));
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

/** Recognizable short skill keywords found inside longer CV summary sentences. */
const SKILL_KEYWORDS = [
  "Barista", "Espresso", "Latte art", "Coffee", "Brewing", "Baking", "Pastry", "Cooking", "Babysitting",
  "Childcare", "Elderly care", "Nursing", "First aid", "Cleaning", "Ironing", "Laundry", "Washing",
  "Gardening", "Driving", "Customer service", "Cashier", "Sales", "Waitress", "Serving", "Housekeeping",
  "Sewing", "Tailoring", "Hairdressing", "Manicure", "Massage", "Tutoring", "Teaching", "English",
  "Arabic", "Computer", "Typing", "Inventory", "Stock", "Catering", "Hospitality", "Reception",
  "Office work", "Accounting", "Marketing", "Painting", "Plumbing", "Electrical", "Carpentry", "Welding",
  "Masonry", "Security", "Delivery", "Packing", "Farming", "Pet care", "Swimming",
  "Frothing", "Orders", "Payments", "Sanitation", "Maintenance", "Grinders", "Blenders",
];

/**
 * Public website preview only: turn long CV summary sentences into short skill chips.
 * Matches source keywords and emits one-word labels; never changes stored CV details.
 */
export function shortSkillsForPreview(position: string, skills: string[]): string[] {
  if (usesDomesticSkills(position)) return skills;
  const found: string[] = [];
  for (const skill of skills) {
    const lower = skill.toLowerCase();
    const matches = SKILL_KEYWORDS.filter((kw) => lower.includes(kw.toLowerCase()));
    if (matches.length) {
      const labels: Record<string, string> = {
        "Latte art": "Latte", "Customer service": "Service", "Elderly care": "Caregiving",
        "First aid": "First-aid", "Office work": "Administration", "Pet care": "Petcare",
      };
      for (const match of matches) {
        const label = labels[match] ?? match;
        if (!found.includes(label)) found.push(label);
      }
    } else {
      const words = skill.replace(/[^a-zA-Z\s-]/g, " ").trim().split(/\s+/).filter(Boolean);
      const short = words[0] ?? "";
      if (short && !found.includes(short)) found.push(short);
    }
  }
  return found;
}