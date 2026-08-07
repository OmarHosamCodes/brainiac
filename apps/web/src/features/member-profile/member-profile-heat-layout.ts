import type { RangePreset } from "@/features/shared/command-bar/range-preset-chooser";

export type MemberProfileHeatLayout = "compact" | "strip";

/** month/week/today → compact; last30 / multi-month tenure / long custom → strip. */
export function resolveMemberProfileHeatLayout(
  preset: RangePreset,
  tenureMonthIndexes: number[],
  startDate: string,
  endDate: string,
): MemberProfileHeatLayout {
  switch (preset) {
    case "today":
    case "week":
    case "month":
      return "compact";
    case "last30":
      return "strip";
    case "tenure": {
      // All quarter ([]) or multi-month → strip; single month → compact.
      if (tenureMonthIndexes.length === 1) return "compact";
      return "strip";
    }
    case "custom": {
      const start = Date.parse(`${startDate}T00:00:00.000Z`);
      const end = Date.parse(`${endDate}T00:00:00.000Z`);
      if (Number.isNaN(start) || Number.isNaN(end)) return "strip";
      const daySpan = Math.floor((end - start) / 86_400_000) + 1;
      return daySpan <= 31 ? "compact" : "strip";
    }
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}
