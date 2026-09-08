import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageBase64: z.string().min(50),
  mimeType: z.string().min(3),
});

export type PassportScanResult = {
  fullName?: string;
  passportNumber?: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
  issueDate?: string;
  expiryDate?: string;
};

const PROMPT = `You read machine-readable and printed data from passport photo pages.
Return ONLY JSON with these keys (omit a key when the value is not clearly readable):
{"fullName","passportNumber","dateOfBirth","placeOfBirth","nationality","issueDate","expiryDate"}
Rules:
- fullName: given names followed by surname, uppercase, no titles.
- passportNumber: exactly as printed, no spaces.
- dateOfBirth / issueDate / expiryDate: ISO format YYYY-MM-DD.
- placeOfBirth: the town/city as printed.
- nationality: country name in English (e.g. Kenya, Philippines, Ethiopia).
No explanation, no markdown fences.`;

export const scanPassport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<PassportScanResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Passport reading is not available right now.");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Passport OCR failed [${response.status}]: ${body}`);
      throw new Error(`Could not read the passport image (${response.status}).`);
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const json = raw.replace(/```json|```/g, "").trim();
    const start = json.indexOf("{");
    const end = json.lastIndexOf("}");
    if (start === -1 || end === -1) return {};

    try {
      const parsed = JSON.parse(json.slice(start, end + 1)) as Record<string, unknown>;
      const str = (key: string) => {
        const value = parsed[key];
        return typeof value === "string" && value.trim() ? value.trim() : undefined;
      };
      return {
        fullName: str("fullName"),
        passportNumber: str("passportNumber")?.replace(/\s+/g, ""),
        dateOfBirth: str("dateOfBirth"),
        placeOfBirth: str("placeOfBirth"),
        nationality: str("nationality"),
        issueDate: str("issueDate"),
        expiryDate: str("expiryDate"),
      };
    } catch {
      return {};
    }
  });
