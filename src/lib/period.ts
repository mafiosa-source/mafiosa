// ============================================================
// Reporting period — the ERP always assumes the CURRENT MONTH
// unless the user deliberately selects another period.
//
// A period only limits *activity* figures (Money In / Money Out for the
// range). It never changes a wallet's real current balance, and it never
// deletes or hides historical transactions — they reappear as soon as a
// broader range is selected.
// ============================================================

export type PeriodPreset =
  | "today"
  | "this-week"
  | "current-month"
  | "previous-month"
  | "custom"
  | "all-time";

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "current-month", label: "Current Month" },
  { value: "previous-month", label: "Previous Month" },
  { value: "custom", label: "Custom Date Range" },
  { value: "all-time", label: "All Time" },
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type Period = { preset: PeriodPreset; from: string; to: string; label: string };

/** The default period for every screen: the current month up to today. */
export function currentMonthPeriod(now = new Date()): Period {
  return resolvePeriod("current-month", "", "", now);
}

export function resolvePeriod(
  preset: PeriodPreset,
  customFrom = "",
  customTo = "",
  now = new Date(),
): Period {
  const monthName = (d: Date) => d.toLocaleString("en-GB", { month: "long", year: "numeric" });

  if (preset === "today") {
    const d = iso(now);
    return { preset, from: d, to: d, label: `Today · ${d}` };
  }
  if (preset === "this-week") {
    const day = (now.getDay() + 6) % 7; // Monday = 0
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    return { preset, from: iso(start), to: iso(now), label: "This week" };
  }
  if (preset === "previous-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { preset, from: iso(start), to: iso(end), label: monthName(start) };
  }
  if (preset === "custom") {
    return {
      preset,
      from: customFrom,
      to: customTo,
      label: `${customFrom || "Beginning"} → ${customTo || "Date"}`,
    };
  }
  if (preset === "all-time") {
    return { preset, from: "", to: "", label: "All time (every historical month)" };
  }
  // current-month (default)
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { preset: "current-month", from: iso(start), to: iso(now), label: monthName(start) };
}
