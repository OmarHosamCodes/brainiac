import type { AgentSurface, AgentToolCatalogEntry, DashboardAgentToolPreset } from "./types";

type ToolCatalogDefinition = Omit<AgentToolCatalogEntry, "available">;

const ALL_MODES: DashboardAgentToolPreset[] = ["ask", "plan", "agent"];

const TOOL_CATALOG: ToolCatalogDefinition[] = [
  {
    name: "ui_present",
    usage: "Renders a schema, React, or workspace block UI artifact in the canvas.",
    surface: ["canvas", "agency"],
    modes: ALL_MODES,
  },
  {
    name: "ask_agency_question",
    usage: "Asks the user a clarifying question in the chat UI (single, multi, or text).",
    surface: ["agency", "canvas"],
    modes: ALL_MODES,
  },
  {
    name: "list_dashboard_nodes",
    usage: "Lists canvas nodes with structural summaries.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "search_dashboard",
    usage: "Searches node titles, tabs, and block content on the canvas.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "list_marketplace_items",
    usage: "Lists marketplace items available for reuse.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "search_marketplace",
    usage: "Searches marketplace titles, summaries, and payloads.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_node_details",
    usage: "Reads one canvas node at summary or full detail.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_tab_details",
    usage: "Reads one tab and its blocks inside a node.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_block_details",
    usage: "Reads one block payload and its edit guide.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_marketplace_item_details",
    usage: "Reads one marketplace item payload.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "fetch_web_page",
    usage: "Fetches a public web page title and text excerpt.",
    surface: ["canvas"],
    modes: ALL_MODES,
  },
  {
    name: "get_current_time",
    usage: "Returns the current ISO timestamp.",
    surface: ["canvas", "agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_time_entries",
    usage: "Lists your recent Agency time entries for the active team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_time_gaps",
    usage: "Checks uncovered time windows vs tracked entries for a YYYY-MM-DD range (read-only).",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "get_agency_client_bill",
    usage:
      "Reads one client's composed bill for a period (current + carry); amounts in integer minor units.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_projects",
    usage: "Lists Agency projects and their clients for the active team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_members",
    usage: "Lists team members and roles for the active Agency team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "get_agency_time_summary",
    usage: "Per-member tracked seconds for a YYYY-MM-DD range (pass only from/to).",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "get_agency_reports_summary",
    usage: "Hours by client, project, and member for a YYYY-MM-DD range.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_clients",
    usage: "Lists Agency clients for the active team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_tags",
    usage: "Lists Agency tags for the active team.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "list_agency_project_tasks",
    usage: "Lists tasks for one Agency project.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "get_agency_active_timer",
    usage: "Reads the current user's active Agency timer, if any.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "get_agency_time_entry",
    usage: "Reads one Agency time entry by id.",
    surface: ["agency"],
    modes: ALL_MODES,
  },
  {
    name: "draft_agency_plan",
    usage: "Drafts a multi-step Agency change plan for user confirmation (no writes).",
    surface: ["agency"],
    modes: ["plan"],
  },
  {
    name: "propose_agency_action",
    usage: "Proposes one Agency write with before/after for Approve/Reject.",
    surface: ["agency"],
    modes: ["agent"],
  },
  {
    name: "draft_canvas_plan",
    usage: "Drafts a multi-step Canvas change plan for user confirmation (no writes).",
    surface: ["canvas"],
    modes: ["plan"],
  },
  {
    name: "propose_canvas_action",
    usage: "Proposes one Canvas write with before/after for Approve/Reject.",
    surface: ["canvas"],
    modes: ["agent"],
  },
];

export function resolveUnlockedSurfaces(input: {
  surface: AgentSurface;
  unlockedSurfaces?: AgentSurface[];
  scopeRefs?: Array<{ kind: string; id: string }>;
}): AgentSurface[] {
  const unlocked = new Set<AgentSurface>([input.surface, ...(input.unlockedSurfaces ?? [])]);
  for (const ref of input.scopeRefs ?? []) {
    if (ref.kind === "node" || ref.kind === "tab" || ref.kind === "block") {
      unlocked.add("canvas");
    }
    if (
      ref.kind === "timeEntry" ||
      ref.kind === "project" ||
      ref.kind === "task" ||
      ref.kind === "member"
    ) {
      unlocked.add("agency");
    }
    if (ref.kind === "surface" && (ref.id === "canvas" || ref.id === "agency")) {
      unlocked.add(ref.id);
    }
  }
  return [...unlocked];
}

export function listAgentToolCatalog(input: {
  surface: AgentSurface;
  mode: DashboardAgentToolPreset;
  unlockedSurfaces?: AgentSurface[];
  scopeRefs?: Array<{ kind: string; id: string }>;
}): AgentToolCatalogEntry[] {
  const surfaces = resolveUnlockedSurfaces(input);
  const seen = new Set<string>();
  const tools: AgentToolCatalogEntry[] = [];
  for (const entry of TOOL_CATALOG) {
    if (!entry.modes.includes(input.mode)) continue;
    if (!entry.surface.some((surface) => surfaces.includes(surface))) continue;
    if (seen.has(entry.name)) continue;
    seen.add(entry.name);
    tools.push({ ...entry, available: true });
  }
  return tools;
}
