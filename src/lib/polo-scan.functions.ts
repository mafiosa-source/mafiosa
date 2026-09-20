import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageBase64: z.string().min(50),
  mimeType: z.string().min(3),
});

export type ScanSheetResult = { workers: { name: string; referenceCode?: string }[] };

const PROMPT = `You read printed or handwritten worker lists from an office sheet photo.
Return ONLY JSON: {"workers":[{"name":"FULL NAME","referenceCode":"CODE"}]}
Rules:
- One entry per worker line, in the order they appear.
- name: the person's full name in uppercase, no titles, no numbering.
- referenceCode: the reference / serial / code printed next to the name; omit the key when there is none.
- Ignore headers, totals, signatures and stamps.
No explanation, no markdown fences.`;

export const scanPoloSheet = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ScanSheetResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Sheet reading is not available right now.");

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
              { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`POLO sheet scan failed [${response.status}]: ${body}`);
      throw new Error(`Could not read the sheet image (${response.status}).`);
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = (payload.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return { workers: [] };

    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as { workers?: unknown };
      const list = Array.isArray(parsed.workers) ? parsed.workers : [];
      const workers: { name: string; referenceCode?: string }[] = [];
      for (const entry of list) {
        const row = entry as Record<string, unknown>;
        const name = typeof row.name === "string" ? row.name.trim() : "";
        const code = typeof row.referenceCode === "string" ? row.referenceCode.trim() : "";
        if (name) workers.push(code ? { name, referenceCode: code } : { name });
      }
      return { workers };
    } catch {
      return { workers: [] };
    }
  });
