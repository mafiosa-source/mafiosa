import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  fileBase64: z.string().min(50),
  mimeType: z.string().min(3),
  fileName: z.string().optional(),
});

export type CvScanResult = {
  fullName?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  position?: string;
  experienceYears?: number;
  experienceCountry?: string;
  maritalStatus?: string;
  childrenCount?: number;
  heightCm?: string;
  weightKg?: string;
  religion?: string;
  education?: string;
  languages?: string[];
  skills?: string[];
  contactNumber?: string;
  address?: string;
  monthlySalary?: string;
  notes?: string;
};

const PROMPT = `You read domestic-worker / housemaid recruitment CVs (scanned images or PDFs) from manpower agencies.
Extract every detail you can find and return ONLY JSON with these keys (omit a key when not present or unreadable):
{
 "fullName": "given names then surname, UPPERCASE, no titles",
 "passportNumber": "as printed, no spaces",
 "passportIssueDate": "YYYY-MM-DD",
 "passportExpiryDate": "YYYY-MM-DD",
 "dateOfBirth": "YYYY-MM-DD",
 "placeOfBirth": "town/city",
 "nationality": "country name in English (Kenya, Philippines, Ethiopia, Uganda, Nepal, Sri Lanka, India...)",
 "position": "one of: Housemaid, Nanny, Cook, Cleaner, Caregiver, Driver, Babysitter, Housekeeper, Laundry, Gardener, Other",
 "experienceYears": number (total years of experience; 0 if none),
 "experienceCountry": "country/countries where she worked before (e.g. Saudi Arabia, UAE, Kuwait)",
 "maritalStatus": "one of: Single, Married, Divorced, Widowed, Separated",
 "childrenCount": number,
 "heightCm": "height in cm as a number string",
 "weightKg": "weight in kg as a number string",
 "religion": "one of: Christian, Muslim, Hindu, Buddhist, Catholic, Other",
 "education": "highest education level as written",
 "languages": ["only languages marked as spoken/known, e.g. English, Arabic, Hindi, Swahili"],
 "skills": ["only skills marked YES/known from: Cleaning, Cooking, Arabic Cooking, Ironing, Laundry, Babysitting, Childcare, Elderly Care, Driving, Gardening, Computer Skills, First Aid, Sewing, Baking"],
 "contactNumber": "phone number",
 "address": "home address",
 "monthlySalary": "expected monthly salary as a number string",
 "notes": "short summary of remarks / previous employment details"
}
Rules: If a skill/language table lists YES/NO, include only YES items. If age is given but not DOB, omit dateOfBirth. No explanation, no markdown fences.`;

export const scanCv = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<CvScanResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("CV reading is not available right now.");

    const isPdf = data.mimeType === "application/pdf";
    const filePart = isPdf
      ? {
          type: "file",
          file: {
            filename: data.fileName || "cv.pdf",
            file_data: `data:application/pdf;base64,${data.fileBase64}`,
          },
        }
      : {
          type: "image_url",
          image_url: { url: `data:${data.mimeType};base64,${data.fileBase64}` },
        };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, filePart] }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`CV OCR failed [${response.status}]: ${body}`);
      if (response.status === 429) throw new Error("Too many scans right now — please try again in a moment.");
      if (response.status === 402) throw new Error("AI credits are exhausted. Please top up to keep scanning CVs.");
      throw new Error(`Could not read the CV (${response.status}).`);
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const json = raw.replace(/```json|```/g, "").trim();
    const start = json.indexOf("{");
    const end = json.lastIndexOf("}");
    if (start === -1 || end === -1) return {};

    try {
      const parsed = JSON.parse(json.slice(start, end + 1)) as Record<string, unknown>;
      const str = (key: string) => {
        const v = parsed[key];
        if (typeof v === "number") return String(v);
        return typeof v === "string" && v.trim() ? v.trim() : undefined;
      };
      const num = (key: string) => {
        const v = parsed[key];
        const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
        return Number.isFinite(n) ? n : undefined;
      };
      const list = (key: string) => {
        const v = parsed[key];
        return Array.isArray(v)
          ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim())
          : undefined;
      };
      return {
        fullName: str("fullName"),
        passportNumber: str("passportNumber")?.replace(/\s+/g, ""),
        passportIssueDate: str("passportIssueDate"),
        passportExpiryDate: str("passportExpiryDate"),
        dateOfBirth: str("dateOfBirth"),
        placeOfBirth: str("placeOfBirth"),
        nationality: str("nationality"),
        position: str("position"),
        experienceYears: num("experienceYears"),
        experienceCountry: str("experienceCountry"),
        maritalStatus: str("maritalStatus"),
        childrenCount: num("childrenCount"),
        heightCm: str("heightCm")?.replace(/[^\d.]/g, "") || undefined,
        weightKg: str("weightKg")?.replace(/[^\d.]/g, "") || undefined,
        religion: str("religion"),
        education: str("education"),
        languages: list("languages"),
        skills: list("skills"),
        contactNumber: str("contactNumber"),
        address: str("address"),
        monthlySalary: str("monthlySalary")?.replace(/[^\d.]/g, "") || undefined,
        notes: str("notes"),
      };
    } catch {
      return {};
    }
  });
