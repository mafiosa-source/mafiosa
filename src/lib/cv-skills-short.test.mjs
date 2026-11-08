import { describe, expect, test } from "bun:test";
import { shortSkillsForPreview, usesDomesticSkills } from "./cv-skills.ts";

describe("shortSkillsForPreview", () => {
  test("housemaid and driver keep their skills untouched", () => {
    const skills = ["Cooking", "Washing", "Cleaning"];
    expect(shortSkillsForPreview("HOUSEMAID", skills)).toEqual(skills);
    expect(shortSkillsForPreview("Driver", skills)).toEqual(skills);
  });

  test("other professions get short keyword chips from long sentences", () => {
    const skills = [
      "Experienced barista with 3 years preparing espresso and latte art for busy cafes",
      "Provided excellent customer service and handled cashier duties",
      "Skilled in cleaning and maintaining equipment",
    ];
    const chips = shortSkillsForPreview("Barista", skills);
    expect(chips).toContain("Barista");
    expect(chips).toContain("Espresso");
    expect(chips).toContain("Latte art");
    expect(chips).toContain("Customer service");
    expect(chips).toContain("Cashier");
    expect(chips).toContain("Cleaning");
    for (const chip of chips) expect(chip.split(" ").length).toBeLessThanOrEqual(2);
  });

  test("falls back to first two words when no keyword matches", () => {
    const chips = shortSkillsForPreview("Chef", ["Managed xyzq team schedules efficiently"]);
    expect(chips).toEqual(["Managed xyzq"]);
  });

  test("domestic check is case-insensitive", () => {
    expect(usesDomesticSkills(" housemaid ")).toBe(true);
    expect(usesDomesticSkills("DRIVER")).toBe(true);
    expect(usesDomesticSkills("Barista")).toBe(false);
  });
});
