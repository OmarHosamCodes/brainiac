/**
 * Agency segments — single source of truth for the IA.
 *
 * Order is daily-traffic ranked. The shortcut key is the second letter of
 * the `g X` chord (Work = `g w`, Clients = `g c`, …).
 */
export type AgencySegmentId =
  | "dashboard"
  | "work"
  | "projects"
  | "clients"
  | "reports"
  | "management"
  | "settings";

export type LegacyAgencySegmentId = "projects" | "resourcing" | "billing";

export type AgencySegment = {
  id: AgencySegmentId;
  label: string;
  icon: string;
  shortcutKey: string;
  /** Plain-spoken description shown under the section title. */
  subtitle: string;
};

export const AGENCY_SEGMENTS: readonly AgencySegment[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "i-lucide-layout-dashboard",
    shortcutKey: "d",
    subtitle: "Team activity, time allocation, and project distribution.",
  },
  {
    id: "work",
    label: "Work",
    icon: "i-lucide-briefcase",
    shortcutKey: "w",
    subtitle: "Tasks, threads, and time in one place.",
  },
  {
    id: "clients",
    label: "Clients",
    icon: "i-lucide-building-2",
    shortcutKey: "c",
    subtitle: "Clients and the projects you're delivering for them.",
  },
  {
    id: "projects",
    label: "Projects",
    icon: "i-lucide-folder-kanban",
    shortcutKey: "p",
    subtitle: "Project pipeline, delivery health, and activity.",
  },
  {
    id: "reports",
    label: "Reports",
    icon: "i-lucide-bar-chart-3",
    shortcutKey: "r",
    subtitle: "Hours and breakdowns across teams and clients.",
  },
  {
    id: "management",
    label: "Management",
    icon: "i-lucide-sliders-horizontal",
    shortcutKey: "m",
    subtitle: "Capacity, invoices, rates, and tenure policy.",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "i-lucide-settings",
    shortcutKey: "s",
    subtitle: "Workspace preferences and operational defaults.",
  },
] as const;

export const LEGACY_AGENCY_SEGMENT_MAP = {
  projects: "projects",
  resourcing: "management",
  billing: "management",
} as const satisfies Record<LegacyAgencySegmentId, AgencySegmentId>;

export function isLegacyAgencySegmentId(value: string | null): value is LegacyAgencySegmentId {
  return value === "projects" || value === "resourcing" || value === "billing";
}
