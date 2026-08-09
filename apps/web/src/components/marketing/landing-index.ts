export const LANDING_INDEX_ENTRIES = [
  {
    id: "canvas",
    numeral: "01",
    name: "Canvas",
    job: "Infinite canvas",
    summary:
      "Pan, zoom, and place nodes. Tabs hold blocks: task lists, notes, kanban, and decision matrices.",
  },
  {
    id: "agency",
    numeral: "02",
    name: "Agency",
    job: "Time, projects, money, people",
    summary:
      "Track time in structured rows. Projects, money, people, and resourcing stay in one place.",
  },
  {
    id: "agent",
    numeral: "03",
    name: "Agent",
    job: "Every tool call visible",
    summary: "The agent reads your workspace and shows each action as text you can inspect.",
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

export function landingScrollTargetId(hash: string): string | null {
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
  if (normalized === "instrument-index" || normalized === "pricing") return normalized;
  const indexId = landingIndexIdFromHash(normalized);
  return indexId ? `index-${indexId}` : null;
}

export function landingInPageHash(href: string, pathname: string): string | null {
  if (href.startsWith("#")) return href;
  if (pathname !== "/") return null;
  if (href.startsWith("/#")) return href.slice(1);
  return null;
}

export function scrollToLandingTarget(targetId: string): void {
  const el = document.getElementById(targetId);
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const top = window.scrollY + el.getBoundingClientRect().top - margin;
  window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
}
