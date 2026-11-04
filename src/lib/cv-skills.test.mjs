import { describe, expect, test } from "bun:test";
import { scannedCvSkills, skillsFromText, usesDomesticSkills } from "./cv-skills";

describe("Profession-specific CV skills", () => {
  test("HOUSEMAID retains the domestic format", () => expect(usesDomesticSkills("HOUSEMAID")).toBe(true));
  test("DRIVER retains the domestic format", () => expect(usesDomesticSkills(" driver ")).toBe(true));
  test("barista uses source skills, not domestic defaults", () => {
    const cv = scannedCvSkills({ position: "Barista", skills: ["Prepared espresso and cappuccino", "Barista at Cafe A, 2022–2024"] }, "Housemaid");
    expect(usesDomesticSkills(cv.position)).toBe(false);
    expect(cv.skills).toEqual(["Prepared espresso and cappuccino", "Barista at Cafe A, 2022–2024"]);
  });
  test("other professions use source summaries", () => {
    for (const position of ["Cook", "Cleaner", "Nanny", "Caregiver", "Other"]) expect(usesDomesticSkills(position)).toBe(false);
  });
  test("missing source skills do not invent abilities", () => expect(scannedCvSkills({ position: "Barista" }, "Housemaid").skills).toEqual([]));
  test("reviewed summaries preserve source tasks and experience", () => expect(skillsFromText("  Espresso preparation\n\nCafe A, 2022–2024\nEspresso preparation")).toEqual(["Espresso preparation", "Cafe A, 2022–2024"]));
});