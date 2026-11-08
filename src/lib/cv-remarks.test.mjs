import { describe, expect, test } from "bun:test";
import { briefCvRemarks, cvRemarksOverview } from "./cv-remarks";

describe("Brief CV remarks", () => {
  test("remarks are limited to two sentences", () => {
    expect(briefCvRemarks("Coffee service experience. Supports cafe operations. A third sentence.")).toBe("Coffee service experience. Supports cafe operations.");
  });
  test("remarks remain at most 60 words", () => {
    const result = briefCvRemarks(Array.from({ length: 90 }, (_, i) => `word${i}`).join(" "));
    expect(result.split(/\s+/)).toHaveLength(60);
  });
  test("fallback does not copy skills and experience bullets", () => {
    const result = cvRemarksOverview({ fullName: "Mary", position: "Barista", experienceYears: 2, skills: ["Prepared espresso and cappuccino", "Managed till at Cafe A"], languages: ["English"] });
    expect(result).toBe("Mary is applying as Barista with 2 year(s) of experience. Speaks English.");
    expect(result).not.toContain("Prepared espresso");
  });
  test("missing experience does not invent strengths", () => {
    expect(cvRemarksOverview({ fullName: "Mary", position: "Barista", skills: [] })).toBe("Mary is applying as Barista.");
  });
});