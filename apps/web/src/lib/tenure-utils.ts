export function tenureStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    intern: "Intern",
    waived: "Waived",
    met: "Met",
    missed: "Missed",
    "on-track": "On track",
    "at-risk": "At risk",
    "in-progress": "In progress",
    skipped: "Skipped",
  };
  return labels[status] ?? status;
}

export function tenureStatusClass(status: string): string {
  switch (status) {
    case "met":
    case "on-track":
      return "text-success";
    case "at-risk":
      return "text-warning";
    case "missed":
      return "text-error";
    default:
      return "text-muted";
  }
}

export function formatTenureHours(hours: number): string {
  return hours.toFixed(1);
}

export function formatUtcDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

export function formatPeriodEndExclusive(exclusiveEndIso: string): string {
  const end = new Date(exclusiveEndIso);
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toLocaleDateString(undefined, { timeZone: "UTC" });
}

export const FISCAL_MONTHS = [
  { label: "January", value: 1 },
  { label: "February", value: 2 },
  { label: "March", value: 3 },
  { label: "April", value: 4 },
  { label: "May", value: 5 },
  { label: "June", value: 6 },
  { label: "July", value: 7 },
  { label: "August", value: 8 },
  { label: "September", value: 9 },
  { label: "October", value: 10 },
  { label: "November", value: 11 },
  { label: "December", value: 12 },
] as const;

export type FiscalMonth = (typeof FISCAL_MONTHS)[number]["value"];
