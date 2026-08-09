export const LANDING_INDEX_ENTRIES = [
  {
    id: "canvas",
    numeral: "01",
    name: "Canvas",
    job: "Spatial workspace",
    summary:
      "Pan, zoom, and place nodes. Tabs hold blocks: task lists, notes, kanban, decision matrices.",
  },
  {
    id: "agency",
    numeral: "02",
    name: "Agency",
    job: "Time, projects, money, people",
    summary:
      "Track time and capacity in structured rows. Projects, money, people, and resourcing sit in the same operating system.",
  },
  {
    id: "agent",
    numeral: "03",
    name: "Agent",
    job: "Every tool call visible",
    summary:
      "The agent reads the workspace and writes in plain sight. Each action shows up as inspectable text.",
  },
] as const;

export type LandingIndexId = (typeof LANDING_INDEX_ENTRIES)[number]["id"];

export const AGENCY_OS_PARTS = ["Tracker", "Projects", "Money", "People", "Resourcing"] as const;

export const DEFAULT_LANDING_INDEX_ID: LandingIndexId = "agency";

export function landingIndexIdFromHash(hash: string): LandingIndexId | null {
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!normalized.startsWith("index-")) return null;
  const id = normalized.slice("index-".length);
  for (const entry of LANDING_INDEX_ENTRIES) {
    if (entry.id === id) return entry.id;
  }
  return null;
}
