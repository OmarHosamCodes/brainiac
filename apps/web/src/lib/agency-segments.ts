/**
 * Agency segments — single source of truth for the IA.
 *
 * Order is daily-traffic ranked. The shortcut key is the second letter of
 * the `g X` chord (Work = `g w`, Projects = `g p`, …).
 */
export type AgencySegmentId =
  | "work"
  | "projects"
  | "clients"
  | "reports"
  | "resourcing"
  | "billing"
  | "settings";

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
    label: "Work",
    icon: "i-lucide-briefcase",
    shortcutKey: "w",
    subtitle: "Tasks, threads, and time in one place.",
  },
  {
    id: "projects",
    label: "Projects",
    icon: "i-lucide-folder-kanban",
    shortcutKey: "p",
    subtitle: "Every project, with budgets and hours this period.",
  },
  {
    id: "clients",
    label: "Clients",
    icon: "i-lucide-building-2",
    shortcutKey: "c",
    subtitle: "Clients and the projects you're delivering for them.",
  },
  {
    id: "reports",
    label: "Reports",
    icon: "i-lucide-bar-chart-3",
    shortcutKey: "r",
    subtitle: "Hours and breakdowns across teams and clients.",
  },
  {
    id: "resourcing",
    label: "Resourcing",
    icon: "i-lucide-calendar-range",
    shortcutKey: "u",
    subtitle: "Member capacity and utilization, week by week.",
  },
  {
    id: "billing",
    label: "Invoices",
    icon: "i-lucide-receipt",
    shortcutKey: "b",
    subtitle: "Invoices, draft to paid, and period close.",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "i-lucide-settings",
    shortcutKey: "s",
    subtitle: "Team configuration for time, rates, and tenure.",
  },
] as const;
