import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  fileBase64: z.string().min(50),
  mimeType: z.string().min(3),
  kind: z.enum(["lpo", "sales", "bank"]),
});

export type ScannedLine = {
  name?: string;
  availableQty?: number;
  qty?: number;
  unit?: string;
  unitCost?: number;
  unitPrice?: number;
  cashQty?: number;
  cardQty?: number;
  total?: number;
  date?: string;
  description?: string;
  direction?: "in" | "out";
  amount?: number;
};

export type ScanResult = {
  date?: string;
  location?: string;
  label?: string;
  fromDate?: string;
  toDate?: string;
  lines: ScannedLine[];
};

const PROMPTS: Record<"lpo" | "sales" | "bank", string> = {
  lpo: `You read catering purchase orders (LPO) — lists of items needed for the next day.
These sheets have TWO quantity columns: the available quantity (stock/inventory on hand today) and the quantity to be ordered.
Return ONLY JSON: {"date":"YYYY-MM-DD","location":"","lines":[{"name":"","availableQty":0,"qty":0,"unit":"","unitCost":0,"total":0}]}
Rules: name uppercase; availableQty is the available/stock/on-hand quantity column; qty is the quantity to be ordered column; unitCost is price per unit; total is line total (qty x unitCost) when printed.
Capture every line exactly as written, including lines where the order quantity is blank or zero.
Omit any key you cannot read. No markdown fences, no explanation.`,
  sales: `You read daily catering sales sheets.
These sheets have TWO quantity columns: CASH SALES (quantity paid in cash) and CARD PAYMENTS (quantity paid by card).
Return ONLY JSON: {"date":"YYYY-MM-DD","location":"","lines":[{"name":"","cashQty":0,"cardQty":0,"qty":0,"unitPrice":0,"total":0}]}
Rules: one line per item sold; cashQty is the cash sales column; cardQty is the card payments column; qty is the combined quantity (cashQty + cardQty, or the sheet's own total column when printed); unitPrice is selling price per unit; total is the line total.
Capture every line exactly as written, including lines where one of the two quantity columns is blank or zero.
Omit any key you cannot read. No markdown fences, no explanation.`,
  bank: `You read bank statements (PDF, spreadsheet export or photo).
Return ONLY JSON: {"label":"account or bank name","fromDate":"YYYY-MM-DD","toDate":"YYYY-MM-DD","lines":[{"date":"YYYY-MM-DD","description":"","direction":"in","amount":0}]}
Rules: direction is "in" for credits/deposits and "out" for debits/withdrawals; amount is always positive.
Omit any key you cannot read. No markdown fences, no explanation.`,
};

export const scanDuMondeDocument = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<ScanResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Document reading is not available right now.");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPTS[data.kind] },
              { type: "image_url", image_url: { url: `data:${data.mimeType};base64,${data.fileBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Du Monde scan failed [${response.status}]: ${body}`);
      throw new Error(`Could not read this file (${response.status}).`);
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = (payload.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1) return { lines: [] };

    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
      const nbr = (v: unknown) => {
        const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
        return Number.isFinite(n) ? n : undefined;
      };
      const rawLines = Array.isArray(parsed["lines"]) ? (parsed["lines"] as Record<string, unknown>[]) : [];
      return {
        date: str(parsed["date"]),
        location: str(parsed["location"]),
        label: str(parsed["label"]),
        fromDate: str(parsed["fromDate"]),
        toDate: str(parsed["toDate"]),
        lines: rawLines.map((l) => ({
          name: str(l["name"]),
          availableQty: nbr(l["availableQty"]),
          qty: nbr(l["qty"]),
          unit: str(l["unit"]),
          unitCost: nbr(l["unitCost"]),
          unitPrice: nbr(l["unitPrice"]),
          cashQty: nbr(l["cashQty"]),
          cardQty: nbr(l["cardQty"]),
          total: nbr(l["total"]),
          date: str(l["date"]),
          description: str(l["description"]),
          direction: str(l["direction"]) === "out" ? "out" : "in",
          amount: nbr(l["amount"]),
        })),
      };
    } catch {
      return { lines: [] };
    }
  });
