/**
 * Agency segments — single source of truth for the IA.
 *
 * Order is execution-first: Tracker leads because it is the default surface.
 * The shortcut key is the second letter of the `g X` chord
 * (Tracker = `g t`, Dashboard = `g d`, Clients = `g c`, …).
 */
export type AgencySegmentId =
  | "work"
  | "dashboard"
  | "clients"
  | "projects"
  | "reports"
  | "management";

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
    id: "work",
    label: "Tracker",
    icon: "i-lucide-timer",
    shortcutKey: "t",
    subtitle: "Track time as you work — start, edit, and log entries.",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "i-lucide-layout-dashboard",
    shortcutKey: "d",
    subtitle: "Live pulse: team activity and project share.",
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
    subtitle: "Project pipeline, journey, tasks, and delivery activity.",
  },
  {
    id: "reports",
    label: "Reports",
    icon: "i-lucide-bar-chart-3",
    shortcutKey: "r",
    subtitle: "Inspect hours, edit rows, and create exports.",
  },
  {
    id: "management",
    label: "Management",
    icon: "i-lucide-sliders-horizontal",
    shortcutKey: "m",
    subtitle: "Capacity, people, and money.",
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

export function isAgencySegmentId(value: string | null): value is AgencySegmentId {
  return AGENCY_SEGMENTS.some((entry) => entry.id === value);
}

/** Resolve the active Agency segment from `?section=`. */
export function agencySegmentFromSearch(search: string): AgencySegmentId {
  const section = new URLSearchParams(search).get("section");
  if (isAgencySegmentId(section)) return section;
  if (isLegacyAgencySegmentId(section)) return LEGACY_AGENCY_SEGMENT_MAP[section];
  return "work";
}

/** Canonical href for an Agency segment (Tracker omits the query). */
export function agencySegmentHref(segment: AgencySegmentId): string {
  return segment === "work" ? "/agency" : `/agency?section=${segment}`;
}

export function agencySegmentLabel(segment: AgencySegmentId): string {
  return AGENCY_SEGMENTS.find((entry) => entry.id === segment)?.label ?? "Agency";
}

export function agencySegmentTabId(segment: AgencySegmentId): string {
  return `agency-tab-${segment}`;
}
